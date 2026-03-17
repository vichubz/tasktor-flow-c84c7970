import { useMemo, useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Plus, X, GripVertical, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import TaskCard from "./TaskCard";
import type { Tables } from "@/integrations/supabase/types";

/* Inline task creator for each kanban column */
const ColumnTaskCreator = ({
  projectId,
  userId,
  onCreated,
}: {
  projectId: string | null;
  userId: string;
  onCreated: () => void;
}) => {
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    if (!title.trim() || creating) return;
    setCreating(true);

    const { data: lastTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("user_id", userId)
      .eq("is_completed", false)
      .order("position", { ascending: false })
      .limit(1);

    const position = lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0;

    const { error } = await supabase.from("tasks").insert({
      user_id: userId,
      project_id: projectId,
      title: title.trim(),
      position,
    });

    if (error) toast.error("Falha ao criar task");
    else {
      toast.success("Task criada!");
      onCreated();
    }
    setTitle("");
    setCreating(false);
    inputRef.current?.focus();
  };

  if (!active) {
    return (
      <button
        onClick={() => {
          setActive(true);
          setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground/40 hover:text-muted-foreground/70 hover:bg-secondary/30 transition-all text-xs"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Add task</span>
      </button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-1.5 px-1.5"
    >
      <input
        ref={inputRef}
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); handleCreate(); }
          if (e.key === "Escape") { setActive(false); setTitle(""); }
        }}
        placeholder="Nova task..."
        disabled={creating}
        className="flex-1 bg-secondary/50 border border-border/30 rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 outline-none focus:ring-1 focus:ring-primary/30"
      />
      <button
        onClick={handleCreate}
        disabled={!title.trim() || creating}
        className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 transition-all disabled:opacity-30 flex-shrink-0"
      >
        <Check className="w-3 h-3" />
      </button>
      <button
        onClick={() => { setActive(false); setTitle(""); }}
        className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
};

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
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
}

const COLORS = [
  "#EF4444", "#3B82F6", "#22C55E", "#F59E0B", "#8B5CF6",
  "#06B6D4", "#F97316", "#EC4899", "#14B8A6", "#6366F1",
  "#84CC16", "#DC2626", "#0EA5E9", "#A855F7", "#D946EF",
  "#64748B", "#78350F", "#065F46", "#1E3A5F", "#BE185D",
];

const KanbanBoard = ({ tasks, projects, filterDifficulty, onComplete, onDelete, onUpdate, onMoveToTop, setTasks, setProjects }: KanbanBoardProps) => {
  const { user } = useAuth();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectColor, setNewProjectColor] = useState(COLORS[0]);
  const [creatingProject, setCreatingProject] = useState(false);

  const handleCreateProject = async () => {
    if (!user || !newProjectName.trim() || creatingProject) return;
    setCreatingProject(true);
    const newPosition = projects.length;
    const { error } = await supabase.from("projects").insert({
      user_id: user.id,
      name: newProjectName.trim(),
      color: newProjectColor,
      position: newPosition,
    });
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

    const sortedProjects = [...projects].sort((a, b) => a.position - b.position);

    for (const project of sortedProjects) {
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
    // Always show "Sem projeto" column so users can drop tasks there
    cols.push({
      id: "__none__",
      name: "Sem projeto",
      color: "hsl(var(--muted-foreground))",
      tasks: unassigned,
    });

    return cols;
  }, [filteredTasks, projects]);

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;

    // Column reorder
    if (type === "COLUMN") {
      const sortedProjects = [...projects].sort((a, b) => a.position - b.position);
      // Filter out __none__ from reorderable list
      const reorderableIds = columns.filter(c => c.id !== "__none__").map(c => c.id);
      const [movedId] = reorderableIds.splice(source.index, 1);
      reorderableIds.splice(destination.index, 0, movedId);

      // Optimistic update
      setProjects(prev => {
        const updated = prev.map(p => {
          const newIdx = reorderableIds.indexOf(p.id);
          return newIdx !== -1 ? { ...p, position: newIdx } : p;
        });
        return updated.sort((a, b) => a.position - b.position);
      });

      // Persist
      const changes = reorderableIds.map((id, i) => ({ id, position: i }));
      try {
        const { error } = await supabase.rpc("reorder_projects" as any, {
          project_ids: changes.map(c => c.id),
          new_positions: changes.map(c => c.position),
        });
        if (error) throw error;
      } catch {
        toast.error("Falha ao reordenar projetos");
        onUpdate();
      }
      return;
    }

    // Task drag
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
      const destItems = Array.from(destCol.tasks);
      destItems.splice(destination.index, 0, movedTask);

      setTasks(prev => {
        return prev.map(t => {
          if (t.id === moved.id) return { ...t, project_id: newProjectId, position: destination.index };
          const srcIdx = sourceItems.findIndex(s => s.id === t.id);
          if (srcIdx !== -1) return { ...t, position: srcIdx };
          const dstIdx = destItems.findIndex(d => d.id === t.id);
          if (dstIdx !== -1) return { ...t, position: dstIdx };
          return t;
        }).sort((a, b) => a.position - b.position);
      });

      try {
        const { error: updateError } = await supabase
          .from("tasks")
          .update({ project_id: newProjectId })
          .eq("id", moved.id);
        if (updateError) throw updateError;

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

  // Separate draggable columns from fixed __none__
  const draggableColumns = columns.filter(c => c.id !== "__none__");
  const noneColumn = columns.find(c => c.id === "__none__");

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto pb-4" style={{ minHeight: 300 }}>
        <Droppable droppableId="kanban-columns" direction="horizontal" type="COLUMN">
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="flex gap-4 snap-x snap-mandatory"
              style={{ minWidth: "min-content" }}
            >
            {draggableColumns.map((col, colIdx) => (
              <Draggable key={col.id} draggableId={`col-${col.id}`} index={colIdx}>
                {(colProvided, colSnapshot) => (
                  <div
                    ref={colProvided.innerRef}
                    {...colProvided.draggableProps}
                    className={`flex-shrink-0 w-[280px] sm:w-[300px] snap-start transition-shadow ${colSnapshot.isDragging ? "shadow-2xl z-50" : ""}`}
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
                      <div {...colProvided.dragHandleProps} className="cursor-grab active:cursor-grabbing flex-shrink-0">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors" />
                      </div>
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
                    <Droppable droppableId={col.id} type="TASK">
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
                          <ColumnTaskCreator
                            projectId={col.id}
                            userId={user!.id}
                            onCreated={onUpdate}
                          />
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* Fixed "Sem projeto" column (not draggable) */}
            {noneColumn && (
              <div className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start">
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-t-xl mb-0"
                  style={{
                    background: `linear-gradient(135deg, ${noneColumn.color}15, ${noneColumn.color}08)`,
                    border: `1px solid ${noneColumn.color}25`,
                    borderBottom: "none",
                  }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: noneColumn.color, boxShadow: `0 0 8px ${noneColumn.color}50` }}
                  />
                  <span className="text-sm font-bold text-foreground truncate">{noneColumn.name}</span>
                  <span
                    className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-md"
                    style={{
                      background: `${noneColumn.color}12`,
                      color: noneColumn.color,
                      border: `1px solid ${noneColumn.color}20`,
                    }}
                  >
                    {noneColumn.tasks.length}
                  </span>
                </div>
                <Droppable droppableId="__none__" type="TASK">
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2 p-2 rounded-b-xl min-h-[120px] transition-colors"
                      style={{
                        background: snapshot.isDraggingOver
                          ? `linear-gradient(180deg, ${noneColumn.color}08, ${noneColumn.color}04)`
                          : "hsl(var(--card) / 0.3)",
                        border: `1px solid ${snapshot.isDraggingOver ? noneColumn.color + "30" : "hsl(var(--border) / 0.15)"}`,
                        borderTop: "none",
                      }}
                    >
                      {noneColumn.tasks.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
                          <Inbox className="w-6 h-6 mb-1" />
                          <span className="text-[11px]">Sem tasks</span>
                        </div>
                      )}
                      {noneColumn.tasks.map((task, index) => (
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
                      <ColumnTaskCreator
                        projectId={null}
                        userId={user!.id}
                        onCreated={onUpdate}
                      />
                    </div>
                  )}
                </Droppable>
              </div>
            )}

            {/* Add project column */}
            <div className="flex-shrink-0 w-[280px] sm:w-[300px] snap-start">
              <AnimatePresence mode="wait">
                {showNewProject ? (
                  <motion.div
                    key="form"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="rounded-xl p-3 space-y-2.5"
                    style={{ background: "hsl(var(--card) / 0.5)", border: "1px dashed hsl(var(--border) / 0.4)" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">Novo projeto</span>
                      <button onClick={() => setShowNewProject(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <input
                      autoFocus
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                      placeholder="Nome do projeto"
                      className="w-full bg-secondary/60 border border-border/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <div className="flex flex-wrap gap-1">
                      {COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewProjectColor(c)}
                          className={`w-5 h-5 rounded-full transition-all ${newProjectColor === c ? "scale-125 ring-2 ring-foreground/30 ring-offset-1 ring-offset-card" : "hover:scale-110"}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={handleCreateProject}
                      disabled={!newProjectName.trim() || creatingProject}
                      className="w-full py-2 rounded-lg text-sm font-bold text-primary-foreground gradient-primary disabled:opacity-50 transition-opacity"
                    >
                      Criar Projeto
                    </button>
                  </motion.div>
                ) : (
                  <motion.button
                    key="button"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowNewProject(true)}
                    className="w-full h-[120px] rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors"
                    style={{ background: "hsl(var(--card) / 0.2)", border: "1px dashed hsl(var(--border) / 0.3)" }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <Plus className="w-6 h-6" />
                    <span className="text-xs font-medium">Novo projeto</span>
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </Droppable>
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;
