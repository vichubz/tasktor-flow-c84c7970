import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { LayoutDashboard, BarChart3, FolderKanban, LogOut, ChevronLeft, ChevronRight, Calendar, Rocket, BrainCircuit } from "lucide-react";
import logoIcone from "@/assets/tasktor_logo_icone.png";
import logoCompleto from "@/assets/logo_completo_tasktor.png";
import ProjectManager from "@/components/dashboard/ProjectManager";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface AppSidebarProps {
  onProjectsChange?: () => void;
  onCalendarToggle?: () => void;
  calendarOpen?: boolean;
}

const AppSidebar = ({ onProjectsChange, onCalendarToggle, calendarOpen }: AppSidebarProps) => {
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
    { to: "/home", icon: Rocket, label: "Início" },
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/metrics", icon: BarChart3, label: "Métricas" },
  ];

  return (
    <>
      <motion.div
        animate={{ width: collapsed ? 64 : 224 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="h-screen flex flex-col overflow-hidden relative flex-shrink-0"
        style={{
          background: "linear-gradient(180deg, hsl(var(--card) / 0.6), hsl(var(--card) / 0.4))",
          borderRight: "1px solid hsl(var(--border) / 0.15)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Soft top glow */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-primary/[0.03] to-transparent pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center justify-center px-3 py-5 border-b border-border/10 relative z-10">
          {collapsed ? (
            <motion.div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
              whileHover={{ rotate: 10, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 400, damping: 15 }}
            >
              <img src={logoIcone} alt="Tasktor" className="w-8 h-8 object-contain" />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="flex items-center justify-center"
            >
              <img src={logoCompleto} alt="Tasktor" className="h-8 object-contain opacity-90" />
            </motion.div>
          )}
        </div>

        {/* User greeting */}
        {!collapsed && profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="px-4 py-3 border-b border-border/10"
          >
            <p className="text-[11px] text-muted-foreground/50 font-medium">Olá,</p>
            <p className="text-sm font-medium text-foreground/80 truncate">{profile.name || "Usuário"}</p>
          </motion.div>
        )}

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2.5 space-y-0.5 relative z-10">
          {links.map(link => {
            const isActive = location.pathname === link.to;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 relative ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground/60 hover:text-foreground/80 hover:bg-foreground/[0.04]"
                }`}
              >
                <link.icon className="w-[17px] h-[17px] flex-shrink-0" />
                {!collapsed && <span>{link.label}</span>}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-xl -z-10"
                    style={{
                      background: "hsl(var(--primary) / 0.08)",
                      border: "1px solid hsl(var(--primary) / 0.1)",
                    }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </NavLink>
            );
          })}

          {/* Calendar */}
          <button
            onClick={onCalendarToggle}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 w-full ${
              calendarOpen
                ? "text-primary bg-primary/[0.08]"
                : "text-muted-foreground/60 hover:text-foreground/80 hover:bg-foreground/[0.04]"
            }`}
          >
            <Calendar className="w-[17px] h-[17px] flex-shrink-0" />
            {!collapsed && <span>Calendário</span>}
          </button>

          {/* Projects */}
          <button
            onClick={() => setShowProjects(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-muted-foreground/60 hover:text-foreground/80 hover:bg-foreground/[0.04] transition-all duration-200 w-full"
          >
            <FolderKanban className="w-[17px] h-[17px] flex-shrink-0" />
            {!collapsed && <span>Projetos</span>}
          </button>

          {/* Project list */}
          {!collapsed && projects.length > 0 && (
            <div className="ml-5 mt-1.5 space-y-0.5">
              {projects.slice(0, 5).map(p => (
                <motion.div
                  key={p.id}
                  whileHover={{ x: 3 }}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-[12px] text-muted-foreground/45 rounded-lg hover:text-muted-foreground/70 hover:bg-foreground/[0.02] transition-all duration-200 cursor-default"
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: p.color, boxShadow: `0 0 4px ${p.color}30` }}
                  />
                  <span className="truncate">{p.name}</span>
                </motion.div>
              ))}
              {projects.length > 5 && (
                <span className="text-[10px] text-muted-foreground/30 px-3">+{projects.length - 5} mais</span>
              )}
            </div>
          )}
        </nav>

        {/* Bottom */}
        <div className="px-2.5 py-3 border-t border-border/10 space-y-0.5 relative z-10">
          <button
            onClick={signOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] text-muted-foreground/50 hover:text-destructive/70 hover:bg-destructive/[0.05] transition-all duration-200 w-full"
          >
            <LogOut className="w-[17px] h-[17px] flex-shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center w-full py-2 text-muted-foreground/30 hover:text-muted-foreground/60 transition-all duration-200"
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
