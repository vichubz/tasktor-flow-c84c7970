import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Mic, Square, Loader2, Plus, X, ArrowLeft, Sparkles, Zap, Send, Check, SkipForward, CheckCheck } from "lucide-react";
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

interface AITask {
  title: string;
  description: string | null;
  difficulty: number;
  project_id: string | null;
  subtasks: string[];
}

type DialogState = "input" | "loading" | "transcribing" | "review";

const SmartTaskDialog = ({ open, onOpenChange, projects, onCreated }: SmartTaskDialogProps) => {
  const { user } = useAuth();
  const [state, setState] = useState<DialogState>("input");
  const [prompt, setPrompt] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [createdCount, setCreatedCount] = useState(0);
  const [creating, setCreating] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const mediaRecorderSupported = typeof window !== "undefined" && !!window.MediaRecorder;

  useEffect(() => {
    if (open) {
      setState("input");
      setPrompt("");
      setTasks([]);
      setCurrentIndex(0);
      setCreatedCount(0);
      setCreating(false);
      setIsRecording(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    } else {
      stopRecording();
    }
  }, [open]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const toggleRecording = useCallback(async () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm",
      });
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (audioBlob.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(",")[1];
            transcribeAudio(base64);
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast.error("Não foi possível acessar o microfone");
    }
  }, [isRecording, stopRecording]);

  const transcribeAudio = async (audioBase64: string) => {
    setState("transcribing");

    try {
      const { data, error } = await supabase.functions.invoke("transcribe-audio", {
        body: {
          audio_base64: audioBase64,
          media_type: "audio/webm",
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Erro ao transcrever");
      }

      setPrompt(data.text);
      setState("input");
      setTimeout(() => textareaRef.current?.focus(), 100);
    } catch (e: any) {
      toast.error(e.message || "Erro ao transcrever áudio");
      setState("input");
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || !user) return;
    stopRecording();
    setState("loading");

    try {
      const { data, error } = await supabase.functions.invoke("ai-task-creator", {
        body: {
          prompt: prompt.trim(),
          projects: projects.map((p) => ({ id: p.id, name: p.name })),
        },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Erro ao processar");
      }

      const aiTasks: AITask[] = data.tasks || [];
      if (aiTasks.length === 0) {
        toast.error("IA não identificou nenhuma task");
        setState("input");
        return;
      }

      setTasks(aiTasks);
      setCurrentIndex(0);
      setCreatedCount(0);
      setState("review");
    } catch (e: any) {
      toast.error(e.message || "Erro ao gerar task com IA");
      setState("input");
    }
  };

  const currentTask = tasks[currentIndex] || null;

  const handleApproveTask = async () => {
    if (!currentTask || !user || creating) return;
    setCreating(true);

    try {
      const { data: lastTask } = await supabase
        .from("tasks")
        .select("position")
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .order("position", { ascending: false })
        .limit(1);

      const position = lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0;

      const { data: newTask, error: taskError } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          title: currentTask.title,
          description: currentTask.description,
          difficulty: currentTask.difficulty,
          project_id: currentTask.project_id,
          position,
        })
        .select("id")
        .single();

      if (taskError) throw taskError;

      if (currentTask.subtasks.length > 0 && newTask) {
        await supabase.from("subtasks").insert(
          currentTask.subtasks.filter((s) => s.trim()).map((title, i) => ({
            task_id: newTask.id,
            title,
            position: i,
          }))
        );
      }

      const newCreatedCount = createdCount + 1;
      setCreatedCount(newCreatedCount);

      if (currentIndex + 1 < tasks.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        toast.success(`${newCreatedCount} task${newCreatedCount !== 1 ? "s" : ""} criada${newCreatedCount !== 1 ? "s" : ""} com IA! 🔥`);
        await onCreated();
        onOpenChange(false);
      }
    } catch {
      toast.error("Falha ao criar task");
    } finally {
      setCreating(false);
    }
  };

  const handleSkipTask = () => {
    if (currentIndex + 1 < tasks.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      if (createdCount > 0) {
        toast.success(`${createdCount} task${createdCount !== 1 ? "s" : ""} criada${createdCount !== 1 ? "s" : ""} com IA! 🔥`);
        onCreated();
      }
      onOpenChange(false);
    }
  };

  const handleApproveAll = async () => {
    if (!user || creating) return;
    setCreating(true);

    try {
      const remaining = tasks.slice(currentIndex);
      let created = 0;

      for (const task of remaining) {
        const { data: lastTask } = await supabase
          .from("tasks")
          .select("position")
          .eq("user_id", user.id)
          .eq("is_completed", false)
          .order("position", { ascending: false })
          .limit(1);

        const position = lastTask && lastTask.length > 0 ? lastTask[0].position + 1 : 0;

        const { data: newTask, error } = await supabase
          .from("tasks")
          .insert({
            user_id: user.id,
            title: task.title,
            description: task.description,
            difficulty: task.difficulty,
            project_id: task.project_id,
            position,
          })
          .select("id")
          .single();

        if (!error && newTask && task.subtasks.length > 0) {
          await supabase.from("subtasks").insert(
            task.subtasks.filter((s) => s.trim()).map((title, i) => ({
              task_id: newTask.id,
              title,
              position: i,
            }))
          );
        }
        if (!error) created++;
      }

      const total = createdCount + created;
      toast.success(`${total} task${total !== 1 ? "s" : ""} criada${total !== 1 ? "s" : ""} com IA! 🔥`);
      await onCreated();
      onOpenChange(false);
    } catch {
      toast.error("Falha ao criar tasks");
    } finally {
      setCreating(false);
    }
  };

  const updateCurrentTask = (updates: Partial<AITask>) => {
    setTasks((prev) => prev.map((t, i) => (i === currentIndex ? { ...t, ...updates } : t)));
  };

  const updateSubtask = (index: number, value: string) => {
    if (!currentTask) return;
    const updated = [...currentTask.subtasks];
    updated[index] = value;
    updateCurrentTask({ subtasks: updated });
  };

  const removeSubtask = (index: number) => {
    if (!currentTask) return;
    updateCurrentTask({ subtasks: currentTask.subtasks.filter((_, i) => i !== index) });
  };

  const addSubtask = () => {
    if (!currentTask) return;
    updateCurrentTask({ subtasks: [...currentTask.subtasks, ""] });
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
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-primary/20 bg-card">
        <DialogTitle className="sr-only">Smart Task Creator</DialogTitle>

        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-border/20">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center animate-smart-glow"
              style={{
                background: "linear-gradient(135deg, rgba(255,120,50,0.2), rgba(255,80,20,0.1))",
              }}
            >
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">Smart Task Creator</h3>
              <p className="text-[11px] text-muted-foreground">
                {state === "review"
                  ? `Task ${currentIndex + 1} de ${tasks.length} — ${createdCount} criada${createdCount !== 1 ? "s" : ""}`
                  : state === "transcribing"
                  ? "Transcrevendo áudio..."
                  : "Descreva suas tasks por texto ou voz"}
              </p>
            </div>
            {state === "review" && tasks.length > 1 && (
              <div className="flex gap-1">
                {tasks.map((_, i) => (
                  <motion.div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      i < currentIndex
                        ? "bg-green-400"
                        : i === currentIndex
                        ? "bg-orange-400"
                        : "bg-muted-foreground/20"
                    }`}
                    animate={i === currentIndex ? { scale: [1, 1.3, 1] } : {}}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                ))}
              </div>
            )}
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
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder='Ex: "Criar API de pagamentos no Backend com subtasks: endpoints, testes e docs. Também fazer design da landing page no Frontend"'
                    className="min-h-[100px] bg-secondary/30 border-border/20 resize-none pr-12 text-sm placeholder:text-muted-foreground/40"
                  />
                  {mediaRecorderSupported && (
                    <motion.button
                      type="button"
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
                        <div className="animate-pulse">
                          <Square className="w-4 h-4 fill-current" />
                        </div>
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                    </motion.button>
                  )}
                </div>

                <AnimatePresence>
                  {isRecording && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20"
                    >
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-xs text-red-400 font-medium">Gravando... fale suas tasks</span>
                      <div className="flex items-center gap-0.5 ml-auto">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className="w-0.5 bg-red-400/60 rounded-full animate-waveform"
                            style={{
                              animationDelay: `${i * 0.12}s`,
                              animationDuration: `${0.6 + i * 0.08}s`,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[10px] text-muted-foreground/40">
                    <kbd className="bg-secondary/60 px-1 py-0.5 rounded text-[9px] font-mono">Ctrl+Enter</kbd> gerar
                    {" · "}Pode pedir múltiplas tasks
                  </p>
                  <Button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || isRecording}
                    size="sm"
                    className="gap-2 font-bold"
                    style={{
                      background: prompt.trim() && !isRecording ? "linear-gradient(135deg, hsl(25 90% 50%), hsl(15 85% 45%))" : undefined,
                      boxShadow: prompt.trim() && !isRecording ? "0 0 15px rgba(255,100,40,0.2)" : undefined,
                    }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    Gerar com IA
                  </Button>
                </div>
              </motion.div>
            )}

            {/* TRANSCRIBING STATE */}
            {state === "transcribing" && (
              <motion.div
                key="transcribing"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="py-10 flex flex-col items-center gap-4"
              >
                <motion.div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(59,130,246,0.15), rgba(99,102,241,0.1))",
                  }}
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Mic className="w-7 h-7 text-blue-400" />
                </motion.div>
                <div className="text-center">
                  <p className="text-sm text-foreground font-medium">Transcrevendo áudio...</p>
                  <p className="text-[11px] text-muted-foreground mt-1">GPT está processando sua fala</p>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-blue-400"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                    />
                  ))}
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

            {/* REVIEW STATE */}
            {state === "review" && currentTask && (
              <motion.div
                key={`review-${currentIndex}`}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
                className="space-y-3 pt-2"
              >
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Título</label>
                  <Input
                    value={currentTask.title}
                    onChange={(e) => updateCurrentTask({ title: e.target.value })}
                    className="bg-secondary/30 border-border/20 font-medium"
                  />
                </motion.div>

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Descrição</label>
                  <Textarea
                    value={currentTask.description || ""}
                    onChange={(e) => updateCurrentTask({ description: e.target.value || null })}
                    className="bg-secondary/30 border-border/20 min-h-[60px] resize-none text-sm"
                    placeholder="Sem descrição"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Projeto</label>
                    <Select
                      value={currentTask.project_id || "none"}
                      onValueChange={(v) => updateCurrentTask({ project_id: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border/20 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                        <SelectItem value="none"><span className="text-muted-foreground">Sem projeto</span></SelectItem>
                        {projects.map((p) => (
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
                      value={String(currentTask.difficulty)}
                      onValueChange={(v) => updateCurrentTask({ difficulty: Number(v) })}
                    >
                      <SelectTrigger className="bg-secondary/30 border-border/20 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-card/95 backdrop-blur-xl border-border/30">
                        {difficultyLabels.map((label, i) => (
                          <SelectItem key={i} value={String(i)}>
                            <span className="flex items-center gap-1.5">
                              {i > 0 &&
                                Array.from({ length: i }).map((_, j) => (
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

                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Subtasks ({currentTask.subtasks.length})
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
                  <div className="space-y-1.5 max-h-[130px] overflow-y-auto">
                    <AnimatePresence>
                      {currentTask.subtasks.map((sub, i) => (
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
                            onChange={(e) => updateSubtask(i, e.target.value)}
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
                    {currentTask.subtasks.length === 0 && (
                      <p className="text-[11px] text-muted-foreground/40 py-2 text-center">Nenhuma subtask</p>
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                  className="flex items-center justify-between pt-2 gap-2"
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

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleSkipTask}
                      disabled={creating}
                      className="gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      Pular
                    </Button>

                    {tasks.length - currentIndex > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleApproveAll}
                        disabled={creating}
                        className="gap-1.5 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                      >
                        {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
                        Aprovar todas ({tasks.length - currentIndex})
                      </Button>
                    )}

                    <Button
                      onClick={handleApproveTask}
                      disabled={!currentTask.title.trim() || creating}
                      size="sm"
                      className="gap-1.5 font-bold"
                      style={{
                        background: "linear-gradient(135deg, hsl(25 90% 50%), hsl(15 85% 45%))",
                        boxShadow: "0 0 15px rgba(255,100,40,0.2)",
                      }}
                    >
                      {creating ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      {creating ? "Criando..." : currentIndex + 1 < tasks.length ? "Aprovar" : "Criar"}
                    </Button>
                  </div>
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
