import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Sparkles, Copy, ClipboardCheck, Trash2, ChevronDown, ChevronUp, Loader2, RotateCcw, FileText, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MeetingSummary {
  id: string;
  title: string | null;
  client: string | null;
  meeting_date: string | null;
  participants: string | null;
  objective: string | null;
  transcription: string;
  result: string;
  created_at: string;
}

const generateTitle = (client: string, objective: string, transcription: string): string => {
  if (client && objective) {
    const shortObj = objective.split(/\s+/).slice(0, 2).join(" ");
    return `${client} — ${shortObj}`;
  }
  if (client) return `${client} — Meeting`;
  if (objective) return objective.length > 40 ? objective.slice(0, 40) + "…" : objective;
  const words = transcription.trim().split(/\s+/).filter(w => w.length > 2).slice(0, 4);
  return words.length > 0 ? words.join(" ") : "Untitled meeting";
};

const formatHistoryDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - itemDate.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const MeetingsAIPage = () => {
  const { user } = useAuth();
  const [transcription, setTranscription] = useState("");
  const [client, setClient] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [participants, setParticipants] = useState("");
  const [objective, setObjective] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<MeetingSummary[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const fetchHistory = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("meeting_summaries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data as MeetingSummary[]);
    setLoadingHistory(false);
  }, [user]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleProcess = async () => {
    if (!transcription.trim() || !user || processing) return;
    setProcessing(true);
    setResult("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-transcription`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            transcription,
            context: {
              client: client || undefined,
              date: meetingDate || undefined,
              participants: participants || undefined,
              objective: objective || undefined,
            },
          }),
        }
      );

      if (resp.status === 429) {
        toast.error("Limite de requisições excedido. Tente novamente em alguns minutos.");
        setProcessing(false);
        return;
      }
      if (resp.status === 402) {
        toast.error("Créditos insuficientes. Adicione créditos ao seu workspace.");
        setProcessing(false);
        return;
      }

      const data = await resp.json();

      if (!data.success) {
        toast.error(data.error || "Falha ao processar transcrição");
        setProcessing(false);
        return;
      }

      setResult(data.result);

      const title = generateTitle(client, objective, transcription);
      await supabase.from("meeting_summaries").insert({
        user_id: user.id,
        title,
        client: client || null,
        meeting_date: meetingDate || null,
        participants: participants || null,
        objective: objective || null,
        transcription,
        result: data.result,
      });
      fetchHistory();
      toast.success("Transcrição processada com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Falha ao processar transcrição");
    }
    setProcessing(false);
  };

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedField(null), 2000);
  };

  const extractSections = (md: string) => {
    const followUpIdx = md.indexOf("# MENSAGEM DE FOLLOW-UP");
    const followUpIdx2 = md.indexOf("# FOLLOW-UP MESSAGE");
    const idx = followUpIdx !== -1 ? followUpIdx : followUpIdx2;
    if (idx === -1) return { summary: md, followUp: "" };
    return {
      summary: md.slice(0, idx).trim(),
      followUp: md.slice(idx).trim(),
    };
  };

  const handleReset = () => {
    setTranscription("");
    setClient("");
    setMeetingDate("");
    setParticipants("");
    setObjective("");
    setResult("");
    setContextOpen(false);
  };

  const handleDeleteHistory = async (id: string) => {
    const prev = [...history];
    setHistory(h => h.filter(x => x.id !== id));
    const { error } = await supabase.from("meeting_summaries").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); setHistory(prev); }
  };

  const handleStartEdit = (e: React.MouseEvent, item: MeetingSummary) => {
    e.stopPropagation();
    setEditingId(item.id);
    setEditingTitle(item.title || item.client || item.objective || "Untitled meeting");
  };

  const handleSaveTitle = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!editingTitle.trim()) return;
    const prev = [...history];
    setHistory(h => h.map(x => x.id === id ? { ...x, title: editingTitle.trim() } : x));
    setEditingId(null);
    const { error } = await supabase.from("meeting_summaries").update({ title: editingTitle.trim() }).eq("id", id);
    if (error) { toast.error("Failed to save title"); setHistory(prev); }
  };

  const handleCancelEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleLoadHistory = (item: MeetingSummary) => {
    setResult(item.result);
    setTranscription(item.transcription);
    setClient(item.client || "");
    setMeetingDate(item.meeting_date || "");
    setParticipants(item.participants || "");
    setObjective(item.objective || "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const { summary, followUp } = extractSections(result);

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0"
      >
        <div className="flex items-center gap-3">
          <motion.div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-primary)" }}
            animate={{ boxShadow: ["0 0 0px rgba(14,165,195,0.3)", "0 0 20px rgba(14,165,195,0.5)", "0 0 0px rgba(14,165,195,0.3)"] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <BrainCircuit className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold font-display gradient-text">Meet Agent</h1>
            <p className="text-xs text-muted-foreground/80">Paste a transcription and get an executive summary + follow-up</p>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto px-3 sm:px-6 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            {/* Context card */}
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <button
                onClick={() => setContextOpen(!contextOpen)}
                className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>Meeting Context (optional)</span>
                {contextOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {contextOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 space-y-3">
                      <Input
                        value={client}
                        onChange={e => setClient(e.target.value)}
                        placeholder="Client / Project"
                        className="bg-secondary/40 border-border/30 h-9 text-sm"
                      />
                      <Input
                        type="date"
                        value={meetingDate}
                        onChange={e => setMeetingDate(e.target.value)}
                        className="bg-secondary/40 border-border/30 h-9 text-sm"
                      />
                      <Input
                        value={participants}
                        onChange={e => setParticipants(e.target.value)}
                        placeholder="Participants"
                        className="bg-secondary/40 border-border/30 h-9 text-sm"
                      />
                      <Input
                        value={objective}
                        onChange={e => setObjective(e.target.value)}
                        placeholder="Meeting objective"
                        className="bg-secondary/40 border-border/30 h-9 text-sm"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Transcription textarea */}
            <div
              className="rounded-xl overflow-hidden relative"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(20px)",
              }}
            >
              <textarea
                value={transcription}
                onChange={e => setTranscription(e.target.value)}
                placeholder="Paste your meeting transcription here..."
                className="w-full bg-transparent text-foreground text-sm outline-none p-5 placeholder:text-muted-foreground/30 resize-y"
                style={{ minHeight: 300 }}
                disabled={processing}
              />
              <div className="absolute bottom-3 right-4 text-[10px] text-muted-foreground/30 font-mono">
                {transcription.length.toLocaleString()} characters
              </div>
            </div>

            {/* Process button */}
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <Button
                onClick={handleProcess}
                disabled={!transcription.trim() || processing}
                className="w-full h-12 gap-2 font-bold text-base relative overflow-hidden"
                style={{
                  background: "var(--gradient-primary)",
                  boxShadow: "0 0 20px rgba(14,165,195,0.3), 0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                {processing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Process Transcription
                  </>
                )}
              </Button>
            </motion.div>

            {/* History */}
            {!loadingHistory && history.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/50 mb-3 flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5" />
                  History
                </h3>
                <div className="space-y-1">
                  {history.map((item, i) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => handleLoadHistory(item)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group transition-all hover:bg-primary/[0.06]"
                      style={{
                        background: "var(--glass-bg)",
                        border: "1px solid var(--glass-border)",
                      }}
                    >
                      <span
                        className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-md shrink-0"
                        style={{
                          background: "hsl(var(--primary) / 0.1)",
                          color: "hsl(var(--primary))",
                        }}
                      >
                        {formatHistoryDate(item.created_at)}
                      </span>
                      {editingId === item.id ? (
                        <div className="flex-1 flex items-center gap-1.5 min-w-0" onClick={e => e.stopPropagation()}>
                          <Input
                            value={editingTitle}
                            onChange={e => setEditingTitle(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") handleSaveTitle(e as any, item.id); if (e.key === "Escape") setEditingId(null); }}
                            className="h-7 text-sm bg-secondary/40 border-border/30 px-2"
                            autoFocus
                          />
                          <motion.button onClick={e => handleSaveTitle(e, item.id)} whileTap={{ scale: 0.9 }} className="text-primary hover:text-primary/80 w-6 h-6 flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </motion.button>
                          <motion.button onClick={handleCancelEdit} whileTap={{ scale: 0.9 }} className="text-muted-foreground/50 hover:text-foreground w-6 h-6 flex items-center justify-center shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </motion.button>
                        </div>
                      ) : (
                        <p className="flex-1 text-sm text-foreground/90 truncate font-semibold">
                          {item.title || item.client || item.objective || "Untitled meeting"}
                        </p>
                      )}
                      <motion.button
                        onClick={e => handleStartEdit(e, item)}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-primary transition-all w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button
                        onClick={e => { e.stopPropagation(); handleDeleteHistory(item.id); }}
                        whileHover={{ scale: 1.15 }}
                        whileTap={{ scale: 0.9 }}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground/30 hover:text-destructive transition-all w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* RIGHT: Result */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div
              className="rounded-xl min-h-[500px] relative overflow-hidden"
              style={{
                background: "var(--glass-bg)",
                border: "1px solid var(--glass-border)",
                backdropFilter: "blur(20px)",
              }}
            >
              {/* Empty state */}
              {!result && !processing && (
                <div className="flex flex-col items-center justify-center h-full min-h-[500px] text-center px-8">
                  <motion.div
                    className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "linear-gradient(145deg, rgba(14,165,195,0.08), rgba(8,18,22,0.8))",
                      border: "1px solid rgba(14,165,195,0.12)",
                    }}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <BrainCircuit className="w-9 h-9 text-primary/40" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground/50 font-medium">Paste a transcription and click process</p>
                  <p className="text-xs text-muted-foreground/30 mt-1">AI will generate an executive summary and a follow-up message</p>
                </div>
              )}

              {/* Loading */}
              {processing && (
                <div className="p-6 space-y-4 min-h-[500px]">
                  <div className="flex items-center gap-3 mb-6">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    <span className="text-sm text-primary font-medium">AI is analyzing your meeting...</span>
                  </div>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full mt-4" />
                  <Skeleton className="h-4 w-2/3 mt-4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-32 w-full mt-4" />
                </div>
              )}

              {/* Result */}
              {result && !processing && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  {/* Action buttons */}
                  <div className="sticky top-0 z-20 flex items-center gap-2 p-4 border-b border-border/15"
                    style={{ background: "hsl(var(--card) / 0.9)", backdropFilter: "blur(12px)" }}
                  >
                    <CopyButton label="Summary" text={summary} field="summary" copiedField={copiedField} onCopy={handleCopy} />
                    {followUp && <CopyButton label="Follow-up" text={followUp} field="followup" copiedField={copiedField} onCopy={handleCopy} />}
                    <CopyButton label="All" text={result} field="all" copiedField={copiedField} onCopy={handleCopy} />
                    <div className="flex-1" />
                    <motion.button
                      onClick={handleReset}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-foreground/[0.05] transition-all"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      New
                    </motion.button>
                  </div>

                  {/* Markdown content */}
                  <div className="p-6 prose-meeting">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

// Small copy button component
const CopyButton = ({
  label, text, field, copiedField, onCopy,
}: {
  label: string; text: string; field: string; copiedField: string | null;
  onCopy: (text: string, field: string) => void;
}) => (
  <motion.button
    onClick={() => onCopy(text, field)}
    whileHover={{ scale: 1.05 }}
    whileTap={{ scale: 0.95 }}
    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
    style={{
      background: copiedField === field ? "hsl(var(--success) / 0.15)" : "hsl(var(--primary) / 0.08)",
      color: copiedField === field ? "hsl(var(--success))" : "hsl(var(--primary))",
      border: `1px solid ${copiedField === field ? "hsl(var(--success) / 0.2)" : "hsl(var(--primary) / 0.15)"}`,
    }}
  >
    {copiedField === field ? <ClipboardCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    {copiedField === field ? "Copied!" : label}
  </motion.button>
);

export default MeetingsAIPage;
