import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const COLORS = [
  "hsl(192 80% 50%)",
  "hsl(270 70% 60%)",
  "hsl(150 60% 50%)",
  "hsl(45 93% 55%)",
  "hsl(339 90% 60%)",
  "hsl(210 100% 60%)",
];

interface ConfettiExplosionProps {
  /** If true, renders full-screen via portal */
  fullScreen?: boolean;
  count?: number;
}

const ConfettiExplosion = ({ count = 36, fullScreen = false }: ConfettiExplosionProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const distance = fullScreen ? 150 + Math.random() * 350 : 60 + Math.random() * 100;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - (fullScreen ? 100 : 30);
    const gravity = fullScreen ? 80 + Math.random() * 200 : 40 + Math.random() * 60;
    const size = fullScreen ? 4 + Math.random() * 8 : 3 + Math.random() * 5;
    const rotation = Math.random() * 720 - 360;
    const isRect = Math.random() > 0.4;

    return { x, y, gravity, size, rotation, color: COLORS[i % COLORS.length], delay: Math.random() * 0.15, isRect };
  });

  const content = (
    <div
      className="pointer-events-none overflow-visible"
      style={{
        position: fullScreen ? "fixed" : "absolute",
        inset: 0,
        zIndex: fullScreen ? 9999 : 50,
      }}
    >
      {/* Center origin for full screen */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: fullScreen ? "50%" : "50%",
        }}
      >
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{
              width: p.isRect ? p.size * 1.5 : p.size,
              height: p.size,
              borderRadius: p.isRect ? "2px" : "50%",
              backgroundColor: p.color,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: p.x,
              y: [p.y, p.y + p.gravity],
              scale: [0, 1.5, 1, 0],
              opacity: [1, 1, 0.8, 0],
              rotate: p.rotation,
            }}
            transition={{
              duration: 1.8,
              delay: p.delay,
              ease: "easeOut",
              y: { duration: 1.8, ease: [0.25, 0.1, 0.25, 1] },
            }}
          />
        ))}
      </div>
    </div>
  );

  if (fullScreen) {
    return createPortal(content, document.body);
  }

  return content;
};

export default ConfettiExplosion;
