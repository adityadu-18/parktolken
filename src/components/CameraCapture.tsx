import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Attach stream to video element whenever both are available
  useEffect(() => {
    if (isActive && videoRef.current && streamRef.current) {
      const video = videoRef.current;
      video.srcObject = streamRef.current;
      video.play().catch(console.error);
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setIsActive(true);
      setError(null);
    } catch {
      setError("Could not access camera. Please allow camera permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    stopCamera();
    onCapture(dataUrl);
  }, [stopCamera, onCapture]);

  const toggleFlash = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await (track as any).applyConstraints({ advanced: [{ torch: !flashOn }] });
      setFlashOn(!flashOn);
    } catch {
      // Flash not supported
    }
  }, [flashOn]);

  if (!isActive) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-4 p-6"
      >
        {error && (
          <p className="text-destructive text-sm text-center">{error}</p>
        )}
        <Button variant="hero" size="lg" className="w-full max-w-xs rounded-2xl h-14" onClick={startCamera}>
          <Camera className="mr-2 h-5 w-5" />
          Open Camera
        </Button>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex flex-col bg-foreground"
    >
      <video ref={videoRef} className="flex-1 object-cover w-full h-full" autoPlay playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      <div className="absolute bottom-0 inset-x-0 p-6 flex items-center justify-center gap-6 bg-gradient-to-t from-foreground/80 to-transparent pb-10">
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground h-12 w-12 rounded-full bg-foreground/40"
          onClick={toggleFlash}
        >
          {flashOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
        </Button>
        <button
          onClick={capturePhoto}
          className="rounded-full border-4 border-primary-foreground bg-primary-foreground/20 flex items-center justify-center active:scale-90 transition-transform"
          style={{ height: 72, width: 72 }}
        >
          <div className="rounded-full bg-primary-foreground" style={{ height: 56, width: 56 }} />
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground h-12 w-12 rounded-full bg-foreground/40"
          onClick={() => { stopCamera(); onClose(); }}
        >
          <RotateCcw className="h-5 w-5" />
        </Button>
      </div>
    </motion.div>
  );
}
