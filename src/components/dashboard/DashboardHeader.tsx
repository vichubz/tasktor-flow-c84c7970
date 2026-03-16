import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DigitalClock from "./DigitalClock";
import WorkTimerCard from "./WorkTimerCard";
import MeetingMetricsCard from "./MeetingMetricsCard";
import GoogleCalendarCard from "./GoogleCalendarCard";
import { CheckCircle2, History, ChevronUp, ChevronDown } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import HistoryModal from "./HistoryModal";

type Project = Tables<"projects">;

interface DashboardHeaderProps {
  projects: Project[];
  todayCompleted: number;
}

const HEADER_COLLAPSED_KEY = "tasktor-header-collapsed";

const DashboardHeader = ({ projects, todayCompleted }: DashboardHeaderProps) => {
  const [showHistory, setShowHistory] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(HEADER_COLLAPSED_KEY) === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem(HEADER_COLLAPSED_KEY, String(collapsed)); } catch {}
  }, [collapsed]);

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
        {/* Row 1: Clock + Completed + History + Collapse toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between gap-2"
        >
          <DigitalClock />
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Completed today */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              whileHover={{ scale: 1.04, y: -2 }}
              className="flex items-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 cursor-default stat-card"
            >
              <div className="w-7 h-7 rounded-md flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))" }}>
                <CheckCircle2 className="w-3.5 h-3.5 text-success icon-pulse" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] text-foreground/60 leading-none font-medium uppercase tracking-wider">Completed</span>
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
              <span className="text-xs font-semibold hidden sm:inline">History</span>
            </motion.button>

            {/* Collapse toggle */}
            <motion.button
              onClick={() => setCollapsed(!collapsed)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="flex items-center justify-center w-7 h-7 rounded-lg stat-card text-muted-foreground hover:text-foreground transition-colors"
            >
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Row 2: Metric cards (collapsible) */}
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 12 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glow-card glow-card-emerald rounded-xl h-full">
                  <MeetingMetricsCard projects={projects} />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glow-card glow-card-cyan rounded-xl h-full">
                  <GoogleCalendarCard />
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glow-card glow-card-purple rounded-xl h-full">
                  <WorkTimerCard projects={projects} />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <HistoryModal open={showHistory} onOpenChange={setShowHistory} projects={projects} />
    </div>
  );
};

export default DashboardHeader;
