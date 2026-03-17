import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, GripVertical, ChevronDown, AlertTriangle, Clock, Sparkles, Plus, X, Loader2, CalendarIcon, Star, Copy, ClipboardPaste, Zap, ArrowUpToLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import ConfettiExplosion from "./ConfettiExplosion";
import { format } from "date-fns";
import { playCompletionSound } from "@/lib/sounds";

type Task = Tables<"tasks"> & { subtasks?: Tables<"subtasks">[], project?: Tables<"projects"> };
type Project = Tables<"projects">;

interface TaskCardProps {
  task: Task;
  index: number;
  isDragging: boolean;
  projects: Project[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  onMoveToTop?: (id: string) => void;
  dragHandleProps?: any;
}

const SUCCESS_MESSAGES = [
  "Task concluída! Bom trabalho! 🎉",
  "Mais uma feita! Continue assim! 🚀",
  "Feito! Você está on fire hoje! ✈️",
  "Concluída! Foco total! 🎯",
  "Ótimo! Próxima! ⚡",
];

function getTaskAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffHours < 1) return "agora";
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays === 1) return "1d";
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`;
  return `${Math.floor(diffDays / 30)}m`;
}

// Cache for subtasks
const subtaskCache = new Map<string, Tables<"subtasks">[]>();

// Module-level clipboard for subtasks
let subtaskClipboard: { titles: string[] } | null = null;
const clipboardListeners = new Set<() => void>();
function setSubtaskClipboard(data: { titles: string[] } | null) {
  subtaskClipboard = data;
  clipboardListeners.forEach(fn => fn());
}

const TaskCard = ({ task, index, isDragging, projects, onComplete, onDelete, onUpdate, onMoveToTop, dragHandleProps }: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [showConfetti, setShowConfetti] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtasks, setSubtasks] = useState<Tables<"subtasks">[]>(task.subtasks || []);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [showSubtaskDropdown, setShowSubtaskDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [highlighted, setHighlighted] = useState(!!(task as any).is_highlighted);
  const [difficulty, setDifficulty] = useState<number>((task as any).difficulty ?? 0);
  const [descExpanded, setDescExpanded] = useState(false);
  const [hasClipboard, setHasClipboard] = useState(!!subtaskClipboard);
  const [pastingSubtasks, setPastingSubtasks] = useState(false);

  // Listen for clipboard changes
  useEffect(() => {
    const listener = () => setHasClipboard(!!subtaskClipboard);
    clipboardListeners.add(listener);
    return () => { clipboardListeners.delete(listener); };
  }, []);

  const handleCopySubtasks = () => {
    if (subtasks.length === 0) return;
    setSubtaskClipboard({ titles: subtasks.map(s => s.title) });
    toast.success(`${subtasks.length} subtask(s) copiadas`);
  };

  const handlePasteSubtasks = async () => {
    if (!subtaskClipboard || pastingSubtasks) return;
    setPastingSubtasks(true);
    const startPos = subtasks.length;
    const inserts = subtaskClipboard.titles.map((title, i) => ({
      task_id: task.id,
      title,
      position: startPos + i,
    }));
    const { data, error } = await supabase.from("subtasks").insert(inserts).select();
    if (error) { toast.error("Falha ao colar subtasks"); }
    else if (data) {
      setSubtasks(prev => [...prev, ...data]);
      subtaskCache.delete(task.id);
      toast.success(`${data.length} subtask(s) coladas`);
    }
    setPastingSubtasks(false);
  };

  const handleToggleHighlight = async () => {
    const newVal = !highlighted;
    setHighlighted(newVal);
    await supabase.from("tasks").update({ is_highlighted: newVal } as any).eq("id", task.id);
    if (newVal && index > 0 && onMoveToTop) {
      onMoveToTop(task.id);
    }
  };

  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const descDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setTitle(task.title); }, [task.title]);
  useEffect(() => { setDescription(task.description || ""); }, [task.description]);
  useEffect(() => { if (task.subtasks) setSubtasks(task.subtasks); }, [task.subtasks]);

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.is_completed;
  const completedSubtasks = subtasks.filter(s => s.is_completed).length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const fetchSubtasks = useCallback(async () => {
    const cached = subtaskCache.get(task.id);
    if (cached) { setSubtasks(cached); return; }
    setLoadingSubtasks(true);
    try {
      const { data, error } = await supabase.from("subtasks").select("*").eq("task_id", task.id).order("position");
      if (error) throw error;
      if (data) { setSubtasks(data); subtaskCache.set(task.id, data); }
    } catch { toast.error("Falha ao carregar subtasks"); }
    setLoadingSubtasks(false);
  }, [task.id]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && subtasks.length === 0 && !task.subtasks?.length) fetchSubtasks();
  };

  const handleToggleSubtaskDropdown = () => {
    const next = !showSubtaskDropdown;
    setShowSubtaskDropdown(next);
    if (next && subtasks.length === 0 && !task.subtasks?.length) fetchSubtasks();
  };

  // Title editing
  const debouncedSaveTitle = useCallback((newTitle: string) => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      if (newTitle !== task.title && newTitle.trim()) {
        setSaving(true);
        await supabase.from("tasks").update({ title: newTitle.trim() }).eq("id", task.id);
        setSaving(false);
      }
    }, 800);
  }, [task.id, task.title]);

  const handleTitleChange = (val: string) => { setTitle(val); debouncedSaveTitle(val); };
  const handleTitleBlur = () => {
    setIsEditing(false);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (title.trim() && title !== task.title) {
      setSaving(true);
      supabase.from("tasks").update({ title: title.trim() }).eq("id", task.id).then(() => { setSaving(false); onUpdate(); });
    }
  };

  // Description editing
  const debouncedSaveDesc = useCallback((newDesc: string) => {
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    descDebounceRef.current = setTimeout(async () => {
      const val = newDesc.trim() || null;
      if (val !== task.description) {
        setSaving(true);
        await supabase.from("tasks").update({ description: val }).eq("id", task.id);
        setSaving(false);
      }
    }, 800);
  }, [task.id, task.description]);

  const handleDescChange = (val: string) => { setDescription(val); debouncedSaveDesc(val); };
  const handleDescBlur = () => {
    setIsEditingDesc(false);
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    const val = description.trim() || null;
    if (val !== task.description) {
      setSaving(true);
      supabase.from("tasks").update({ description: val }).eq("id", task.id).then(() => { setSaving(false); onUpdate(); });
    }
  };

  // Project change
  const handleProjectChange = async (newProjectId: string) => {
    const pid = newProjectId === "none" ? null : newProjectId;
    setSaving(true);
    const { error } = await supabase.from("tasks").update({ project_id: pid }).eq("id", task.id);
    if (error) toast.error("Falha ao alterar projeto");
    setSaving(false);
    onUpdate();
  };

  // Deadline change
  const handleDeadlineChange = async (date: Date | undefined) => {
    const deadlineStr = date ? format(date, "yyyy-MM-dd") : null;
    setSaving(true);
    const { error } = await supabase.from("tasks").update({ deadline: deadlineStr }).eq("id", task.id);
    if (error) toast.error("Falha ao alterar prazo");
    setSaving(false);
    onUpdate();
  };

  // Subtask operations
  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, is_completed: !completed } : s));
    subtaskCache.delete(task.id);
    const { error } = await supabase.from("subtasks").update({ is_completed: !completed }).eq("id", subtaskId);
    if (error) {
      toast.error("Falha ao atualizar subtask");
      setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, is_completed: completed } : s));
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    const position = subtasks.length;
    const { data, error } = await supabase.from("subtasks").insert({ task_id: task.id, title: newSubtaskTitle.trim(), position }).select().single();
    if (error) { toast.error("Falha ao adicionar subtask"); }
    else if (data) { setSubtasks(prev => [...prev, data]); subtaskCache.delete(task.id); }
    setNewSubtaskTitle("");
    setAddingSubtask(false);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const prev = subtasks;
    setSubtasks(s => s.filter(x => x.id !== subtaskId));
    subtaskCache.delete(task.id);
    const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
    if (error) { toast.error("Falha ao excluir subtask"); setSubtasks(prev); }
  };

  const handleEditSubtask = (sub: Tables<"subtasks">) => {
    setEditingSubtaskId(sub.id);
    setEditingSubtaskTitle(sub.title);
  };

  const handleSaveSubtaskTitle = async (subtaskId: string) => {
    setEditingSubtaskId(null);
    if (!editingSubtaskTitle.trim()) return;
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, title: editingSubtaskTitle.trim() } : s));
    subtaskCache.delete(task.id);
    await supabase.from("subtasks").update({ title: editingSubtaskTitle.trim() }).eq("id", subtaskId);
  };

  // Completion with celebration — double-click protection
  const handleComplete = useCallback(() => {
    if (completing) return;
    setShowConfetti(true);
    setCompleting(true);
    playCompletionSound();
    const msg = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
    toast.success(msg);
    setTimeout(() => {
      onComplete(task.id);
    }, 700);
  }, [task.id, onComplete, completing]);

  const handleDelete = useCallback(() => {
    if (confirmDelete) {
      setConfirmDelete(false);
      onDelete(task.id);
    } else {
      setConfirmDelete(true);
      // Auto-dismiss confirmation after 3 seconds
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }, [task.id, onDelete, confirmDelete]);

  const daysUntilDeadline = task.deadline
    ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const projectColor = task.project?.color || "hsl(var(--primary))";

  return (
    <AnimatePresence>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={completing
          ? { scale: [1, 1.02, 0.95], x: [0, 0, 200], opacity: [1, 1, 0] }
          : { opacity: 1, y: 0, scale: isDragging ? 1.03 : 1 }
        }
        transition={completing
          ? { duration: 0.7, ease: "easeInOut" }
          : { duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }
        }
        className={`relative overflow-visible transition-all duration-300 group ${
          isDragging ? "shadow-2xl z-50 ring-2 ring-primary/30" : ""
        } ${highlighted ? "task-highlighted" : ""}`}
      >
        <div
          className="rounded-xl overflow-hidden relative"
          style={{
            background: highlighted
              ? "linear-gradient(145deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.03), hsl(var(--card)))"
              : "var(--glass-bg)",
            border: `1px solid ${highlighted ? "transparent" : "hsl(var(--primary) / 0.08)"}`,
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Full-screen confetti */}
          {showConfetti && <ConfettiExplosion count={40} fullScreen />}

          {/* Completion flash */}
          <AnimatePresence>
            {completing && (
              <motion.div
                className="absolute inset-0 z-40 pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.4, 0] }}
                transition={{ duration: 0.6 }}
                style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent)" }}
              />
            )}
          </AnimatePresence>

          {/* Left accent bar */}
          <motion.div
            className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
            style={{
              background: task.project
                ? `linear-gradient(180deg, ${projectColor}, ${projectColor}80)`
                : "var(--gradient-primary)",
            }}
            initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
            transition={{ duration: 0.4, delay: index * 0.05 }}
          />

          {/* Main row — compact single line */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 py-1 pl-2.5 sm:pl-3.5">
            <div
              {...dragHandleProps}
              className="flex-shrink-0 cursor-grab touch-none active:cursor-grabbing"
              title="Drag task"
            >
              <GripVertical className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors" />
            </div>

            {/* Position badge */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="flex items-center justify-center min-w-[24px] sm:min-w-[28px] h-6 sm:h-7 rounded-md font-mono text-[10px] sm:text-xs font-bold bg-secondary/60 text-muted-foreground"
            >
              <span className="relative z-10">#{index + 1}</span>
            </motion.div>

            {/* Complete button */}
            <motion.button
              onClick={handleComplete}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
              className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center hover:border-success transition-all flex-shrink-0 group/btn relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(45,190,160,0.1))" }}
                initial={{ scale: 0 }} whileHover={{ scale: 1 }}
              />
              <Check className="w-3.5 h-3.5 text-transparent group-hover/btn:text-success transition-colors relative z-10" />
            </motion.button>

            {/* Title + Description preview */}
            <div className="flex-1 min-w-0">
              {isEditing ? (
                <input
                  autoFocus value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleBlur();
                    if (e.key === "Escape") { setTitle(task.title); setIsEditing(false); }
                  }}
                  className="w-full bg-transparent text-foreground text-base font-bold outline-none border-b-2 border-primary/50 pb-0.5"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span onClick={() => setIsEditing(true)} className="text-sm sm:text-base text-foreground cursor-text truncate hover:text-primary transition-colors font-bold">
                    {task.title}
                  </span>
                  <span className="text-[9px] text-muted-foreground/50 font-mono flex-shrink-0 hidden sm:inline">{getTaskAge(task.created_at)}</span>
                </div>
              )}
              {task.description && !isEditing && (
                <div className="mt-0.5">
                  <span
                    className={`text-[11px] sm:text-xs text-muted-foreground/60 leading-tight ${descExpanded ? "whitespace-pre-wrap" : "truncate block"}`}
                  >
                    {descExpanded ? task.description : task.description}
                  </span>
                  {task.description.length > 80 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDescExpanded(!descExpanded); }}
                      className="text-[10px] text-primary/60 hover:text-primary transition-colors font-medium ml-1"
                    >
                      {descExpanded ? "ver menos" : "ver mais"}
                    </button>
                  )}
                </div>
              )}
            </div>

            {saving && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center text-xs text-primary/60">
                <Loader2 className="w-3 h-3 animate-spin" />
              </motion.div>
            )}

            {/* Project badge */}
            {task.project ? (
              <motion.span
                whileHover={{ scale: 1.08 }}
                className="text-[10px] sm:text-xs font-bold px-2 py-0.5 sm:py-1 rounded-md flex-shrink-0 cursor-default hidden sm:inline-flex"
                style={{
                  background: `linear-gradient(135deg, ${task.project.color}20, ${task.project.color}08)`,
                  color: task.project.color,
                  border: `1px solid ${task.project.color}25`,
                }}
              >
                {task.project.name}
              </motion.span>
            ) : (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 bg-secondary/40 text-muted-foreground/60 border border-border/30 hidden sm:inline-flex">
                Sem projeto
              </span>
            )}

            {/* Deadline badge */}
            {task.deadline && (
              <span
                className={`text-[10px] font-mono flex-shrink-0 items-center gap-1 px-2 py-0.5 rounded-md hidden sm:flex ${
                  isOverdue
                    ? "text-destructive bg-destructive/10 border border-destructive/20"
                    : daysUntilDeadline !== null && daysUntilDeadline <= 2
                      ? "text-yellow-400 bg-yellow-400/10 border border-yellow-400/15"
                      : "text-muted-foreground bg-secondary/50 border border-border/20"
                }`}
              >
                {isOverdue ? (
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
                    <AlertTriangle className="w-3 h-3" />
                  </motion.div>
                ) : <Clock className="w-3 h-3" />}
                {isOverdue && <span className="text-[9px] font-bold mr-0.5">Atrasada</span>}
                {new Date(task.deadline).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })}
              </span>
            )}

            {/* Subtask dropdown button */}
            {totalSubtasks > 0 && (
              <motion.button
                onClick={handleToggleSubtaskDropdown}
                whileHover={{ scale: 1.1 }}
                className="flex items-center gap-1 flex-shrink-0 px-1.5 py-0.5 rounded-md hover:bg-primary/10 transition-colors"
              >
                <motion.div animate={{ rotate: showSubtaskDropdown ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </motion.div>
                <span className="text-[10px] font-mono text-muted-foreground">{completedSubtasks}/{totalSubtasks}</span>
              </motion.button>
            )}

            {/* Edit expand button */}
            <motion.button
              onClick={handleExpand}
              whileHover={{ scale: 1.15, backgroundColor: "rgba(14,165,195,0.08)" }}
              className="text-muted-foreground hover:text-foreground transition-all flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md"
              title="Editar detalhes"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </motion.button>

            {/* Difficulty selector */}
            <div className="flex items-center flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ opacity: difficulty > 0 ? 1 : undefined }}>
              {[1, 2, 3].map(level => (
                <motion.button
                  key={level}
                  onClick={async (e) => {
                    e.stopPropagation();
                    const newVal = difficulty === level ? 0 : level;
                    setDifficulty(newVal);
                    await supabase.from("tasks").update({ difficulty: newVal } as any).eq("id", task.id);
                  }}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.85 }}
                  className={`w-4 h-4 sm:w-[18px] sm:h-[18px] flex items-center justify-center transition-colors ${
                    level <= difficulty ? "text-orange-400" : "text-muted-foreground/15 hover:text-orange-400/40"
                  }`}
                  title={`Dificuldade ${level}`}
                >
                  <Zap className={`w-3 h-3 ${level <= difficulty ? "fill-orange-400" : ""}`} />
                </motion.button>
              ))}
            </div>

            {/* Highlight toggle */}
            <motion.button
              onClick={handleToggleHighlight}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              className={`flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md transition-all ${
                highlighted
                  ? "text-amber-400"
                  : "text-muted-foreground/20 hover:text-amber-400/60 opacity-0 group-hover:opacity-100"
              }`}
              title={highlighted ? "Remover destaque" : "Destacar task"}
            >
              <Star className={`w-3.5 h-3.5 ${highlighted ? "fill-amber-400" : ""}`} />
            </motion.button>


            {confirmDelete ? (
              <motion.button
                onClick={handleDelete}
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="text-destructive text-[10px] font-bold px-2 py-0.5 rounded-md bg-destructive/10 border border-destructive/20 flex-shrink-0"
              >
                Confirmar?
              </motion.button>
            ) : (
              <motion.button
                onClick={handleDelete}
                whileHover={{ scale: 1.15, backgroundColor: "rgba(239,68,68,0.08)" }}
                className="text-muted-foreground/20 hover:text-destructive transition-all flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>

          {/* Subtask dropdown panel — appears below the card row */}
          <AnimatePresence>
            {showSubtaskDropdown && totalSubtasks > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="px-3 sm:px-5 pb-3 pt-1 border-t border-border/10" style={{ background: "rgba(14,165,195,0.02)" }}>
                  {/* Progress bar + copy/paste */}
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <motion.button
                        onClick={handleCopySubtasks}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all"
                        title="Copiar subtasks"
                      >
                        <Copy className="w-3 h-3" />
                      </motion.button>
                      {hasClipboard && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          onClick={handlePasteSubtasks}
                          disabled={pastingSubtasks}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-30"
                          title="Colar subtasks"
                        >
                          {pastingSubtasks ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardPaste className="w-3 h-3" />}
                        </motion.button>
                      )}
                    </div>
                    <div className="flex-1 h-1.5 bg-secondary/60 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background: subtaskProgress === 100
                            ? "linear-gradient(90deg, hsl(var(--success)), hsl(172 66% 45%))"
                            : "var(--gradient-primary)",
                        }}
                        initial={{ width: 0 }} animate={{ width: `${subtaskProgress}%` }}
                        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono">{completedSubtasks}/{totalSubtasks}</span>
                  </div>

                  {/* Subtask list */}
                  {subtasks.map((sub, si) => (
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: si * 0.03 }}
                      className="flex items-center gap-2.5 group/sub py-1 px-2 rounded-md hover:bg-primary/[0.04] transition-all"
                    >
                      <motion.button
                        whileTap={{ scale: 0.8 }}
                        onClick={() => handleSubtaskToggle(sub.id, sub.is_completed)}
                        className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 ${
                          sub.is_completed
                            ? "border-success bg-success/20"
                            : "border-muted-foreground/25 group-hover/sub:border-primary"
                        }`}
                      >
                        {sub.is_completed && <Check className="w-2.5 h-2.5 text-success" />}
                      </motion.button>

                      {editingSubtaskId === sub.id ? (
                        <input
                          autoFocus
                          value={editingSubtaskTitle}
                          onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                          onBlur={() => handleSaveSubtaskTitle(sub.id)}
                          onKeyDown={(e) => e.key === "Enter" && handleSaveSubtaskTitle(sub.id)}
                          className="flex-1 bg-transparent text-xs text-foreground outline-none border-b border-primary/30 pb-0.5"
                        />
                      ) : (
                        <span
                          onClick={() => handleEditSubtask(sub)}
                          className={`text-xs transition-all flex-1 cursor-text hover:text-primary ${
                            sub.is_completed ? "line-through text-muted-foreground/40" : "text-foreground"
                          }`}
                        >
                          {sub.title}
                        </span>
                      )}

                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </motion.div>
                  ))}

                  {/* Add subtask inline */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Input
                      value={newSubtaskTitle}
                      onChange={(e) => setNewSubtaskTitle(e.target.value)}
                      placeholder="Add subtask..."
                      className="bg-secondary/40 border-border/30 h-7 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask())}
                    />
                    <motion.button
                      onClick={handleAddSubtask}
                      disabled={!newSubtaskTitle.trim() || addingSubtask}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      className="w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-30 flex-shrink-0"
                    >
                      {addingSubtask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded edit content */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="px-3 sm:px-5 pb-4 pt-2 border-t border-border/15 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

                  {/* Description */}
                  <div className="mb-3 relative z-10">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">Description</span>
                    {isEditingDesc ? (
                      <textarea
                        autoFocus value={description}
                        onChange={(e) => handleDescChange(e.target.value)}
                        onBlur={handleDescBlur}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleDescBlur(); }
                          if (e.key === "Escape") { setDescription(task.description || ""); setIsEditingDesc(false); }
                        }}
                        className="w-full bg-secondary/40 text-sm text-foreground rounded-lg p-2.5 outline-none border border-primary/20 min-h-[50px] resize-none"
                        placeholder="Add a description... (Enter to save, Shift+Enter for new line)"
                      />
                    ) : (
                      <p onClick={() => setIsEditingDesc(true)} className="text-sm text-muted-foreground leading-relaxed cursor-text hover:text-foreground transition-colors min-h-[20px] p-1.5 rounded-md hover:bg-secondary/30">
                        {task.description || "Click to add description..."}
                      </p>
                    )}
                  </div>

                  {/* Project selector */}
                  <div className="mb-3 relative z-10">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">Project</span>
                    <Select value={task.project_id || "none"} onValueChange={handleProjectChange}>
                      <SelectTrigger className="bg-secondary/40 border-border/30 h-8 text-sm w-full max-w-xs">
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                        <SelectItem value="none"><span className="text-muted-foreground">No project</span></SelectItem>
                        {projects.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                              {p.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Deadline editor */}
                  <div className="mb-3 relative z-10">
                    <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-1.5 block">Deadline</span>
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-secondary/40 border border-border/30 text-sm hover:border-primary/30 transition-colors">
                            <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                            {task.deadline
                              ? new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : <span className="text-muted-foreground/50">Set deadline</span>}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                          <Calendar
                            mode="single"
                            selected={task.deadline ? new Date(task.deadline) : undefined}
                            onSelect={handleDeadlineChange}
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                      {task.deadline && (
                        <motion.button
                          onClick={() => handleDeadlineChange(undefined)}
                          whileHover={{ scale: 1.1 }}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>
                  </div>

                  {/* Subtasks in expanded view */}
                  <div className="space-y-1.5 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-primary/50" />
                        Subtasks
                      </span>
                      <div className="flex items-center gap-1 ml-auto">
                        {subtasks.length > 0 && (
                          <motion.button
                            onClick={handleCopySubtasks}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all"
                            title="Copiar subtasks"
                          >
                            <Copy className="w-3 h-3" />
                          </motion.button>
                        )}
                        {hasClipboard && (
                          <motion.button
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={handlePasteSubtasks}
                            disabled={pastingSubtasks}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all disabled:opacity-30"
                            title="Colar subtasks"
                          >
                            {pastingSubtasks ? <Loader2 className="w-3 h-3 animate-spin" /> : <ClipboardPaste className="w-3 h-3" />}
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {loadingSubtasks && (
                      <div className="space-y-1.5">
                        <Skeleton className="h-7 w-full" />
                        <Skeleton className="h-7 w-3/4" />
                      </div>
                    )}

                    {!loadingSubtasks && subtasks.map((sub, si) => (
                      <motion.div
                        key={sub.id}
                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: si * 0.05 }}
                        className="flex items-center gap-2.5 group/sub py-1.5 px-2 rounded-md hover:bg-primary/[0.04] transition-all"
                      >
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => handleSubtaskToggle(sub.id, sub.is_completed)}
                          className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 ${
                            sub.is_completed
                              ? "border-success bg-success/20"
                              : "border-muted-foreground/25 group-hover/sub:border-primary"
                          }`}
                          style={sub.is_completed ? { boxShadow: "0 0 8px rgba(16,185,129,0.3)" } : {}}
                        >
                          {sub.is_completed && <Check className="w-2.5 h-2.5 text-success" />}
                        </motion.button>

                        {editingSubtaskId === sub.id ? (
                          <input
                            autoFocus
                            value={editingSubtaskTitle}
                            onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                            onBlur={() => handleSaveSubtaskTitle(sub.id)}
                            onKeyDown={(e) => e.key === "Enter" && handleSaveSubtaskTitle(sub.id)}
                            className="flex-1 bg-transparent text-xs text-foreground outline-none border-b border-primary/30 pb-0.5"
                          />
                        ) : (
                          <span
                            onClick={() => handleEditSubtask(sub)}
                            className={`text-xs transition-all flex-1 cursor-text hover:text-primary ${
                              sub.is_completed ? "line-through text-muted-foreground/40" : "text-foreground"
                            }`}
                          >
                            {sub.title}
                          </span>
                        )}

                        <button
                          onClick={() => handleDeleteSubtask(sub.id)}
                          className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}

                    {/* Add subtask */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Input
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        placeholder="Add subtask..."
                        className="bg-secondary/40 border-border/30 h-7 text-xs"
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask())}
                      />
                      <motion.button
                        onClick={handleAddSubtask}
                        disabled={!newSubtaskTitle.trim() || addingSubtask}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-30 flex-shrink-0"
                      >
                        {addingSubtask ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default TaskCard;
