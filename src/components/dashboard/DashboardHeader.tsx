import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import DigitalClock from "./DigitalClock";
import WorkTimer from "./WorkTimer";
import { CheckCircle2, Calendar, Clock } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Project = Tables<"projects">;

interface DashboardHeaderProps {
  projects: Project[];
  todayCompleted: number;
}

const DashboardHeader = ({ projects, todayCompleted }: DashboardHeaderProps) => {
  const { user } = useAuth();
  const [meetingHours, setMeetingHours] = useState<string>("0");
  const [meetingCount, setMeetingCount] = useState(0);

  const today = new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("meeting_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", today)
        .single();
      if (data) {
        setMeetingHours(String(data.hours));
        setMeetingCount(data.meeting_count);
      }
    };
    load();
  }, [user, today]);

  const saveMeetingHours = async (value: string) => {
    if (!user) return;
    setMeetingHours(value);
    const hours = parseFloat(value) || 0;
    const { data: existing } = await supabase
      .from("meeting_logs")
      .select("id")
      .eq("user_id", user.id)
      .eq("date", today)
      .single();

    if (existing) {
      await supabase.from("meeting_logs").update({ hours }).eq("id", existing.id);
    } else {
      await supabase.from("meeting_logs").insert({ user_id: user.id, date: today, hours, meeting_count: 0 });
    }
  };

  const miniCards = [
    { icon: Calendar, label: "Reuniões hoje", value: meetingCount.toString(), color: "text-primary" },
    { 
      icon: Clock, 
      label: "Horas em reunião", 
      value: meetingHours, 
      color: "text-accent",
      editable: true,
      onChange: saveMeetingHours,
    },
    { icon: CheckCircle2, label: "Concluídas hoje", value: todayCompleted.toString(), color: "text-success" },
  ];

  return (
    <div className="glass border-b border-border/50 px-6 py-4">
      <div className="flex items-center justify-between gap-6">
        <DigitalClock />

        {/* Mini stat cards */}
        <div className="flex items-center gap-3">
          {miniCards.map((card) => (
            <div key={card.label} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
              <card.icon className={`w-4 h-4 ${card.color}`} />
              <div className="flex flex-col">
                <span className="text-[10px] text-muted-foreground leading-none mb-0.5">{card.label}</span>
                {card.editable ? (
                  <input
                    type="number"
                    value={card.value}
                    onChange={(e) => card.onChange?.(e.target.value)}
                    className="w-12 bg-transparent text-foreground font-mono text-sm font-semibold outline-none border-none p-0"
                    step="0.5"
                    min="0"
                  />
                ) : (
                  <span className="text-foreground font-mono text-sm font-semibold">{card.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <WorkTimer projects={projects} />
      </div>
    </div>
  );
};

export default DashboardHeader;
