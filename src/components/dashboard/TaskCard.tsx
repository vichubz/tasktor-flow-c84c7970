import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, GripVertical, ChevronRight, Flame, AlertTriangle, Clock, Sparkles, Plus, X, Loader2, CalendarIcon } from "lucide-react";
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

type Task = Tables<"tasks"> & { subtasks?: Tables<"subtasks">[], project?: Tables<"projects"> };
type Project = Tables<"projects">;

interface TaskCardProps {
  task: Task;
  index: number;
  isTop3: boolean;
  isDragging: boolean;
  projects: Project[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  dragHandleProps?: any;
}

const SUCCESS_MESSAGES = [
  "Tarefa concluída! Mandou bem! 🎉",
  "Mais uma pra conta! Continue assim! 🚀",
  "Feito! Você tá voando hoje! ✈️",
  "Concluída! Foco total! 🎯",
  "Boa! Próxima! ⚡",
];

function getTaskAge(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffDays === 0) return "Criada hoje";
  if (diffDays === 1) return "Criada há 1 dia";
  if (diffDays < 7) return `Criada há ${diffDays} dias`;
  if (diffWeeks === 1) return "Criada há 1 semana";
  if (diffWeeks < 4) return `Criada há ${diffWeeks} semanas`;
  if (diffMonths === 1) return "Criada há 1 mês";
  return `Criada há ${diffMonths} meses`;
}

// Cache for subtasks
const subtaskCache = new Map<string, Tables<"subtasks">[]>();

const TaskCard = ({ task, index, isTop3, isDragging, projects, onComplete, onDelete, onUpdate, dragHandleProps }: TaskCardProps) => {
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

  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const descDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const subtaskDebounceRef = useRef<NodeJS.Timeout | null>(null);

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
    } catch { toast.error("Erro ao carregar subtarefas"); }
    setLoadingSubtasks(false);
  }, [task.id]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
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
    if (error) toast.error("Erro ao alterar projeto");
    setSaving(false);
    onUpdate();
  };

  // Deadline change
  const handleDeadlineChange = async (date: Date | undefined) => {
    const deadlineStr = date ? format(date, "yyyy-MM-dd") : null;
    setSaving(true);
    const { error } = await supabase.from("tasks").update({ deadline: deadlineStr }).eq("id", task.id);
    if (error) toast.error("Erro ao alterar prazo");
    setSaving(false);
    onUpdate();
  };

  // Subtask operations
  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, is_completed: !completed } : s));
    subtaskCache.delete(task.id);
    const { error } = await supabase.from("subtasks").update({ is_completed: !completed }).eq("id", subtaskId);
    if (error) {
      toast.error("Erro ao atualizar subtarefa");
      setSubtasks(prev => prev.map(s => s.id === subtaskId ? { ...s, is_completed: completed } : s));
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtaskTitle.trim()) return;
    setAddingSubtask(true);
    const position = subtasks.length;
    const { data, error } = await supabase.from("subtasks").insert({ task_id: task.id, title: newSubtaskTitle.trim(), position }).select().single();
    if (error) { toast.error("Erro ao adicionar subtarefa"); }
    else if (data) { setSubtasks(prev => [...prev, data]); subtaskCache.delete(task.id); }
    setNewSubtaskTitle("");
    setAddingSubtask(false);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const prev = subtasks;
    setSubtasks(s => s.filter(x => x.id !== subtaskId));
    subtaskCache.delete(task.id);
    const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
    if (error) { toast.error("Erro ao excluir subtarefa"); setSubtasks(prev); }
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

  // Completion with celebration
  const handleComplete = useCallback(() => {
    setShowConfetti(true);
    setCompleting(true);
    const msg = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)];
    toast.success(msg);
    setTimeout(() => {
      onComplete(task.id);
    }, 700);
  }, [task.id, onComplete]);

  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [task.id, onDelete]);

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
        className={`relative rounded-xl overflow-hidden transition-all duration-300 group ${
          isDragging ? "shadow-2xl z-50 ring-2 ring-primary/30" : ""
        } ${isTop3 ? "top3-card" : "task-card-hover"}`}
        style={{
          background: isTop3
            ? "linear-gradient(145deg, rgba(14,165,195,0.08), rgba(45,190,160,0.04), rgba(8,18,22,0.85))"
            : "var(--glass-bg)",
          border: `1px solid ${isTop3 ? "transparent" : "rgba(14,165,195,0.08)"}`,
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

        {/* Hover shimmer */}
        <motion.div
          className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ transform: "skewX(-12deg)" }}
        />

        {/* Main row */}
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 pl-4 sm:pl-6">
          <div
            {...dragHandleProps}
            className="flex-shrink-0 cursor-grab touch-none active:cursor-grabbing"
            title="Arrastar tarefa"
          >
            <GripVertical className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors" />
          </div>

          {/* Position badge */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 3 }}
            className={`flex items-center justify-center min-w-[28px] sm:min-w-[36px] h-7 sm:h-9 rounded-lg font-mono text-xs sm:text-sm font-bold relative overflow-hidden ${
              isTop3 ? "text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
            }`}
            style={isTop3 ? { background: "var(--gradient-primary)", boxShadow: "0 0 16px rgba(14,165,195,0.3)" } : {}}
          >
            {isTop3 && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ["-200%", "200%"] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              />
            )}
            <span className="relative z-10">#{index + 1}</span>
          </motion.div>

          {isTop3 && (
            <motion.div animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }} className="hidden sm:block">
              <Flame className="w-5 h-5 text-primary flex-shrink-0 drop-shadow-[0_0_8px_rgba(14,165,195,0.6)]" />
            </motion.div>
          )}

          {/* Complete button */}
          <div className="relative">
            <motion.button
              onClick={handleComplete}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.85 }}
              className="w-8 h-8 rounded-full border-2 border-muted-foreground/20 flex items-center justify-center hover:border-success transition-all flex-shrink-0 group/btn relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(45,190,160,0.1))" }}
                initial={{ scale: 0 }} whileHover={{ scale: 1 }}
              />
              <Check className="w-4 h-4 text-transparent group-hover/btn:text-success transition-colors relative z-10" />
            </motion.button>
          </div>

          {/* Title + description */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                autoFocus value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
                className="w-full bg-transparent text-foreground text-base outline-none border-b-2 border-primary/50 pb-0.5"
              />
            ) : (
              <span onClick={() => setIsEditing(true)} className="text-base text-foreground cursor-text truncate block hover:text-primary transition-colors font-semibold" style={{ textShadow: isTop3 ? "0 0 20px rgba(14,165,195,0.1)" : undefined }}>
                {task.title}
              </span>
            )}
            {task.description && !expanded && (
              <p className="text-xs text-muted-foreground/80 truncate mt-0.5">{task.description}</p>
            )}
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-muted-foreground/40" />
              <span className="text-[10px] text-muted-foreground/50">{getTaskAge(task.created_at)}</span>
            </div>
          </div>

          {saving && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 text-xs text-primary/60">
              <Loader2 className="w-3 h-3 animate-spin" />
            </motion.div>
          )}

          {totalSubtasks > 0 && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-20 h-2.5 bg-secondary/60 rounded-full overflow-hidden relative">
                <motion.div
                  className="h-full rounded-full relative overflow-hidden"
                  style={{
                    background: subtaskProgress === 100
                      ? "linear-gradient(90deg, hsl(var(--success)), hsl(172 66% 45%))"
                      : "var(--gradient-primary)",
                  }}
                  initial={{ width: 0 }} animate={{ width: `${subtaskProgress}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                </motion.div>
              </div>
              <span className="text-xs text-muted-foreground font-mono">{completedSubtasks}/{totalSubtasks}</span>
            </div>
          )}

          {task.project ? (
            <motion.span
              whileHover={{ scale: 1.08, y: -1 }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg flex-shrink-0 cursor-default relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, ${task.project.color}20, ${task.project.color}08)`,
                color: task.project.color,
                border: `1px solid ${task.project.color}25`,
                boxShadow: `0 0 16px ${task.project.color}12`,
              }}
            >
              {task.project.name}
            </motion.span>
          ) : (
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0 bg-secondary/40 text-muted-foreground/60 border border-border/30">
              Sem projeto
            </span>
          )}

          {task.deadline && (
            <motion.span
              whileHover={{ scale: 1.05 }}
              className={`text-xs font-mono flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ${
                isOverdue
                  ? "text-destructive bg-destructive/10 border border-destructive/20"
                  : daysUntilDeadline !== null && daysUntilDeadline <= 2
                    ? "text-yellow-400 bg-yellow-400/10 border border-yellow-400/15"
                    : "text-muted-foreground bg-secondary/50 border border-border/20"
              }`}
            >
              {isOverdue ? (
                <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 0.5, repeat: Infinity }}>
                  <AlertTriangle className="w-3.5 h-3.5" />
                </motion.div>
              ) : <Clock className="w-3.5 h-3.5" />}
              {isOverdue && <span className="text-[10px] font-bold mr-1">Atrasado</span>}
              {new Date(task.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
            </motion.span>
          )}

          <motion.button
            onClick={handleExpand}
            whileHover={{ scale: 1.15, backgroundColor: "rgba(14,165,195,0.08)" }}
            className="text-muted-foreground hover:text-foreground transition-all flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
          >
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          </motion.button>

          <motion.button
            onClick={handleDelete}
            whileHover={{ scale: 1.15, backgroundColor: "rgba(239,68,68,0.08)" }}
            className="text-muted-foreground/20 hover:text-destructive transition-all flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 pt-2 ml-[76px] border-t border-border/15 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />

                    {/* Description */}
                    <div className="mb-4 relative z-10">
                      <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Descrição</span>
                      {isEditingDesc ? (
                        <textarea
                          autoFocus value={description}
                          onChange={(e) => handleDescChange(e.target.value)}
                          onBlur={handleDescBlur}
                          className="w-full bg-secondary/40 text-sm text-foreground rounded-lg p-3 outline-none border border-primary/20 min-h-[60px] resize-none"
                          placeholder="Adicione uma descrição..."
                        />
                      ) : (
                        <p onClick={() => setIsEditingDesc(true)} className="text-sm text-muted-foreground leading-relaxed cursor-text hover:text-foreground transition-colors min-h-[24px] p-2 rounded-lg hover:bg-secondary/30">
                          {task.description || "Clique para adicionar descrição..."}
                        </p>
                      )}
                    </div>

                    {/* Project selector */}
                    <div className="mb-4 relative z-10">
                      <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Projeto</span>
                      <Select value={task.project_id || "none"} onValueChange={handleProjectChange}>
                        <SelectTrigger className="bg-secondary/40 border-border/30 h-9 text-sm w-full max-w-xs">
                          <SelectValue placeholder="Selecionar projeto" />
                        </SelectTrigger>
                        <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                          <SelectItem value="none"><span className="text-muted-foreground">Sem projeto</span></SelectItem>
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
                    <div className="mb-4 relative z-10">
                      <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2 block">Prazo</span>
                      <div className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary/40 border border-border/30 text-sm hover:border-primary/30 transition-colors">
                              <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                              {task.deadline
                                ? new Date(task.deadline).toLocaleDateString("pt-BR")
                                : <span className="text-muted-foreground/50">Adicionar prazo</span>}
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
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </motion.button>
                        )}
                      </div>
                    </div>

                    {/* Subtasks */}
                    <div className="space-y-2 relative z-10">
                      <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-3 h-3 text-primary/50" />
                        Subtarefas
                      </span>

                      {loadingSubtasks && (
                        <div className="space-y-2">
                          <Skeleton className="h-8 w-full" />
                          <Skeleton className="h-8 w-3/4" />
                        </div>
                      )}

                      {!loadingSubtasks && subtasks.map((sub, si) => (
                        <motion.div
                          key={sub.id}
                          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: si * 0.05 }}
                          className="flex items-center gap-3 group/sub py-2 px-3 rounded-lg hover:bg-primary/[0.04] transition-all"
                        >
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => handleSubtaskToggle(sub.id, sub.is_completed)}
                            className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                              sub.is_completed
                                ? "border-success bg-success/20"
                                : "border-muted-foreground/25 group-hover/sub:border-primary"
                            }`}
                            style={sub.is_completed ? { boxShadow: "0 0 10px rgba(16,185,129,0.3)" } : {}}
                          >
                            {sub.is_completed && <Check className="w-3 h-3 text-success" />}
                          </motion.button>

                          {editingSubtaskId === sub.id ? (
                            <input
                              autoFocus
                              value={editingSubtaskTitle}
                              onChange={(e) => setEditingSubtaskTitle(e.target.value)}
                              onBlur={() => handleSaveSubtaskTitle(sub.id)}
                              onKeyDown={(e) => e.key === "Enter" && handleSaveSubtaskTitle(sub.id)}
                              className="flex-1 bg-transparent text-sm text-foreground outline-none border-b border-primary/30 pb-0.5"
                            />
                          ) : (
                            <span
                              onClick={() => handleEditSubtask(sub)}
                              className={`text-sm transition-all flex-1 cursor-text hover:text-primary ${
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
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      ))}

                      {/* Add subtask */}
                      <div className="flex items-center gap-2 mt-2">
                        <Input
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="Adicionar subtarefa..."
                          className="bg-secondary/40 border-border/30 h-8 text-sm"
                          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddSubtask())}
                        />
                        <motion.button
                          onClick={handleAddSubtask}
                          disabled={!newSubtaskTitle.trim() || addingSubtask}
                          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-all disabled:opacity-30 flex-shrink-0"
                        >
                          {addingSubtask ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                        </motion.button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
        </motion.div>
      </AnimatePresence>
  );
};

export default TaskCard;
