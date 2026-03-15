import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import AppSidebar from "@/components/layout/AppSidebar";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-lg gradient-primary animate-pulse" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen bg-background w-full">
      <AppSidebar />
      {children}
    </div>
  );
};

export default AppLayout;
