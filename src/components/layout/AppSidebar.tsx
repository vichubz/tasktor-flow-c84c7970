import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
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
      <div
        className={`h-screen flex flex-col border-r border-border/50 bg-sidebar transition-all duration-300 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border/30">
          <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center glow-primary flex-shrink-0">
            <Zap className="w-4 h-4 text-primary-foreground" />
          </div>
          {!collapsed && <span className="text-lg font-bold text-foreground text-tight">Tasktor</span>}
        </div>

        {/* User */}
        {!collapsed && profile && (
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-xs text-muted-foreground">Olá,</p>
            <p className="text-sm font-semibold text-foreground truncate">{profile.name || "Usuário"}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                location.pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              }`}
            >
              <link.icon className="w-4.5 h-4.5 flex-shrink-0" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          ))}

          <button
            onClick={() => setShowProjects(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all w-full"
          >
            <FolderKanban className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>Projetos</span>}
          </button>
        </nav>

        {/* Bottom */}
        <div className="px-2 py-3 border-t border-border/30 space-y-1">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-destructive transition-all w-full"
          >
            <LogOut className="w-4.5 h-4.5 flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-1.5 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

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
