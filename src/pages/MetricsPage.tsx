import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { CalendarDays, Clock, CheckCircle2, TrendingUp, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

const MetricsPage = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState("week");
  const [projects, setProjects] = useState<Project[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [timeEntries, setTimeEntries] = useState<any[]>([]);
  const [meetingLogs, setMeetingLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
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
    };
    fetchMetrics();
  }, [user, period]);

  // Computed metrics
  const totalCompleted = completedTasks.length;
  const totalWorkSeconds = timeEntries.reduce((sum, e) => sum + e.duration_seconds, 0);
  const totalMeetingHours = meetingLogs.reduce((sum, m) => sum + Number(m.hours), 0);
  const daysInPeriod = period === "today" ? 1 : period === "week" ? 7 : 30;
  const avgTasksPerDay = daysInPeriod > 0 ? (totalCompleted / daysInPeriod).toFixed(1) : "0";

  // Project time distribution for pie chart
  const projectTimeData = projects.map(p => ({
    name: p.name,
    value: timeEntries.filter(e => e.project_id === p.id).reduce((s, e) => s + e.duration_seconds, 0) / 3600,
    color: p.color,
  })).filter(d => d.value > 0);

  // Tasks per day for bar chart
  const tasksByDay: Record<string, number> = {};
  completedTasks.forEach(t => {
    const day = new Date(t.completed_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    tasksByDay[day] = (tasksByDay[day] || 0) + 1;
  });
  const tasksChartData = Object.entries(tasksByDay).map(([date, count]) => ({ date, count }));

  // Work time per day
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

  // Most worked project
  const mostWorked = projectTimeData.length > 0 
    ? projectTimeData.reduce((a, b) => a.value > b.value ? a : b).name 
    : "—";

  const statCards = [
    { icon: CheckCircle2, label: "Tarefas Concluídas", value: totalCompleted, color: "text-success" },
    { icon: Clock, label: "Tempo Trabalhado", value: formatHours(totalWorkSeconds), color: "text-accent" },
    { icon: CalendarDays, label: "Horas em Reunião", value: `${totalMeetingHours.toFixed(1)}h`, color: "text-primary" },
    { icon: TrendingUp, label: "Média Tarefas/Dia", value: avgTasksPerDay, color: "text-accent" },
    { icon: Award, label: "Projeto + Trabalhado", value: mostWorked, color: "text-primary" },
  ];

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass rounded-xl p-4"
          >
            <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
            <p className="text-2xl font-bold text-foreground font-mono">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Tarefas Concluídas por Dia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tasksChartData}>
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass rounded-xl p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Tempo por Projeto</h3>
          {projectTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={projectTimeData} innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {projectTimeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} formatter={(v: any) => `${Number(v).toFixed(1)}h`} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">Sem dados de tempo</div>
          )}
        </div>
      </div>

      <div className="glass rounded-xl p-6 mb-8">
        <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Tempo Trabalhado por Dia</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timeChartData}>
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }} formatter={(v: any) => `${v}h`} />
            <Line type="monotone" dataKey="hours" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ fill: "hsl(var(--accent))" }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Completed tasks history */}
      <div className="glass rounded-xl p-6">
        <h3 className="text-sm font-semibold text-foreground mb-4 text-tight">Histórico de Tarefas</h3>
        {completedTasks.length > 0 ? (
          <div className="space-y-2">
            <div className="grid grid-cols-4 text-xs text-muted-foreground font-medium px-3 pb-2">
              <span>Título</span><span>Projeto</span><span>Concluída em</span><span>Criada em</span>
            </div>
            {completedTasks.slice(0, 20).map((task: any) => (
              <div key={task.id} className="grid grid-cols-4 text-sm px-3 py-2 rounded-lg hover:bg-secondary/50 transition-colors">
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
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-8">Nenhuma tarefa concluída no período</p>
        )}
      </div>
    </div>
  );
};

export default MetricsPage;
