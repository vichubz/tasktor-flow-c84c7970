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
    const fetch = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*, project:projects(*)")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("completed_at", `${today}T00:00:00`)
        .order("completed_at", { ascending: false });
      if (data) setTasks(data as Task[]);
    };
    fetch();

    // Subscribe to changes
    const channel = supabase
      .channel("completed-tasks")
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${user.id}` }, fetch)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, today]);

  if (tasks.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        Concluídas hoje ({tasks.length})
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-1.5 overflow-hidden"
          >
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-secondary/30"
              >
                <Check className="w-4 h-4 text-success" />
                <span className="text-sm text-muted-foreground line-through flex-1">{task.title}</span>
                {task.project && (
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: `${task.project.color}15`, color: task.project.color }}
                  >
                    {task.project.name}
                  </span>
                )}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompletedTasks;
