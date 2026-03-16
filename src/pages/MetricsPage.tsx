import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Area, AreaChart } from "recharts";
import { CalendarDays, Clock, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const useCountUp = (end: number, duration = 600) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration]);
  return count;
};

const MetricsPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState("week");
  const [projects, setProjects] = useState<{ id: string; name: string; color: string }[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [meetingLogs, setMeetingLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const fetchMetrics = async () => {
      const now = new Date();
      let startDate: Date;
      if (period === "today") startDate = new Date(now.toDateString());
      else if (period === "week") { startDate = new Date(now); startDate.setDate(now.getDate() - 7); }
      else { startDate = new Date(now); startDate.setDate(now.getDate() - 30); }
      const startStr = startDate.toISOString();

      try {
        const [tasksRes, projectsRes, timeRes, meetingRes] = await Promise.all([
          supabase.from("tasks").select("id, title, completed_at, project_id, project:projects(name, color)").eq("user_id", user.id).eq("is_completed", true).gte("completed_at", startStr).order("completed_at", { ascending: false }),
          supabase.from("projects").select("id, name, color").eq("user_id", user.id),
          supabase.from("time_entries").select("id, project_id, date, duration_seconds").eq("user_id", user.id).gte("date", startDate.toISOString().split("T")[0]),
          supabase.from("meeting_logs").select("id, date, hours, meeting_count").eq("user_id", user.id).gte("date", startDate.toISOString().split("T")[0]),
        ]);

        if (tasksRes.error || projectsRes.error || timeRes.error || meetingRes.error) {
          toast.error("Erro ao carregar métricas");
        }
        if (tasksRes.data) setCompletedTasks(tasksRes.data);
        if (projectsRes.data) setProjects(projectsRes.data);
        if (timeRes.data) setTimeEntries(timeRes.data);
        if (meetingRes.data) setMeetingLogs(meetingRes.data);
      } catch {
        toast.error("Erro ao carregar métricas");
      }
      setLoading(false);
    };
    fetchMetrics();
  }, [user, period]);

  const totalCompleted = completedTasks.length;
  const totalWorkSeconds = timeEntries.reduce((sum, e) => sum + e.duration_seconds, 0);
  const totalMeetingHours = meetingLogs.reduce((sum, m) => sum + Number(m.hours), 0);
  const daysInPeriod = period === "today" ? 1 : period === "week" ? 7 : 30;
  const avgTasksPerDay = daysInPeriod > 0 ? (totalCompleted / daysInPeriod).toFixed(1) : "0";

  const animatedCompleted = useCountUp(totalCompleted);
  const animatedWorkHours = useCountUp(Math.floor(totalWorkSeconds / 3600));

  const projectTimeData = projects.map(p => ({
    name: p.name,
    value: timeEntries.filter(e => e.project_id === p.id).reduce((s, e) => s + e.duration_seconds, 0) / 3600,
    color: p.color,
  })).filter(d => d.value > 0);

  const tasksByDay: Record<string, number> = {};
  completedTasks.forEach(t => {
    const day = new Date(t.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    tasksByDay[day] = (tasksByDay[day] || 0) + 1;
  });
  const tasksChartData = Object.entries(tasksByDay).map(([date, count]) => ({ date, count }));

  const timeByDay: Record<string, number> = {};
  timeEntries.forEach(e => {
    const day = new Date(e.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    timeByDay[day] = (timeByDay[day] || 0) + e.duration_seconds / 3600;
  });
  const timeChartData = Object.entries(timeByDay).map(([date, hours]) => ({ date, hours: Number(hours.toFixed(1)) }));

  const formatHours = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const mostWorked = projectTimeData.length > 0
    ? projectTimeData.reduce((a, b) => a.value > b.value ? a : b).name
    : "—";

  const statCards = [
    { icon: CheckCircle2, label: "Tarefas Concluídas", value: animatedCompleted.toString(), color: "text-success", glow: "from-success/10" },
    { icon: Clock, label: "Tempo Trabalhado", value: formatHours(totalWorkSeconds), color: "text-primary", glow: "from-primary/10" },
    { icon: CalendarDays, label: "Horas em Reunião", value: `${totalMeetingHours.toFixed(1)}h`, color: "text-accent", glow: "from-accent/10" },
    { icon: TrendingUp, label: "Média Tarefas/Dia", value: avgTasksPerDay, color: "text-primary", glow: "from-primary/10" },
    { icon: Award, label: "Projeto + Trabalhado", value: mostWorked, color: "text-accent", glow: "from-accent/10" },
  ];

  const tooltipStyle = {
    background: "hsl(200 22% 7% / 0.95)",
    border: "1px solid hsl(200 12% 14%)",
    borderRadius: "10px",
    color: "hsl(210 40% 98%)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 20px rgba(14, 165, 195, 0.08)",
    backdropFilter: "blur(12px)",
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto px-3 sm:px-6 py-4 sm:py-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3"
      >
        <h1 className="text-xl sm:text-2xl font-bold font-display text-tight gradient-text">Métricas & Relatórios</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-full sm:w-40 bg-secondary/50 border-border/50 h-9 backdrop-blur-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card/95 backdrop-blur-xl border-border/50">
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, ease: "easeOut" }}
            whileHover={{ y: -2 }}
            className="stat-card rounded-xl p-4 sm:p-5 card-lift relative overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.glow} to-transparent opacity-50 pointer-events-none`} />
            <div className="relative z-10">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3 icon-pulse`} />
              <motion.p
                className="text-xl sm:text-2xl font-bold text-foreground font-mono neon-text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.08 + 0.2 }}
              >
                {stat.value}
              </motion.p>
              <p className="text-xs text-foreground/80 mt-1.5 font-medium uppercase tracking-wide">{stat.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-gradient rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 text-tight font-display">Tarefas Concluídas por Dia</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tasksChartData}>
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(192 80% 40%)" />
                  <stop offset="100%" stopColor="hsl(172 66% 45%)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="hsl(210 15% 58%)" fontSize={11} />
              <YAxis stroke="hsl(210 15% 58%)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-gradient rounded-xl p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 text-tight font-display">Tempo por Projeto</h3>
          {projectTimeData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={180} className="sm:max-w-[60%]">
                <PieChart>
                  <Pie data={projectTimeData} innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="value">
                    {projectTimeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toFixed(1)}h`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2.5">
                {projectTimeData.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color, boxShadow: `0 0 8px ${p.color}40` }} />
                    <span className="text-xs text-muted-foreground truncate flex-1">{p.name}</span>
                    <span className="text-xs font-mono text-foreground font-semibold">{p.value.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de tempo</div>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-gradient rounded-xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-4 text-tight font-display">Tempo Trabalhado por Dia</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={timeChartData}>
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(192 80% 40%)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="hsl(192 80% 40%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="hsl(210 15% 58%)" fontSize={11} />
            <YAxis stroke="hsl(210 15% 58%)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v}h`} />
            <Area type="monotone" dataKey="hours" stroke="hsl(192 80% 40%)" strokeWidth={2.5} fill="url(#colorHours)" dot={{ fill: "hsl(192 80% 40%)", strokeWidth: 0, r: 4 }} activeDot={{ r: 6, fill: "hsl(192 80% 40%)", stroke: "hsl(192 80% 60%)", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="glass-gradient rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 text-tight font-display">Histórico de Tarefas</h3>
        {completedTasks.length > 0 ? (
          <div className="space-y-1">
            <div className="grid grid-cols-4 text-xs text-foreground/50 font-medium px-3 pb-2 uppercase tracking-wider">
              <span>Título</span><span>Projeto</span><span>Concluída em</span><span>Criada em</span>
            </div>
            {completedTasks.slice(0, 20).map((task: any, i: number) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-4 text-sm px-3 py-2.5 rounded-lg hover:bg-primary/5 transition-all group"
              >
                <span className="text-foreground truncate group-hover:text-primary transition-colors">{task.title}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project?.color, boxShadow: `0 0 6px ${task.project?.color}40` }} />
                  <span className="text-muted-foreground truncate">{task.project?.name || "Sem projeto"}</span>
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {task.completed_at ? new Date(task.completed_at).toLocaleDateString("pt-BR") : "—"}
                </span>
                <span className="text-muted-foreground font-mono text-xs">
                  {new Date(task.created_at).toLocaleDateString("pt-BR")}
                </span>
              </motion.div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhuma tarefa concluída no período</p>
        )}
      </motion.div>
    </div>
  );
};

export default MetricsPage;
