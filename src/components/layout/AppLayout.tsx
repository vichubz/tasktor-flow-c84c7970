import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import AppSidebar from "@/components/layout/AppSidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-10 h-10 rounded-xl gradient-primary animate-pulse glow-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="flex h-dvh mesh-gradient w-full ambient-bg dot-grid overflow-hidden">
      <div className="hidden md:block">
        <AppSidebar />
      </div>
      <div className="relative z-10 flex-1 flex flex-col min-h-0 gradient-line-top pb-16 md:pb-0 overflow-hidden">
        {children}
      </div>
      <MobileBottomNav />
    </div>
  );
};

export default AppLayout;
