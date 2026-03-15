import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Edit2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Project = Tables<"projects">;

const COLORS = [
  // Roxos & Violetas
  "#7C3AED", "#8B5CF6", "#6366F1", "#A855F7", "#C084FC",
  // Azuis
  "#3B82F6", "#2563EB", "#06B6D4", "#0EA5E9", "#38BDF8",
  // Verdes
  "#10B981", "#059669", "#22C55E", "#34D399", "#2DD4A0",
  // Vermelhos & Laranjas
  "#EF4444", "#F97316", "#FB923C", "#DC2626",
  // Amarelos
  "#F59E0B", "#EAB308", "#FBBF24",
  // Rosas
  "#EC4899", "#F472B6", "#DB2777",
  // Neutros
  "#6B7280", "#78716C", "#64748B",
];

interface ProjectManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onUpdated: () => void;
}

const ProjectManager = ({ open, onOpenChange, projects, onUpdated }: ProjectManagerProps) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);
  const [hasTasks, setHasTasks] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) return;
    await supabase.from("projects").insert({ user_id: user.id, name: name.trim(), color });
    setName("");
    setColor(COLORS[0]);
    toast.success("Projeto criado!");
    onUpdated();
  };

  const handleDeleteClick = async (project: Project) => {
    // Check if project has tasks (both completed and incomplete)
    const { count } = await supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id);
    setHasTasks((count ?? 0) > 0);
    setDeleteTarget(project);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    if (hasTasks) {
      // Unlink tasks from project first
      await supabase.from("tasks").update({ project_id: null }).eq("project_id", deleteTarget.id);
    }
    await supabase.from("projects").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    toast.success("Projeto excluído");
    onUpdated();
  };

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return;
    await supabase.from("projects").update({ name: editName.trim() }).eq("id", id);
    setEditingId(null);
    toast.success("Projeto atualizado");
    onUpdated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground text-tight">Projetos</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do projeto"
              className="bg-secondary border-border h-10"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex flex-wrap items-center gap-1.5">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? "scale-125 ring-2 ring-foreground/30 ring-offset-1 ring-offset-card" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <Button onClick={handleCreate} disabled={!name.trim()} className="gradient-primary text-primary-foreground w-full h-10">
              <Plus className="w-4 h-4 mr-2" /> Criar Projeto
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {projects.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2.5">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                {editingId === p.id ? (
                  <input
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={() => handleSaveEdit(p.id)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(p.id)}
                    className="flex-1 bg-transparent text-foreground text-sm outline-none border-b border-primary/50"
                  />
                ) : (
                  <span className="flex-1 text-sm text-foreground">{p.name}</span>
                )}
                <button
                  onClick={() => { setEditingId(p.id); setEditName(p.name); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDeleteClick(p)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            {projects.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum projeto ainda</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Excluir projeto "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasTasks
                ? "Este projeto possui tarefas vinculadas. Elas serão desvinculadas (não excluídas) e ficarão sem projeto."
                : "Este projeto será excluído permanentemente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-secondary border-border text-foreground hover:bg-secondary/80">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProjectManager;
