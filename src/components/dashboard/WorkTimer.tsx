import { useState, useEffect } from "react";
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
  const [seconds, setSeconds] = useState(0);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

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
        setIsRunning(true);
        const elapsed = Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000);
        setSeconds(elapsed);
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
    
    // Stop any active timer first
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
      setIsRunning(true);
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    if (activeEntryId) {
      await supabase.from("time_entries").update({
        duration_seconds: seconds,
      }).eq("id", activeEntryId);
    }
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (activeEntryId) {
      await supabase.from("time_entries").update({
        ended_at: new Date().toISOString(),
        duration_seconds: seconds,
      }).eq("id", activeEntryId);
    }
    setActiveEntryId(null);
    setSeconds(0);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const activeProject = projects.find(p => p.id === selectedProject);

  return (
    <motion.div
      className={`glass rounded-xl px-4 py-3 flex items-center gap-3 ${isRunning ? "animate-pulse-glow" : ""}`}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Clock className="w-4 h-4 text-muted-foreground" />
      
      <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isRunning}>
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

      <span 
        className="font-mono text-lg font-semibold text-foreground min-w-[80px] text-center"
        style={{ color: activeProject?.color }}
      >
        {formatTime(seconds)}
      </span>

      <div className="flex gap-1">
        {!isRunning ? (
          <button
            onClick={handleStart}
            disabled={!selectedProject}
            className="w-8 h-8 rounded-lg bg-success/20 text-success flex items-center justify-center hover:bg-success/30 transition-colors disabled:opacity-30"
          >
            <Play className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="w-8 h-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center hover:bg-primary/30 transition-colors"
          >
            <Pause className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={handleStop}
          disabled={!activeEntryId}
          className="w-8 h-8 rounded-lg bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30 transition-colors disabled:opacity-30"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default WorkTimer;
