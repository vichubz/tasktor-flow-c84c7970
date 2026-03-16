import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, BarChart3, Rocket, BrainCircuit, Calendar, Video } from "lucide-react";

const MobileBottomNav = () => {
  const location = useLocation();

  const links = [
    { to: "/home", icon: Rocket, label: "Início" },
    { to: "/dashboard", icon: LayoutDashboard, label: "Tarefas" },
    { to: "/meetings", icon: Video, label: "Reuniões" },
    { to: "/meetings-ai", icon: BrainCircuit, label: "IA" },
    { to: "/calendar", icon: Calendar, label: "Agenda" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex items-center justify-around"
      style={{
        background: "linear-gradient(180deg, hsl(200 25% 5% / 0.95), hsl(200 25% 4%))",
        borderTop: "1px solid hsl(var(--border) / 0.15)",
        backdropFilter: "blur(24px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {links.map(link => {
        const isActive = location.pathname === link.to;
        return (
          <NavLink
            key={link.to}
            to={link.to}
            className={`flex flex-col items-center gap-0.5 py-2.5 px-3 min-w-[56px] transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground/60"
            }`}
          >
            <link.icon className={`w-5 h-5 ${isActive ? "drop-shadow-[0_0_8px_rgba(14,165,195,0.5)]" : ""}`} />
            <span className="text-[10px] font-medium">{link.label}</span>
            {isActive && (
              <div
                className="absolute top-0 w-8 h-0.5 rounded-b-full"
                style={{ background: "var(--gradient-primary)", boxShadow: "0 0 8px rgba(14,165,195,0.4)" }}
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
};

export default MobileBottomNav;
