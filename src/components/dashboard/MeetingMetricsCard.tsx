import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Plus, Minus, Clock } from "lucide-react";
import { toast } from "sonner";

const MeetingMetricsCard = () => {
  const { user } = useAuth();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [count, setCount] = useState(0);
  const [logId, setLogId] = useState<string | null>(null);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("meeting_logs")
          .select("id, hours, meeting_count")
          .eq("user_id", user.id)
          .eq("date", today)
          .maybeSingle();
        if (error) throw error;
        if (data) {
          const totalMinutes = Math.round(Number(data.hours) * 60);
          setHours(Math.floor(totalMinutes / 60));
          setMinutes(totalMinutes % 60);
          setCount(data.meeting_count);
          setLogId(data.id);
        }
      } catch {
        toast.error("Erro ao carregar reuniões");
      }
    };
    load();
  }, [user, today]);

  const upsert = async (totalHours: number, newCount: number) => {
    if (!user) return;
    try {
      if (logId) {
        const { error } = await supabase.from("meeting_logs").update({ hours: totalHours, meeting_count: newCount }).eq("id", logId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("meeting_logs")
          .insert({ user_id: user.id, date: today, hours: totalHours, meeting_count: newCount })
          .select()
          .single();
        if (error) throw error;
        if (data) setLogId(data.id);
      }
    } catch {
      toast.error("Erro ao salvar reuniões");
    }
  };

  const adjustCount = (delta: number) => {
    const newCount = Math.max(0, count + delta);
    setCount(newCount);
    upsert(hours + minutes / 60, newCount);
  };

  const adjustTime = (deltaMinutes: number) => {
    const totalMin = Math.max(0, hours * 60 + minutes + deltaMinutes);
    const newH = Math.floor(totalMin / 60);
    const newM = totalMin % 60;
    setHours(newH);
    setMinutes(newM);
    upsert(newH + newM / 60, count);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="stat-card rounded-xl px-4 py-3 flex flex-col gap-2 card-lift"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center">
          <Video className="w-3.5 h-3.5 text-accent" />
        </div>
        <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Reuniões Hoje</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <motion.button onClick={() => adjustCount(-1)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className="w-5 h-5 rounded bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all">
            <Minus className="w-2.5 h-2.5" />
          </motion.button>
          <motion.span key={count} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-lg font-bold text-accent min-w-[20px] text-center neon-text-accent">
            {count}
          </motion.span>
          <motion.button onClick={() => adjustCount(1)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className="w-5 h-5 rounded bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all">
            <Plus className="w-2.5 h-2.5" />
          </motion.button>
        </div>

        <div className="w-px h-6 bg-border/30" />

        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <motion.button onClick={() => adjustTime(-15)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className="w-5 h-5 rounded bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all">
            <Minus className="w-2.5 h-2.5" />
          </motion.button>
          <span className="font-mono text-sm font-bold text-foreground min-w-[48px] text-center">
            {hours}h{minutes.toString().padStart(2, "0")}
          </span>
          <motion.button onClick={() => adjustTime(15)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className="w-5 h-5 rounded bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/15 transition-all">
            <Plus className="w-2.5 h-2.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default MeetingMetricsCard;
