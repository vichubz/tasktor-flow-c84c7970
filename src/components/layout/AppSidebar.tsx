import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, BarChart3, FolderKanban, LogOut, Zap, ChevronLeft, ChevronRight } from "lucide-react";
import ProjectManager from "@/components/dashboard/ProjectManager";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface AppSidebarProps {
  onProjectsChange?: () => void;
}

const AppSidebar = ({ onProjectsChange }: AppSidebarProps) => {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showProjects, setShowProjects] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const fetchProjects = async () => {
    if (!user) return;
    const { data } = await supabase.from("projects").select("*").eq("user_id", user.id).order("created_at");
    if (data) setProjects(data);
    onProjectsChange?.();
  };

  useEffect(() => { fetchProjects(); }, [user]);

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/metrics", icon: BarChart3, label: "Métricas" },
  ];

  return (
    <>
      <motion.div
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="h-screen flex flex-col border-r border-border/50 bg-sidebar overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border/30">
          <motion.div
            className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-primary flex-shrink-0"
            whileHover={{ rotate: 15, scale: 1.1 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <Zap className="w-4 h-4 text-primary-foreground" />
          </motion.div>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-lg font-bold text-foreground text-tight"
            >
              Tasktor
            </motion.span>
          )}
        </div>

        {/* User */}
        {!collapsed && profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 py-3 border-b border-border/30"
          >
            <p className="text-xs text-muted-foreground">Olá,</p>
            <p className="text-sm font-semibold text-foreground truncate">{profile.name || "Usuário"}</p>
          </motion.div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {links.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative ${
                  isActive
                    ? "bg-primary/10 text-primary active-indicator"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <link.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{link.label}</span>}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-primary/10 rounded-lg -z-10"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}

          <button
            onClick={() => setShowProjects(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
          >
            <FolderKanban className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Projetos</span>}
          </button>

          {/* Project list in sidebar */}
          {!collapsed && projects.length > 0 && (
            <div className="ml-4 mt-1 space-y-0.5">
              {projects.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
              {projects.length > 5 && (
                <span className="text-[10px] text-muted-foreground/60 px-3">+{projects.length - 5} mais</span>
              )}
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-border/30 space-y-1">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1.5 text-muted-foreground hover:text-foreground transition-all hover:scale-110"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </motion.div>

      <ProjectManager
        open={showProjects}
        onOpenChange={setShowProjects}
        projects={projects}
        onUpdated={fetchProjects}
      />
    </>
  );
};

export default AppSidebar;
