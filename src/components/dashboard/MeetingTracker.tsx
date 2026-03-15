import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Plus, Minus } from "lucide-react";

const MeetingTracker = () => {
  const { user } = useAuth();
  const [hours, setHours] = useState(0);
  const [count, setCount] = useState(0);
  const [logId, setLogId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("meeting_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      if (data) {
        setHours(data.hours);
        setCount(data.meeting_count);
        setLogId(data.id);
      }
    };
    load();
  }, [user, today]);

  const upsert = async (newHours: number, newCount: number) => {
    if (!user) return;
    if (logId) {
      await supabase.from("meeting_logs").update({ hours: newHours, meeting_count: newCount }).eq("id", logId);
    } else {
      const { data } = await supabase
        .from("meeting_logs")
        .insert({ user_id: user.id, date: today, hours: newHours, meeting_count: newCount })
        .select()
        .single();
      if (data) setLogId(data.id);
    }
  };

  const adjustCount = async (delta: number) => {
    const newCount = Math.max(0, count + delta);
    setCount(newCount);
    await upsert(hours, newCount);
  };

  const adjustHours = async (delta: number) => {
    const newHours = Math.max(0, Math.round((hours + delta) * 10) / 10);
    setHours(newHours);
    await upsert(newHours, count);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="stat-card rounded-xl px-4 py-3 flex items-center gap-4 card-lift"
    >
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent/15 flex items-center justify-center relative">
          <Video className="w-4 h-4 text-accent" />
          <div className="absolute inset-0 rounded-lg bg-accent/5 animate-pulse" />
        </div>
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Reuniões</span>
      </div>

      {/* Meeting count */}
      <div className="flex items-center gap-1.5">
        <motion.button
          onClick={() => adjustCount(-1)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="w-6 h-6 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
        >
          <Minus className="w-3 h-3" />
        </motion.button>
        <motion.span
          key={count}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-mono text-base font-bold text-accent min-w-[24px] text-center neon-text-accent"
        >
          {count}
        </motion.span>
        <motion.button
          onClick={() => adjustCount(1)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="w-6 h-6 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
        >
          <Plus className="w-3 h-3" />
        </motion.button>
      </div>

      <div className="w-px h-6 bg-border/30" />

      {/* Hours */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">hrs</span>
        <motion.button
          onClick={() => adjustHours(-0.5)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="w-6 h-6 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
        >
          <Minus className="w-3 h-3" />
        </motion.button>
        <motion.span
          key={hours}
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="font-mono text-base font-bold text-accent min-w-[32px] text-center"
        >
          {hours}
        </motion.span>
        <motion.button
          onClick={() => adjustHours(0.5)}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="w-6 h-6 rounded-md bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all"
        >
          <Plus className="w-3 h-3" />
        </motion.button>
      </div>
    </motion.div>
  );
};

export default MeetingTracker;