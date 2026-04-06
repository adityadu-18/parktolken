import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Timer, Bell, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ParkingTimerProps {
  maxMinutes: number;
}

export function ParkingTimer({ maxMinutes }: ParkingTimerProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(maxMinutes * 60);
  const [startTime, setStartTime] = useState<number | null>(null);

  const totalSeconds = maxMinutes * 60;

  useEffect(() => {
    if (!isRunning || startTime === null) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, totalSeconds - elapsed);
      setSecondsLeft(remaining);

      if (remaining <= 15 * 60 && remaining > 15 * 60 - 1) {
        toast.warning("Parking time ending soon!", {
          description: `Move your car within ${Math.ceil(remaining / 60)} minutes to avoid a fine.`,
        });
      }

      if (remaining === 0) {
        toast.error("Parking time expired!", {
          description: "Move your car now to avoid a fine.",
        });
        setIsRunning(false);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime, totalSeconds]);

  const startTimer = useCallback(() => {
    setStartTime(Date.now());
    setSecondsLeft(totalSeconds);
    setIsRunning(true);
    toast.success("Parking timer started!", {
      description: `You have ${maxMinutes} minutes of parking.`,
    });
  }, [totalSeconds, maxMinutes]);

  const stopTimer = useCallback(() => {
    setIsRunning(false);
    setStartTime(null);
    setSecondsLeft(totalSeconds);
  }, [totalSeconds]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const progress = secondsLeft / totalSeconds;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Timer className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">Parking Timer</h3>
      </div>

      <div className="text-center mb-4">
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" strokeWidth="8" className="stroke-muted" />
            <motion.circle
              cx="60" cy="60" r="52" fill="none" strokeWidth="8"
              className="stroke-primary"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 52}
              animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - progress) }}
              transition={{ duration: 0.5 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>

      {!isRunning ? (
        <Button variant="hero" className="w-full rounded-xl" onClick={startTimer}>
          <Bell className="mr-2 h-4 w-4" />
          Start Parking Timer
        </Button>
      ) : (
        <Button variant="destructive" className="w-full rounded-xl" onClick={stopTimer}>
          <Square className="mr-2 h-4 w-4" />
          Stop Timer
        </Button>
      )}
    </motion.div>
  );
}
