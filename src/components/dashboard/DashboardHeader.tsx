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
    <div className="glass border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <DigitalClock />

        {/* Completed today mini card */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 card-lift cursor-default"
        >
          <CheckCircle2 className="w-4 h-4 text-success" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground leading-none mb-0.5">Concluídas hoje</span>
            <motion.span
              key={todayCompleted}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-foreground font-mono text-sm font-semibold neon-text-success"
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
