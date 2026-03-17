import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Zap } from "lucide-react";

const useCountUp = (end: number, duration = 500) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (end === 0) { setCount(0); return; }
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
};

interface EffortScoreCardProps {
  refreshKey?: number;
}

const EffortScoreCard = ({ refreshKey }: EffortScoreCardProps) => {
  const { user } = useAuth();
  const [effortToday, setEffortToday] = useState(0);
  const [breakdown, setBreakdown] = useState({ easy: 0, medium: 0, hard: 0 });

  useEffect(() => {
    if (!user) return;
    const fetchEffort = async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("tasks")
        .select("difficulty")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("completed_at", `${today}T00:00:00`);

      if (data) {
        const total = data.reduce((sum, t) => sum + Math.max(t.difficulty || 0, 1), 0);
        setEffortToday(total);
        setBreakdown({
          easy: data.filter(t => (t.difficulty || 0) <= 1).length,
          medium: data.filter(t => t.difficulty === 2).length,
          hard: data.filter(t => t.difficulty === 3).length,
        });
      }
    };
    fetchEffort();
  }, [user, refreshKey]);

  const animatedScore = useCountUp(effortToday);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="stat-card rounded-xl px-4 py-3 flex flex-col gap-2 card-lift h-full"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.05))" }}>
            <Zap className="w-3.5 h-3.5 text-amber-500 icon-pulse" />
          </div>
          <span className="text-xs text-foreground/90 font-semibold uppercase tracking-wider">Esforço Hoje</span>
        </div>
      </div>

      <div className="flex items-end gap-2">
        <motion.span
          key={effortToday}
          initial={{ opacity: 0, scale: 1.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-mono text-2xl font-bold"
          style={{ color: "hsl(38 92% 50%)", textShadow: "0 0 20px rgba(245, 158, 11, 0.3)" }}
        >
          {animatedScore}
        </motion.span>
        <span className="text-xs text-muted-foreground font-medium mb-1">pontos</span>
      </div>

      <div className="flex items-center gap-2">
        {[
          { level: 1, count: breakdown.easy, label: "⚡1" },
          { level: 2, count: breakdown.medium, label: "⚡2" },
          { level: 3, count: breakdown.hard, label: "⚡3" },
        ].map(b => (
          <span
            key={b.level}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400/80"
          >
            {b.label} × {b.count}
          </span>
        ))}
      </div>
    </motion.div>
  );
};

export default EffortScoreCard;
