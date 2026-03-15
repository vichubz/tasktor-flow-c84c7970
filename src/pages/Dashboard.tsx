import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TaskCard from "@/components/dashboard/TaskCard";
import NewTaskDialog from "@/components/dashboard/NewTaskDialog";
import CompletedTasks from "@/components/dashboard/CompletedTasks";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Task = Tables<"tasks"> & { subtasks?: Tables<"subtasks">[], project?: Tables<"projects"> };
type Project = Tables<"projects">;

const Dashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filterProject, setFilterProject] = useState<string>("all");
  const [showNewTask, setShowNewTask] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [tasksRes, projectsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, subtasks(*), project:projects(*)")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("position", { ascending: true }),
      supabase.from("projects").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    if (projectsRes.data) setProjects(projectsRes.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredTasks = filterProject === "all" 
    ? tasks 
    : tasks.filter(t => t.project_id === filterProject);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !user) return;
    const items = Array.from(filteredTasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    // Update local state immediately
    const updatedTasks = items.map((t, i) => ({ ...t, position: i }));
    setTasks(prev => {
      const otherTasks = prev.filter(t => !updatedTasks.find(u => u.id === t.id));
      return [...updatedTasks, ...otherTasks].sort((a, b) => a.position - b.position);
    });

    // Persist
    for (const t of updatedTasks) {
      await supabase.from("tasks").update({ position: t.position }).eq("id", t.id);
    }
  };

  const handleComplete = async (taskId: string) => {
    await supabase.from("tasks").update({ 
      is_completed: true, 
      completed_at: new Date().toISOString() 
    }).eq("id", taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success("Tarefa concluída! 🎉");
  };

  const handleDelete = async (taskId: string) => {
    await supabase.from("tasks").delete().eq("id", taskId);
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success("Tarefa excluída");
  };

  const todayCompleted = tasks.filter(t => {
    if (!t.completed_at) return false;
    return new Date(t.completed_at).toDateString() === new Date().toDateString();
  }).length;

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <DashboardHeader projects={projects} todayCompleted={todayCompleted} />
      
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Task controls */}
        <div className="flex items-center justify-between mb-6 mt-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground text-tight">Tarefas</h2>
            <span className="text-sm text-muted-foreground font-mono">{filteredTasks.length} pendentes</span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-44 bg-secondary border-border h-9">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar projeto" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todos os projetos</SelectItem>
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
            <Button
              onClick={() => setShowNewTask(true)}
              className="gradient-primary text-primary-foreground h-9 gap-2 glow-primary"
              disabled={projects.length === 0}
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {projects.length === 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 text-muted-foreground"
          >
            <p className="text-lg mb-2">Crie seu primeiro projeto para começar</p>
            <p className="text-sm">Use o menu lateral para gerenciar seus projetos</p>
          </motion.div>
        )}

        {/* Task list with drag and drop */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                {filteredTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                      >
                        <TaskCard
                          task={task}
                          index={index}
                          isTop3={index < 3}
                          isDragging={snapshot.isDragging}
                          onComplete={handleComplete}
                          onDelete={handleDelete}
                          onUpdate={fetchData}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {!loading && filteredTasks.length === 0 && projects.length > 0 && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-16 text-muted-foreground"
          >
            <p className="text-lg">Nenhuma tarefa pendente</p>
            <p className="text-sm mt-1">Clique em "Nova Tarefa" para começar</p>
          </motion.div>
        )}

        <CompletedTasks />
      </div>

      <NewTaskDialog 
        open={showNewTask} 
        onOpenChange={setShowNewTask} 
        projects={projects} 
        onCreated={fetchData} 
      />
    </div>
  );
};

export default Dashboard;
