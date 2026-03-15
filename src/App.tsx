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

const queryClient = new QueryClient();

const PageTransition = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
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

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<PageTransition><AuthPage /></PageTransition>} />
        <Route path="/home" element={
          <AppLayout>
            <PageTransition>
              <Suspense fallback={<LoadingFallback />}>
                <HomePage />
              </Suspense>
            </PageTransition>
          </AppLayout>
        } />
        <Route path="/dashboard" element={<AppLayout><PageTransition><Dashboard /></PageTransition></AppLayout>} />
        <Route path="/metrics" element={
          <AppLayout>
            <PageTransition>
              <Suspense fallback={<LoadingFallback />}>
                <MetricsPage />
              </Suspense>
            </PageTransition>
          </AppLayout>
        } />
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
