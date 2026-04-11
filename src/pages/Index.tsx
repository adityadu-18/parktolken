import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Upload, ParkingCircle, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/CameraCapture";
import { ImageUpload } from "@/components/ImageUpload";
import { ParkingResults, type ParkingAnalysis } from "@/components/ParkingResults";
import { LoadingAnalysis } from "@/components/LoadingAnalysis";
import { analyzeSign } from "@/lib/analyzeSign";
import { toast } from "sonner";

type AppState = "home" | "camera" | "loading" | "results";

const Index = () => {
  const [state, setState] = useState<AppState>("home");
  const [analysis, setAnalysis] = useState<ParkingAnalysis | null>(null);
  const [capturedImage, setCapturedImage] = useState<string>("");

  const handleImage = async (imageData: string) => {
    setCapturedImage(imageData);
    setState("loading");
    try {
      const result = await analyzeSign(imageData);
      setAnalysis(result);
      setState("results");
    } catch (e: any) {
      toast.error("Analysis failed", {
        description: e.message || "Please try again with a clearer image.",
      });
      setState("home");
    }
  };

  const handleBack = () => {
    setState("home");
    setAnalysis(null);
    setCapturedImage("");
  };

  if (state === "camera") {
    return <CameraCapture onCapture={handleImage} onClose={() => setState("home")} />;
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingAnalysis />
      </div>
    );
  }

  if (state === "results" && analysis) {
    return (
      <div className="min-h-screen bg-background">
        <ParkingResults analysis={analysis} imageData={capturedImage} onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 gap-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-3xl bg-primary mb-6">
            <ParkingCircle className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-primary">ParkTolken</h1>
          <p className="text-foreground/70 text-base max-w-xs mx-auto font-medium">
            Scan Swedish parking signs and instantly know if you can park here
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex flex-col items-center gap-3 w-full"
        >
          <Button
            variant="hero"
            size="lg"
            className="w-full max-w-xs rounded-2xl h-14"
            onClick={() => setState("camera")}
          >
            <Camera className="mr-2 h-5 w-5" />
            Scan Parking Sign
          </Button>

          <ImageUpload onUpload={handleImage} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-xs text-muted-foreground max-w-xs"
        >
          <p>Point your camera at any Swedish parking sign to get an instant interpretation with parking rules and timing.</p>
        </motion.div>
      </div>

      <div className="text-center py-4 space-y-1">
        <p className="text-xs text-muted-foreground">Images are processed temporarily and never stored</p>
        <p className="text-muted-foreground" style={{ fontSize: '11px' }}>© 2025 Designed by Aditya Udapudi</p>
      </div>
    </div>
  );
};

export default Index;
