import { motion } from "framer-motion";
import DigitalClock from "./DigitalClock";
import WorkTimerCard from "./WorkTimerCard";
import MeetingMetricsCard from "./MeetingMetricsCard";
import GoogleCalendarCard from "./GoogleCalendarCard";
import { CheckCircle2, History } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { useState } from "react";
import HistoryModal from "./HistoryModal";

type Project = Tables<"projects">;

interface DashboardHeaderProps {
  projects: Project[];
  todayCompleted: number;
}

const DashboardHeader = ({ projects, todayCompleted }: DashboardHeaderProps) => {
  const [showHistory, setShowHistory] = useState(false);

  return (
    <div className="relative overflow-hidden border-b border-border/20">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-accent/5 to-primary/8 bg-[length:200%_100%] animate-gradient-shift" />
      
      {/* Scanning light effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        style={{ width: "50%" }}
      />

      {/* Dot pattern overlay */}
      <div className="absolute inset-0 opacity-[0.04]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }} />

      {/* Bottom gradient border */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="glass px-3 sm:px-4 py-3 relative z-10 border-0" style={{ backdropFilter: "blur(32px)" }}>
        {/* Row 1: Clock + Completed + History */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between mb-3 gap-2"
        >
          <DigitalClock />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Completed today */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.04, y: -2 }}
              className="flex items-center gap-2 rounded-lg px-3 py-2 cursor-default stat-card"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))" }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-success icon-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-foreground/60 leading-none font-medium uppercase tracking-wider">Concluídas</span>
                <motion.span
                  key={todayCompleted}
                  initial={{ opacity: 0, scale: 2 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-foreground font-mono text-sm font-bold neon-text-success"
                >
                  {todayCompleted}
                </motion.span>
              </div>
            </motion.div>

            {/* History button */}
            <motion.button
              onClick={() => setShowHistory(true)}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              whileHover={{ scale: 1.08, y: -1 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 stat-card text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-4 h-4" />
              <span className="text-xs font-semibold hidden sm:inline">Histórico</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Row 2: Metric cards — symmetric grid with glow borders */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glow-card glow-card-emerald rounded-xl h-full">
            <MeetingMetricsCard />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glow-card glow-card-cyan rounded-xl h-full">
            <GoogleCalendarCard />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glow-card glow-card-purple rounded-xl h-full">
            <WorkTimerCard projects={projects} />
          </motion.div>
        </div>
      </div>

      <HistoryModal open={showHistory} onOpenChange={setShowHistory} projects={projects} />
    </div>
  );
};

export default DashboardHeader;
