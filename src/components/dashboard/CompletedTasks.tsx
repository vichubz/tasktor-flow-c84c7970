import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Task = Tables<"tasks"> & { project?: Tables<"projects"> };

const CompletedTasks = () => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const fetchCompleted = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, project:projects(*)")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("completed_at", `${today}T00:00:00`)
        .order("completed_at", { ascending: false });
      if (data) setTasks(data as Task[]);
    };
    fetchCompleted();

    const channel = supabase
      .channel("completed-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, fetchCompleted)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, today]);

  if (tasks.length === 0) return null;

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
        <span className="text-xs font-mono bg-success/10 text-success px-2 py-0.5 rounded-md">{tasks.length}</span>
      </motion.button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-1.5 overflow-hidden"
          >
            {tasks.map((task, i) => (
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
                {task.project && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-md font-semibold"
                    style={{ backgroundColor: `${task.project.color}12`, color: task.project.color }}
                  >
                    {task.project.name}
                  </span>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompletedTasks;