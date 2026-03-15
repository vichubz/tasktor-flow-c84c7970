import { motion } from "framer-motion";
import DigitalClock from "./DigitalClock";
import WorkTimer from "./WorkTimer";
import MeetingTracker from "./MeetingTracker";
import { CheckCircle2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface DashboardHeaderProps {
  projects: Project[];
  todayCompleted: number;
}

const DashboardHeader = ({ projects, todayCompleted }: DashboardHeaderProps) => {
  return (
    <div className="glass border-b border-border/30 px-6 py-4 relative overflow-hidden">
      {/* Ambient gradient glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="flex items-center justify-between gap-4 relative z-10">
        <DigitalClock />

        {/* Completed today */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 stat-card rounded-xl px-4 py-3 card-lift cursor-default"
        >
          <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center">
            <CheckCircle2 className="w-4.5 h-4.5 text-success" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground leading-none mb-1 font-medium uppercase tracking-wider">Concluídas</span>
            <motion.span
              key={todayCompleted}
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1 }}
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
  );
};

export default DashboardHeader;