import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, GripVertical, ChevronRight, Flame, AlertTriangle, Clock, Sparkles, Plus, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";

type Task = Tables<"tasks"> & { subtasks?: Tables<"subtasks">[], project?: Tables<"projects"> };

interface TaskCardProps {
  task: Task;
  index: number;
  isTop3: boolean;
  isDragging: boolean;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}

const ConfettiParticle = ({ delay, color, angle }: { delay: number; color: string; angle: number }) => {
  const distance = 50 + Math.random() * 70;
  const x = Math.cos(angle) * distance;
  const y = Math.sin(angle) * distance;
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ backgroundColor: color, left: "50%", top: "50%" }}
      initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
      animate={{ scale: [0, 1.8, 0], x, y, opacity: [1, 1, 0] }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    />
  );
};

const CONFETTI_COLORS = [
  "hsl(192 80% 50%)", "hsl(172 66% 50%)", "hsl(160 60% 45%)",
  "hsl(45 93% 47%)", "hsl(339 90% 60%)", "hsl(210 100% 60%)",
];

// Cache for subtasks to avoid refetching
const subtaskCache = new Map<string, Tables<"subtasks">[]>();

const TaskCard = ({ task, index, isTop3, isDragging, onComplete, onDelete, onUpdate }: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [showConfetti, setShowConfetti] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtasks, setSubtasks] = useState<Tables<"subtasks">[]>(task.subtasks || []);
  const [loadingSubtasks, setLoadingSubtasks] = useState(false);

  const titleDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const descDebounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => { setTitle(task.title); }, [task.title]);
  useEffect(() => { setDescription(task.description || ""); }, [task.description]);
  // If subtasks come from props (initial load), use them
  useEffect(() => { if (task.subtasks) setSubtasks(task.subtasks); }, [task.subtasks]);

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.is_completed;
  const completedSubtasks = subtasks.filter(s => s.is_completed).length;
  const totalSubtasks = subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  // Lazy-load subtasks when expanded
  const fetchSubtasks = useCallback(async () => {
    const cached = subtaskCache.get(task.id);
    if (cached) { setSubtasks(cached); return; }
    setLoadingSubtasks(true);
    try {
      const { data, error } = await supabase
        .from("subtasks")
        .select("*")
        .eq("task_id", task.id)
        .order("position");
      if (error) throw error;
      if (data) {
        setSubtasks(data);
        subtaskCache.set(task.id, data);
      }
    } catch {
      toast.error("Erro ao carregar subtarefas");
    }
    setLoadingSubtasks(false);
  }, [task.id]);

  const handleExpand = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && subtasks.length === 0 && !task.subtasks?.length) {
      fetchSubtasks();
    }
  };

  const debouncedSaveTitle = useCallback((newTitle: string) => {
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    titleDebounceRef.current = setTimeout(async () => {
      if (newTitle !== task.title && newTitle.trim()) {
        setSaving(true);
        const { error } = await supabase.from("tasks").update({ title: newTitle.trim() }).eq("id", task.id);
        if (error) toast.error("Erro ao salvar título");
        setSaving(false);
      }
    }, 800);
  }, [task.id, task.title]);

  const debouncedSaveDesc = useCallback((newDesc: string) => {
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    descDebounceRef.current = setTimeout(async () => {
      const val = newDesc.trim() || null;
      if (val !== task.description) {
        setSaving(true);
        const { error } = await supabase.from("tasks").update({ description: val }).eq("id", task.id);
        if (error) toast.error("Erro ao salvar descrição");
        setSaving(false);
      }
    }, 800);
  }, [task.id, task.description]);

  const handleTitleChange = (val: string) => { setTitle(val); debouncedSaveTitle(val); };
  const handleDescChange = (val: string) => { setDescription(val); debouncedSaveDesc(val); };

  const handleTitleBlur = () => {
    setIsEditing(false);
    if (titleDebounceRef.current) clearTimeout(titleDebounceRef.current);
    if (title.trim() && title !== task.title) {
      setSaving(true);
      supabase.from("tasks").update({ title: title.trim() }).eq("id", task.id).then(({ error }) => {
        if (error) toast.error("Erro ao salvar título");
        setSaving(false);
        onUpdate();
      });
    }
  };

  const handleDescBlur = () => {
    setIsEditingDesc(false);
    if (descDebounceRef.current) clearTimeout(descDebounceRef.current);
    const val = description.trim() || null;
    if (val !== task.description) {
      setSaving(true);
      supabase.from("tasks").update({ description: val }).eq("id", task.id).then(({ error }) => {
        if (error) toast.error("Erro ao salvar descrição");
        setSaving(false);
        onUpdate();
      });
    }
  };

  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    // Optimistic update
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
    if (error) {
      toast.error("Erro ao adicionar subtarefa");
    } else if (data) {
      setSubtasks(prev => [...prev, data]);
      subtaskCache.delete(task.id);
    }
    setNewSubtaskTitle("");
    setAddingSubtask(false);
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    const prev = subtasks;
    setSubtasks(s => s.filter(x => x.id !== subtaskId));
    subtaskCache.delete(task.id);
    const { error } = await supabase.from("subtasks").delete().eq("id", subtaskId);
    if (error) {
      toast.error("Erro ao excluir subtarefa");
      setSubtasks(prev);
    }
  };

  const handleComplete = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => onComplete(task.id), 600);
  }, [task.id, onComplete]);

  const confettiParticles = Array.from({ length: 16 }, (_, i) => ({
    delay: Math.random() * 0.15,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    angle: (i / 16) * Math.PI * 2,
  }));

  const daysUntilDeadline = task.deadline
    ? Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const projectColor = task.project?.color || "hsl(var(--primary))";

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: isDragging ? 1.03 : 1 }}
        transition={{ duration: 0.35, delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
        className={`relative rounded-xl overflow-hidden transition-all duration-300 group ${
          isDragging ? "shadow-2xl z-50 ring-2 ring-primary/30" : ""
        } ${isTop3 ? "top3-card" : ""}`}
        style={{
          background: isTop3
            ? `linear-gradient(145deg, rgba(14, 165, 195, 0.08), rgba(45, 190, 160, 0.04), rgba(8, 18, 22, 0.85))`
            : "var(--glass-bg)",
          border: `1px solid ${isTop3 ? "rgba(14, 165, 195, 0.15)" : "var(--glass-border)"}`,
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Left accent bar */}
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
          style={{
            background: task.project
              ? `linear-gradient(180deg, ${projectColor}, ${projectColor}80)`
              : "var(--gradient-primary)",
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.4, delay: index * 0.05 }}
        />

        {/* Hover shimmer */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ transform: "skewX(-12deg)" }}
        />

        {/* Main row */}
        <div className="flex items-center gap-4 px-5 py-4 pl-6">
          <GripVertical className="w-5 h-5 text-muted-foreground/20 flex-shrink-0 cursor-grab hover:text-muted-foreground/50 transition-colors" />

          {/* Position badge */}
          <motion.div
            whileHover={{ scale: 1.1, rotate: 3 }}
            className={`flex items-center justify-center min-w-[36px] h-9 rounded-lg font-mono text-sm font-bold relative overflow-hidden ${
              isTop3 ? "text-primary-foreground" : "bg-secondary/60 text-muted-foreground"
            }`}
            style={isTop3 ? { background: "var(--gradient-primary)" } : {}}
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
            <motion.div
              animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Flame className="w-5 h-5 text-primary flex-shrink-0 drop-shadow-[0_0_8px_rgba(14,165,195,0.6)]" />
            </motion.div>
          )}

          {/* Complete button with confetti */}
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
                initial={{ scale: 0 }}
                whileHover={{ scale: 1 }}
              />
              <Check className="w-4 h-4 text-transparent group-hover/btn:text-success transition-colors relative z-10" />
            </motion.button>
            <AnimatePresence>
              {showConfetti && confettiParticles.map((p, i) => (
                <ConfettiParticle key={i} {...p} />
              ))}
            </AnimatePresence>
          </div>

          {/* Title + description */}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={(e) => e.key === "Enter" && handleTitleBlur()}
                className="w-full bg-transparent text-foreground text-base outline-none border-b-2 border-primary/50 pb-0.5"
              />
            ) : (
              <span
                onClick={() => setIsEditing(true)}
                className="text-base text-foreground cursor-text truncate block hover:text-primary transition-colors font-semibold"
              >
                {task.title}
              </span>
            )}
            {task.description && !expanded && (
              <p className="text-xs text-muted-foreground/60 truncate mt-0.5">{task.description}</p>
            )}
          </div>

          {saving && (
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="flex items-center gap-1 text-xs text-primary/60">
              <Loader2 className="w-3 h-3 animate-spin" />
            </motion.div>
          )}

          {/* Subtask progress */}
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
                  initial={{ width: 0 }}
                  animate={{ width: `${subtaskProgress}%` }}
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

          {/* Project badge */}
          {task.project && (
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
          )}

          {!task.project && (
            <span className="text-xs font-medium px-2.5 py-1 rounded-lg flex-shrink-0 bg-secondary/40 text-muted-foreground/60 border border-border/30">
              Sem projeto
            </span>
          )}

          {/* Deadline */}
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

          {/* Expand */}
          <motion.button
            onClick={handleExpand}
            whileHover={{ scale: 1.15, backgroundColor: "rgba(14,165,195,0.08)" }}
            className="text-muted-foreground hover:text-foreground transition-all flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
          >
            <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronRight className="w-4 h-4" />
            </motion.div>
          </motion.button>

          {/* Delete */}
          <motion.button
            onClick={() => setShowDeleteConfirm(true)}
            whileHover={{ scale: 1.15, backgroundColor: "rgba(239,68,68,0.08)" }}
            className="text-muted-foreground/20 hover:text-destructive transition-all flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg"
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
                      autoFocus
                      value={description}
                      onChange={(e) => handleDescChange(e.target.value)}
                      onBlur={handleDescBlur}
                      className="w-full bg-secondary/40 text-sm text-foreground rounded-lg p-3 outline-none border border-primary/20 min-h-[60px] resize-none"
                      placeholder="Adicione uma descrição..."
                    />
                  ) : (
                    <p
                      onClick={() => setIsEditingDesc(true)}
                      className="text-sm text-muted-foreground leading-relaxed cursor-text hover:text-foreground transition-colors min-h-[24px] p-2 rounded-lg hover:bg-secondary/30"
                    >
                      {task.description || "Clique para adicionar descrição..."}
                    </p>
                  )}
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
                    <motion.label
                      key={sub.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: si * 0.05 }}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-3 cursor-pointer group/sub py-2 px-3 rounded-lg hover:bg-primary/[0.04] transition-all"
                    >
                      <motion.div
                        whileTap={{ scale: 0.8 }}
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                          sub.is_completed
                            ? "border-success bg-success/20"
                            : "border-muted-foreground/25 group-hover/sub:border-primary"
                        }`}
                        style={sub.is_completed ? { boxShadow: "0 0 10px rgba(16,185,129,0.3)" } : {}}
                      >
                        {sub.is_completed && <Check className="w-3 h-3 text-success" />}
                      </motion.div>
                      <input
                        type="checkbox"
                        checked={sub.is_completed}
                        onChange={() => handleSubtaskToggle(sub.id, sub.is_completed)}
                        className="sr-only"
                      />
                      <span className={`text-sm transition-all flex-1 ${
                        sub.is_completed ? "line-through text-muted-foreground/40" : "text-foreground"
                      }`}>
                        {sub.title}
                      </span>
                      <button
                        onClick={(e) => { e.preventDefault(); handleDeleteSubtask(sub.id); }}
                        className="opacity-0 group-hover/sub:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </motion.label>
                  ))}
                  
                  {/* Add subtask inline */}
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
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa "{task.title}" será excluída permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-foreground hover:bg-secondary/80">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete(task.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TaskCard;
