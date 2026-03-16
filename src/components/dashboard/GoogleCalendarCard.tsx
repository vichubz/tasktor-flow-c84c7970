import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, ExternalLink, Loader2, Plus, Unplug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  meetLink: string | null;
  location: string | null;
}

const GoogleCalendarCard = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  const [schedTitle, setSchedTitle] = useState("");
  const [schedDate, setSchedDate] = useState(new Date().toISOString().split("T")[0]);
  const [schedStart, setSchedStart] = useState("09:00");
  const [schedEnd, setSchedEnd] = useState("10:00");
  const [schedLink, setSchedLink] = useState("");
  const [schedDesc, setSchedDesc] = useState("");

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await supabase.functions.invoke("google-calendar-events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { timeZone },
      });
      if (res.error) throw res.error;
      setConnected(res.data.connected);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("calendar") === "connected") {
      toast.success("Google Calendar conectado!");
      window.history.replaceState({}, "", "/dashboard");
      fetchEvents();
    }
  }, [fetchEvents]);

  const handleConnect = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await supabase.functions.invoke("google-calendar-auth", {
        body: { user_id: user.id, origin: window.location.origin },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      if (res.data?.url) window.location.href = res.data.url;
    } catch (err: any) {
      toast.error("Erro ao conectar: " + (err.message || "tente novamente"));
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    await supabase.from("google_tokens").delete().eq("user_id", user.id);
    setConnected(false);
    setEvents([]);
    toast.success("Google Calendar desconectado");
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedTitle || !schedDate || !schedStart || !schedEnd) return;
    setScheduling(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("google-calendar-create-event", {
        body: { title: schedTitle, date: schedDate, startTime: schedStart, endTime: schedEnd, description: schedDesc || undefined, meetLink: schedLink || undefined },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      toast.success("Reunião agendada!");
      setShowSchedule(false);
      setSchedTitle("");
      setSchedDesc("");
      setSchedLink("");
      fetchEvents();
    } catch (err: any) {
      toast.error("Erro ao agendar: " + (err.message || "tente novamente"));
    } finally {
      setScheduling(false);
    }
  };

  const now = new Date();
  const nextEvent = events.find(e => new Date(e.start) > now);
  const callLink = nextEvent?.meetLink || (nextEvent?.location?.startsWith("http") ? nextEvent.location : null);

  if (loading) {
    return (
      <div className="stat-card-calendar rounded-xl px-4 py-3 flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Calendar...</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <motion.button
        onClick={handleConnect}
        whileHover={{ scale: 1.02, y: -2 }}
        whileTap={{ scale: 0.98 }}
        className="stat-card-calendar rounded-xl px-4 py-3 flex items-center justify-center gap-2 cursor-pointer group"
      >
        <Calendar className="w-4 h-4 text-primary group-hover:text-accent transition-colors" />
        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          Conectar Calendar
        </span>
      </motion.button>
    );
  }

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        className="stat-card-calendar rounded-xl px-4 py-3 flex flex-col gap-2 card-lift h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
              <Calendar className="w-3.5 h-3.5 text-primary icon-pulse" />
            </div>
            <span className="text-xs text-foreground/90 font-semibold uppercase tracking-wider">Agenda</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono font-bold text-primary neon-text-primary">{events.length}</span>
            <span className="text-[9px] text-muted-foreground">hoje</span>
            <motion.button onClick={() => setShowSchedule(true)} whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
              className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center text-primary ml-1">
              <Plus className="w-3 h-3" />
            </motion.button>
            <motion.button onClick={handleDisconnect} whileHover={{ scale: 1.1 }}
              className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground/30 hover:text-destructive transition-colors ml-0.5">
              <Unplug className="w-3 h-3" />
            </motion.button>
          </div>
        </div>

        {/* Next meeting */}
        <div className="flex items-center gap-2 min-w-0">
          {nextEvent ? (
            <>
              <span className="text-xs text-foreground font-semibold truncate flex-1">{nextEvent.title}</span>
              <span className="text-[10px] text-primary font-mono flex-shrink-0 neon-text-primary">
                {new Date(nextEvent.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              {callLink && (
                <motion.a href={callLink} target="_blank" rel="noopener noreferrer"
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-accent flex-shrink-0"
                  style={{ background: "rgba(45, 190, 160, 0.15)" }}>
                  <ExternalLink className="w-3 h-3" />
                </motion.a>
              )}
            </>
          ) : (
            <span className="text-xs text-muted-foreground/60">Sem reuniões agendadas</span>
          )}
        </div>
      </motion.div>

      {/* Schedule Dialog */}
      {showSchedule && (
        <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
          <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display gradient-text">Agendar Reunião</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSchedule} className="space-y-4">
              <div className="input-glow rounded-lg">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Título *</label>
                <Input value={schedTitle} onChange={e => setSchedTitle(e.target.value)} placeholder="Nome da reunião" className="bg-secondary/60 border-border/30" required />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="input-glow rounded-lg">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Data *</label>
                  <Input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} className="bg-secondary/60 border-border/30" required />
                </div>
                <div className="input-glow rounded-lg">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Início *</label>
                  <Input type="time" value={schedStart} onChange={e => setSchedStart(e.target.value)} className="bg-secondary/60 border-border/30" required />
                </div>
                <div className="input-glow rounded-lg">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fim *</label>
                  <Input type="time" value={schedEnd} onChange={e => setSchedEnd(e.target.value)} className="bg-secondary/60 border-border/30" required />
                </div>
              </div>
              <div className="input-glow rounded-lg">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Link da call</label>
                <Input value={schedLink} onChange={e => setSchedLink(e.target.value)} placeholder="https://meet.google.com/..." className="bg-secondary/60 border-border/30" />
              </div>
              <div className="input-glow rounded-lg">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição</label>
                <Textarea value={schedDesc} onChange={e => setSchedDesc(e.target.value)} placeholder="Opcional" className="bg-secondary/60 border-border/30 h-20 resize-none" />
              </div>
              <Button type="submit" disabled={scheduling} className="w-full font-bold" style={{ background: "var(--gradient-primary)", boxShadow: "0 0 20px rgba(14,165,195,0.3)" }}>
                {scheduling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {scheduling ? "Agendando..." : "Agendar Reunião"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default GoogleCalendarCard;
