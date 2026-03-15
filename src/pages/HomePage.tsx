import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, ArrowRight } from "lucide-react";
import logoCompleto from "@/assets/logo_completo_tasktor.png";

// Particle component using CSS animation for performance
const Particle = ({ index }: { index: number }) => {
  const style = useMemo(() => {
    const size = 2 + Math.random() * 3;
    const colors = [
      "rgba(14,165,195,0.25)",
      "rgba(124,58,237,0.2)",
      "rgba(255,255,255,0.15)",
      "rgba(45,190,160,0.2)",
    ];
    const color = colors[index % colors.length];
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const duration = 15 + Math.random() * 25;
    const delay = Math.random() * -30;
    const driftX = -30 + Math.random() * 60;
    const driftY = -30 + Math.random() * 60;

    return {
      width: size,
      height: size,
      background: color,
      left: `${left}%`,
      top: `${top}%`,
      borderRadius: "50%",
      position: "absolute" as const,
      animation: `particle-drift-${index % 6} ${duration}s ease-in-out ${delay}s infinite`,
      boxShadow: `0 0 ${size * 2}px ${color}`,
      "--drift-x": `${driftX}px`,
      "--drift-y": `${driftY}px`,
    };
  }, [index]);

  return <div style={style} />;
};

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

  const particles = useMemo(() => Array.from({ length: 40 }, (_, i) => i), []);

  return (
    <div className="flex-1 h-screen overflow-hidden relative flex items-center justify-center">
      {/* ═══ LAYER 1: Animated gradient background ═══ */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 120% 80% at 50% 50%, #1a0a2e 0%, #0d1033 30%, #0A0A1A 70%, #080812 100%)",
          animation: "bg-breathe 10s ease-in-out infinite",
        }}
      />

      {/* ═══ LAYER 2: Perspective grid ═══ */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ perspective: "400px" }}
      >
        <div
          className="absolute w-full"
          style={{
            height: "200%",
            bottom: "-20%",
            transform: "rotateX(55deg)",
            transformOrigin: "center bottom",
            backgroundImage:
              "linear-gradient(rgba(14,165,195,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            animation: "grid-scroll 20s linear infinite",
          }}
        />
      </div>

      {/* ═══ LAYER 3: Glow orbs ═══ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 450,
            height: 450,
            background: "radial-gradient(circle, rgba(14,165,195,0.12), transparent 70%)",
            filter: "blur(80px)",
            top: "-10%",
            right: "-5%",
          }}
          animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 400,
            height: 400,
            background: "radial-gradient(circle, rgba(124,58,237,0.1), transparent 70%)",
            filter: "blur(100px)",
            bottom: "-5%",
            left: "-8%",
          }}
          animate={{ scale: [1.2, 0.9, 1.2], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 350,
            height: 350,
            background: "radial-gradient(circle, rgba(16,185,129,0.08), transparent 70%)",
            filter: "blur(90px)",
            top: "50%",
            left: "60%",
          }}
          animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* ═══ LAYER 4: Particles ═══ */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {particles.map(i => (
          <Particle key={i} index={i} />
        ))}
      </div>

      {/* ═══ CLOCK — top right ═══ */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute top-6 right-8 text-right z-20"
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
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
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

        {/* Tagline glow */}
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
          {/* Shimmer effect */}
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-white/15" />
        </motion.div>
      </motion.div>

      {/* ═══ CSS keyframes for particles and background ═══ */}
      <style>{`
        @keyframes bg-breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes grid-scroll {
          0% { background-position: 0 0; }
          100% { background-position: 0 60px; }
        }
        ${Array.from({ length: 6 }, (_, i) => {
          const x1 = -20 + Math.random() * 40;
          const y1 = -20 + Math.random() * 40;
          const x2 = -15 + Math.random() * 30;
          const y2 = -15 + Math.random() * 30;
          return `
            @keyframes particle-drift-${i} {
              0%, 100% { transform: translate(0, 0); opacity: 0.15; }
              25% { transform: translate(${x1}px, ${y1}px); opacity: 0.3; }
              50% { transform: translate(${x2}px, ${y2}px); opacity: 0.1; }
              75% { transform: translate(${-x1}px, ${-y2}px); opacity: 0.25; }
            }
          `;
        }).join("")}
      `}</style>
    </div>
  );
};

export default HomePage;
