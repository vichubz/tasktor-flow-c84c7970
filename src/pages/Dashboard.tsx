import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import TaskCard from "@/components/dashboard/TaskCard";
import NewTaskDialog from "@/components/dashboard/NewTaskDialog";
import CompletedTasks from "@/components/dashboard/CompletedTasks";
import InlineTaskCreator, { type InlineTaskCreatorHandle } from "@/components/dashboard/InlineTaskCreator";
import SkeletonTaskCard from "@/components/dashboard/SkeletonTaskCard";
import { Plus, Filter, Inbox, Sparkles, Zap } from "lucide-react";
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
  const skipRealtimeRef = useRef(false);
  const inlineCreatorRef = useRef<InlineTaskCreatorHandle>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    try {
      const [tasksRes, projectsRes, completedRes] = await Promise.all([
        supabase
          .from("tasks")
          .select("*, project:projects(id, name, color)")
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .order("position", { ascending: true }),
        supabase.from("projects").select("id, name, color, icon, created_at, user_id").eq("user_id", user.id).order("created_at"),
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
    } catch {
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Keyboard shortcut: N to open new task
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" || e.key === "N") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable) return;
        e.preventDefault();
        setShowNewTask(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("dashboard-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, () => {
        if (skipRealtimeRef.current) { skipRealtimeRef.current = false; return; }
        fetchData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  const filteredTasks = filterProject === "all" ? tasks : tasks.filter(t => t.project_id === filterProject);

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || !user) return;
    const items = Array.from(filteredTasks);
    const [reordered] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reordered);

    const changes: { id: string; position: number }[] = [];
    const updatedTasks = items.map((t, i) => {
      if (t.position !== i) changes.push({ id: t.id, position: i });
      return { ...t, position: i };
    });

    setTasks(prev => {
      const otherTasks = prev.filter(t => !updatedTasks.find(u => u.id === t.id));
      return [...updatedTasks, ...otherTasks].sort((a, b) => a.position - b.position);
    });

    if (changes.length === 0) return;
    skipRealtimeRef.current = true;

    try {
      const { error } = await supabase.rpc("reorder_tasks", {
        task_ids: changes.map(c => c.id),
        new_positions: changes.map(c => c.position),
      });
      if (error) throw error;
    } catch {
      toast.error("Erro ao reordenar tarefas");
      fetchData();
    }
  };

  const handleComplete = async (taskId: string) => {
    const prev = [...tasks];
    setTasks(p => p.filter(t => t.id !== taskId));
    setTodayCompleted(p => p + 1);
    skipRealtimeRef.current = true;

    const { error } = await supabase.from("tasks").update({
      is_completed: true,
      completed_at: new Date().toISOString()
    }).eq("id", taskId);

    if (error) {
      toast.error("Erro ao concluir tarefa");
      setTasks(prev);
      setTodayCompleted(p => p - 1);
    }
  };

  const handleDelete = async (taskId: string) => {
    const deletedTask = tasks.find(t => t.id === taskId);
    const prev = [...tasks];
    // Remove immediately from UI
    setTasks(p => p.filter(t => t.id !== taskId));
    skipRealtimeRef.current = true;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast.error("Erro ao excluir tarefa");
      setTasks(prev);
      return;
    }
    toast("Tarefa excluída", {
      action: deletedTask ? {
        label: "Desfazer",
        onClick: async () => {
          skipRealtimeRef.current = true;
          const { error: restoreError } = await supabase.from("tasks").insert({
            user_id: deletedTask.user_id,
            title: deletedTask.title,
            description: deletedTask.description,
            project_id: deletedTask.project_id,
            position: deletedTask.position,
            deadline: deletedTask.deadline,
          });
          if (!restoreError) fetchData();
          else toast.error("Erro ao restaurar tarefa");
        },
      } : undefined,
      duration: 5000,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(14,165,195,0.04), transparent 70%)", top: "-10%", right: "-10%" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <DashboardHeader projects={projects} todayCompleted={todayCompleted} />

      <div className="flex-1 overflow-y-auto px-6 pb-6 relative z-10">
        {/* Task controls */}
        <div className="flex items-center justify-between mb-6 mt-5">
          <div className="flex items-center gap-3">
            <motion.h2
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              className="text-xl font-extrabold text-tight font-display gradient-text flex items-center gap-2"
            >
              <Zap className="w-5 h-5 text-primary" />
              Tarefas
            </motion.h2>
            <motion.span
              key={filteredTasks.length}
              initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-sm text-muted-foreground font-mono px-3 py-1 rounded-lg relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(14,165,195,0.08), rgba(8,18,22,0.6))",
                border: "1px solid rgba(14,165,195,0.1)",
              }}
            >
              {filteredTasks.length} pendentes
            </motion.span>
          </div>
          <div className="flex items-center gap-3">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-44 bg-secondary/40 border-border/30 h-9 backdrop-blur-sm hover:border-primary/30 transition-colors">
                <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filtrar projeto" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                <SelectItem value="all">Todos os projetos</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}50` }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => setShowNewTask(true)}
                className="h-9 gap-2 font-bold relative overflow-hidden group"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "0 0 20px rgba(14,165,195,0.3), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}
                />
                <Plus className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Nova Tarefa</span>
                <kbd className="relative z-10 ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono">N</kbd>
              </Button>
            </motion.div>
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => <SkeletonTaskCard key={i} />)}
          </div>
        )}

        {projects.length === 0 && !loading && tasks.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 text-muted-foreground">
            <motion.div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-5 relative"
              style={{
                background: "linear-gradient(145deg, rgba(14,165,195,0.1), rgba(45,190,160,0.05), rgba(8,18,22,0.8))",
                border: "1px solid rgba(14,165,195,0.15)",
              }}
              animate={{ y: [0, -10, 0], boxShadow: ["0 0 0px rgba(14,165,195,0.2)", "0 0 30px rgba(14,165,195,0.4)", "0 0 0px rgba(14,165,195,0.2)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Sparkles className="w-10 h-10 text-primary/60" />
            </motion.div>
            <p className="text-lg mb-2 font-display font-extrabold gradient-text">Crie seu primeiro projeto para começar</p>
            <p className="text-sm">Use o menu lateral para gerenciar seus projetos</p>
          </motion.div>
        )}

        {!loading && (
          <>
            {/* Inline task creator */}
            {projects.length > 0 && (
              <div className="mb-3">
                <InlineTaskCreator projects={projects} onCreated={fetchData} />
              </div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {filteredTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                            <TaskCard
                              task={task}
                              index={index}
                              isTop3={index < 3}
                              isDragging={snapshot.isDragging}
                              projects={projects}
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
          </>
        )}

        {!loading && filteredTasks.length === 0 && (projects.length > 0 || tasks.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 text-muted-foreground">
            <motion.div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: "linear-gradient(145deg, rgba(16,185,129,0.08), rgba(8,18,22,0.8))",
                border: "1px solid rgba(16,185,129,0.12)",
              }}
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Inbox className="w-10 h-10 text-success/50" />
            </motion.div>
            <p className="text-lg font-display font-extrabold gradient-text">Nenhuma tarefa pendente</p>
            <p className="text-sm mt-1">Clique em "Nova Tarefa" para começar</p>
          </motion.div>
        )}

        <CompletedTasks />
      </div>

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} projects={projects} onCreated={fetchData} />
    </div>
  );
};

export default Dashboard;
