import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ArrowRight } from "lucide-react";
import logoCompleto from "@/assets/logo_completo_tasktor.png";
import HomeBackground from "@/components/home/HomeBackground";

const HomePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");
  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex-1 h-screen overflow-hidden relative flex items-center justify-center" style={{ background: "#050510" }}>
      {/* ═══ Animated Background ═══ */}
      <HomeBackground />


      {/* ═══ CLOCK — top right ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute top-4 right-4 sm:top-6 sm:right-8 text-right"
        style={{ zIndex: 10 }}
      >
        <div className="font-mono text-xs sm:text-sm text-white/40 tracking-wider">
          {hours}
          <span className="animate-pulse">:</span>
          {minutes}
          <span className="text-white/20">:{seconds}</span>
        </div>
        <p className="text-[10px] sm:text-[11px] text-white/20 capitalize mt-0.5 hidden sm:block">{dateStr}</p>
      </motion.div>

      {/* ═══ CENTRAL CONTENT ═══ */}
      <div className="relative flex flex-col items-center text-center px-4 sm:px-6 max-w-2xl" style={{ zIndex: 10 }}>
        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-base sm:text-lg text-white/60 font-display mb-6 sm:mb-8"
        >
          Bem-vindo de volta, <span className="text-white/80 font-semibold">{profile?.name || "Usuário"}</span>
        </motion.p>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 1.2, type: "spring", stiffness: 100, damping: 15 }}
          className="mb-4"
        >
          <img
            src={logoCompleto}
            alt="Tasktor"
            className="h-20 md:h-24 object-contain drop-shadow-[0_0_40px_rgba(14,165,195,0.3)]"
          />
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mb-12"
        >
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/25 font-mono">
            Produtividade Premium
          </p>
        </motion.div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mb-14"
        >
          <p className="text-xl md:text-2xl text-white/70 font-display font-medium leading-relaxed italic max-w-lg mx-auto">
            "Discipline is choosing between what you want now and what you want most."
          </p>
          <p className="text-sm text-white/30 mt-4 font-body">— Abraham Lincoln</p>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/dashboard")}
          className="relative group px-10 py-4 rounded-2xl font-display font-bold text-lg text-white overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(192 80% 40%), hsl(172 66% 45%))",
            boxShadow: "0 0 40px rgba(14,165,195,0.35), 0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
          />
          <span className="relative z-10 flex items-center gap-3">
            Ir para o Dashboard
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </span>
        </motion.button>
      </div>

      {/* ═══ BOTTOM CHEVRON ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        style={{ zIndex: 10 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-white/15" />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default HomePage;
