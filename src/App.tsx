import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence, motion } from "framer-motion";
import { lazy, Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/NotFound";

const MetricsPage = lazy(() => import("@/pages/MetricsPage"));
const HomePage = lazy(() => import("@/pages/HomePage"));
const MeetingsAIPage = lazy(() => import("@/pages/MeetingsAIPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const MeetingsPage = lazy(() => import("@/pages/MeetingsPage"));
const SettingsPage = lazy(() => import("@/pages/SettingsPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -20 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    className="flex-1 flex flex-col h-full"
  >
    {children}
  </motion.div>
);

const LoadingFallback = () => (
  <div className="flex-1 flex items-center justify-center">
    <div className="w-10 h-10 rounded-xl gradient-primary animate-pulse glow-primary" />
  </div>
);

const WrappedLazy = ({ children }: { children: React.ReactNode }) => (
  <AppLayout>
    <PageTransition>
      <Suspense fallback={<LoadingFallback />}>
        {children}
      </Suspense>
    </PageTransition>
  </AppLayout>
);

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><AuthPage /></PageTransition>} />
        <Route path="/home" element={<WrappedLazy><HomePage /></WrappedLazy>} />
        <Route path="/dashboard" element={<AppLayout><PageTransition><Dashboard /></PageTransition></AppLayout>} />
        <Route path="/metrics" element={<WrappedLazy><MetricsPage /></WrappedLazy>} />
        <Route path="/meetings-ai" element={<WrappedLazy><MeetingsAIPage /></WrappedLazy>} />
        <Route path="/meetings" element={<WrappedLazy><MeetingsPage /></WrappedLazy>} />
        <Route path="/calendar" element={<WrappedLazy><CalendarPage /></WrappedLazy>} />
        <Route path="/settings" element={<WrappedLazy><SettingsPage /></WrappedLazy>} />
        <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
