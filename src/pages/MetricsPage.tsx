import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from "recharts";
import { CalendarDays, Clock, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

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
  const [projects, setProjects] = useState<Project[]>([]);
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

      const [tasksRes, projectsRes, timeRes, meetingRes] = await Promise.all([
        supabase.from("tasks").select("*, project:projects(*)").eq("user_id", user.id).eq("is_completed", true).gte("completed_at", startStr).order("completed_at", { ascending: false }),
        supabase.from("projects").select("*").eq("user_id", user.id),
        supabase.from("time_entries").select("*").eq("user_id", user.id).gte("date", startDate.toISOString().split("T")[0]),
        supabase.from("meeting_logs").select("*").eq("user_id", user.id).gte("date", startDate.toISOString().split("T")[0]),
      ]);

      if (tasksRes.data) setCompletedTasks(tasksRes.data);
      if (projectsRes.data) setProjects(projectsRes.data);
      if (timeRes.data) setTimeEntries(timeRes.data);
      if (meetingRes.data) setMeetingLogs(meetingRes.data);
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
    { icon: CheckCircle2, label: "Tarefas Concluídas", value: animatedCompleted.toString(), color: "text-success" },
    { icon: Clock, label: "Tempo Trabalhado", value: formatHours(totalWorkSeconds), color: "text-accent" },
    { icon: CalendarDays, label: "Horas em Reunião", value: `${totalMeetingHours.toFixed(1)}h`, color: "text-primary" },
    { icon: TrendingUp, label: "Média Tarefas/Dia", value: avgTasksPerDay, color: "text-accent" },
    { icon: Award, label: "Projeto + Trabalhado", value: mostWorked, color: "text-primary" },
  ];

  const tooltipStyle = {
    background: "hsl(240 18% 8%)",
    border: "1px solid hsl(240 6% 16%)",
    borderRadius: "8px",
    color: "hsl(210 40% 96%)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
  };

  return (
    <div className="flex-1 h-screen overflow-y-auto px-6 py-6">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground text-tight">Métricas & Relatórios</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40 bg-secondary border-border h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="today">Hoje</SelectItem>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-4 mb-8">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, ease: "easeOut" }}
            className="glass-hover rounded-xl p-4 card-lift"
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <motion.p
              className="text-2xl font-bold text-foreground font-mono"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.08 + 0.2 }}
            >
              {stat.value}
            </motion.p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-hover rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Tarefas Concluídas por Dia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tasksChartData}>
              <XAxis dataKey="date" stroke="hsl(215 16% 57%)" fontSize={11} />
              <YAxis stroke="hsl(215 16% 57%)" fontSize={11} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="hsl(263 70% 58%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-hover rounded-xl p-6"
        >
          <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Tempo por Projeto</h3>
          {projectTimeData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={220}>
                <PieChart>
                  <Pie data={projectTimeData} innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                    {projectTimeData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${Number(v).toFixed(1)}h`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {projectTimeData.map(p => (
                  <div key={p.name} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="text-xs text-muted-foreground truncate flex-1">{p.name}</span>
                    <span className="text-xs font-mono text-foreground">{p.value.toFixed(1)}h</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de tempo</div>
          )}
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="glass-hover rounded-xl p-6 mb-8"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Tempo Trabalhado por Dia</h3>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={timeChartData}>
            <defs>
              <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(187 92% 42%)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(187 92% 42%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" stroke="hsl(215 16% 57%)" fontSize={11} />
            <YAxis stroke="hsl(215 16% 57%)" fontSize={11} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `${v}h`} />
            <Area type="monotone" dataKey="hours" stroke="hsl(187 92% 42%)" strokeWidth={2} fill="url(#colorHours)" dot={{ fill: "hsl(187 92% 42%)", strokeWidth: 0, r: 4 }} />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Completed tasks history */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-hover rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Histórico de Tarefas</h3>
        {completedTasks.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium px-3 pb-2">
              <span>Título</span><span>Projeto</span><span>Concluída em</span><span>Criada em</span>
            </div>
            {completedTasks.slice(0, 20).map((task: any, i: number) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="grid grid-cols-4 text-sm px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <span className="text-foreground truncate">{task.title}</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: task.project?.color }} />
                  <span className="text-muted-foreground truncate">{task.project?.name}</span>
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
