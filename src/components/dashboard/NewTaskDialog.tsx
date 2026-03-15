import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Plus, X } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Project = Tables<"projects">;

interface NewTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onCreated: () => void;
}

const NewTaskDialog = ({ open, onOpenChange, projects, onCreated }: NewTaskDialogProps) => {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectId, setProjectId] = useState("");
  const [deadline, setDeadline] = useState<Date | undefined>();
  const [subtasks, setSubtasks] = useState<string[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return;
    setLoading(true);

    // Get max position
    const { data: lastTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("position", { ascending: false })
      .limit(1);

    const position = (lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0);

    const { data: task, error } = await supabase.from("tasks").insert({
      user_id: user.id,
      project_id: projectId || null,
      title,
      description: description || null,
      position,
      deadline: deadline ? format(deadline, "yyyy-MM-dd") : null,
    }).select().single();

    if (error) {
      toast.error("Erro ao criar tarefa");
      setLoading(false);
      return;
    }

    // Create subtasks
    if (task && subtasks.length > 0) {
      await supabase.from("subtasks").insert(
        subtasks.map((s, i) => ({ task_id: task.id, title: s, position: i }))
      );
    }

    toast.success("Tarefa criada!");
    setTitle("");
    setDescription("");
    setProjectId("");
    setDeadline(undefined);
    setSubtasks([]);
    setLoading(false);
    onOpenChange(false);
    onCreated();
  };

  const addSubtask = () => {
    if (newSubtask.trim()) {
      setSubtasks([...subtasks, newSubtask.trim()]);
      setNewSubtask("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-foreground text-tight">Nova Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título da tarefa"
              className="bg-secondary border-border h-11"
              required
            />
          </div>

          <Select value={projectId} onValueChange={setProjectId} required>
            <SelectTrigger className="bg-secondary border-border h-11">
              <SelectValue placeholder="Selecionar projeto" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="bg-secondary border-border min-h-[80px]"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn("w-full justify-start text-left h-11 bg-secondary border-border", !deadline && "text-muted-foreground")}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {deadline ? format(deadline, "dd/MM/yyyy") : "Prazo (opcional)"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
              <Calendar
                mode="single"
                selected={deadline}
                onSelect={setDeadline}
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Subtasks */}
          <div>
            <div className="flex gap-2 mb-2">
              <Input
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                placeholder="Adicionar subtarefa"
                className="bg-secondary border-border h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSubtask())}
              />
              <Button type="button" variant="outline" size="sm" onClick={addSubtask} className="border-border h-9">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {subtasks.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground py-1">
                <span className="w-3 h-3 rounded border border-muted-foreground/30" />
                <span className="flex-1">{s}</span>
                <button type="button" onClick={() => setSubtasks(subtasks.filter((_, j) => j !== i))}>
                  <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            ))}
          </div>

          <Button
            type="submit"
            disabled={loading || !title || !projectId}
            className="w-full gradient-primary text-primary-foreground h-11 font-semibold"
          >
            {loading ? "Criando..." : "Criar Tarefa"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewTaskDialog;
