import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Square, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface WorkTimerProps {
  projects: Project[];
}

const WorkTimer = ({ projects }: WorkTimerProps) => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const pausedSecondsRef = useRef(0);

  // Load active timer from DB on mount
  useEffect(() => {
    if (!user) return;
    const loadActive = async () => {
      const { data } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);
      
      if (data && data.length > 0) {
        const entry = data[0];
        setActiveEntryId(entry.id);
        setSelectedProject(entry.project_id);
        // Check if it was paused (has duration but no end)
        if (entry.duration_seconds > 0) {
          // Was paused — show paused state
          setSeconds(entry.duration_seconds);
          pausedSecondsRef.current = entry.duration_seconds;
          setIsPaused(true);
          setIsRunning(false);
        } else {
          // Still running
          const elapsed = Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000);
          setSeconds(elapsed);
          setIsRunning(true);
        }
      }
    };
    loadActive();
  }, [user]);

  // Timer tick
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStart = async () => {
    if (!user || !selectedProject) return;

    if (isPaused && activeEntryId) {
      // Resume: update started_at to account for paused time, reset duration
      const newStartedAt = new Date(Date.now() - pausedSecondsRef.current * 1000).toISOString();
      await supabase.from("time_entries").update({
        started_at: newStartedAt,
        duration_seconds: 0,
      }).eq("id", activeEntryId);
      setIsPaused(false);
      setIsRunning(true);
      return;
    }
    
    // Stop any existing active timer
    if (activeEntryId) {
      await supabase.from("time_entries").update({
        ended_at: new Date().toISOString(),
        duration_seconds: seconds,
      }).eq("id", activeEntryId);
    }

    const { data } = await supabase.from("time_entries").insert({
      user_id: user.id,
      project_id: selectedProject,
      started_at: new Date().toISOString(),
    }).select().single();

    if (data) {
      setActiveEntryId(data.id);
      setSeconds(0);
      pausedSecondsRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    setIsPaused(true);
    pausedSecondsRef.current = seconds;
    if (activeEntryId) {
      await supabase.from("time_entries").update({
        duration_seconds: seconds,
      }).eq("id", activeEntryId);
    }
  };

  const handleStop = async () => {
    setIsRunning(false);
    setIsPaused(false);
    if (activeEntryId) {
      await supabase.from("time_entries").update({
        ended_at: new Date().toISOString(),
        duration_seconds: seconds,
      }).eq("id", activeEntryId);
    }
    setActiveEntryId(null);
    setSeconds(0);
    pausedSecondsRef.current = 0;
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const activeProject = projects.find(p => p.id === selectedProject);
  const isActive = isRunning || isPaused;

  return (
    <motion.div
      className={`glass rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-300 ${
        isRunning ? "animate-pulse-glow" : ""
      } ${isActive ? "border-primary/30" : ""}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className={`relative ${isRunning ? "" : ""}`}>
        <Clock className="w-4 h-4 text-muted-foreground" />
        {isRunning && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />
        )}
      </div>
      
      <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isActive}>
        <SelectTrigger className="w-32 h-8 bg-secondary border-border text-xs">
          <SelectValue placeholder="Projeto" />
        </SelectTrigger>
        <SelectContent className="bg-card border-border">
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <motion.span 
        className={`font-mono text-lg font-semibold min-w-[80px] text-center ${isRunning ? "neon-text-primary" : ""}`}
        style={{ color: activeProject?.color }}
        key={formatTime(seconds)}
        initial={false}
        animate={isRunning ? { scale: [1, 1.02, 1] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      >
        {formatTime(seconds)}
      </motion.span>

      <div className="flex gap-1">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!selectedProject}
            className="w-8 h-8 rounded-lg bg-success/20 text-success flex items-center justify-center hover:bg-success/30 transition-all disabled:opacity-30 hover:scale-110"
          >
            <Play className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-all hover:scale-110"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleStop}
          disabled={!activeEntryId}
          className="w-8 h-8 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30 transition-all disabled:opacity-30 hover:scale-110"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      {isPaused && (
        <span className="text-xs text-primary/60 font-mono animate-pulse">PAUSADO</span>
      )}
    </motion.div>
  );
};

export default WorkTimer;
