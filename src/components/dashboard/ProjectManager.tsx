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
  "#EF4444", // vermelho
  "#3B82F6", // azul
  "#22C55E", // verde
  "#F59E0B", // amarelo
  "#8B5CF6", // roxo
  "#06B6D4", // ciano
  "#F97316", // laranja
  "#EC4899", // rosa
  "#14B8A6", // teal
  "#6366F1", // índigo
  "#84CC16", // lima
  "#DC2626", // vermelho escuro
  "#0EA5E9", // azul claro
  "#A855F7", // violeta
  "#D946EF", // magenta
  "#64748B", // cinza
  "#78350F", // marrom
  "#065F46", // verde escuro
  "#1E3A5F", // azul marinho
  "#BE185D", // rosa escuro
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
    const updates: { name: string; color?: string } = { name: editName.trim() };
    if (editColor) updates.color = editColor;
    await supabase.from("projects").update(updates).eq("id", id);
    setEditingId(null);
    setEditColor(null);
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
              <div key={p.id} className="bg-secondary/50 rounded-lg px-3 py-2.5 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      if (editingId === p.id) {
                        // cycle — already editing, just focus color
                      } else {
                        setEditingId(p.id);
                        setEditName(p.name);
                        setEditColor(p.color);
                      }
                    }}
                    className="w-4 h-4 rounded-full flex-shrink-0 ring-1 ring-foreground/10 hover:ring-foreground/30 transition-all"
                    style={{ backgroundColor: editingId === p.id ? (editColor || p.color) : p.color }}
                  />
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
                    onClick={() => { setEditingId(p.id); setEditName(p.name); setEditColor(p.color); }}
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
                {editingId === p.id && (
                  <div className="flex flex-wrap gap-1 pl-7">
                    {COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-5 h-5 rounded-full transition-all ${editColor === c ? "scale-125 ring-2 ring-foreground/30 ring-offset-1 ring-offset-card" : "hover:scale-110"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
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
