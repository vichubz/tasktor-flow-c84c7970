import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import AppSidebar from "@/components/layout/AppSidebar";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import CalendarPanel from "@/components/dashboard/CalendarPanel";

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const { user, loading } = useAuth();
  const [calendarOpen, setCalendarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center mesh-gradient">
        <div className="w-10 h-10 rounded-xl gradient-primary animate-pulse glow-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen mesh-gradient w-full ambient-bg dot-grid">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:block">
        <AppSidebar
          onCalendarToggle={() => setCalendarOpen(prev => !prev)}
          calendarOpen={calendarOpen}
        />
      </div>
      <CalendarPanel open={calendarOpen} onClose={() => setCalendarOpen(false)} />
      <div className="relative z-10 flex-1 flex flex-col gradient-line-top pb-16 md:pb-0">
        {children}
      </div>
      {/* Mobile bottom nav — visible only on mobile */}
      <MobileBottomNav
        onCalendarToggle={() => setCalendarOpen(prev => !prev)}
        calendarOpen={calendarOpen}
      />
    </div>
  );
};

export default AppLayout;
