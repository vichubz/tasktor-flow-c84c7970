import { useState, useEffect, memo } from "react";
import { motion } from "framer-motion";

const DigitalClock = memo(() => {
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
    <div className="flex flex-col">
      <div className="flex items-baseline gap-0.5">
        <div className="flex gap-1">
          {hours.split("").map((digit, i) => (
            <motion.span
              key={`h-${i}-${digit}`}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-display text-3xl font-extrabold inline-block gradient-text"
              style={{ textShadow: "0 0 20px rgba(14, 165, 195, 0.3)" }}
            >
              {digit}
            </motion.span>
          ))}
        </div>

        <motion.span
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-2xl font-bold text-primary mx-0.5"
        >
          :
        </motion.span>

        <div className="flex gap-1">
          {minutes.split("").map((digit, i) => (
            <motion.span
              key={`m-${i}-${digit}`}
              initial={{ y: -8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="font-display text-3xl font-extrabold inline-block gradient-text"
              style={{ textShadow: "0 0 20px rgba(14, 165, 195, 0.3)" }}
            >
              {digit}
            </motion.span>
          ))}
        </div>

        <span className="font-mono text-base text-muted-foreground ml-1.5">
          {seconds}
        </span>
      </div>
      <span className="text-xs text-muted-foreground capitalize font-body mt-0.5">{dateStr}</span>
    </div>
  );
});

DigitalClock.displayName = "DigitalClock";

export default DigitalClock;
