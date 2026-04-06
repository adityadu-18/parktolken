import { motion } from "framer-motion";

export function LoadingAnalysis() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 p-8 min-h-[300px]">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className="h-16 w-16 rounded-full border-4 border-muted border-t-primary" />
      </motion.div>
      <div className="text-center">
        <h3 className="font-semibold text-lg mb-1">Analyzing parking sign...</h3>
        <p className="text-sm text-muted-foreground">This usually takes a few seconds</p>
      </div>
    </div>
  );
}
