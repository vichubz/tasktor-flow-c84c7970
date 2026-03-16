import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Video, Plus, Trash2, Clock, FolderKanban, FileText, Link2, X, Loader2, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Meeting = Tables<"meetings"> & { project?: Tables<"projects"> | null; summary?: Tables<"meeting_summaries"> | null };
type Project = Tables<"projects">;

const MeetingsPage = () => {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [summaries, setSummaries] = useState<Tables<"meeting_summaries">[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [linkingId, setLinkingId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formProjectId, setFormProjectId] = useState<string>("none");
  const [formDurationH, setFormDurationH] = useState("0");
  const [formDurationM, setFormDurationM] = useState("30");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchMeetings = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("meetings")
      .select("*, project:projects(id, name, color), summary:meeting_summaries(id, title, result)")
      .eq("user_id", user.id)
      .eq("meeting_date", selectedDate)
      .order("created_at", { ascending: false });
    if (error) { console.error(error); toast.error("Erro ao carregar reuniões"); }
    else setMeetings((data as Meeting[]) || []);
    setLoading(false);
  }, [user, selectedDate]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("name");
    if (data) setProjects(data);
  }, [user]);

  const fetchSummaries = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("meeting_summaries").select("id, title, result, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);
    if (data) setSummaries(data as Tables<"meeting_summaries">[]);
  }, [user]);

  useEffect(() => { fetchMeetings(); }, [fetchMeetings]);
  useEffect(() => { fetchProjects(); fetchSummaries(); }, [fetchProjects, fetchSummaries]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !user) return;
    setSaving(true);
    const durationMinutes = parseInt(formDurationH) * 60 + parseInt(formDurationM);
    const { error } = await supabase.from("meetings").insert({
      user_id: user.id,
      title: formTitle.trim(),
      project_id: formProjectId === "none" ? null : formProjectId,
      duration_minutes: durationMinutes,
      description: formDesc.trim() || null,
      meeting_date: formDate,
    });
    if (error) { toast.error("Erro ao criar reunião"); }
    else {
      toast.success("Reunião registrada!");
      // Update meeting_logs
      await upsertMeetingLog(formDate);
      setFormTitle(""); setFormDesc(""); setFormProjectId("none"); setFormDurationH("0"); setFormDurationM("30");
      setShowForm(false);
      fetchMeetings();
    }
    setSaving(false);
  };

  const upsertMeetingLog = async (date: string) => {
    if (!user) return;
    // Recalculate from meetings table
    const { data: allMeetings } = await supabase.from("meetings").select("duration_minutes").eq("user_id", user.id).eq("meeting_date", date);
    if (!allMeetings) return;
    const totalMinutes = allMeetings.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
    const totalHours = totalMinutes / 60;
    const count = allMeetings.length;

    const { data: existing } = await supabase.from("meeting_logs").select("id").eq("user_id", user.id).eq("date", date).maybeSingle();
    if (existing) {
      await supabase.from("meeting_logs").update({ hours: totalHours, meeting_count: count }).eq("id", existing.id);
    } else {
      await supabase.from("meeting_logs").insert({ user_id: user.id, date, hours: totalHours, meeting_count: count });
    }
  };

  const handleDelete = async (id: string) => {
    const prev = [...meetings];
    setMeetings(m => m.filter(x => x.id !== id));
    const { error } = await supabase.from("meetings").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir"); setMeetings(prev); }
    else {
      toast.success("Reunião excluída");
      await upsertMeetingLog(selectedDate);
    }
  };

  const handleLinkSummary = async (meetingId: string, summaryId: string) => {
    const { error } = await supabase.from("meetings").update({ summary_id: summaryId === "none" ? null : summaryId }).eq("id", meetingId);
    if (error) toast.error("Erro ao vincular");
    else { toast.success("Transcrição vinculada!"); setLinkingId(null); fetchMeetings(); }
  };

  const totalMinutes = meetings.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;

  return (
    <div className="flex-1 flex flex-col h-full p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Video className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold gradient-text">Reuniões</h1>
            <p className="text-xs text-muted-foreground">Registre e gerencie suas reuniões</p>
          </div>
        </div>
        <Button onClick={() => { setShowForm(true); setFormDate(selectedDate); }} className="gap-2 font-bold text-xs" style={{ background: "var(--gradient-primary)", boxShadow: "0 0 15px rgba(14,165,195,0.2)" }}>
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nova Reunião</span>
        </Button>
      </div>

      {/* Date + Stats */}
      <div className="flex items-center gap-4 mb-4">
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="bg-secondary/60 border-border/30 w-44" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Video className="w-4 h-4 text-accent" />
          <span className="font-mono font-bold text-accent">{meetings.length}</span>
          <span>reuniões</span>
          <span className="text-muted-foreground/40">•</span>
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-mono font-bold text-foreground">{totalH}h{totalM.toString().padStart(2, "0")}</span>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.form initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} onSubmit={handleCreate} className="stat-card rounded-xl p-4 space-y-3 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Nova Reunião</span>
              <button type="button" onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título da reunião" className="bg-secondary/60 border-border/30" required />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="bg-secondary/60 border-border/30" required />
              <Select value={formProjectId} onValueChange={setFormProjectId}>
                <SelectTrigger className="bg-secondary/60 border-border/30"><SelectValue placeholder="Projeto" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem projeto</SelectItem>
                  {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-1">
                <Input type="number" min="0" max="23" value={formDurationH} onChange={e => setFormDurationH(e.target.value)} className="bg-secondary/60 border-border/30 w-16" />
                <span className="text-xs text-muted-foreground">h</span>
                <Input type="number" min="0" max="59" step="5" value={formDurationM} onChange={e => setFormDurationM(e.target.value)} className="bg-secondary/60 border-border/30 w-16" />
                <span className="text-xs text-muted-foreground">m</span>
              </div>
            </div>
            <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descrição / anotações (opcional)" className="bg-secondary/60 border-border/30 resize-none" />
            <Button type="submit" disabled={saving} className="w-full font-bold" style={{ background: "var(--gradient-primary)" }}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {saving ? "Salvando..." : "Registrar Reunião"}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Meetings list */}
      <div className="flex-1 space-y-2">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl shimmer" />
          ))
        ) : meetings.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Video className="w-10 h-10 mx-auto mb-3 text-primary/30" />
            <p className="text-sm">Nenhuma reunião registrada neste dia</p>
          </div>
        ) : (
          meetings.map((meeting, i) => (
            <motion.div key={meeting.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="stat-card rounded-xl p-4 group">
              <div className="flex items-start gap-3">
                <div className="w-1 min-h-[40px] rounded-full flex-shrink-0 mt-0.5" style={{ background: meeting.project?.color || "hsl(var(--accent))" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{meeting.title}</p>
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">
                        {Math.floor(meeting.duration_minutes / 60)}h{(meeting.duration_minutes % 60).toString().padStart(2, "0")}
                      </span>
                    </div>
                    {meeting.project && (
                      <div className="flex items-center gap-1">
                        <FolderKanban className="w-3 h-3" style={{ color: meeting.project.color }} />
                        <span className="text-[10px] font-bold" style={{ color: meeting.project.color }}>{meeting.project.name}</span>
                      </div>
                    )}
                    {meeting.summary && (
                      <div className="flex items-center gap-1 text-accent">
                        <FileText className="w-3 h-3" />
                        <span className="text-[10px] font-bold">Transcrição vinculada</span>
                      </div>
                    )}
                  </div>
                  {meeting.description && (
                    <p className="text-xs text-muted-foreground/70 mt-1.5 line-clamp-2">{meeting.description}</p>
                  )}

                  {/* Linked summary preview */}
                  {meeting.summary && (
                    <div className="mt-2 p-2 rounded-lg bg-accent/5 border border-accent/10">
                      <p className="text-[11px] font-semibold text-accent mb-1">{meeting.summary.title || "Resumo"}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-3">{meeting.summary.result?.slice(0, 200)}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  {linkingId === meeting.id ? (
                    <div className="flex items-center gap-1">
                      <Select onValueChange={(v) => handleLinkSummary(meeting.id, v)}>
                        <SelectTrigger className="h-7 text-xs bg-secondary/60 border-border/30 w-40"><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma</SelectItem>
                          {summaries.map(s => <SelectItem key={s.id} value={s.id}>{s.title || "Sem título"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <button onClick={() => setLinkingId(null)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <motion.button onClick={() => setLinkingId(meeting.id)} whileHover={{ scale: 1.1 }} className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-accent transition-all p-1" title="Vincular transcrição">
                      <Link2 className="w-4 h-4" />
                    </motion.button>
                  )}
                  <motion.button onClick={() => handleDelete(meeting.id)} whileHover={{ scale: 1.1 }} className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all p-1" title="Excluir">
                    <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default MeetingsPage;
