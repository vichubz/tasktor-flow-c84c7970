import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Calendar, Plus, Loader2, ChevronLeft, ChevronRight, Clock, MapPin, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  meetLink: string | null;
  location: string | null;
  description: string | null;
  allDay: boolean;
}

const CalendarPage = () => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("10:00");
  const [formLink, setFormLink] = useState("");
  const [formDesc, setFormDesc] = useState("");

  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const fetchEvents = useCallback(async (date?: Date) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const targetDate = date || selectedDate;
      const dateStr = targetDate.toLocaleDateString("en-CA");
      const res = await supabase.functions.invoke("google-calendar-events", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { timeZone, date: dateStr },
      });
      if (res.error) throw res.error;
      setConnected(res.data.connected);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [user, selectedDate, timeZone]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

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

  const navigateDate = (delta: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + delta);
    setSelectedDate(newDate);
    fetchEvents(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    setSelectedDate(today);
    fetchEvents(today);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDate || !formStart || !formEnd) return;
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const res = await supabase.functions.invoke("google-calendar-create-event", {
        body: { title: formTitle, date: formDate, startTime: formStart, endTime: formEnd, description: formDesc || undefined, meetLink: formLink || undefined },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.error) throw res.error;
      toast.success("Evento criado!");
      setShowCreateForm(false);
      setFormTitle("");
      setFormDesc("");
      setFormLink("");
      fetchEvents();
    } catch (err: any) {
      toast.error("Erro: " + (err.message || "tente novamente"));
    } finally {
      setCreating(false);
    }
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const dateLabel = selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const now = new Date();

  // Build full week around selectedDate
  const weekStart = new Date(selectedDate);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  return (
    <div className="flex-1 flex flex-col h-full p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-display font-bold gradient-text">Agenda</h1>
            <p className="text-xs text-muted-foreground">Google Calendar</p>
          </div>
        </div>
        {connected && (
          <Button
            onClick={() => { setShowCreateForm(true); setFormDate(selectedDate.toLocaleDateString("en-CA")); }}
            className="gap-2 font-bold text-xs"
            style={{ background: "var(--gradient-primary)", boxShadow: "0 0 15px rgba(14,165,195,0.2)" }}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Novo Evento</span>
          </Button>
        )}
      </div>

      {!connected && !loading ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-5">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center stat-card">
            <Calendar className="w-10 h-10 text-primary/50" />
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-xs">Conecte seu Google Calendar para ver e gerenciar suas reuniões</p>
          <Button onClick={handleConnect} className="font-bold" style={{ background: "var(--gradient-primary)" }}>
            Conectar Calendar
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1">
          {/* Date navigation */}
          <div className="stat-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <motion.button onClick={() => navigateDate(-1)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </motion.button>
              <div className="text-center">
                <p className="text-sm md:text-base font-semibold text-foreground capitalize">{dateLabel}</p>
                {!isToday && (
                  <button onClick={goToToday} className="text-[11px] text-primary hover:text-accent transition-colors font-semibold mt-0.5">
                    Ir para hoje
                  </button>
                )}
              </div>
              <motion.button onClick={() => navigateDate(1)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Week bar */}
            <div className="flex gap-1.5 justify-center">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + i);
                const isSelected = d.toDateString() === selectedDate.toDateString();
                const isTodayDot = d.toDateString() === new Date().toDateString();
                return (
                  <button
                    key={i}
                    onClick={() => { setSelectedDate(d); fetchEvents(d); }}
                    className={`flex-1 max-w-[56px] py-2 rounded-lg flex flex-col items-center justify-center text-[11px] transition-all ${
                      isSelected ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <span className="font-semibold uppercase">{d.toLocaleDateString("pt-BR", { weekday: "narrow" })}</span>
                    <span className={`text-sm font-bold ${isTodayDot && !isSelected ? "text-accent" : ""}`}>{d.getDate()}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <motion.form
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              onSubmit={handleCreate}
              className="stat-card rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Novo Evento</span>
                <button type="button" onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título do evento" className="bg-secondary/60 border-border/30" required />
              <div className="grid grid-cols-3 gap-2">
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="bg-secondary/60 border-border/30" required />
                <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="bg-secondary/60 border-border/30" required />
                <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="bg-secondary/60 border-border/30" required />
              </div>
              <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="Link da call (opcional)" className="bg-secondary/60 border-border/30" />
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descrição (opcional)" className="bg-secondary/60 border-border/30 resize-none" />
              <Button type="submit" disabled={creating} className="w-full font-bold"
                style={{ background: "var(--gradient-primary)" }}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {creating ? "Criando..." : "Criar Evento"}
              </Button>
            </motion.form>
          )}

          {/* Events list */}
          <div className="flex-1 space-y-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))
            ) : events.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 text-primary/30" />
                <p className="text-sm">Nenhum evento neste dia</p>
              </div>
            ) : (
              events.map((event) => {
                const start = new Date(event.start);
                const end = new Date(event.end);
                const isPast = end < now;
                const isNow = start <= now && end >= now;
                const callLink = event.meetLink || (event.location?.startsWith("http") ? event.location : null);

                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`stat-card rounded-xl p-4 transition-all ${isPast ? "opacity-50" : ""} ${isNow ? "border-primary/30 animate-pulse-glow" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-1 min-h-[40px] rounded-full flex-shrink-0 mt-0.5 ${isNow ? "bg-primary" : isPast ? "bg-muted-foreground/30" : "bg-accent/50"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">{event.title}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-mono">
                            {event.allDay ? "Dia inteiro" : (
                              <>
                                {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                {" — "}
                                {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              </>
                            )}
                          </span>
                          {isNow && <span className="text-[10px] font-bold text-primary uppercase tracking-wider animate-pulse">Agora</span>}
                        </div>
                        {event.location && !event.location.startsWith("http") && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground truncate">{event.location}</span>
                          </div>
                        )}
                      </div>
                      {callLink && (
                        <a href={callLink} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-accent flex-shrink-0 hover:bg-accent/15 transition-colors"
                          style={{ background: "rgba(45, 190, 160, 0.1)" }}>
                          Entrar
                        </a>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
