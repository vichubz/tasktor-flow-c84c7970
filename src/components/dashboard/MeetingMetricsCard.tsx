import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const MeetingMetricsCard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [count, setCount] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Read directly from meetings table
      const { data, error } = await supabase
        .from("meetings")
        .select("duration_minutes")
        .eq("user_id", user.id)
        .eq("meeting_date", today);
      if (error) {
        console.warn("Meetings load error:", error.message);
        return;
      }
      if (data) {
        const totalMinutes = data.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
        setHours(Math.floor(totalMinutes / 60));
        setMinutes(totalMinutes % 60);
        setCount(data.length);
      }
    };
    load();
  }, [user, today]);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={() => navigate("/meetings")}
      className="stat-card-meeting rounded-xl px-4 py-3 flex flex-col gap-2 card-lift h-full cursor-pointer"
    >
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center">
          <Video className="w-3.5 h-3.5 text-accent icon-pulse" />
        </div>
        <span className="text-xs text-foreground/90 font-semibold uppercase tracking-wider">Reuniões Hoje</span>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <motion.span key={count} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="font-mono text-lg font-bold text-accent min-w-[20px] text-center neon-text-accent">
            {count}
          </motion.span>
          <span className="text-xs text-muted-foreground">reuniões</span>
        </div>

        <div className="w-px h-6 bg-border/30" />

        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="font-mono text-sm font-bold text-foreground">
            {hours}h{minutes.toString().padStart(2, "0")}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

export default MeetingMetricsCard;
