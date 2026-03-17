import { motion, useMotionValue, useTransform, useSpring, MotionValue } from "framer-motion";
import { useMemo, useEffect } from "react";

/* ═══ Particles ═══ */
const PARTICLE_COLORS = [
  "rgba(14,165,195,0.3)",
  "rgba(124,58,237,0.25)",
  "rgba(255,255,255,0.2)",
  "rgba(16,185,129,0.25)",
];

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const size = 2 + Math.random() * 3;
    const left = Math.random() * 100;
    const delay = Math.random() * 20;
    const duration = 18 + Math.random() * 22;
    const opacity = 0.1 + Math.random() * 0.3;
    const color = PARTICLE_COLORS[i % PARTICLE_COLORS.length];
    const driftX = -30 + Math.random() * 60;
    return { size, left, delay, duration, opacity, color, driftX };
  });
}

/* ═══ Orb config ═══ */
const ORBS = [
  { color: "#0ea5c3", size: 400, blur: 100, pos: { top: "-5%", left: "-5%" }, opRange: [0.05, 0.15], scaleRange: [0.8, 1.2], dur: 8, parallax: 0.03 },
  { color: "#7c3aed", size: 500, blur: 120, pos: { bottom: "-8%", right: "-8%" }, opRange: [0.04, 0.12], scaleRange: [0.9, 1.3], dur: 10, parallax: 0.05 },
  { color: "#10b981", size: 350, blur: 90, pos: { top: "40%", left: "-3%" }, opRange: [0.03, 0.10], scaleRange: [0.85, 1.15], dur: 12, parallax: 0.04 },
  { color: "#ec4899", size: 300, blur: 100, pos: { top: "-3%", left: "40%" }, opRange: [0.02, 0.08], scaleRange: [0.9, 1.1], dur: 14, parallax: 0.02 },
];

/* ═══ Aurora config ═══ */
const AURORAS = [
  { color: "rgba(124,58,237,0.08)", w: "130vw", h: "50vh", dur: 20, rotDur: 30, startX: -120, startY: -100, parallax: 0.06 },
  { color: "rgba(14,165,195,0.06)", w: "140vw", h: "45vh", dur: 18, rotDur: 35, startX: 80, startY: 120, parallax: 0.04 },
  { color: "rgba(16,185,129,0.05)", w: "120vw", h: "55vh", dur: 22, rotDur: 40, startX: -100, startY: 80, parallax: 0.05 },
  { color: "rgba(236,72,153,0.04)", w: "150vw", h: "40vh", dur: 25, rotDur: 32, startX: 120, startY: -80, parallax: 0.03 },
];

/* ═══ Individual components to respect hook rules ═══ */

const AuroraOrb = ({ a, i, springX, springY }: { a: typeof AURORAS[0]; i: number; springX: MotionValue<number>; springY: MotionValue<number> }) => {
  const px = useTransform(springX, v => a.startX + v * a.parallax * 200);
  const py = useTransform(springY, v => a.startY + v * a.parallax * 200);
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: a.w,
        height: a.h,
        background: `radial-gradient(ellipse at center, ${a.color}, transparent 70%)`,
        filter: `blur(${80 + i * 10}px)`,
        left: "50%",
        top: "50%",
        x: px,
        y: py,
      }}
      animate={{
        x: [a.startX, -a.startX, a.startX],
        y: [a.startY, -a.startY, a.startY],
        rotate: [0, 180, 360],
        opacity: [0.6, 1, 0.6],
      }}
      transition={{
        duration: a.dur,
        repeat: Infinity,
        ease: "easeInOut",
        rotate: { duration: a.rotDur, repeat: Infinity, ease: "linear" },
      }}
    />
  );
};

const PulsingOrb = ({ orb, springX, springY }: { orb: typeof ORBS[0]; springX: MotionValue<number>; springY: MotionValue<number> }) => {
  const ox = useTransform(springX, v => v * orb.parallax * 300);
  const oy = useTransform(springY, v => v * orb.parallax * 300);
  return (
    <motion.div
      className="absolute rounded-full"
      style={{
        width: orb.size,
        height: orb.size,
        background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
        filter: `blur(${orb.blur}px)`,
        x: ox,
        y: oy,
        ...orb.pos,
      }}
      animate={{
        scale: [orb.scaleRange[0], orb.scaleRange[1], orb.scaleRange[0]],
        opacity: [orb.opRange[0], orb.opRange[1], orb.opRange[0]],
      }}
      transition={{
        duration: orb.dur,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
};

const HomeBackground = () => {
  const particles = useMemo(() => generateParticles(20), []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 30, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 30, damping: 20 });

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      mouseX.set((e.clientX - cx) / cx);
      mouseY.set((e.clientY - cy) / cy);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
      {/* Layer 1: Mesh Gradient */}
      <div className="absolute inset-0 home-mesh-gradient" style={{ zIndex: 0 }} />

      {/* Layer 2: Aurora Bands */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
        {AURORAS.map((a, i) => (
          <AuroraOrb key={`aurora-${i}`} a={a} i={i} springX={springX} springY={springY} />
        ))}
      </div>

      {/* Layer 3: Pulsing Orbs */}
      <div className="absolute inset-0" style={{ zIndex: 2 }}>
        {ORBS.map((orb, i) => (
          <PulsingOrb key={`orb-${i}`} orb={orb} springX={springX} springY={springY} />
        ))}
      </div>

      {/* Layer 4: Floating Particles */}
      <div className="absolute inset-0 overflow-hidden" style={{ zIndex: 3 }}>
        {particles.map((p, i) => (
          <span
            key={i}
            className="home-particle"
            style={{
              "--p-left": `${p.left}%`,
              "--p-size": `${p.size}px`,
              "--p-opacity": p.opacity,
              "--p-duration": `${p.duration}s`,
              "--p-delay": `${p.delay}s`,
              "--p-color": p.color,
              "--p-drift": `${p.driftX}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Layer 5: Noise Texture */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 4,
          opacity: 0.03,
          mixBlendMode: "overlay",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />

      {/* Layer 6: Vignette */}
      <div
        className="absolute inset-0"
        style={{
          zIndex: 5,
          background: "radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, #050510 100%)",
          opacity: 0.65,
        }}
      />
    </div>
  );
};

export default HomeBackground;
