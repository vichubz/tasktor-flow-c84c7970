import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Mic, Square, Loader2, Plus, X, ArrowLeft, Sparkles, Zap, Send } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

type Project = Tables<"projects">;

interface SmartTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Project[];
  onCreated: () => Promise<void>;
}

interface AIResult {
  title: string;
  description: string | null;
  difficulty: number;
  project_id: string | null;
  subtasks: string[];
}

type DialogState = "input" | "loading" | "preview";

const SmartTaskDialog = ({ open, onOpenChange, projects, onCreated }: SmartTaskDialogProps) => {
  const { user } = useAuth();
  const [state, setState] = useState<DialogState>("input");
  const [prompt, setPrompt] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<AIResult | null>(null);
  const [creating, setCreating] = useState(false);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Speech recognition support
  const speechSupported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  useEffect(() => {
    if (open) {
      setState("input");
      setPrompt("");
      setResult(null);
      setCreating(false);
      setIsRecording(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      stopRecording();
    }
  }, [open]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "pt-BR";

    let finalTranscript = prompt;

    recognition.onresult = (event: any) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim = transcript;
        }
      }
      setPrompt(finalTranscript + (interim ? " " + interim : ""));
    };

    recognition.onerror = () => {
      stopRecording();
      toast.error("Erro no reconhecimento de voz");
    };

    recognition.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, prompt, stopRecording]);

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;

    // Stop recording if active
    stopRecording();

    setState("loading");

    try {
      const { data, error } = await supabase.functions.invoke("ai-task-creator", {
        body: {
          prompt: prompt.trim(),
          projects: projects.map(p => ({ id: p.id, name: p.name })),
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Erro ao processar");
      }

      setResult({
        title: data.title,
        description: data.description,
        difficulty: data.difficulty,
        project_id: data.project_id,
        subtasks: data.subtasks || [],
      });
      setState("preview");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar task com IA");
      setState("input");
    }
  };

  const handleCreate = async () => {
    if (!result || !user || creating) return;
    setCreating(true);

    try {
      // Get next position
      const { data: lastTask } = await supabase
        .from("tasks")
        .select("position")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("position", { ascending: false })
        .limit(1);

      const position = lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0;

      // Insert task
      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: result.title,
          description: result.description,
          difficulty: result.difficulty,
          project_id: result.project_id,
          position,
        })
        .select("id")
        .single();

      if (taskError) throw taskError;

      // Insert subtasks
      if (result.subtasks.length > 0 && newTask) {
        const subtaskRows = result.subtasks.map((title, i) => ({
          task_id: newTask.id,
          title,
          position: i,
        }));
        const { error: subError } = await supabase.from("subtasks").insert(subtaskRows);
        if (subError) console.error("Subtask insert error:", subError);
      }

      toast.success("Task criada com IA! 🔥");
      await onCreated();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Falha ao criar task");
    } finally {
      setCreating(false);
    }
  };

  const updateSubtask = (index: number, value: string) => {
    if (!result) return;
    const updated = [...result.subtasks];
    updated[index] = value;
    setResult({ ...result, subtasks: updated });
  };

  const removeSubtask = (index: number) => {
    if (!result) return;
    setResult({ ...result, subtasks: result.subtasks.filter((_, i) => i !== index) });
  };

  const addSubtask = () => {
    if (!result) return;
    setResult({ ...result, subtasks: [...result.subtasks, ""] });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && prompt.trim()) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const difficultyLabels = ["Sem nível", "Fácil", "Médio", "Difícil"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-primary/20 bg-card/95 backdrop-blur-xl">
        <DialogTitle className="sr-only">Smart Task Creator</DialogTitle>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/20">
          <div className="flex items-center gap-3">
            <motion.div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, rgba(255,120,50,0.2), rgba(255,80,20,0.1))",
                boxShadow: "0 0 20px rgba(255,100,40,0.15)",
              }}
              animate={{
                boxShadow: [
                  "0 0 10px rgba(255,100,40,0.1)",
                  "0 0 25px rgba(255,100,40,0.25)",
                  "0 0 10px rgba(255,100,40,0.1)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Flame className="w-5 h-5 text-orange-400" />
            </motion.div>
            <div>
              <h3 className="text-sm font-bold text-foreground">Smart Task Creator</h3>
              <p className="text-[11px] text-muted-foreground">Descreva sua task por texto ou voz</p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <AnimatePresence mode="wait">
            {/* INPUT STATE */}
            {state === "input" && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-3 pt-2"
              >
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Ex: "Criar API de pagamentos no Backend com subtasks: endpoints, testes e docs"'
                    className="min-h-[100px] bg-secondary/30 border-border/20 resize-none pr-12 text-sm placeholder:text-muted-foreground/40"
                  />
                  {/* Mic button inside textarea */}
                  {speechSupported && (
                    <motion.button
                      onClick={toggleRecording}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className={`absolute bottom-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                        isRecording
                          ? "bg-red-500/20 text-red-400"
                          : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      {isRecording ? (
                        <motion.div
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        >
                          <Square className="w-4 h-4 fill-current" />
                        </motion.div>
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </motion.button>
                  )}
                </div>

                {/* Recording indicator */}
                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <motion.div
                        className="w-2 h-2 rounded-full bg-red-500"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <span className="text-xs text-red-400 font-medium">Gravando... fale sua task</span>
                      {/* Simple waveform */}
                      <div className="flex items-center gap-0.5 ml-auto">
                        {[0, 1, 2, 3, 4].map(i => (
                          <motion.div
                            key={i}
                            className="w-0.5 bg-red-400/60 rounded-full"
                            animate={{ height: [4, 12 + Math.random() * 8, 4] }}
                            transition={{ duration: 0.5 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.1 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground/40">
                    <kbd className="bg-secondary/60 px-1 py-0.5 rounded text-[9px] font-mono">Ctrl+Enter</kbd> gerar
                  </p>
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim()}
                    size="sm"
                    className="gap-2 font-bold"
                    style={{
                      background: prompt.trim() ? "linear-gradient(135deg, hsl(25 90% 50%), hsl(15 85% 45%))" : undefined,
                      boxShadow: prompt.trim() ? "0 0 15px rgba(255,100,40,0.2)" : undefined,
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gerar com IA
                  </Button>
                </div>
              </motion.div>
            )}

            {/* LOADING STATE */}
            {state === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-10 space-y-4"
              >
                <motion.div
                  className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(255,120,50,0.15), rgba(255,80,20,0.05))",
                  }}
                  animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Flame className="w-7 h-7 text-orange-400" />
                </motion.div>
                <p className="text-center text-sm text-muted-foreground font-medium">Analisando com IA...</p>

                {/* Skeleton fields */}
                <div className="space-y-3 px-2">
                  {[80, 60, 100, 45].map((w, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                    >
                      <div className="h-2 w-16 bg-muted/50 rounded mb-1.5" />
                      <div
                        className="h-9 rounded-lg animate-pulse"
                        style={{
                          width: `${w}%`,
                          background: "linear-gradient(90deg, hsl(var(--muted) / 0.3), hsl(var(--muted) / 0.5), hsl(var(--muted) / 0.3))",
                          backgroundSize: "200% 100%",
                          animation: "shimmer 1.5s ease-in-out infinite",
                        }}
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* PREVIEW STATE */}
            {state === "preview" && result && (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3 pt-2"
              >
                {/* Title */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Título</label>
                  <Input
                    value={result.title}
                    onChange={e => setResult({ ...result, title: e.target.value })}
                    className="bg-secondary/30 border-border/20 font-medium"
                  />
                </motion.div>

                {/* Description */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição</label>
                  <Textarea
                    value={result.description || ""}
                    onChange={e => setResult({ ...result, description: e.target.value || null })}
                    className="bg-secondary/30 border-border/20 min-h-[60px] resize-none text-sm"
                    placeholder="Sem descrição"
                  />
                </motion.div>

                {/* Project + Difficulty row */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Projeto</label>
                    <Select
                      value={result.project_id || "none"}
                      onValueChange={v => setResult({ ...result, project_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border/20 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                        <SelectItem value="none"><span className="text-muted-foreground">Sem projeto</span></SelectItem>
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
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Dificuldade</label>
                    <Select
                      value={String(result.difficulty)}
                      onValueChange={v => setResult({ ...result, difficulty: Number(v) })}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border/20 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                        {difficultyLabels.map((label, i) => (
                          <SelectItem key={i} value={String(i)}>
                            <span className="flex items-center gap-1.5">
                              {i > 0 && Array.from({ length: i }).map((_, j) => (
                                <Zap key={j} className="w-3 h-3 text-orange-400 fill-orange-400" />
                              ))}
                              {label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>

                {/* Subtasks */}
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Subtasks ({result.subtasks.length})
                    </label>
                    <motion.button
                      onClick={addSubtask}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="w-6 h-6 rounded-md flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                  <div className="space-y-1.5 max-h-[160px] overflow-y-auto">
                    <AnimatePresence>
                      {result.subtasks.map((sub, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10, height: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center gap-2"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/40 flex-shrink-0" />
                          <Input
                            value={sub}
                            onChange={e => updateSubtask(i, e.target.value)}
                            className="h-8 bg-secondary/20 border-border/15 text-xs flex-1"
                            placeholder="Subtask..."
                          />
                          <motion.button
                            onClick={() => removeSubtask(i)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    {result.subtasks.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/40 py-2 text-center">Nenhuma subtask</p>
                    )}
                  </div>
                </motion.div>

                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center justify-between pt-2"
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setState("input")}
                    className="gap-1.5 text-muted-foreground"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Voltar
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={!result.title.trim() || creating}
                    size="sm"
                    className="gap-2 font-bold"
                    style={{
                      background: "linear-gradient(135deg, hsl(25 90% 50%), hsl(15 85% 45%))",
                      boxShadow: "0 0 15px rgba(255,100,40,0.2)",
                    }}
                  >
                    {creating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    {creating ? "Criando..." : "Criar Task"}
                  </Button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SmartTaskDialog;
