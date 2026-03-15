import { useState, useEffect } from "react";
import { motion } from "framer-motion";

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.toLocaleTimeString("pt-BR", { hour12: false, hour: "2-digit", minute: "2-digit" });
  const seconds = time.toLocaleTimeString("pt-BR", { hour12: false, second: "2-digit" }).split(":").pop();
  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col">
      <div className="flex items-baseline gap-1">
        <span className="font-mono text-2xl font-bold text-foreground text-tight tracking-wider neon-text-primary">
          {hours}
        </span>
        <motion.span
          className="font-mono text-lg text-primary/60"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          :{seconds}
        </motion.span>
      </div>
      <span className="text-xs text-muted-foreground capitalize">{dateStr}</span>
    </div>
  );
};

export default DigitalClock;
