import { useState } from "react";
import { Pencil, Check, X, Clock, FolderKanban } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Meeting = Tables<"meetings"> & { project?: Tables<"projects"> | null; summary?: Tables<"meeting_summaries"> | null };
type Project = Tables<"projects">;

interface EditableMeetingProps {
  meeting: Meeting;
  projects: Project[];
  onUpdated: () => void;
}

const EditableMeeting = ({ meeting, projects, onUpdated }: EditableMeetingProps) => {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(meeting.title);
  const [desc, setDesc] = useState(meeting.description || "");
  const [projectId, setProjectId] = useState(meeting.project_id || "none");
  const [durationH, setDurationH] = useState(String(Math.floor(meeting.duration_minutes / 60)));
  const [durationM, setDurationM] = useState(String(meeting.duration_minutes % 60));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const duration_minutes = parseInt(durationH) * 60 + parseInt(durationM);
    const { error } = await supabase.from("meetings").update({
      title: title.trim(),
      description: desc.trim() || null,
      project_id: projectId === "none" ? null : projectId,
      duration_minutes,
    }).eq("id", meeting.id);
    if (error) toast.error("Erro ao salvar");
    else { toast.success("Reunião atualizada!"); setEditing(false); onUpdated(); }
    setSaving(false);
  };

  const handleCancel = () => {
    setTitle(meeting.title);
    setDesc(meeting.description || "");
    setProjectId(meeting.project_id || "none");
    setDurationH(String(Math.floor(meeting.duration_minutes / 60)));
    setDurationM(String(meeting.duration_minutes % 60));
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <button onClick={() => setEditing(true)} className="text-muted-foreground/50 hover:text-primary transition-colors p-0.5" title="Editar">
            <Pencil className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span className="text-[11px] font-mono">{Math.floor(meeting.duration_minutes / 60)}h{(meeting.duration_minutes % 60).toString().padStart(2, "0")}</span>
          </div>
          {meeting.project && (
            <div className="flex items-center gap-1">
              <FolderKanban className="w-3 h-3" style={{ color: meeting.project.color }} />
              <span className="text-[10px] font-bold" style={{ color: meeting.project.color }}>{meeting.project.name}</span>
            </div>
          )}
        </div>
        {meeting.description && (
          <p className="text-[11px] text-muted-foreground/70">{meeting.description}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input value={title} onChange={e => setTitle(e.target.value)} className="h-7 text-xs bg-secondary/60 border-border/30" placeholder="Título" />
      <div className="flex items-center gap-2">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-7 text-xs bg-secondary/60 border-border/30 flex-1"><SelectValue placeholder="Projeto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem projeto</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1">
          <Input type="number" min="0" max="23" value={durationH} onChange={e => setDurationH(e.target.value)} className="h-7 w-12 text-xs bg-secondary/60 border-border/30" />
          <span className="text-[10px] text-muted-foreground">h</span>
          <Input type="number" min="0" max="59" step="5" value={durationM} onChange={e => setDurationM(e.target.value)} className="h-7 w-12 text-xs bg-secondary/60 border-border/30" />
          <span className="text-[10px] text-muted-foreground">m</span>
        </div>
      </div>
      <Textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Descrição (opcional)" className="text-xs bg-secondary/60 border-border/30 resize-none min-h-[50px]" />
      <div className="flex items-center gap-1.5">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors">
          <Check className="w-3.5 h-3.5" /> Salvar
        </button>
        <button onClick={handleCancel} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" /> Cancelar
        </button>
      </div>
    </div>
  );
};

export default EditableMeeting;
