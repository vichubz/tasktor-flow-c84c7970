import { useMemo, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import TaskCard from "./TaskCard";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { subtasks?: Tables<"subtasks">[]; project?: Tables<"projects"> };
type Project = Tables<"projects">;

interface KanbanBoardProps {
  tasks: Task[];
  projects: Project[];
  filterDifficulty: string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  onMoveToTop: (id: string) => void;
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
}

const COLORS = [
  "#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6",
  "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1",
  "#84CC16", "#DC2626", "#0EA5E9", "#A855F7", "#D946EF",
  "#64748B", "#78350F", "#065F46", "#1E3A5F", "#BE185D",
];

const KanbanBoard = ({ tasks, projects, filterDifficulty, onComplete, onDelete, onUpdate, onMoveToTop, setTasks }: KanbanBoardProps) => {
  const { user } = useAuth();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim() || creatingProject) return;
    setCreatingProject(true);
    const { error } = await supabase.from("projects").insert({ user_id: user.id, name: newProjectName.trim(), color: newProjectColor });
    if (error) toast.error("Falha ao criar projeto");
    else {
      toast.success("Projeto criado!");
      setNewProjectName("");
      setNewProjectColor(COLORS[0]);
      setShowNewProject(false);
      onUpdate();
    }
    setCreatingProject(false);
  };
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterDifficulty !== "all" && t.difficulty !== Number(filterDifficulty)) return false;
      return true;
    });
  }, [tasks, filterDifficulty]);

  const columns = useMemo(() => {
    const cols: { id: string; name: string; color: string; tasks: Task[] }[] = [];

    for (const project of projects) {
      cols.push({
        id: project.id,
        name: project.name,
        color: project.color,
        tasks: filteredTasks
          .filter(t => t.project_id === project.id)
          .sort((a, b) => a.position - b.position),
      });
    }

    const unassigned = filteredTasks.filter(t => !t.project_id).sort((a, b) => a.position - b.position);
    if (unassigned.length > 0 || cols.length === 0) {
      cols.push({
        id: "__none__",
        name: "Sem projeto",
        color: "hsl(var(--muted-foreground))",
        tasks: unassigned,
      });
    }

    return cols;
  }, [filteredTasks, projects]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;
    const sourceCol = columns.find(c => c.id === sourceColId);
    const destCol = columns.find(c => c.id === destColId);
    if (!sourceCol || !destCol) return;

    const sourceItems = Array.from(sourceCol.tasks);
    const [moved] = sourceItems.splice(source.index, 1);

    const newProjectId = destColId === "__none__" ? null : destColId;
    const movedTask = { ...moved, project_id: newProjectId };

    if (sourceColId === destColId) {
      // Reorder within same column
      sourceItems.splice(destination.index, 0, movedTask);
      const changes: { id: string; position: number }[] = [];
      sourceItems.forEach((t, i) => {
        if (t.position !== i) changes.push({ id: t.id, position: i });
      });

      setTasks(prev => {
        const updated = prev.map(t => {
          const change = sourceItems.find(s => s.id === t.id);
          if (change) return { ...t, position: sourceItems.indexOf(change) };
          return t;
        });
        return updated.sort((a, b) => a.position - b.position);
      });

      if (changes.length > 0) {
        try {
          const { error } = await supabase.rpc("reorder_tasks", {
            task_ids: changes.map(c => c.id),
            new_positions: changes.map(c => c.position),
          });
          if (error) throw error;
        } catch {
          toast.error("Falha ao reordenar tasks");
          onUpdate();
        }
      }
    } else {
      // Cross-column move
      const destItems = Array.from(destCol.tasks);
      destItems.splice(destination.index, 0, movedTask);

      // Optimistic update
      setTasks(prev => {
        return prev.map(t => {
          if (t.id === moved.id) {
            return { ...t, project_id: newProjectId, position: destination.index };
          }
          // Reposition source column
          const srcIdx = sourceItems.findIndex(s => s.id === t.id);
          if (srcIdx !== -1) return { ...t, position: srcIdx };
          // Reposition dest column
          const dstIdx = destItems.findIndex(d => d.id === t.id);
          if (dstIdx !== -1) return { ...t, position: dstIdx };
          return t;
        }).sort((a, b) => a.position - b.position);
      });

      try {
        // Update project_id
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ project_id: newProjectId })
          .eq("id", moved.id);
        if (updateError) throw updateError;

        // Reorder both columns
        const allChanges: { id: string; position: number }[] = [];
        sourceItems.forEach((t, i) => { if (t.position !== i) allChanges.push({ id: t.id, position: i }); });
        destItems.forEach((t, i) => { if (t.position !== i) allChanges.push({ id: t.id, position: i }); });

        if (allChanges.length > 0) {
          const { error } = await supabase.rpc("reorder_tasks", {
            task_ids: allChanges.map(c => c.id),
            new_positions: allChanges.map(c => c.position),
          });
          if (error) throw error;
        }
      } catch {
        toast.error("Falha ao mover task");
        onUpdate();
      }
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ minHeight: 300 }}>
        {columns.map((col, colIdx) => (
          <motion.div
            key={col.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: colIdx * 0.05 }}
            className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start"
          >
            {/* Column header */}
            <div
              className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl mb-0"
              style={{
                background: `linear-gradient(135deg, ${col.color}15, ${col.color}08)`,
                border: `1px solid ${col.color}25`,
                borderBottom: "none",
              }}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: col.color, boxShadow: `0 0 8px ${col.color}50` }}
              />
              <span className="text-sm font-bold text-foreground truncate">{col.name}</span>
              <span
                className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-md"
                style={{
                  background: `${col.color}12`,
                  color: col.color,
                  border: `1px solid ${col.color}20`,
                }}
              >
                {col.tasks.length}
              </span>
            </div>

            {/* Column body */}
            <Droppable droppableId={col.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-2 p-2 rounded-b-xl min-h-[120px] transition-colors"
                  style={{
                    background: snapshot.isDraggingOver
                      ? `linear-gradient(180deg, ${col.color}08, ${col.color}04)`
                      : "hsl(var(--card) / 0.3)",
                    border: `1px solid ${snapshot.isDraggingOver ? col.color + "30" : "hsl(var(--border) / 0.15)"}`,
                    borderTop: "none",
                  }}
                >
                  {col.tasks.length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                      <Inbox className="w-6 h-6 mb-1" />
                      <span className="text-[11px]">Sem tasks</span>
                    </div>
                  )}
                  {col.tasks.map((task, index) => (
                    <Draggable key={task.id} draggableId={task.id} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                          <TaskCard
                            task={task}
                            index={index}
                            isDragging={snapshot.isDragging}
                            projects={projects}
                            onComplete={onComplete}
                            onDelete={onDelete}
                            onUpdate={onUpdate}
                            onMoveToTop={onMoveToTop}
                            compact
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </motion.div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
