import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Play, Pause, Square, Timer, Cloud } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Project = Tables<"projects">;

const formatTime = (s: number) => {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const formatDayTotal = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
};

const WorkTimerCard = ({ projects }: { projects: Project[] }) => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [selectedProject, setSelectedProject] = useState("");
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [dayTotal, setDayTotal] = useState(0);
  const [showSync, setShowSync] = useState(false);
  const pausedSecondsRef = useRef(0);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startedAtRef = useRef<string | null>(null);
  const secondsRef = useRef(0);

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);

  const today = new Date().toISOString().split("T")[0];

  const fetchDayTotal = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("time_entries")
        .select("duration_seconds")
        .eq("user_id", user.id)
        .eq("date", today)
        .not("ended_at", "is", null);
      if (data) setDayTotal(data.reduce((sum, e) => sum + e.duration_seconds, 0));
    } catch {
      // silent
    }
  }, [user, today]);

  useEffect(() => {
    if (!user) return;
    const loadActive = async () => {
      try {
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
            setSeconds(entry.duration_seconds);
            pausedSecondsRef.current = entry.duration_seconds;
            setIsPaused(true);
          } else {
            const elapsed = Math.floor((Date.now() - new Date(entry.started_at).getTime()) / 1000);
            setSeconds(elapsed);
            setIsRunning(true);
          }
        }
      } catch {
        toast.error("Failed to load timer");
      }
    };
    loadActive();
    fetchDayTotal();
  }, [user, fetchDayTotal]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (!isRunning || !activeEntryId) {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current);
      return;
    }
    syncIntervalRef.current = setInterval(async () => {
      const { error } = await supabase.from("time_entries").update({ duration_seconds: secondsRef.current }).eq("id", activeEntryId);
      if (!error) {
        setShowSync(true);
        setTimeout(() => setShowSync(false), 1200);
      }
    }, 30000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [isRunning, activeEntryId]);

  const handleStart = async () => {
    if (!user || !selectedProject) {
      if (!selectedProject) toast.error("Select a project first");
      return;
    }
    try {
      if (isPaused && activeEntryId) {
        const newStartedAt = new Date(Date.now() - pausedSecondsRef.current * 1000).toISOString();
        startedAtRef.current = newStartedAt;
        const { error } = await supabase.from("time_entries").update({ started_at: newStartedAt, duration_seconds: 0 }).eq("id", activeEntryId);
        if (error) throw error;
        setIsPaused(false);
        setIsRunning(true);
        return;
      }
      if (activeEntryId) {
        await supabase.from("time_entries").update({ ended_at: new Date().toISOString(), duration_seconds: seconds }).eq("id", activeEntryId);
      }
      const now = new Date().toISOString();
      const { data, error } = await supabase.from("time_entries").insert({ user_id: user.id, project_id: selectedProject, started_at: now }).select().single();
      if (error) throw error;
      if (data) {
        setActiveEntryId(data.id);
        startedAtRef.current = now;
        setSeconds(0);
        pausedSecondsRef.current = 0;
        setIsRunning(true);
        setIsPaused(false);
        toast.success("Timer started!");
      }
    } catch {
      toast.error("Failed to start timer");
    }
  };

  const handlePause = async () => {
    setIsRunning(false);
    setIsPaused(true);
    pausedSecondsRef.current = seconds;
    if (activeEntryId) {
      const { error } = await supabase.from("time_entries").update({ duration_seconds: seconds }).eq("id", activeEntryId);
      if (error) toast.error("Failed to pause timer");
    }
    toast("Timer paused", { icon: "⏸️" });
  };

  const handleStop = async () => {
    const prevSeconds = seconds;
    setIsRunning(false);
    setIsPaused(false);
    if (activeEntryId) {
      const { error } = await supabase.from("time_entries").update({ ended_at: new Date().toISOString(), duration_seconds: prevSeconds }).eq("id", activeEntryId);
      if (error) {
        toast.error("Failed to save time");
      } else {
        toast.success("Time saved!");
      }
    }
    setActiveEntryId(null);
    startedAtRef.current = null;
    setSeconds(0);
    pausedSecondsRef.current = 0;
    fetchDayTotal();
  };

  const activeProject = projects.find(p => p.id === selectedProject);
  const isActive = isRunning || isPaused;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`stat-card-timer rounded-xl px-4 py-3 flex flex-col gap-2 card-lift h-full ${isRunning ? "animate-pulse-glow" : ""}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-7 h-7 rounded-md bg-[rgba(124,58,237,0.15)] flex items-center justify-center">
              <Timer className="w-3.5 h-3.5 text-[#8B5CF6] icon-pulse" />
            </div>
            {isRunning && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-success animate-pulse" />}
          </div>
          <span className="text-xs text-foreground/90 font-semibold uppercase tracking-wider">Timer</span>
          <AnimatePresence>
            {showSync && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="flex items-center gap-1 text-success"
              >
                <Cloud className="w-3 h-3" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono">
          Today: <span className="text-foreground font-bold">{formatDayTotal(dayTotal + (isActive ? seconds : 0))}</span>
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <Select value={selectedProject} onValueChange={setSelectedProject} disabled={isActive}>
          <SelectTrigger className="flex-1 h-7 bg-secondary/50 border-border/30 text-[11px] backdrop-blur-sm">
            <SelectValue placeholder="Project" />
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

        <span className={`font-mono text-lg font-bold min-w-[80px] text-center ${isRunning ? "neon-text-primary" : ""}`}
          style={{ color: activeProject?.color, textShadow: isRunning ? `0 0 20px ${activeProject?.color || "rgba(14,165,195,0.3)"}` : undefined }}>
          {formatTime(seconds)}
        </span>

        <div className="flex gap-1">
          {!isRunning ? (
            <motion.button onClick={handleStart} disabled={!selectedProject}
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-md bg-success/15 text-success flex items-center justify-center hover:bg-success/25 transition-all disabled:opacity-30">
              <Play className="w-3.5 h-3.5" />
            </motion.button>
          ) : (
            <motion.button onClick={handlePause}
              whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-md bg-primary/15 text-primary flex items-center justify-center hover:bg-primary/25 transition-all">
              <Pause className="w-3.5 h-3.5" />
            </motion.button>
          )}
          <motion.button onClick={handleStop} disabled={!activeEntryId}
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            className="w-7 h-7 rounded-md bg-destructive/15 text-destructive flex items-center justify-center hover:bg-destructive/25 transition-all disabled:opacity-30">
            <Square className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {isPaused && (
        <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
          className="text-[10px] text-primary/70 font-mono font-bold tracking-wider text-center">
          PAUSED
        </motion.span>
      )}
    </motion.div>
  );
};

export default WorkTimerCard;
