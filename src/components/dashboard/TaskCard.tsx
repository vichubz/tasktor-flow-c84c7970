import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Trash2, GripVertical, ChevronDown, ChevronRight, Flame, AlertTriangle } from "lucide-react";
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

const TaskCard = ({ task, index, isTop3, isDragging, onComplete, onDelete, onUpdate }: TaskCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

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

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0, scale: isDragging ? 1.02 : 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      className={`glass rounded-xl transition-all duration-200 ${
        isDragging ? "shadow-2xl z-50" : "hover:bg-secondary/30"
      } ${isTop3 ? "top3-card" : ""}`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Drag handle */}
        <GripVertical className="w-4 h-4 text-muted-foreground/40 flex-shrink-0 cursor-grab" />

        {/* Position badge */}
        <span className={`font-mono text-xs font-bold min-w-[28px] text-center rounded-md px-1.5 py-0.5 ${
          isTop3 
            ? "bg-primary/20 text-primary" 
            : "bg-secondary text-muted-foreground"
        }`}>
          #{index + 1}
        </span>

        {isTop3 && <Flame className="w-4 h-4 text-primary flex-shrink-0" />}

        {/* Complete button */}
        <button
          onClick={() => onComplete(task.id)}
          className="w-6 h-6 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center hover:border-success hover:bg-success/10 transition-all flex-shrink-0 group"
        >
          <Check className="w-3 h-3 text-transparent group-hover:text-success transition-colors" />
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => e.key === "Enter" && handleTitleSave()}
              className="w-full bg-transparent text-foreground text-sm outline-none border-b border-primary/50"
            />
          ) : (
            <span
              onClick={() => setIsEditing(true)}
              className="text-sm text-foreground cursor-text truncate block"
            >
              {task.title}
            </span>
          )}
        </div>

        {/* Subtask progress */}
        {totalSubtasks > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full transition-all"
                style={{ width: `${subtaskProgress}%` }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground font-mono">{completedSubtasks}/{totalSubtasks}</span>
          </div>
        )}

        {/* Project badge */}
        {task.project && (
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0"
            style={{
              backgroundColor: `${task.project.color}20`,
              color: task.project.color,
            }}
          >
            {task.project.name}
          </span>
        )}

        {/* Deadline */}
        {task.deadline && (
          <span className={`text-[11px] font-mono flex-shrink-0 flex items-center gap-1 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
            {isOverdue && <AlertTriangle className="w-3 h-3" />}
            {new Date(task.deadline).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
          </span>
        )}

        {/* Expand */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
        >
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Delete */}
        <button
          onClick={() => onDelete(task.id)}
          className="text-muted-foreground/40 hover:text-destructive transition-colors flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Expanded content */}
      {expanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-4 pb-4 border-t border-border/30 pt-3 ml-[72px]"
        >
          {task.description && (
            <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
          )}

          {task.subtasks && task.subtasks.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-medium">Subtarefas</span>
              {task.subtasks.map(sub => (
                <label key={sub.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={sub.is_completed}
                    onChange={() => handleSubtaskToggle(sub.id, sub.is_completed)}
                    className="w-3.5 h-3.5 rounded border-muted-foreground/30 accent-primary"
                  />
                  <span className={`text-sm ${sub.is_completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {sub.title}
                  </span>
                </label>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
};

export default TaskCard;
