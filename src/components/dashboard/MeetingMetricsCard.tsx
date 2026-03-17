import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Video, Clock, Plus, X, Save, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type Summary = Tables<"meeting_summaries">;

interface MeetingMetricsCardProps {
  projects?: Project[];
}

const MeetingMetricsCard = ({ projects = [] }: MeetingMetricsCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [count, setCount] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [durationH, setDurationH] = useState("0");
  const [durationM, setDurationM] = useState("30");
  const [projectId, setProjectId] = useState("none");
  const [summaryId, setSummaryId] = useState("none");
  const [summaries, setSummaries] = useState<Summary[]>([]);

  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const loadMetrics = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("meetings")
      .select("duration_minutes")
      .eq("user_id", user.id)
      .eq("meeting_date", today);
    if (error) { console.warn("Meetings load error:", error.message); return; }
    if (data) {
      const totalMinutes = data.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
      setHours(Math.floor(totalMinutes / 60));
      setMinutes(totalMinutes % 60);
      setCount(data.length);
    }
  };

  useEffect(() => { loadMetrics(); }, [user, today]);

  const openForm = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowForm(true);
    // Fetch summaries on demand
    if (user) {
      const { data } = await supabase
        .from("meeting_summaries")
        .select("id, title, meeting_date, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setSummaries(data as Summary[]);
    }
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !title.trim()) { toast.error("Please enter a title"); return; }
    setSaving(true);
    const totalMin = parseInt(durationH) * 60 + parseInt(durationM);
    const { error } = await supabase.from("meetings").insert({
      user_id: user.id,
      title: title.trim(),
      duration_minutes: totalMin,
      meeting_date: today,
      project_id: projectId === "none" ? null : projectId,
      summary_id: summaryId === "none" ? null : summaryId,
    });
    setSaving(false);
    if (error) { toast.error("Falha ao salvar reunião"); return; }
    toast.success("Reunião salva!");
    setTitle(""); setDurationH("0"); setDurationM("30"); setProjectId("none"); setSummaryId("none");
    setShowForm(false);
    loadMetrics();
  };

  const cancelForm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowForm(false);
  };

  return (
    <motion.div
      whileHover={!showForm ? { y: -2 } : undefined}
      onClick={() => !showForm && navigate("/meetings")}
      className="stat-card-meeting rounded-xl px-4 py-3 flex flex-col gap-2 card-lift h-full cursor-pointer"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-accent/15 flex items-center justify-center">
            <Video className="w-3.5 h-3.5 text-accent icon-pulse" />
          </div>
          <span className="text-xs text-foreground/90 font-semibold uppercase tracking-wider">Meetings Today</span>
        </div>
        <motion.button
          onClick={showForm ? cancelForm : openForm}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        {!showForm ? (
          <motion.div
            key="metrics"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <motion.span key={count} initial={{ scale: 1.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                className="font-mono text-lg font-bold text-accent min-w-[20px] text-center neon-text-accent">
                {count}
              </motion.span>
              <span className="text-xs text-muted-foreground">meetings</span>
            </div>
            <div className="w-px h-6 bg-border/30" />
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-muted-foreground" />
              <span className="font-mono text-sm font-bold text-foreground">
                {hours}h{minutes.toString().padStart(2, "0")}
              </span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Meeting title..."
              className="h-8 text-xs bg-background/40 border-border/30"
              autoFocus
            />
            <div className="flex gap-2">
              <Select value={durationH} onValueChange={setDurationH}>
                <SelectTrigger className="h-8 text-xs bg-background/40 border-border/30 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                  {[0,1,2,3,4,5,6,7,8].map(h => (
                    <SelectItem key={h} value={String(h)}>{h}h</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={durationM} onValueChange={setDurationM}>
                <SelectTrigger className="h-8 text-xs bg-background/40 border-border/30 flex-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                  {[0,5,10,15,20,25,30,35,40,45,50,55].map(m => (
                    <SelectItem key={m} value={String(m)}>{m}min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger className="h-8 text-xs bg-background/40 border-border/30">
                <SelectValue placeholder="Project (optional)" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                <SelectItem value="none">No project</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={summaryId} onValueChange={setSummaryId}>
              <SelectTrigger className="h-8 text-xs bg-background/40 border-border/30">
                <Link2 className="w-3 h-3 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Link Meet Agent transcript" />
              </SelectTrigger>
              <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                <SelectItem value="none">No transcript</SelectItem>
                {summaries.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="truncate">{s.title || `Transcript ${s.meeting_date || s.created_at.split("T")[0]}`}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              size="sm"
              className="h-8 text-xs font-bold gap-1.5"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Save className="w-3 h-3" />
              {saving ? "Saving..." : "Save Meeting"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MeetingMetricsCard;
