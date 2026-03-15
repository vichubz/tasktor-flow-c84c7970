import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Check, Loader2, Undo2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Task = Tables<"tasks"> & { project?: Tables<"projects"> };

const CompletedTasks = () => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const fetchCompleted = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, project:projects(id, name, color)")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("completed_at", `${today}T00:00:00`)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      if (data) setTasks(data as Task[]);
    } catch {
      toast.error("Erro ao carregar tarefas concluídas");
    }
    setLoading(false);
    setHasFetched(true);
  }, [user, today]);

  useEffect(() => {
    if (expanded && !hasFetched) fetchCompleted();
  }, [expanded, hasFetched, fetchCompleted]);

  const handleUncomplete = async (taskId: string) => {
    const prev = [...tasks];
    setTasks(t => t.filter(x => x.id !== taskId));
    const { error } = await supabase.from("tasks").update({ is_completed: false, completed_at: null }).eq("id", taskId);
    if (error) {
      toast.error("Erro ao restaurar tarefa");
      setTasks(prev);
    } else {
      toast.success("Tarefa restaurada!");
    }
  };

  return (
    <div className="mt-6">
      <motion.button
        onClick={() => setExpanded(!expanded)}
        whileHover={{ x: 4 }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-display font-semibold"
      >
        <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronRight className="w-4 h-4" />
        </motion.div>
        <span>Concluídas hoje</span>
        {hasFetched && tasks.length > 0 && (
          <span className="text-xs font-mono bg-success/10 text-success px-2 py-0.5 rounded-md">{tasks.length}</span>
        )}
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-1.5 overflow-hidden"
          >
            {loading && (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            )}
            {!loading && tasks.length === 0 && (
              <p className="text-sm text-muted-foreground/60 py-4 text-center">Nenhuma tarefa concluída hoje</p>
            )}
            {!loading && tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg glass-gradient hover:bg-primary/5 transition-all group"
              >
                <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-success" />
                </div>
                <span className="text-sm text-muted-foreground line-through flex-1 group-hover:text-foreground/60 transition-colors">{task.title}</span>
                {task.completed_at && (
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {new Date(task.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                {task.project && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                    style={{ backgroundColor: `${task.project.color}12`, color: task.project.color }}
                  >
                    {task.project.name}
                  </span>
                )}
                <motion.button
                  onClick={() => handleUncomplete(task.id)}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-primary transition-all"
                  title="Restaurar tarefa"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </motion.button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompletedTasks;
