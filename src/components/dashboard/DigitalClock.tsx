import { useState, useEffect } from "react";

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const timeStr = time.toLocaleTimeString("pt-BR", { hour12: false });
  const dateStr = time.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col">
      <span className="font-mono text-2xl font-bold text-foreground text-tight tracking-wider">
        {timeStr}
      </span>
      <span className="text-xs text-muted-foreground capitalize">{dateStr}</span>
    </div>
  );
};

export default DigitalClock;
