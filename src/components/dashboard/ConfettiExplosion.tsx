import { motion } from "framer-motion";

const COLORS = [
  "hsl(192 80% 50%)", // cyan
  "hsl(270 70% 60%)", // violet
  "hsl(150 60% 50%)", // green
  "hsl(45 93% 55%)",  // gold
  "hsl(339 90% 60%)", // pink
  "hsl(210 100% 60%)", // blue
];

interface ConfettiExplosionProps {
  count?: number;
}

const ConfettiExplosion = ({ count = 24 }: ConfettiExplosionProps) => {
  const particles = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
    const distance = 60 + Math.random() * 100;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance - 30; // bias upward
    const gravity = 40 + Math.random() * 60; // fall down
    const size = 3 + Math.random() * 5;
    const rotation = Math.random() * 720 - 360;
    const isRect = Math.random() > 0.5;

    return { x, y, gravity, size, rotation, color: COLORS[i % COLORS.length], delay: Math.random() * 0.1, isRect };
  });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible z-50">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: "50%",
            top: "50%",
            width: p.isRect ? p.size * 1.5 : p.size,
            height: p.size,
            borderRadius: p.isRect ? "1px" : "50%",
            backgroundColor: p.color,
          }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{
            x: p.x,
            y: [p.y, p.y + p.gravity],
            scale: [0, 1.5, 0.8, 0],
            opacity: [1, 1, 0.8, 0],
            rotate: p.rotation,
          }}
          transition={{
            duration: 1.5,
            delay: p.delay,
            ease: "easeOut",
            y: { duration: 1.5, ease: [0.25, 0.1, 0.25, 1] },
          }}
        />
      ))}
    </div>
  );
};

export default ConfettiExplosion;
