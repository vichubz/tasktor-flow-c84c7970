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

  const fetchData = useCallback(async (retry = true) => {
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
      if (tasksRes.error || projectsRes.error) {
        throw new Error("fetch failed");
      }
      if (tasksRes.data) setTasks(tasksRes.data as Task[]);
      if (projectsRes.data) setProjects(projectsRes.data);
      setTodayCompleted(completedRes.count ?? 0);
      setLoading(false);
    } catch {
      if (retry) {
        // Retry once after 2s on network failure
        setTimeout(() => fetchData(false), 2000);
      } else {
        toast.error("Failed to load data. Please reload the page.");
        setLoading(false);
      }
    }
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "n" || e.key === "N") && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        inlineCreatorRef.current?.activate();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

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
      toast.error("Failed to reorder tasks");
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
      toast.error("Failed to complete task");
      setTasks(prev);
      setTodayCompleted(p => p - 1);
    }
  };

  const handleDelete = async (taskId: string) => {
    const deletedTask = tasks.find(t => t.id === taskId);
    const prev = [...tasks];
    setTasks(p => p.filter(t => t.id !== taskId));
    skipRealtimeRef.current = true;

    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) {
      toast.error("Failed to delete task");
      setTasks(prev);
      return;
    }
    toast("Task deleted", {
      action: deletedTask ? {
        label: "Undo",
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
          else toast.error("Failed to restore task");
        },
      } : undefined,
      duration: 5000,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
      {/* Ambient background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(14,165,195,0.07), transparent 70%)", top: "-10%", right: "-10%" }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(45,190,160,0.06), transparent 70%)", bottom: "5%", left: "-5%" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
        <motion.div
          className="absolute w-[350px] h-[350px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.05), transparent 70%)", bottom: "15%", left: "20%" }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        />
      </div>

      <DashboardHeader projects={projects} todayCompleted={todayCompleted} />

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-6 relative z-10">
        {/* Task controls */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 mt-4 sm:mt-5 gap-3"
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-extrabold text-tight font-display gradient-text flex items-center gap-2">
              <Zap className="w-4 sm:w-5 h-4 sm:h-5 text-primary" />
              Tasks
            </h2>
            <motion.span
              key={filteredTasks.length}
              initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="text-xs sm:text-sm text-muted-foreground font-mono px-2 sm:px-3 py-1 rounded-lg relative overflow-hidden"
              style={{
                background: "linear-gradient(135deg, rgba(14,165,195,0.08), rgba(8,18,22,0.6))",
                border: "1px solid rgba(14,165,195,0.1)",
              }}
            >
              {filteredTasks.length} pending
            </motion.span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="flex-1 sm:flex-none sm:w-44 bg-secondary/40 border-border/30 h-9 backdrop-blur-sm hover:border-primary/30 transition-colors text-xs sm:text-sm">
                <Filter className="w-3.5 h-3.5 mr-1.5 sm:mr-2 text-muted-foreground" />
                <SelectValue placeholder="Filter" />
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
                className="h-9 gap-1.5 sm:gap-2 font-bold relative overflow-hidden group text-xs sm:text-sm"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "0 0 20px rgba(14,165,195,0.3), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                  animate={{ x: ["-200%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                />
                <Plus className="w-4 h-4 relative z-10" />
                <span className="relative z-10 hidden sm:inline">Nova Tarefa</span>
                <span className="relative z-10 sm:hidden">Nova</span>
                <kbd className="relative z-10 ml-1 text-[10px] bg-white/10 px-1.5 py-0.5 rounded font-mono hidden sm:inline">N</kbd>
              </Button>
            </motion.div>
          </div>
        </motion.div>

        {/* Marquee project banner */}
        {!loading && projects.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="mb-4 overflow-hidden relative pointer-events-none select-none"
          >
            {/* Fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-12 z-10" style={{ background: "linear-gradient(to right, hsl(var(--background)), transparent)" }} />
            <div className="absolute right-0 top-0 bottom-0 w-12 z-10" style={{ background: "linear-gradient(to left, hsl(var(--background)), transparent)" }} />

            <div className="marquee-track">
              {[0, 1].map(copy => (
                <div key={copy} className="marquee-content" aria-hidden={copy === 1}>
                  {projects.map((p) => (
                    <div
                      key={`${copy}-${p.id}`}
                      className="flex items-center gap-2 px-4 py-1.5 rounded-full whitespace-nowrap"
                      style={{
                        background: `linear-gradient(135deg, ${p.color}12, ${p.color}06)`,
                        border: `1px solid ${p.color}20`,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}50` }}
                      />
                      <span className="text-[11px] font-semibold text-muted-foreground/80">{p.name}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
            {projects.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-3"
              >
                <InlineTaskCreator ref={inlineCreatorRef} projects={projects} onCreated={fetchData} />
              </motion.div>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tasks">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-3">
                    {filteredTasks.map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps}>
                            <TaskCard
                              task={task}
                              index={index}
                              isTop3={index < 3}
                              isDragging={snapshot.isDragging}
                              projects={projects}
                              onComplete={handleComplete}
                              onDelete={handleDelete}
                              onUpdate={fetchData}
                              dragHandleProps={provided.dragHandleProps}
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

        <CompletedTasks onTaskRestored={fetchData} />
      </div>

      <NewTaskDialog open={showNewTask} onOpenChange={setShowNewTask} projects={projects} onCreated={fetchData} />
    </div>
  );
};

export default Dashboard;
