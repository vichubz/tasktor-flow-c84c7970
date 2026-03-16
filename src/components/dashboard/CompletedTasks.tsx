import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { ChevronRight, Check, Loader2, Undo2, Trash2, X, Pencil } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Task = Tables<"tasks"> & { project?: Tables<"projects"> };

interface CompletedTasksProps {
  onTaskRestored?: () => void;
}

const CompletedTasks = ({ onTaskRestored }: CompletedTasksProps = {}) => {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editProjectId, setEditProjectId] = useState<string>("none");
  const [projects, setProjects] = useState<Tables<"projects">[]>([]);

  const today = new Date().toISOString().split("T")[0];

  const fetchCompleted = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("tasks")
        .select("*, project:projects(id, name, color)")
        .eq("user_id", user.id)
        .eq("is_completed", true)
        .gte("completed_at", `${today}T00:00:00`)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      if (data) setTasks(data as Task[]);
    } catch { toast.error("Erro ao carregar tarefas concluídas"); }
    setLoading(false);
    setHasFetched(true);
  }, [user, today]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("name");
    if (data) setProjects(data);
  }, [user]);

  useEffect(() => {
    if (expanded && !hasFetched) { fetchCompleted(); fetchProjects(); }
  }, [expanded, hasFetched, fetchCompleted, fetchProjects]);

  const handleUncomplete = async (taskId: string) => {
    const prev = [...tasks];
    setTasks(t => t.filter(x => x.id !== taskId));
    const { error } = await supabase.from("tasks").update({ is_completed: false, completed_at: null }).eq("id", taskId);
    if (error) { toast.error("Erro ao restaurar tarefa"); setTasks(prev); }
    else { toast.success("Tarefa restaurada para a lista ativa"); onTaskRestored?.(); }
  };

  const handleDelete = async (taskId: string) => {
    setConfirmDeleteId(null);
    const deletedTask = tasks.find(t => t.id === taskId);
    const prev = [...tasks];
    setTasks(t => t.filter(x => x.id !== taskId));
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) { toast.error("Erro ao excluir tarefa"); setTasks(prev); }
    else {
      toast("Tarefa excluída", {
        action: deletedTask ? {
          label: "Desfazer",
          onClick: async () => {
            await supabase.from("tasks").insert({
              user_id: deletedTask.user_id,
              title: deletedTask.title,
              description: deletedTask.description,
              project_id: deletedTask.project_id,
              position: deletedTask.position,
              deadline: deletedTask.deadline,
              is_completed: true,
              completed_at: deletedTask.completed_at,
            });
            fetchCompleted();
          },
        } : undefined,
        duration: 5000,
      });
    }
  };

  const handleClearAll = async () => {
    setConfirmClearAll(false);
    const prev = [...tasks];
    const ids = tasks.map(t => t.id);
    setTasks([]);
    for (const id of ids) {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) { toast.error("Erro ao limpar tarefas"); setTasks(prev); return; }
    }
    toast.success("Todas as tarefas concluídas foram excluídas");
  };

  const startEdit = (task: Task) => {
    setEditingId(task.id);
    setEditTitle(task.title);
    setEditProjectId(task.project_id || "none");
  };

  const saveEdit = async (taskId: string) => {
    if (!editTitle.trim()) return;
    const prev = [...tasks];
    const newProjectId = editProjectId === "none" ? null : editProjectId;
    setTasks(t => t.map(x => x.id === taskId ? { ...x, title: editTitle.trim(), project_id: newProjectId } : x));
    setEditingId(null);
    const { error } = await supabase.from("tasks").update({ title: editTitle.trim(), project_id: newProjectId }).eq("id", taskId);
    if (error) { toast.error("Erro ao salvar"); setTasks(prev); }
    else { toast.success("Tarefa atualizada"); fetchCompleted(); }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <motion.button
          onClick={() => setExpanded(!expanded)}
          whileHover={{ x: 4 }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-display font-semibold"
        >
          <motion.div animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronRight className="w-4 h-4" />
          </motion.div>
          <span>Concluídas hoje</span>
          {hasFetched && tasks.length > 0 && (
            <span className="text-xs font-mono bg-success/10 text-success px-2 py-0.5 rounded-md">{tasks.length}</span>
          )}
        </motion.button>

        {expanded && tasks.length > 0 && (
          confirmClearAll ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-destructive font-semibold">Excluir todas?</span>
              <motion.button onClick={handleClearAll} whileHover={{ scale: 1.05 }} className="px-3 py-1 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold">
                Confirmar
              </motion.button>
              <motion.button onClick={() => setConfirmClearAll(false)} whileHover={{ scale: 1.05 }} className="px-3 py-1 rounded-lg bg-secondary text-foreground text-xs font-bold">
                Cancelar
              </motion.button>
            </div>
          ) : (
            <motion.button
              onClick={() => setConfirmClearAll(true)}
              whileHover={{ scale: 1.05 }}
              className="text-xs text-muted-foreground/50 hover:text-destructive transition-colors flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              Limpar todas
            </motion.button>
          )
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-2 space-y-1.5 overflow-hidden"
          >
            {loading && (
              <div className="flex items-center gap-2 py-4 justify-center text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Carregando...</span>
              </div>
            )}
            {!loading && tasks.length === 0 && (
              <p className="text-sm text-muted-foreground/60 py-4 text-center">Nenhuma tarefa concluída hoje</p>
            )}
            {!loading && tasks.map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20, scale: 0.95 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 rounded-lg glass-gradient hover:bg-primary/5 transition-all group"
              >
                <div className="w-5 h-5 rounded-full bg-success/15 flex items-center justify-center">
                  <Check className="w-3 h-3 text-success" />
                </div>

                {editingId === task.id ? (
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    <Input
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") saveEdit(task.id); if (e.key === "Escape") setEditingId(null); }}
                      className="h-7 text-sm bg-secondary/40 border-border/30 flex-1"
                      autoFocus
                    />
                    <Select value={editProjectId} onValueChange={setEditProjectId}>
                      <SelectTrigger className="h-7 text-xs bg-secondary/40 border-border/30 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Sem projeto</SelectItem>
                        {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <motion.button onClick={() => saveEdit(task.id)} whileTap={{ scale: 0.9 }} className="text-primary hover:text-primary/80">
                      <Check className="w-4 h-4" />
                    </motion.button>
                    <motion.button onClick={() => setEditingId(null)} whileTap={{ scale: 0.9 }} className="text-muted-foreground/50 hover:text-foreground">
                      <X className="w-4 h-4" />
                    </motion.button>
                  </div>
                ) : (
                  <>
                    <span className="text-sm text-muted-foreground line-through flex-1 group-hover:text-foreground/60 transition-colors">{task.title}</span>
                    {task.completed_at && (
                      <span className="text-[10px] text-muted-foreground/50 font-mono">
                        {new Date(task.completed_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    )}
                    {task.project && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold" style={{ backgroundColor: `${task.project.color}12`, color: task.project.color }}>
                        {task.project.name}
                      </span>
                    )}

                    {confirmDeleteId === task.id ? (
                      <div className="flex items-center gap-1">
                        <motion.button onClick={() => handleDelete(task.id)} whileTap={{ scale: 0.9 }} className="text-[10px] px-2 py-0.5 rounded bg-destructive text-destructive-foreground font-bold">
                          Excluir
                        </motion.button>
                        <motion.button onClick={() => setConfirmDeleteId(null)} whileTap={{ scale: 0.9 }} className="text-muted-foreground/40 hover:text-foreground">
                          <X className="w-3 h-3" />
                        </motion.button>
                      </div>
                    ) : (
                      <>
                        <motion.button
                          onClick={() => startEdit(task)}
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-primary transition-all"
                          title="Editar tarefa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleUncomplete(task.id)}
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-primary transition-all"
                          title="Restaurar tarefa"
                        >
                          <Undo2 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          onClick={() => setConfirmDeleteId(task.id)}
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground/40 hover:text-destructive transition-all"
                          title="Excluir tarefa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </>
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CompletedTasks;
