import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Square, Timer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Project = Tables<"projects">;

interface WorkTimerProps {
  projects: Project[];
}

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const WorkTimer = ({ projects }: WorkTimerProps) => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedProject, setSelectedProject] = useState("");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const pausedSecondsRef = useRef(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<string | null>(null);

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
        startedAtRef.current = entry.started_at;
        if (entry.duration_seconds > 0) {
          // Was paused
          setSeconds(entry.duration_seconds);
          pausedSecondsRef.current = entry.duration_seconds;
          setIsPaused(true);
        } else {
          // Running - calculate elapsed from started_at
          const elapsed = Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000);
          setSeconds(elapsed);
          setIsRunning(true);
        }
      }
    };
    loadActive();
  }, [user]);

  // Local tick every second
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Sync to DB every 30 seconds when running
  useEffect(() => {
    if (!isRunning || !activeEntryId) {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      return;
    }
    syncIntervalRef.current = setInterval(() => {
      supabase.from("time_entries").update({ duration_seconds: seconds }).eq("id", activeEntryId);
    }, 30000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [isRunning, activeEntryId, seconds]);

  const handleStart = async () => {
    if (!user || !selectedProject) {
      if (!selectedProject) toast.error("Selecione um projeto primeiro");
      return;
    }
    if (isPaused && activeEntryId) {
      const newStartedAt = new Date(Date.now() - pausedSecondsRef.current * 1000).toISOString();
      startedAtRef.current = newStartedAt;
      await supabase.from("time_entries").update({ started_at: newStartedAt, duration_seconds: 0 }).eq("id", activeEntryId);
      setIsPaused(false);
      setIsRunning(true);
      return;
    }
    // Stop any existing entry
    if (activeEntryId) {
      await supabase.from("time_entries").update({ ended_at: new Date().toISOString(), duration_seconds: seconds }).eq("id", activeEntryId);
    }
    const now = new Date().toISOString();
    const { data } = await supabase.from("time_entries").insert({
      user_id: user.id,
      project_id: selectedProject,
      started_at: now,
    }).select().single();
    if (data) {
      setActiveEntryId(data.id);
      startedAtRef.current = now;
      setSeconds(0);
      pausedSecondsRef.current = 0;
      setIsRunning(true);
      setIsPaused(false);
      toast.success("Timer iniciado!");
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    setIsPaused(true);
    pausedSecondsRef.current = seconds;
    if (activeEntryId) {
      await supabase.from("time_entries").update({ duration_seconds: seconds }).eq("id", activeEntryId);
    }
    toast("Timer pausado", { icon: "⏸️" });
  };

  const handleStop = async () => {
    setIsRunning(false);
    setIsPaused(false);
    if (activeEntryId) {
      await supabase.from("time_entries").update({ ended_at: new Date().toISOString(), duration_seconds: seconds }).eq("id", activeEntryId);
      toast.success("Tempo salvo!");
    }
    setActiveEntryId(null);
    startedAtRef.current = null;
    setSeconds(0);
    pausedSecondsRef.current = 0;
  };

  const activeProject = projects.find(p => p.id === selectedProject);
  const isActive = isRunning || isPaused;

  return (
    <motion.div
      className={`stat-card rounded-xl px-4 py-3 flex items-center gap-3 transition-all duration-300 ${
        isRunning ? "animate-pulse-glow" : ""
      } ${isActive ? "border-primary/20" : ""}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="relative">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Timer className="w-5 h-5 text-primary" />
        </div>
        {isRunning && (
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success animate-pulse" />
        )}
      </div>

      <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isActive}>
        <SelectTrigger className="w-36 h-9 bg-secondary/50 border-border/30 text-xs backdrop-blur-sm">
          <SelectValue placeholder="Projeto" />
        </SelectTrigger>
        <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
          {projects.map(p => (
            <SelectItem key={p.id} value={p.id}>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}40` }} />
                {p.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <span
        className={`font-mono text-xl font-bold min-w-[90px] text-center ${isRunning ? "neon-text-primary" : ""}`}
        style={{ color: activeProject?.color }}
      >
        {formatTime(seconds)}
      </span>

      <div className="flex gap-1.5">
        {!isRunning ? (
          <motion.button
            onClick={handleStart}
            disabled={!selectedProject}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-lg bg-success/15 text-success flex items-center justify-center hover:bg-success/25 transition-all disabled:opacity-30"
          >
            <Play className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            onClick={handlePause}
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-all"
          >
            <Pause className="w-4 h-4" />
          </motion.button>
        )}
        <motion.button
          onClick={handleStop}
          disabled={!activeEntryId}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-lg bg-destructive/15 text-destructive flex items-center justify-center hover:bg-destructive/25 transition-all disabled:opacity-30"
        >
          <Square className="w-4 h-4" />
        </motion.button>
      </div>

      {isPaused && (
        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
          className="text-xs text-primary/70 font-mono font-bold tracking-wider"
        >
          PAUSADO
        </motion.span>
      )}
    </motion.div>
  );
};

export default WorkTimer;
