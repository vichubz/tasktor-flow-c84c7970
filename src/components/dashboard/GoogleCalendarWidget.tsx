import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Video, Plus, ExternalLink, Loader2, Unplug } from "lucide-react";
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

const GoogleCalendarWidget = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduling, setScheduling] = useState(false);

  // Schedule form
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

      const res = await supabase.functions.invoke("google-calendar-events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (res.error) throw res.error;
      const result = res.data;

      setConnected(result.connected);
      setEvents(result.events || []);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchEvents();
    // Refresh every 5 min
    const interval = setInterval(fetchEvents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  // Check if just connected
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
      if (res.data?.url) {
        window.location.href = res.data.url;
      }
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
        body: {
          title: schedTitle,
          date: schedDate,
          startTime: schedStart,
          endTime: schedEnd,
          description: schedDesc || undefined,
          meetLink: schedLink || undefined,
        },
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

  // Find next upcoming event
  const now = new Date();
  const nextEvent = events.find(e => new Date(e.start) > now);
  const totalMeetings = events.length;

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl stat-card">
        <Loader2 className="w-4 h-4 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Calendar...</span>
      </div>
    );
  }

  if (!connected) {
    return (
      <motion.button
        onClick={handleConnect}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className="flex items-center gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all group"
        style={{
          background: "linear-gradient(145deg, rgba(14, 165, 195, 0.08), rgba(8, 18, 22, 0.8))",
          border: "1px solid rgba(14, 165, 195, 0.12)",
        }}
      >
        <Calendar className="w-4 h-4 text-primary group-hover:text-accent transition-colors" />
        <span className="text-xs font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
          Conectar Calendar
        </span>
      </motion.button>
    );
  }

  const callLink = nextEvent?.meetLink || (nextEvent?.location?.startsWith("http") ? nextEvent.location : null);

  return (
    <>
      <div className="flex items-center gap-3">
        {/* Total meetings today */}
        <motion.div
          whileHover={{ scale: 1.04, y: -2 }}
          className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-default relative overflow-hidden group"
          style={{
            background: "linear-gradient(145deg, rgba(14, 165, 195, 0.08), rgba(8, 18, 22, 0.8))",
            border: "1px solid rgba(14, 165, 195, 0.12)",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <motion.div
            className="w-9 h-9 rounded-lg flex items-center justify-center relative z-10"
            style={{ background: "linear-gradient(135deg, rgba(14, 165, 195, 0.2), rgba(14, 165, 195, 0.05))" }}
          >
            <Video className="w-4 h-4 text-primary" />
          </motion.div>
          <div className="flex flex-col relative z-10">
            <span className="text-[10px] text-muted-foreground leading-none mb-1 font-medium uppercase tracking-wider">Reuniões</span>
            <motion.span
              key={totalMeetings}
              initial={{ opacity: 0, scale: 1.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-foreground font-mono text-lg font-bold neon-text-primary"
            >
              {totalMeetings}
            </motion.span>
          </div>
        </motion.div>

        {/* Next meeting */}
        <motion.div
          whileHover={{ scale: 1.02, y: -2 }}
          className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-default relative overflow-hidden group"
          style={{
            background: "linear-gradient(145deg, rgba(14, 165, 195, 0.06), rgba(45, 190, 160, 0.03), rgba(8, 18, 22, 0.85))",
            border: "1px solid rgba(14, 165, 195, 0.10)",
          }}
        >
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] text-muted-foreground leading-none mb-1 font-medium uppercase tracking-wider">Próxima</span>
            {nextEvent ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-foreground font-semibold truncate max-w-[120px]">
                  {nextEvent.title}
                </span>
                <span className="text-[10px] text-primary font-mono">
                  {new Date(nextEvent.start).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {callLink && (
                  <motion.a
                    href={callLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={{ scale: 1.15 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-6 h-6 rounded-md flex items-center justify-center text-accent hover:text-accent-foreground transition-colors"
                    style={{ background: "rgba(45, 190, 160, 0.15)" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </motion.a>
                )}
              </div>
            ) : (
              <span className="text-xs text-muted-foreground/60">Sem reuniões</span>
            )}
          </div>
        </motion.div>

        {/* Schedule button */}
        <motion.button
          onClick={() => setShowSchedule(true)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-9 h-9 rounded-lg flex items-center justify-center transition-all"
          style={{
            background: "linear-gradient(135deg, rgba(14, 165, 195, 0.15), rgba(14, 165, 195, 0.05))",
            border: "1px solid rgba(14, 165, 195, 0.12)",
          }}
        >
          <Plus className="w-4 h-4 text-primary" />
        </motion.button>

        {/* Disconnect */}
        <motion.button
          onClick={handleDisconnect}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/30 hover:text-destructive transition-colors"
        >
          <Unplug className="w-3.5 h-3.5" />
        </motion.button>
      </div>

      {/* Schedule Dialog */}
      <Dialog open={showSchedule} onOpenChange={setShowSchedule}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display gradient-text">Agendar Reunião</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSchedule} className="space-y-4">
            <div className="input-glow rounded-lg">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Título *</label>
              <Input
                value={schedTitle}
                onChange={e => setSchedTitle(e.target.value)}
                placeholder="Nome da reunião"
                className="bg-secondary/60 border-border/30"
                required
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="input-glow rounded-lg">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Data *</label>
                <Input
                  type="date"
                  value={schedDate}
                  onChange={e => setSchedDate(e.target.value)}
                  className="bg-secondary/60 border-border/30"
                  required
                />
              </div>
              <div className="input-glow rounded-lg">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Início *</label>
                <Input
                  type="time"
                  value={schedStart}
                  onChange={e => setSchedStart(e.target.value)}
                  className="bg-secondary/60 border-border/30"
                  required
                />
              </div>
              <div className="input-glow rounded-lg">
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fim *</label>
                <Input
                  type="time"
                  value={schedEnd}
                  onChange={e => setSchedEnd(e.target.value)}
                  className="bg-secondary/60 border-border/30"
                  required
                />
              </div>
            </div>
            <div className="input-glow rounded-lg">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Link da call</label>
              <Input
                value={schedLink}
                onChange={e => setSchedLink(e.target.value)}
                placeholder="https://meet.google.com/..."
                className="bg-secondary/60 border-border/30"
              />
            </div>
            <div className="input-glow rounded-lg">
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descrição</label>
              <Textarea
                value={schedDesc}
                onChange={e => setSchedDesc(e.target.value)}
                placeholder="Opcional"
                className="bg-secondary/60 border-border/30 h-20 resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={scheduling}
              className="w-full font-bold"
              style={{ background: "var(--gradient-primary)", boxShadow: "0 0 20px rgba(14,165,195,0.3)" }}
            >
              {scheduling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {scheduling ? "Agendando..." : "Agendar Reunião"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default GoogleCalendarWidget;
