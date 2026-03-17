import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ArrowRight, RefreshCw } from "lucide-react";
import logoCompleto from "@/assets/logo_completo_tasktor.png";
import HomeBackground from "@/components/home/HomeBackground";
import { getDailyQuote, getRandomQuote } from "@/lib/quotes";

const HomePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [quote, setQuote] = useState(getDailyQuote);

  const rotateQuote = () => {
    setQuote((prev) => getRandomQuote(prev.text));
  };

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
    year: "numeric"
  });

  return (
    <div className="flex-1 h-dvh min-h-0 overflow-hidden relative flex items-center justify-center" style={{ background: "#050510" }}>
      {/* ═══ Animated Background ═══ */}
      <HomeBackground />


      {/* ═══ CLOCK — top right ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute top-4 right-4 sm:top-6 sm:right-8 text-right"
        style={{ zIndex: 10 }}>
        
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
          className="text-base sm:text-lg text-white/60 font-display mb-6 sm:mb-8">
          
          Bem-vindo de volta, <span className="text-white/80 font-semibold">{profile?.name || "Usuário"}</span>
        </motion.p>

        {/* Logo — Epic Entrance */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, rotateX: 90, y: -80 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
          transition={{ delay: 0.4, duration: 1.6, type: "spring", stiffness: 60, damping: 12 }}
          className="mb-4 relative"
          style={{ perspective: 800 }}
        >
          {/* Pulsing glow ring behind logo */}
          <motion.div
            className="absolute inset-0 -inset-x-8 -inset-y-4 rounded-full"
            style={{
              background: "radial-gradient(ellipse at center, rgba(14,165,195,0.25) 0%, rgba(124,58,237,0.15) 40%, transparent 70%)",
              filter: "blur(25px)",
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0.8, 0.4],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Secondary glow — warm accent */}
          <motion.div
            className="absolute inset-0 -inset-x-12 -inset-y-6 rounded-full"
            style={{
              background: "radial-gradient(ellipse at center, rgba(16,185,129,0.12) 0%, rgba(236,72,153,0.08) 50%, transparent 70%)",
              filter: "blur(35px)",
            }}
            animate={{
              scale: [1.2, 0.9, 1.2],
              opacity: [0.3, 0.6, 0.3],
              rotate: [0, 180, 360],
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Logo with continuous float + subtle 3D tilt */}
          <motion.img
            src={logoCompleto}
            alt="Tasktor"
            className="h-16 sm:h-20 md:h-24 object-contain relative z-10"
            style={{
              filter: "drop-shadow(0 0 50px rgba(14,165,195,0.4)) drop-shadow(0 0 100px rgba(124,58,237,0.2))",
            }}
            animate={{
              y: [0, -6, 0, -3, 0],
              rotateY: [0, 3, 0, -3, 0],
              rotateX: [0, -2, 0, 2, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            whileHover={{
              scale: 1.08,
              rotateY: 8,
              filter: "drop-shadow(0 0 70px rgba(14,165,195,0.6)) drop-shadow(0 0 120px rgba(124,58,237,0.35))",
              transition: { duration: 0.4 },
            }}
          />
          {/* Light streak across logo */}
          <motion.div
            className="absolute inset-0 z-20 overflow-hidden rounded-lg pointer-events-none"
            style={{ mixBlendMode: "overlay" }}
          >
            <motion.div
              className="absolute h-full w-1/3"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)",
                top: 0,
              }}
              animate={{ x: ["-100%", "400%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
            />
          </motion.div>
        </motion.div>

        {/* Tagline */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
          className="mb-8 sm:mb-12">
          
          

          
        </motion.div>

        {/* Quote */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="mb-10 sm:mb-14">
          
          <motion.div key={quote.text} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <p className="text-lg sm:text-xl md:text-2xl text-white/70 font-display font-medium leading-relaxed italic max-w-lg mx-auto">
              "{quote.text}"
            </p>
            <p className="text-sm text-white/30 mt-4 font-body">— {quote.author}</p>
          </motion.div>
          <button
            onClick={rotateQuote}
            className="mt-4 p-2 rounded-full text-white/20 hover:text-white/50 hover:bg-white/5 transition-all duration-300"
            aria-label="Trocar frase">
            
            <RefreshCw className="w-4 h-4" />
          </button>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.3, duration: 0.6 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/dashboard")}
          className="relative group px-8 sm:px-10 py-3 sm:py-4 rounded-2xl font-display font-bold text-base sm:text-lg text-white overflow-hidden"
          style={{
            background: "linear-gradient(135deg, hsl(192 80% 40%), hsl(172 66% 45%))",
            boxShadow: "0 0 40px rgba(14,165,195,0.35), 0 8px 32px rgba(0,0,0,0.4)"
          }}>
          
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            animate={{ x: ["-200%", "200%"] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }} />
          
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
        style={{ zIndex: 10 }}>
        
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
          
          <ChevronDown className="w-5 h-5 text-white/15" />
        </motion.div>
      </motion.div>
    </div>);

};

export default HomePage;