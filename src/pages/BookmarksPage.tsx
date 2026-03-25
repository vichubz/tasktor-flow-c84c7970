import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Link2, ExternalLink, Plus, X, Search, Trash2, KeyRound, Globe, FileText, Edit2, Check, Loader2, Bookmark, FolderOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type ProjectItem = {
  id: string;
  name: string;
  color: string;
};

type BookmarkItem = {
  id: string;
  user_id: string;
  title: string;
  url: string | null;
  notes: string | null;
  category: string;
  position: number;
  created_at: string;
  project_id: string | null;
};

const CATEGORIES = [
  { value: "link", label: "Link", icon: Globe, color: "text-primary" },
  { value: "access", label: "Acesso", icon: KeyRound, color: "text-amber-400" },
  { value: "doc", label: "Documento", icon: FileText, color: "text-emerald-400" },
];

function getCategoryMeta(cat: string) {
  return CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];
}

function extractDomain(url: string) {
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

const BookmarksPage = () => {
  const { user } = useAuth();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterProject, setFilterProject] = useState<string>("all");
  const [projects, setProjects] = useState<ProjectItem[]>([]);

  // New bookmark form
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formCategory, setFormCategory] = useState("link");
  const [formProjectId, setFormProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editCategory, setEditCategory] = useState("link");
  const [editProjectId, setEditProjectId] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("bookmarks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }) as { data: BookmarkItem[] | null; error: any };
    if (error) { toast.error("Falha ao carregar bookmarks"); setLoading(false); return; }
    setBookmarks(data || []);
    setLoading(false);
  }, [user]);

  const fetchProjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("projects")
      .select("id, name, color")
      .eq("user_id", user.id)
      .order("position");
    setProjects(data || []);
  }, [user]);

  useEffect(() => { fetchBookmarks(); fetchProjects(); }, [fetchBookmarks, fetchProjects]);

  const handleAdd = async () => {
    if (!formTitle.trim() || !user) return;
    setSaving(true);
    let url = formUrl.trim() || null;
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    const { data, error } = await supabase.from("bookmarks").insert({
      user_id: user.id,
      title: formTitle.trim(),
      url,
      notes: formNotes.trim() || null,
      category: formCategory,
      position: bookmarks.length,
      project_id: formProjectId,
    } as any).select().single();
    if (error) toast.error("Falha ao salvar");
    else {
      setBookmarks(prev => [data as BookmarkItem, ...prev]);
      setFormTitle(""); setFormUrl(""); setFormNotes(""); setFormCategory("link"); setFormProjectId(null);
      setShowForm(false);
      toast.success("Salvo!");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    const { error } = await supabase.from("bookmarks").delete().eq("id", id);
    if (error) { toast.error("Falha ao excluir"); fetchBookmarks(); }
  };

  const startEdit = (b: BookmarkItem) => {
    setEditingId(b.id);
    setEditTitle(b.title);
    setEditUrl(b.url || "");
    setEditNotes(b.notes || "");
    setEditCategory(b.category);
    setEditProjectId(b.project_id);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim()) return;
    let url = editUrl.trim() || null;
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) url = "https://" + url;
    setBookmarks(prev => prev.map(b => b.id === editingId ? { ...b, title: editTitle.trim(), url, notes: editNotes.trim() || null, category: editCategory, project_id: editProjectId } : b));
    setEditingId(null);
    await supabase.from("bookmarks").update({ title: editTitle.trim(), url, notes: editNotes.trim() || null, category: editCategory, project_id: editProjectId } as any).eq("id", editingId);
  };

  const filtered = bookmarks.filter(b => {
    if (filterCat !== "all" && b.category !== filterCat) return false;
    if (filterProject !== "all") {
      if (filterProject === "none" && b.project_id !== null) return false;
      if (filterProject !== "none" && b.project_id !== filterProject) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      return b.title.toLowerCase().includes(q) || (b.url || "").toLowerCase().includes(q) || (b.notes || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute w-[500px] h-[500px] rounded-full animate-orb-pulse" style={{ background: "radial-gradient(circle, hsl(var(--primary) / 0.06), transparent 70%)", top: "-8%", right: "-8%" }} />
        <div className="absolute w-[350px] h-[350px] rounded-full animate-orb-pulse-slow" style={{ background: "radial-gradient(circle, rgba(245,158,11,0.05), transparent 70%)", bottom: "10%", left: "-5%" }} />
      </div>

      {/* Header */}
      <div className="px-4 sm:px-6 pt-5 pb-3 relative z-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "var(--gradient-primary)", boxShadow: "var(--glow-primary)" }}>
            <Bookmark className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold font-display gradient-text">Links & Acessos</h1>
            <p className="text-xs text-muted-foreground/60">Salve links, credenciais e documentos importantes</p>
          </div>
        </div>

        {/* Search + filter + add */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar..."
              className="pl-9 bg-secondary/40 border-border/30 h-9"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg p-0.5" style={{ background: "hsl(var(--secondary) / 0.4)", border: "1px solid hsl(var(--border) / 0.2)" }}>
              <button
                onClick={() => setFilterCat("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${filterCat === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                Todos
              </button>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setFilterCat(cat.value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1 ${filterCat === cat.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <cat.icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Project filter */}
            {projects.length > 0 && (
              <div className="flex items-center rounded-lg p-0.5 overflow-x-auto" style={{ background: "hsl(var(--secondary) / 0.4)", border: "1px solid hsl(var(--border) / 0.2)" }}>
                <button
                  onClick={() => setFilterProject("all")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${filterProject === "all" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <FolderOpen className="w-3 h-3 inline mr-1" />Todos
                </button>
                <button
                  onClick={() => setFilterProject("none")}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap ${filterProject === "none" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Sem projeto
                </button>
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => setFilterProject(p.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 whitespace-nowrap ${filterProject === p.id ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="truncate max-w-[80px]">{p.name}</span>
                  </button>
                ))}
              </div>
            )}

            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                onClick={() => setShowForm(!showForm)}
                className="h-9 gap-1.5 font-bold text-xs sm:text-sm"
                style={{ background: "var(--gradient-primary)", boxShadow: "0 0 20px rgba(14,165,195,0.3), 0 4px 12px rgba(0,0,0,0.3)" }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Novo</span>
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-6 relative z-10">
        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mb-4"
            >
              <div
                className="rounded-xl p-4 space-y-3"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid hsl(var(--primary) / 0.15)",
                  backdropFilter: "blur(20px)",
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-foreground">Novo item</span>
                  {/* Category selector */}
                  <div className="flex items-center gap-1 ml-auto">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => setFormCategory(cat.value)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all ${formCategory === cat.value ? `bg-primary/15 ${cat.color}` : "text-muted-foreground/50 hover:text-muted-foreground"}`}
                      >
                        <cat.icon className="w-3 h-3" />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Título *"
                  className="bg-secondary/40 border-border/30 h-9 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
                />
                <Input
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder="URL (opcional)"
                  className="bg-secondary/40 border-border/30 h-9 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleAdd()}
                />
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Notas, credenciais, informações... (opcional)"
                  className="w-full bg-secondary/40 border border-border/30 rounded-md p-2.5 text-sm text-foreground resize-none min-h-[60px] outline-none focus:border-primary/30 transition-colors"
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="text-muted-foreground">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAdd}
                    disabled={!formTitle.trim() || saving}
                    className="gap-1.5"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Salvar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: "var(--glass-bg)" }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 text-muted-foreground"
          >
            <motion.div
              className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: "linear-gradient(145deg, hsl(var(--primary) / 0.08), hsl(var(--card)))",
                border: "1px solid hsl(var(--primary) / 0.12)",
              }}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Link2 className="w-10 h-10 text-primary/50" />
            </motion.div>
            <p className="text-lg font-display font-extrabold gradient-text">
              {search ? "Nenhum resultado encontrado" : "Nenhum link salvo ainda"}
            </p>
            <p className="text-sm mt-1">
              {search ? "Tente outra busca" : "Clique em \"Novo\" para adicionar seu primeiro link ou acesso"}
            </p>
          </motion.div>
        )}

        {/* Bookmark list */}
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((b, i) => {
              const catMeta = getCategoryMeta(b.category);
              const CatIcon = catMeta.icon;
              const isEditing = editingId === b.id;

              return (
                <motion.div
                  key={b.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 100 }}
                  transition={{ duration: 0.25, delay: i * 0.03 }}
                  layout
                  className="rounded-xl overflow-hidden relative group"
                  style={{
                    background: "var(--glass-bg)",
                    border: "1px solid hsl(var(--primary) / 0.08)",
                    backdropFilter: "blur(20px)",
                  }}
                >
                  {/* Left accent */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-full"
                    style={{
                      background: b.category === "access" ? "linear-gradient(180deg, #f59e0b, #f59e0b80)"
                        : b.category === "doc" ? "linear-gradient(180deg, #10b981, #10b98180)"
                        : "var(--gradient-primary)",
                    }}
                  />

                  {isEditing ? (
                    /* Edit mode */
                    <div className="px-4 pl-5 py-3 space-y-2">
                      <div className="flex items-center gap-1 mb-1">
                        {CATEGORIES.map(cat => (
                          <button
                            key={cat.value}
                            onClick={() => setEditCategory(cat.value)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-all ${editCategory === cat.value ? `bg-primary/15 ${cat.color}` : "text-muted-foreground/40 hover:text-muted-foreground"}`}
                          >
                            <cat.icon className="w-3 h-3" />
                            {cat.label}
                          </button>
                        ))}
                      </div>
                      <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Título" className="bg-secondary/40 border-border/30 h-8 text-sm" autoFocus />
                      <Input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="bg-secondary/40 border-border/30 h-8 text-sm" />
                      <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        placeholder="Notas..."
                        className="w-full bg-secondary/40 border border-border/30 rounded-md p-2 text-sm text-foreground resize-none min-h-[50px] outline-none focus:border-primary/30 transition-colors"
                      />
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)} className="h-7 text-xs">Cancelar</Button>
                        <Button size="sm" onClick={handleSaveEdit} className="h-7 text-xs gap-1" style={{ background: "var(--gradient-primary)" }}>
                          <Check className="w-3 h-3" /> Salvar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Display mode */
                    <div className="px-4 pl-5 py-3 flex items-start gap-3">
                      {/* Category icon */}
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${catMeta.color}`} style={{ background: "hsl(var(--secondary) / 0.6)" }}>
                        <CatIcon className="w-4 h-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground truncate">{b.title}</span>
                          {b.url && (
                            <a
                              href={b.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] text-primary/60 hover:text-primary flex items-center gap-1 flex-shrink-0 transition-colors"
                              title={b.url}
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span className="hidden sm:inline truncate max-w-[180px]">{extractDomain(b.url)}</span>
                            </a>
                          )}
                        </div>
                        {b.notes && (
                          <p className="text-xs text-muted-foreground/60 mt-1 whitespace-pre-wrap leading-relaxed line-clamp-3">
                            {b.notes}
                          </p>
                        )}
                        <span className="text-[10px] text-muted-foreground/30 font-mono mt-1.5 block">
                          {new Date(b.created_at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          onClick={() => startEdit(b)}
                          whileHover={{ scale: 1.1 }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-foreground hover:bg-secondary/50 transition-all"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          onClick={() => handleDelete(b.id)}
                          whileHover={{ scale: 1.1 }}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default BookmarksPage;
