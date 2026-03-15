import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ArrowRight } from "lucide-react";
import logoCompleto from "@/assets/logo_completo_tasktor.png";

const HomePage = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Set playback speed to 0.5x via YouTube postMessage API
  const onIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    // Wait a moment for the player to initialize
    const t = setTimeout(() => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "setPlaybackRate", args: [0.5] }),
        "*"
      );
    }, 1500);
    return () => clearTimeout(t);
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
    <div className="flex-1 h-screen overflow-hidden relative flex items-center justify-center" style={{ background: "#0A0A0F" }}>
      {/* ═══ LAYER 0: YouTube Video Background ═══ */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ zIndex: 0 }}
      >
        <div
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            width: "120%",
            height: "120%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <iframe
            ref={iframeRef}
            onLoad={onIframeLoad}
            src="https://www.youtube.com/embed/tnd958ovCqI?autoplay=1&mute=1&loop=1&playlist=tnd958ovCqI&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&enablejsapi=1&disablekb=1&iv_load_policy=3"
            allow="autoplay; encrypted-media"
            allowFullScreen
            title="Background Video"
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              pointerEvents: "none",
            }}
          />
        </div>
      </div>

      {/* ═══ LAYER 1: Dark Overlay ═══ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 1,
          background: "linear-gradient(180deg, rgba(5,5,15,0.75) 0%, rgba(5,5,15,0.60) 40%, rgba(5,5,15,0.70) 100%)",
        }}
      />

      {/* ═══ LAYER 2: Glow orbs (subtle over overlay) ═══ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 2 }}>
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 450,
            height: 450,
            background: "radial-gradient(circle, rgba(14,165,195,0.08), transparent 70%)",
            filter: "blur(80px)",
            top: "-10%",
            right: "-5%",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(124,58,237,0.07), transparent 70%)",
            filter: "blur(100px)",
            bottom: "-5%",
            left: "-8%",
          }}
          animate={{ scale: [1.2, 0.9, 1.2], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ═══ CLOCK — top right ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute top-6 right-8 text-right"
        style={{ zIndex: 10 }}
      >
        <div className="font-mono text-sm text-white/40 tracking-wider">
          {hours}
          <span className="animate-pulse">:</span>
          {minutes}
          <span className="text-white/20">:{seconds}</span>
        </div>
        <p className="text-[11px] text-white/20 capitalize mt-0.5">{dateStr}</p>
      </motion.div>

      {/* ═══ CENTRAL CONTENT ═══ */}
      <div className="relative flex flex-col items-center text-center px-6 max-w-2xl" style={{ zIndex: 10 }}>
        {/* Greeting */}
        <motion.p
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg text-white/60 font-display mb-8"
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
