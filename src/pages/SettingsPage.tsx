import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, User, Trash2, LogOut, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";

const SettingsPage = () => {
  const { user, profile, signOut } = useAuth();
  const [name, setName] = useState(profile?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSaveName = async () => {
    if (!user || !name.trim()) return;
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ name: name.trim() }).eq("id", user.id);
    if (error) toast.error("Erro ao salvar nome");
    else toast.success("Nome atualizado!");
    setSavingName(false);
  };

  const resetData = async (type: string) => {
    if (!user) return;
    setDeleting(type);
    try {
      if (type === "tasks" || type === "all") {
        await supabase.from("subtasks").delete().in("task_id",
          (await supabase.from("tasks").select("id").eq("user_id", user.id)).data?.map(t => t.id) || []
        );
        await supabase.from("tasks").delete().eq("user_id", user.id);
      }
      if (type === "meetings" || type === "all") {
        await supabase.from("meetings").delete().eq("user_id", user.id);
        await supabase.from("meeting_logs").delete().eq("user_id", user.id);
      }
      if (type === "time" || type === "all") {
        await supabase.from("time_entries").delete().eq("user_id", user.id);
      }
      if (type === "transcriptions" || type === "all") {
        // First unlink meetings
        await supabase.from("meetings").update({ summary_id: null }).eq("user_id", user.id);
        await supabase.from("meeting_summaries").delete().eq("user_id", user.id);
      }
      if (type === "google" || type === "all") {
        await supabase.from("google_tokens").delete().eq("user_id", user.id);
      }
      toast.success(type === "all" ? "Todos os dados foram resetados" : "Dados excluídos com sucesso");
    } catch {
      toast.error("Erro ao excluir dados");
    }
    setDeleting(null);
  };

  const resetItems = [
    { key: "tasks", label: "Tarefas", desc: "Todas as tarefas e subtarefas" },
    { key: "meetings", label: "Reuniões", desc: "Registros de reuniões e logs diários" },
    { key: "time", label: "Tempo trabalhado", desc: "Todas as entradas de tempo" },
    { key: "transcriptions", label: "Transcrições", desc: "Resumos de reuniões com IA" },
    { key: "google", label: "Google Calendar", desc: "Desconectar conta do Google" },
  ];

  return (
    <div className="flex-1 flex flex-col h-full p-4 md:p-8 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)" }}>
          <Settings className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-display font-bold gradient-text">Configurações</h1>
          <p className="text-xs text-muted-foreground">Gerencie sua conta e dados</p>
        </div>
      </div>

      <div className="max-w-xl space-y-6">
        {/* Profile */}
        <div className="stat-card rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Perfil</h2>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Email</label>
            <p className="text-sm text-foreground/80 mt-0.5">{user?.email}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-medium">Nome</label>
            <div className="flex gap-2 mt-1">
              <Input value={name} onChange={e => setName(e.target.value)} className="bg-secondary/60 border-border/30" placeholder="Seu nome" />
              <Button onClick={handleSaveName} disabled={savingName} className="font-bold text-xs px-4" style={{ background: "var(--gradient-primary)" }}>
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
              </Button>
            </div>
          </div>
        </div>

        {/* Reset data */}
        <div className="stat-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <Trash2 className="w-4 h-4 text-destructive" />
            <h2 className="text-sm font-bold text-foreground">Resetar Dados</h2>
          </div>
          <p className="text-xs text-muted-foreground">Exclua dados específicos ou todos de uma vez. Esta ação é irreversível.</p>

          <div className="space-y-2 mt-3">
            {resetItems.map(item => (
              <AlertDialog key={item.key}>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-3 rounded-lg bg-secondary/30 hover:bg-destructive/5 hover:border-destructive/20 border border-border/10 transition-all text-left group">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{item.label}</p>
                      <p className="text-[11px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Trash2 className="w-4 h-4 text-muted-foreground/30 group-hover:text-destructive transition-colors" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-destructive" />
                      Excluir {item.label}?
                    </AlertDialogTitle>
                    <AlertDialogDescription>{item.desc}. Esta ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => resetData(item.key)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting === item.key ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ))}

            {/* Reset all */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 border border-destructive/20 transition-all text-sm font-bold text-destructive mt-2">
                  <AlertTriangle className="w-4 h-4" />
                  Resetar Tudo
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Resetar TODOS os dados?
                  </AlertDialogTitle>
                  <AlertDialogDescription>Isso excluirá todas as tarefas, reuniões, tempo trabalhado, transcrições e desconectará o Google Calendar. Esta ação é irreversível.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => resetData("all")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    {deleting === "all" ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Resetar Tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Account */}
        <div className="stat-card rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <LogOut className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Conta</h2>
          </div>
          <Button onClick={signOut} variant="outline" className="w-full text-sm font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30">
            <LogOut className="w-4 h-4 mr-2" />
            Sair da conta
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
