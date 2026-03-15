import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TaskCard from "@/components/dashboard/TaskCard";
import NewTaskDialog from "@/components/dashboard/NewTaskDialog";
import CompletedTasks from "@/components/dashboard/CompletedTasks";
import SkeletonTaskCard from "@/components/dashboard/SkeletonTaskCard";
import { Plus, Filter, Inbox, Sparkles } from "lucide-react";
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
  const [todayCompleted, setTodayCompleted] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const [tasksRes, projectsRes, completedRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("*, subtasks(*), project:projects(*)")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("position", { ascending: true }),
      supabase.from("projects").select("*").eq("user_id", user.id).order("created_at"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("completed_at", `${today}T00:00:00`),
    ]);
    if (tasksRes.data) setTasks(tasksRes.data as Task[]);
    if (projectsRes.data) setProjects(projectsRes.data);
    setTodayCompleted(completedRes.count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, () => {
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const filteredTasks = filterProject === "all"
    ? tasks
    : tasks.filter(t => t.project_id === filterProject);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !user) return;
    const items = Array.from(filteredTasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);
    const updatedTasks = items.map((t, i) => ({ ...t, position: i }));
    setTasks(prev => {
      const otherTasks = prev.filter(t => !updatedTasks.find(u => u.id === t.id));
      return [...updatedTasks, ...otherTasks].sort((a, b) => a.position - b.position);
    });
    await Promise.all(
      updatedTasks.map(t => supabase.from("tasks").update({ position: t.position }).eq("id", t.id))
    );
  };

  const handleComplete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    setTodayCompleted(prev => prev + 1);
    toast.success("Tarefa concluída! 🎉");
    await supabase.from("tasks").update({
      is_completed: true,
      completed_at: new Date().toISOString()
    }).eq("id", taskId);
  };

  const handleDelete = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    toast.success("Tarefa excluída");
    await supabase.from("tasks").delete().eq("id", taskId);
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <DashboardHeader projects={projects} todayCompleted={todayCompleted} />

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Task controls */}
        <div className="flex items-center justify-between mb-6 mt-5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-foreground text-tight font-display gradient-text">Tarefas</h2>
            <motion.span
              key={filteredTasks.length}
              initial={{ scale: 1.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-sm text-muted-foreground font-mono bg-secondary/50 px-2.5 py-0.5 rounded-md"
            >
              {filteredTasks.length} pendentes
            </motion.span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-44 bg-secondary/50 border-border/50 h-9 backdrop-blur-sm">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar projeto" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}40` }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setShowNewTask(true)}
              className="gradient-primary text-primary-foreground h-9 gap-2 glow-primary btn-shimmer font-semibold"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </Button>
          </div>
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <SkeletonTaskCard key={i} />)}
          </div>
        )}

        {projects.length === 0 && !loading && tasks.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-muted-foreground"
          >
            <motion.div
              className="w-20 h-20 rounded-2xl glass-gradient flex items-center justify-center mx-auto mb-5"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-9 h-9 text-primary/50" />
            </motion.div>
            <p className="text-lg mb-2 font-display font-semibold">Crie seu primeiro projeto para começar</p>
            <p className="text-sm">Use o menu lateral para gerenciar seus projetos</p>
          </motion.div>
        )}

        {/* Task list */}
        {!loading && (
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
        )}

        {!loading && filteredTasks.length === 0 && (projects.length > 0 || tasks.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-muted-foreground"
          >
            <motion.div
              className="w-20 h-20 rounded-2xl glass-gradient flex items-center justify-center mx-auto mb-5"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Inbox className="w-9 h-9 text-success/40" />
            </motion.div>
            <p className="text-lg font-display font-semibold">Nenhuma tarefa pendente</p>
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