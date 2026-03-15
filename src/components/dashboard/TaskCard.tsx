import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Trash2, GripVertical, ChevronDown, ChevronRight, Flame, AlertTriangle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

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
  "hsl(263 70% 58%)", "hsl(187 92% 42%)", "hsl(160 60% 45%)",
  "hsl(45 93% 47%)", "hsl(339 90% 60%)", "hsl(210 100% 60%)",
];

const TaskCard = ({ task, index, isTop3, isDragging, onComplete, onDelete, onUpdate }: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [showConfetti, setShowConfetti] = useState(false);

  const isOverdue = task.deadline && new Date(task.deadline) < new Date() && !task.is_completed;
  const completedSubtasks = task.subtasks?.filter(s => s.is_completed).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  const handleTitleSave = async () => {
    setIsEditing(false);
    if (title !== task.title) {
      await supabase.from("tasks").update({ title }).eq("id", task.id);
      onUpdate();
    }
  };

  const handleSubtaskToggle = async (subtaskId: string, completed: boolean) => {
    await supabase.from("subtasks").update({ is_completed: !completed }).eq("id", subtaskId);
    onUpdate();
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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, scale: isDragging ? 1.03 : 1 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className={`glass-hover rounded-xl transition-all duration-200 ${
        isDragging ? "shadow-2xl z-50 border-primary/20" : ""
      } ${isTop3 ? "top3-card" : ""}`}
    >
      {/* Main row */}
      <div className="flex items-center gap-4 px-5 py-4">
        {/* Drag handle */}
        <GripVertical className="w-5 h-5 text-muted-foreground/30 flex-shrink-0 cursor-grab hover:text-muted-foreground transition-colors" />

        {/* Position badge */}
        <div className={`flex items-center justify-center min-w-[36px] h-9 rounded-lg font-mono text-sm font-bold ${
          isTop3
            ? "bg-primary/15 text-primary neon-text-primary"
            : "bg-secondary text-muted-foreground"
        }`}>
          #{index + 1}
        </div>

        {isTop3 && (
          <motion.div
            animate={{ rotate: [0, -12, 12, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <Flame className="w-5 h-5 text-primary flex-shrink-0 drop-shadow-[0_0_6px_rgba(124,58,237,0.5)]" />
          </motion.div>
        )}

        {/* Complete button with confetti */}
        <div className="relative">
          <motion.button
            onClick={handleComplete}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            className="w-8 h-8 rounded-full border-2 border-muted-foreground/25 flex items-center justify-center hover:border-success hover:bg-success/10 transition-all flex-shrink-0 group"
          >
            <Check className="w-4 h-4 text-transparent group-hover:text-success transition-colors" />
          </motion.button>
          <AnimatePresence>
            {showConfetti && confettiParticles.map((p, i) => (
              <ConfettiParticle key={i} {...p} />
            ))}
          </AnimatePresence>
        </div>

        {/* Title + description preview */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="w-full bg-transparent text-foreground text-base outline-none border-b-2 border-primary/50 pb-0.5"
            />
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              className="text-base text-foreground cursor-text truncate block hover:text-primary transition-colors font-medium"
            >
              {task.title}
            </span>
          )}
          {task.description && !expanded && (
            <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{task.description}</p>
          )}
        </div>

        {/* Subtask progress bar */}
        {totalSubtasks > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: subtaskProgress === 100
                    ? "hsl(var(--success))"
                    : "var(--gradient-primary)",
                }}
                initial={{ width: 0 }}
                animate={{ width: `${subtaskProgress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
            <span className="text-xs text-muted-foreground font-mono">{completedSubtasks}/{totalSubtasks}</span>
          </div>
        )}

        {/* Project badge */}
        {task.project && (
          <motion.span
            whileHover={{ scale: 1.05 }}
            className="text-xs font-semibold px-2.5 py-1 rounded-lg flex-shrink-0 cursor-default"
            style={{
              backgroundColor: `${task.project.color}18`,
              color: task.project.color,
              boxShadow: `0 0 12px ${task.project.color}15`,
            }}
          >
            {task.project.name}
          </motion.span>
        )}

        {/* Deadline */}
        {task.deadline && (
          <span className={`text-xs font-mono flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-md ${
            isOverdue
              ? "text-destructive bg-destructive/10 animate-pulse"
              : daysUntilDeadline !== null && daysUntilDeadline <= 2
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-muted-foreground bg-secondary/50"
          }`}>
            {isOverdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
            {new Date(task.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        )}

        {/* Expand */}
        <motion.button
          onClick={() => setExpanded(!expanded)}
          whileHover={{ scale: 1.15 }}
          className="text-muted-foreground hover:text-foreground transition-all flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/50"
        >
          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4" />
          </motion.div>
        </motion.button>

        {/* Delete */}
        <motion.button
          onClick={() => onDelete(task.id)}
          whileHover={{ scale: 1.15 }}
          className="text-muted-foreground/30 hover:text-destructive transition-all flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-destructive/10"
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
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-2 ml-[76px] border-t border-border/20">
              {task.description && (
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{task.description}</p>
              )}

              {task.subtasks && task.subtasks.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Subtarefas</span>
                  {task.subtasks.map(sub => (
                    <motion.label
                      key={sub.id}
                      whileHover={{ x: 4 }}
                      className="flex items-center gap-3 cursor-pointer group py-1.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors"
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                        sub.is_completed
                          ? "bg-success border-success"
                          : "border-muted-foreground/30 group-hover:border-primary"
                      }`}>
                        {sub.is_completed && <Check className="w-2.5 h-2.5 text-success-foreground" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={sub.is_completed}
                        onChange={() => handleSubtaskToggle(sub.id, sub.is_completed)}
                        className="sr-only"
                      />
                      <span className={`text-sm transition-all ${
                        sub.is_completed ? "line-through text-muted-foreground/50" : "text-foreground"
                      }`}>
                        {sub.title}
                      </span>
                    </motion.label>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default TaskCard;
