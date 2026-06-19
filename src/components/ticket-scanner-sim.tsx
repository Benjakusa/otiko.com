import React, { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle2, AlertCircle, X, Loader2, Camera, CameraOff } from "lucide-react";
import jsQR from "jsqr";

type ScanStatus = "idle" | "valid" | "used" | "invalid" | "error";

interface TicketScannerSimProps {
  onClose: () => void;
  token: string;
}

export default function TicketScannerSim({ onClose, token }: TicketScannerSimProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const cooldownRef = useRef(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [scanResult, setScanResult] = useState<{
    ticketNumber?: string;
    buyerName?: string;
    categoryName?: string;
    eventName?: string;
    scannedAt?: string;
    error?: string;
  } | null>(null);
  const [verifying, setVerifying] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    scanningRef.current = false;
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    setStatus("idle");
    setScanResult(null);
    cooldownRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { min: 640 }, height: { min: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      scanningRef.current = true;
      requestAnimationFrame(scanFrame);
    } catch (err: any) {
      const msg = err.name === "NotAllowedError"
        ? "Camera permission denied. Please allow camera access in your browser settings."
        : err.name === "NotFoundError"
        ? "No camera found on this device."
        : "Unable to access camera: " + (err.message || "Unknown error");
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [stopCamera]);

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  const verifyTicket = async (qrData: string) => {
    if (cooldownRef.current) return;
    cooldownRef.current = true;
    scanningRef.current = false;
    setVerifying(true);
    setStatus("idle");
    setScanResult(null);

    let ticketNumber = qrData;
    let verificationCode = "";
    try {
      const parsed = JSON.parse(qrData);
      ticketNumber = parsed.ticketNumber || qrData;
      verificationCode = parsed.verificationCode || "";
    } catch { }

    try {
      const res = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ ticketNumber, verificationCode }),
      });
      const data = await res.json();

      if (!res.ok || data.valid === false) {
        const errMsg = (data.error || "").toLowerCase();
        if (errMsg.includes("already used") || errMsg.includes("already")) {
          setStatus("used");
        } else {
          setStatus("invalid");
        }
        setScanResult({ error: data.error || "Invalid ticket" });
      } else {
        setStatus("valid");
        setScanResult(data.ticket);
      }
    } catch {
      setStatus("error");
      setScanResult({ error: "Unable to connect to server." });
    } finally {
      setVerifying(false);
    }
  };

  const scanFrame = () => {
    if (!scanningRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      requestAnimationFrame(scanFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) { requestAnimationFrame(scanFrame); return; }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code && code.data.length > 5) {
      verifyTicket(code.data);
      return;
    }
    requestAnimationFrame(scanFrame);
  };

  const handleNewScan = () => {
    cooldownRef.current = false;
    setStatus("idle");
    setScanResult(null);
    scanningRef.current = true;
    requestAnimationFrame(scanFrame);
  };

  const statusCard = () => {
    switch (status) {
      case "valid":
        return (
          <div className="mt-6 bg-emerald-50 border-2 border-emerald-400 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-800">Valid Ticket</p>
                <p className="text-[10px] text-emerald-600">Gate access granted</p>
              </div>
            </div>
            <div className="border-t border-emerald-200 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-emerald-600 text-[11px]">Ticket</span>
                <span className="font-bold text-emerald-900 font-mono text-xs">#{scanResult?.ticketNumber}</span>
              </div>
              {scanResult?.eventName && (
                <div className="flex justify-between">
                  <span className="text-emerald-600 text-[11px]">Event</span>
                  <span className="font-medium text-emerald-900 text-xs text-right max-w-[200px] truncate">{scanResult.eventName}</span>
                </div>
              )}
              {scanResult?.buyerName && (
                <div className="flex justify-between">
                  <span className="text-emerald-600 text-[11px]">Attendee</span>
                  <span className="font-medium text-emerald-900 text-xs">{scanResult.buyerName}</span>
                </div>
              )}
              {scanResult?.categoryName && (
                <div className="flex justify-between">
                  <span className="text-emerald-600 text-[11px]">Category</span>
                  <span className="font-medium text-emerald-900 text-xs">{scanResult.categoryName}</span>
                </div>
              )}
              {scanResult?.scannedAt && (
                <div className="flex justify-between">
                  <span className="text-emerald-600 text-[11px]">Scanned at</span>
                  <span className="font-medium text-emerald-900 text-xs">{new Date(scanResult.scannedAt).toLocaleTimeString()}</span>
                </div>
              )}
            </div>
          </div>
        );
      case "used":
        return (
          <div className="mt-6 bg-amber-50 border-2 border-amber-400 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-800">This ticket has already been used.</p>
                <p className="text-[10px] text-amber-600">Duplicate scan blocked</p>
              </div>
            </div>
            {scanResult?.error && (
              <p className="text-xs text-amber-700 bg-amber-100/50 p-2.5 rounded-lg">{scanResult.error}</p>
            )}
          </div>
        );
      case "invalid":
        return (
          <div className="mt-6 bg-red-50 border-2 border-red-400 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <X className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-800">Invalid Ticket</p>
                <p className="text-[10px] text-red-600">No matching ticket found</p>
              </div>
            </div>
            {scanResult?.error && (
              <p className="text-xs text-red-700 bg-red-100/50 p-2.5 rounded-lg">{scanResult.error}</p>
            )}
          </div>
        );
      case "error":
        return (
          <div className="mt-6 bg-red-50 border-2 border-red-400 rounded-xl p-5 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-800">Connection Error</p>
                <p className="text-[10px] text-red-600">Please try again</p>
              </div>
            </div>
            {scanResult?.error && (
              <p className="text-xs text-red-700 bg-red-100/50 p-2.5 rounded-lg">{scanResult.error}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Ticket Scanner</h3>
          <p className="text-xs text-slate-500">Point camera at QR code to verify tickets.</p>
        </div>
        <button onClick={onClose}
          className="text-white bg-red-600 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition"
        >
          Close
        </button>
      </div>

      {/* Camera View */}
      <div className="bg-black rounded-2xl overflow-hidden shadow-sm border border-slate-200 relative">
        {cameraError ? (
          <div className="aspect-[4/3] flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-6 text-center">
            <CameraOff className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-700 mb-1">Camera Unavailable</p>
            <p className="text-xs text-slate-400 max-w-xs">{cameraError}</p>
            <button
              onClick={startCamera}
              className="mt-4 bg-red-600 hover:bg-blue-600 hover:text-white text-white text-xs font-bold px-4 py-2 rounded-xl transition"
            >
              Retry Camera
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              className="w-full aspect-[4/3] object-cover"
              playsInline
              muted
            />
            <canvas ref={canvasRef} className="hidden" />
            {/* Scanning overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/60 rounded-xl shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" />
              </div>
            </div>
            {!cameraActive && !verifying && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
            )}
          </>
        )}

        {verifying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-white mx-auto mb-2" />
              <p className="text-white text-sm font-medium">Verifying...</p>
            </div>
          </div>
        )}
      </div>

      {/* Result Card */}
      {status !== "idle" && scanResult && (
        <div className="relative">
          {statusCard()}
          <button
            onClick={handleNewScan}
            className="mt-3 w-full bg-red-600 hover:bg-blue-600 hover:text-white text-white font-bold py-3 rounded-xl text-sm transition flex items-center justify-center gap-2"
          >
            <Camera className="h-4 w-4" />
            Scan Next Ticket
          </button>
        </div>
      )}

      {/* Status indicator when idle */}
      {status === "idle" && cameraActive && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Camera active — waiting for QR code
        </div>
      )}

      {/* Manual override */}
      <details className="bg-slate-50 rounded-xl border border-slate-200">
        <summary className="text-[11px] font-semibold text-slate-500 p-4 cursor-pointer hover:text-slate-700 transition select-none">
          Manual entry (if camera is unavailable)
        </summary>
        <div className="px-4 pb-4">
          <p className="text-[10px] text-slate-400 mb-2">Paste the QR code content manually:</p>
          <ManualEntryForm token={token} onResult={(s, r) => { setStatus(s); setScanResult(r); }} />
        </div>
      </details>
    </div>
  );
}

function ManualEntryForm({ token, onResult: showResult }: {
  token: string;
  onResult: (status: ScanStatus, result: any) => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);

    let ticketNumber = input.trim();
    let verificationCode = "";
    try {
      const parsed = JSON.parse(input.trim());
      ticketNumber = parsed.ticketNumber || ticketNumber;
      verificationCode = parsed.verificationCode || "";
    } catch { }

    try {
      const res = await fetch("/api/tickets/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ ticketNumber, verificationCode }),
      });
      const data = await res.json();
      if (!res.ok || data.valid === false) {
        const errMsg = (data.error || "").toLowerCase();
        if (errMsg.includes("already used") || errMsg.includes("already")) {
          showResult("used", data);
        } else {
          showResult("invalid", data);
        }
      } else {
        showResult("valid", data.ticket);
      }
    } catch {
      showResult("error", { error: "Unable to connect to server." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        type="text"
        placeholder="Paste QR data..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:border-slate-900"
      />
      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="bg-red-600 hover:bg-blue-600 hover:text-white text-white text-xs font-bold px-3 py-2 rounded-lg transition disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Verify"}
      </button>
    </form>
  );
}
