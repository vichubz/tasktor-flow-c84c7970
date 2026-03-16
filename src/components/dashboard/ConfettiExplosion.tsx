import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SYMBOLS = ["$", "$", "💰", "$", "R$", "$"];
const COLORS = [
  "#FFD700",
  "#10b981",
  "#0ea5c3",
  "#ffffff",
  "#f59e0b",
  "#22d3ee",
];

interface ConfettiExplosionProps {
  fullScreen?: boolean;
  count?: number;
}

const ConfettiExplosion = ({ count = 32, fullScreen = false }: ConfettiExplosionProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
    const distance = fullScreen ? 120 + Math.random() * 400 : 60 + Math.random() * 100;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - (fullScreen ? 120 : 30);
    const gravity = fullScreen ? 100 + Math.random() * 250 : 40 + Math.random() * 60;
    const size = fullScreen ? 16 + Math.random() * 24 : 12 + Math.random() * 14;
    const rotation = Math.random() * 720 - 360;

    return {
      x, y, gravity, size, rotation,
      color: COLORS[i % COLORS.length],
      symbol: SYMBOLS[i % SYMBOLS.length],
      delay: Math.random() * 0.2,
    };
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
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
        }}
      >
        {particles.map((p, i) => (
          <motion.span
            key={i}
            className="absolute font-bold select-none"
            style={{
              fontSize: p.size,
              color: p.color,
              textShadow: `0 0 12px ${p.color}80, 0 0 4px ${p.color}40`,
              lineHeight: 1,
            }}
            initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
            animate={{
              x: p.x,
              y: [p.y, p.y + p.gravity],
              scale: [0, 1.4, 1, 0],
              opacity: [1, 1, 0.7, 0],
              rotate: p.rotation,
            }}
            transition={{
              duration: 2,
              delay: p.delay,
              ease: "easeOut",
              y: { duration: 2, ease: [0.25, 0.1, 0.25, 1] },
            }}
          >
            {p.symbol}
          </motion.span>
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
