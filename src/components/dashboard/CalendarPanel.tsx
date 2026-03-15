import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Video, Plus, ExternalLink, Loader2, ChevronLeft, ChevronRight, Clock, MapPin, X } from "lucide-react";
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

interface CalendarPanelProps {
  open: boolean;
  onClose: () => void;
}

const CalendarPanel = ({ open, onClose }: CalendarPanelProps) => {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);

  // Create form state
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

  useEffect(() => {
    if (open) fetchEvents();
  }, [open, fetchEvents]);

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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-[64px] md:left-[224px] top-0 bottom-0 w-[340px] z-40 flex flex-col border-r border-border/30 overflow-hidden"
          style={{ background: "var(--gradient-sidebar)" }}
        >
          {/* Header */}
          <div className="px-4 py-4 border-b border-border/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-display text-base gradient-text">Calendário</span>
            </div>
            <motion.button onClick={onClose} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
              <X className="w-4 h-4" />
            </motion.button>
          </div>

          {!connected && !loading ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center stat-card">
                <Calendar className="w-8 h-8 text-primary/50" />
              </div>
              <p className="text-sm text-muted-foreground text-center">Conecte seu Google Calendar para ver suas reuniões</p>
              <Button onClick={handleConnect} className="font-bold" style={{ background: "var(--gradient-primary)" }}>
                Conectar Calendar
              </Button>
            </div>
          ) : (
            <>
              {/* Date nav */}
              <div className="px-4 py-3 border-b border-border/20">
                <div className="flex items-center justify-between mb-2">
                  <motion.button onClick={() => navigateDate(-1)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                  </motion.button>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground capitalize">{dateLabel}</p>
                    {!isToday && (
                      <button onClick={goToToday} className="text-[10px] text-primary hover:text-accent transition-colors font-semibold">
                        Ir para hoje
                      </button>
                    )}
                  </div>
                  <motion.button onClick={() => navigateDate(1)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Quick week nav */}
                <div className="flex gap-1 justify-center">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() - d.getDay() + i);
                    const isSelected = d.toDateString() === selectedDate.toDateString();
                    const isTodayDot = d.toDateString() === new Date().toDateString();
                    return (
                      <button
                        key={i}
                        onClick={() => { setSelectedDate(d); fetchEvents(d); }}
                        className={`w-9 h-9 rounded-lg flex flex-col items-center justify-center text-[10px] transition-all ${
                          isSelected ? "bg-primary/20 text-primary border border-primary/30" : "text-muted-foreground hover:bg-secondary/50"
                        }`}
                      >
                        <span className="font-semibold uppercase">{d.toLocaleDateString("pt-BR", { weekday: "narrow" })}</span>
                        <span className={`text-[11px] font-bold ${isTodayDot && !isSelected ? "text-accent" : ""}`}>{d.getDate()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Events list */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-lg" />
                  ))
                ) : events.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 text-primary/30" />
                    <p className="text-xs">Nenhum evento neste dia</p>
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
                        className={`stat-card rounded-lg p-3 transition-all ${isPast ? "opacity-50" : ""} ${isNow ? "border-primary/30 animate-pulse-glow" : ""}`}
                      >
                        <div className="flex items-start gap-2">
                          <div className={`w-1 h-full min-h-[36px] rounded-full flex-shrink-0 mt-0.5 ${isNow ? "bg-primary" : isPast ? "bg-muted-foreground/30" : "bg-accent/50"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              <span className="text-[11px] text-muted-foreground font-mono">
                                {event.allDay ? "Dia inteiro" : (
                                  <>
                                    {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                    {" — "}
                                    {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                                  </>
                                )}
                              </span>
                              {isNow && <span className="text-[9px] font-bold text-primary uppercase tracking-wider animate-pulse">Agora</span>}
                            </div>
                            {event.location && !event.location.startsWith("http") && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-[10px] text-muted-foreground truncate">{event.location}</span>
                              </div>
                            )}
                          </div>
                          {callLink && (
                            <a href={callLink} target="_blank" rel="noopener noreferrer"
                              className="px-2 py-1 rounded-md text-[10px] font-semibold text-accent flex-shrink-0 hover:bg-accent/15 transition-colors"
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

              {/* Create event section */}
              <div className="border-t border-border/20 px-4 py-3">
                {!showCreateForm ? (
                  <Button onClick={() => { setShowCreateForm(true); setFormDate(selectedDate.toLocaleDateString("en-CA")); }}
                    className="w-full h-9 gap-2 font-bold text-xs"
                    style={{ background: "var(--gradient-primary)", boxShadow: "0 0 15px rgba(14,165,195,0.2)" }}>
                    <Plus className="w-3.5 h-3.5" />
                    Novo Evento
                  </Button>
                ) : (
                  <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onSubmit={handleCreate}
                    className="space-y-2"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-foreground">Novo Evento</span>
                      <button type="button" onClick={() => setShowCreateForm(false)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Título do evento" className="h-8 text-xs bg-secondary/60 border-border/30" required />
                    <div className="grid grid-cols-3 gap-2">
                      <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="h-8 text-xs bg-secondary/60 border-border/30" required />
                      <Input type="time" value={formStart} onChange={e => setFormStart(e.target.value)} className="h-8 text-xs bg-secondary/60 border-border/30" required />
                      <Input type="time" value={formEnd} onChange={e => setFormEnd(e.target.value)} className="h-8 text-xs bg-secondary/60 border-border/30" required />
                    </div>
                    <Input value={formLink} onChange={e => setFormLink(e.target.value)} placeholder="Link da call (opcional)" className="h-8 text-xs bg-secondary/60 border-border/30" />
                    <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Descrição (opcional)" className="text-xs bg-secondary/60 border-border/30 h-14 resize-none" />
                    <Button type="submit" disabled={creating} className="w-full h-8 text-xs font-bold"
                      style={{ background: "var(--gradient-primary)" }}>
                      {creating ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                      {creating ? "Criando..." : "Criar Evento"}
                    </Button>
                  </motion.form>
                )}
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CalendarPanel;
