import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RotateCcw, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const didFallbackRef = useRef(false);
  const [isActive, setIsActive] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }
    streamRef.current?.getTracks().forEach((track) => {
      track.onended = null;
      track.onmute = null;
      track.stop();
    });
    streamRef.current = null;
    setIsActive(false);
    setFlashOn(false);
  }, []);

  const attachStreamToVideo = useCallback(async () => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;

    video.srcObject = stream;
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.setAttribute("playsinline", "true");
    video.setAttribute("webkit-playsinline", "true");

    if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
      await new Promise<void>((resolve) => {
        const onReady = () => resolve();
        video.addEventListener("loadedmetadata", onReady, { once: true });
        video.addEventListener("loadeddata", onReady, { once: true });
      });
    }
    await video.play();
  }, []);

  const recoverWithFallbackStream = useCallback(async () => {
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = fallbackStream;
      const track = fallbackStream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          setError("Camera preview stopped unexpectedly. Please reopen the camera.");
          stopCamera();
        };
      }
      await attachStreamToVideo();
    } catch {
      setError("Camera preview stopped unexpectedly. Please reopen the camera.");
      stopCamera();
    }
  }, [attachStreamToVideo, stopCamera]);

  const bindTrackLifecycle = useCallback((stream: MediaStream) => {
    const track = stream.getVideoTracks()[0];
    if (!track) return;
    track.onended = () => {
      if (!didFallbackRef.current) {
        didFallbackRef.current = true;
        void recoverWithFallbackStream();
        return;
      }
      setError("Camera preview stopped unexpectedly. Please reopen the camera.");
      stopCamera();
    };
  }, [recoverWithFallbackStream, stopCamera]);

  const setVideoElement = useCallback((node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      void attachStreamToVideo().catch(() => {
        setError("Camera preview failed to start. Please try again.");
        stopCamera();
      });
    }
  }, [attachStreamToVideo, stopCamera]);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      didFallbackRef.current = false;
      stopCamera();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }

      streamRef.current = stream;
      bindTrackLifecycle(stream);
      setIsActive(true);

      requestAnimationFrame(() => {
        void attachStreamToVideo().catch(() => {
          setError("Camera preview failed to start. Please try again.");
          stopCamera();
        });
      });
    } catch {
      setError("Could not access camera. Please allow camera permissions.");
      stopCamera();
    }
  }, [attachStreamToVideo, bindTrackLifecycle, stopCamera]);

  // Auto-start camera immediately on mount
  useEffect(() => {
    startCamera();
    return () => { stopCamera(); };
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
      await (track as MediaStreamTrack & {
        applyConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
      }).applyConstraints?.({ advanced: [{ torch: !flashOn } as MediaTrackConstraintSet] });
      setFlashOn(!flashOn);
    } catch {
      // Flash not supported
    }
  }, [flashOn]);

  // While camera is loading or if there's an error, show a full-screen overlay
  if (!isActive) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-foreground flex items-center justify-center"
      >
        {error ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-4 p-6"
          >
            <p className="text-destructive text-sm text-center">{error}</p>
            <Button variant="hero" size="lg" className="rounded-2xl h-14 px-8" onClick={startCamera}>
              <Camera className="mr-2 h-5 w-5" />
              Retry Camera
            </Button>
            <Button variant="ghost" className="text-primary-foreground" onClick={onClose}>
              Go Back
            </Button>
          </motion.div>
        ) : (
          <div className="text-primary-foreground text-sm animate-pulse">Opening camera…</div>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }} className="fixed inset-0 z-50 bg-foreground">
      <div className="relative h-full w-full overflow-hidden">
        <video ref={setVideoElement} className="absolute inset-0 h-full w-full object-cover" autoPlay playsInline muted />
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
      </div>
    </motion.div>
  );
}
