import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Project = Tables<"projects">;

interface InlineTaskCreatorProps {
  projects: Project[];
  onCreated: () => void;
}

const InlineTaskCreator = ({ projects, onCreated }: InlineTaskCreatorProps) => {
  const { user } = useAuth();
  const [active, setActive] = useState(false);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("none");
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (active) inputRef.current?.focus();
  }, [active]);

  const handleCreate = async () => {
    if (!title.trim() || !user || creating) return;
    setCreating(true);

    const { data: lastTask } = await supabase
      .from("tasks")
      .select("position")
      .eq("user_id", user.id)
      .eq("is_completed", false)
      .order("position", { ascending: false })
      .limit(1);

    const position = lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0;

    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      project_id: projectId !== "none" ? projectId : null,
      title: title.trim(),
      position,
    });

    if (error) {
      toast.error("Erro ao criar tarefa");
    } else {
      toast.success("Tarefa criada!");
      onCreated();
    }

    setTitle("");
    setCreating(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreate();
    } else if (e.key === "Escape") {
      setActive(false);
      setTitle("");
    }
  };

  const handleCancel = () => {
    setActive(false);
    setTitle("");
    setProjectId("none");
  };

  if (!active) {
    return (
      <motion.button
        onClick={() => setActive(true)}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className="w-full rounded-xl px-5 py-4 flex items-center gap-3 cursor-pointer transition-all group"
        style={{
          background: "var(--glass-bg)",
          border: "1px dashed hsl(var(--border) / 0.3)",
        }}
      >
        <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/20 flex items-center justify-center group-hover:border-primary/40 transition-colors">
          <Plus className="w-4 h-4 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
        </div>
        <span className="text-sm text-muted-foreground/40 group-hover:text-muted-foreground/70 transition-colors font-medium">
          Adicionar tarefa...
        </span>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.25 }}
      className="rounded-xl overflow-hidden"
      style={{
        background: "var(--glass-bg)",
        border: "1px solid hsl(var(--primary) / 0.2)",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="flex items-center gap-3 px-5 py-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 flex items-center justify-center flex-shrink-0">
          <Plus className="w-4 h-4 text-primary/50" />
        </div>
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Título da tarefa..."
          className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/40"
          disabled={creating}
        />
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="w-36 h-8 bg-secondary/40 border-border/30 text-xs">
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
            <SelectItem value="none">
              <span className="text-muted-foreground">Sem projeto</span>
            </SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <motion.button
          onClick={handleCreate}
          disabled={!title.trim() || creating}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/15 text-primary hover:bg-primary/25 transition-all disabled:opacity-30 flex-shrink-0"
        >
          <Check className="w-4 h-4" />
        </motion.button>
        <motion.button
          onClick={handleCancel}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>
      <div className="px-5 pb-2">
        <p className="text-[10px] text-muted-foreground/30">
          <kbd className="bg-secondary/60 px-1 py-0.5 rounded text-[9px] font-mono">Enter</kbd> criar · <kbd className="bg-secondary/60 px-1 py-0.5 rounded text-[9px] font-mono">Esc</kbd> cancelar
        </p>
      </div>
    </motion.div>
  );
};

export default InlineTaskCreator;
