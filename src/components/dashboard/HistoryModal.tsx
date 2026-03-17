import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Trash2, Check, X, Video, Calendar, Filter, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;
type MeetingLog = Tables<"meeting_logs">;

interface HistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
}

const HistoryModal = ({ open, onOpenChange, projects }: HistoryModalProps) => {
  const { user } = useAuth();
  const [tab, setTab] = useState("effort");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card/95 backdrop-blur-xl border-border/30 max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display gradient-text text-xl">Histórico</DialogTitle>
        </DialogHeader>
        <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="bg-secondary/50 border border-border/20">
            <TabsTrigger value="effort" className="gap-1.5 data-[state=active]:bg-amber-500/15 data-[state=active]:text-amber-500">
              <Zap className="w-3.5 h-3.5" /> Esforço
            </TabsTrigger>
            <TabsTrigger value="meetings" className="gap-1.5 data-[state=active]:bg-accent/15 data-[state=active]:text-accent">
              <Video className="w-3.5 h-3.5" /> Reuniões
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-1.5 data-[state=active]:bg-primary/15 data-[state=active]:text-primary">
              <Calendar className="w-3.5 h-3.5" /> Agenda
            </TabsTrigger>
          </TabsList>
          <TabsContent value="effort" className="flex-1 overflow-hidden mt-3">
            <EffortHistoryTab projects={projects} />
          </TabsContent>
          <TabsContent value="meetings" className="flex-1 overflow-hidden mt-3">
            <MeetingsHistoryTab />
          </TabsContent>
          <TabsContent value="calendar" className="flex-1 overflow-hidden mt-3">
            <CalendarTab />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

/* ===== EFFORT HISTORY TAB ===== */
const EffortHistoryTab = ({ projects }: { projects: Project[] }) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProject, setFilterProject] = useState("all");
  const [filterDate, setFilterDate] = useState("");

  const fetchTasks = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("tasks")
      .select("id, title, difficulty, completed_at, project_id, project:projects(name, color)")
      .eq("user_id", user.id)
      .eq("is_completed", true)
      .order("completed_at", { ascending: false })
      .limit(200);
    if (filterProject !== "all") query = query.eq("project_id", filterProject);
    if (filterDate) {
      query = query.gte("completed_at", `${filterDate}T00:00:00`).lte("completed_at", `${filterDate}T23:59:59`);
    }
    const { data } = await query;
    setTasks(data || []);
    setLoading(false);
  }, [user, filterProject, filterDate]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const totalPoints = tasks.reduce((sum, t) => sum + Math.max(t.difficulty || 0, 1), 0);

  const getDifficultyIcons = (d: number) => {
    const level = Math.max(d || 0, 1);
    return Array.from({ length: level }, (_, i) => (
      <Zap key={i} className="w-3 h-3 text-amber-500 inline" />
    ));
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="h-8 w-40 bg-secondary/50 border-border/30 text-xs" />
          {filterDate && <button onClick={() => setFilterDate("")} className="text-xs text-muted-foreground hover:text-foreground">✕</button>}
        </div>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-40 h-8 bg-secondary/50 border-border/30 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
            <SelectItem value="all">Todos</SelectItem>
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
        <span className="text-xs font-mono text-muted-foreground ml-auto">
          Total: <span className="text-amber-500 font-bold">{totalPoints} pts</span>
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-border/20">
        <Table>
          <TableHeader>
            <TableRow className="border-border/20 hover:bg-transparent">
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Tarefa</TableHead>
              <TableHead className="text-xs">Projeto</TableHead>
              <TableHead className="text-xs">Dificuldade</TableHead>
              <TableHead className="text-xs">Pontos</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/10">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : tasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
                  Nenhuma tarefa concluída encontrada
                </TableCell>
              </TableRow>
            ) : (
              tasks.map(task => (
                <TableRow key={task.id} className="border-border/10 hover:bg-secondary/20">
                  <TableCell className="text-xs font-mono">
                    {task.completed_at ? new Date(task.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-foreground truncate max-w-[200px]">{task.title}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project?.color || "#666" }} />
                      {task.project?.name || "Sem projeto"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-0.5">
                      {getDifficultyIcons(task.difficulty)}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono font-bold text-amber-500">
                    {Math.max(task.difficulty || 0, 1)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

/* ===== MEETINGS HISTORY TAB ===== */
const MeetingsHistoryTab = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<MeetingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [editHours, setEditHours] = useState("");

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    let query = supabase.from("meeting_logs").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(100);
    if (filterDate) query = query.eq("date", filterDate);
    const { data } = await query;
    setLogs(data || []);
    setLoading(false);
  }, [user, filterDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalMeetings = logs.reduce((sum, l) => sum + l.meeting_count, 0);
  const totalHours = logs.reduce((sum, l) => sum + Number(l.hours), 0);

  const startEdit = (log: MeetingLog) => {
    setEditingId(log.id);
    setEditCount(log.meeting_count);
    const h = Math.floor(Number(log.hours));
    const m = Math.round((Number(log.hours) - h) * 60);
    setEditHours(`${h}:${m.toString().padStart(2, "0")}`);
  };

  const saveEdit = async (id: string) => {
    const [h, m] = editHours.split(":").map(Number);
    const newHours = (h || 0) + (m || 0) / 60;
    await supabase.from("meeting_logs").update({ meeting_count: editCount, hours: newHours }).eq("id", id);
    setEditingId(null);
    toast.success("Registro atualizado");
    fetchLogs();
  };

  const deleteLog = async (id: string) => {
    await supabase.from("meeting_logs").delete().eq("id", id);
    toast.success("Registro excluído");
    fetchLogs();
  };

  const formatHours = (h: number) => {
    const hrs = Math.floor(h);
    const mins = Math.round((h - hrs) * 60);
    return `${hrs}h${mins.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
            className="h-8 w-40 bg-secondary/50 border-border/30 text-xs" />
          {filterDate && <button onClick={() => setFilterDate("")} className="text-xs text-muted-foreground hover:text-foreground">✕</button>}
        </div>
        <div className="flex items-center gap-4 ml-auto text-xs font-mono text-muted-foreground">
          <span>Reuniões: <span className="text-foreground font-bold">{totalMeetings}</span></span>
          <span>Tempo: <span className="text-foreground font-bold">{formatHours(totalHours)}</span></span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto rounded-lg border border-border/20">
        <Table>
          <TableHeader>
            <TableRow className="border-border/20 hover:bg-transparent">
              <TableHead className="text-xs">Data</TableHead>
              <TableHead className="text-xs">Reuniões</TableHead>
              <TableHead className="text-xs">Tempo</TableHead>
              <TableHead className="text-xs w-20"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/10">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            ) : (
              logs.map(log => (
                <TableRow key={log.id} className="border-border/10 hover:bg-secondary/20">
                  <TableCell className="text-xs font-mono">{log.date}</TableCell>
                  <TableCell className="text-xs font-mono">
                    {editingId === log.id ? (
                      <Input type="number" value={editCount} onChange={e => setEditCount(Number(e.target.value))} min={0}
                        className="h-7 w-16 text-xs bg-secondary/50 border-border/30" />
                    ) : log.meeting_count}
                  </TableCell>
                  <TableCell className="text-xs font-mono">
                    {editingId === log.id ? (
                      <Input value={editHours} onChange={e => setEditHours(e.target.value)} placeholder="H:MM"
                        className="h-7 w-20 text-xs bg-secondary/50 border-border/30" />
                    ) : formatHours(Number(log.hours))}
                  </TableCell>
                  <TableCell>
                    {editingId === log.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => saveEdit(log.id)} className="w-6 h-6 rounded flex items-center justify-center text-success hover:bg-success/15 transition-colors">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:bg-secondary/50 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(log)} className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors">
                          <Pencil className="w-3 h-3" />
                        </button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="w-6 h-6 rounded flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="bg-card/95 backdrop-blur-xl border-border/30">
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
                              <AlertDialogDescription>Tem certeza que deseja excluir este registro de reunião?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteLog(log.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

/* ===== CALENDAR TAB ===== */
const CalendarTab = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const res = await supabase.functions.invoke("google-calendar-events", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.error) throw res.error;
        setConnected(res.data.connected);
        setEvents(res.data.events || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Calendar className="w-10 h-10 mx-auto mb-3 text-primary/40" />
        <p className="text-sm">Google Calendar não conectado</p>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Calendar className="w-10 h-10 mx-auto mb-3 text-primary/40" />
        <p className="text-sm">Nenhuma reunião agendada para hoje</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto space-y-2">
      {events.map((event: any) => {
        const start = new Date(event.start);
        const end = new Date(event.end);
        const isPast = end < new Date();
        const isNow = start <= new Date() && end >= new Date();
        const callLink = event.meetLink || (event.location?.startsWith("http") ? event.location : null);

        return (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`stat-card rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${isPast ? "opacity-50" : ""} ${isNow ? "border-primary/30 animate-pulse-glow" : ""}`}
          >
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={`w-1 h-10 rounded-full ${isNow ? "bg-primary" : isPast ? "bg-muted-foreground/30" : "bg-accent/50"}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">{event.title}</p>
                <p className="text-xs text-muted-foreground font-mono">
                  {start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  {" — "}
                  {end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
            {isNow && <span className="text-[10px] font-bold text-primary uppercase tracking-wider animate-pulse">Agora</span>}
            {callLink && (
              <a href={callLink} target="_blank" rel="noopener noreferrer"
                className="px-3 py-1.5 rounded-md text-xs font-semibold text-accent hover:bg-accent/15 transition-colors flex-shrink-0"
                style={{ background: "rgba(45, 190, 160, 0.1)" }}>
                Entrar
              </a>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default HistoryModal;
