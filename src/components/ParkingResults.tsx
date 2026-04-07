import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Clock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParkingTimer } from "./ParkingTimer";

export interface ParkingAnalysis {
  detectedSigns: string[];
  interpretation: string;
  rules: string[];
  isAllowed: boolean | null;
  status: string;
  timeRemaining: string | null;
  maxParkingMinutes: number | null;
  confidence: number;
}

interface ParkingResultsProps {
  analysis: ParkingAnalysis;
  imageData: string;
  onBack: () => void;
}

export function ParkingResults({ analysis, imageData, onBack }: ParkingResultsProps) {
  const statusIcon = analysis.isAllowed === true
    ? <CheckCircle2 className="h-8 w-8 text-success" />
    : analysis.isAllowed === false
    ? <XCircle className="h-8 w-8 text-destructive" />
    : <AlertTriangle className="h-8 w-8 text-warning" />;

  const statusBg = analysis.isAllowed === true
    ? "bg-success border-success text-success-foreground"
    : analysis.isAllowed === false
    ? "bg-destructive border-destructive text-destructive-foreground"
    : "bg-warning border-warning text-warning-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 p-4 pb-8 max-w-lg mx-auto w-full"
    >
      <Button variant="ghost" className="self-start -ml-2" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back
      </Button>

      {/* Captured Image */}
      <div className="rounded-2xl overflow-hidden border border-border shadow-sm">
        <img src={imageData} alt="Parking sign" className="w-full h-48 object-cover" />
      </div>

      {/* Status Card */}
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        className={`rounded-2xl border p-5 ${statusBg}`}
      >
        <div className="flex items-center gap-3 mb-2">
          {statusIcon}
          <h2 className="text-xl font-bold">{analysis.status}</h2>
        </div>
        {analysis.timeRemaining && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Time remaining: {analysis.timeRemaining}</span>
          </div>
        )}
      </motion.div>

      {/* Interpretation */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-2">Sign Interpretation</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">{analysis.interpretation}</p>
      </div>

      {/* Detected Signs */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Detected Signs</h3>
        <div className="flex flex-wrap gap-2">
          {analysis.detectedSigns.map((sign, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
              {sign}
            </span>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="font-semibold mb-3">Parking Rules</h3>
        <ul className="space-y-2">
          {analysis.rules.map((rule, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              {rule}
            </li>
          ))}
        </ul>
      </div>

      {/* Confidence */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">AI Confidence</h3>
          <span className="text-sm font-medium text-muted-foreground">{Math.round(analysis.confidence * 100)}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${analysis.confidence * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-primary"
          />
        </div>
      </div>

      {/* Timer */}
      {analysis.isAllowed && analysis.maxParkingMinutes && (
        <ParkingTimer maxMinutes={analysis.maxParkingMinutes} />
      )}
    </motion.div>
  );
}
