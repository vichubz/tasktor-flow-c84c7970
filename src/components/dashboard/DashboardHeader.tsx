import { motion } from "framer-motion";
import DigitalClock from "./DigitalClock";
import WorkTimer from "./WorkTimer";
import MeetingTracker from "./MeetingTracker";
import { CheckCircle2, Zap } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface DashboardHeaderProps {
  projects: Project[];
  todayCompleted: number;
}

const DashboardHeader = ({ projects, todayCompleted }: DashboardHeaderProps) => {
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
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1px, transparent 1px)",
        backgroundSize: "20px 20px",
      }} />

      <div className="glass px-6 py-4 relative z-10 border-0">
        <div className="flex items-center justify-between gap-4">
          <DigitalClock />

          {/* Completed today */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.04, y: -2 }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-default relative overflow-hidden group"
            style={{
              background: "linear-gradient(145deg, rgba(16, 185, 129, 0.08), rgba(8, 18, 22, 0.8))",
              border: "1px solid rgba(16, 185, 129, 0.12)",
            }}
          >
            {/* Hover glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-success/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <motion.div
              className="w-9 h-9 rounded-lg flex items-center justify-center relative z-10"
              style={{ background: "linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.05))" }}
              animate={{ boxShadow: ["0 0 0px rgba(16,185,129,0.3)", "0 0 20px rgba(16,185,129,0.5)", "0 0 0px rgba(16,185,129,0.3)"] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <CheckCircle2 className="w-4.5 h-4.5 text-success" />
            </motion.div>
            <div className="flex flex-col relative z-10">
              <span className="text-[10px] text-muted-foreground leading-none mb-1 font-medium uppercase tracking-wider">Concluídas</span>
              <motion.span
                key={todayCompleted}
                initial={{ opacity: 0, scale: 2, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="text-foreground font-mono text-lg font-bold neon-text-success"
              >
                {todayCompleted}
              </motion.span>
            </div>
          </motion.div>

          <MeetingTracker />

          <WorkTimer projects={projects} />
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
