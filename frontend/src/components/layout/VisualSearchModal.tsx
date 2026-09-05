"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiVisualSearchByFile,
  type VisualSearchResultItem,
} from "@/app/lib/api";
import {
  Camera,
  Upload,
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Cpu,
  Boxes,
  Video,
  VideoOff,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface VisualSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VisualSearchModal({ isOpen, onClose }: VisualSearchModalProps) {
  const router = useRouter();
  const { token } = useAuth();

  const [mode, setMode] = useState<"upload" | "camera">("upload");
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [results, setResults] = useState<VisualSearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // Mount flag — needed to use createPortal safely with SSR (Next.js)
  useEffect(() => { setMounted(true); }, []);

  // Camera stream states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Stop camera stream helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Start camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        err instanceof Error && err.name === "NotAllowedError"
          ? "Camera permission was denied. Please allow camera access in your browser."
          : "Could not access camera device. Please check hardware connection or use file upload."
      );
      setCameraActive(false);
    }
  }, [stopCamera]);

  // Clean up stream on modal close or unmount
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setMode("upload");
      setError(null);
      setCameraError(null);
    }
  }, [isOpen, stopCamera]);

  // Handle switching to camera mode
  useEffect(() => {
    if (isOpen && mode === "camera") {
      startCamera();
    } else {
      stopCamera();
    }
  }, [isOpen, mode, startCamera, stopCamera]);

  // Perform search pipeline
  const executeSearch = async (file: File) => {
    // Validation
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/avif",
      "image/svg+xml",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.match(/\.(jpe?g|png|webp|gif|avif|svg)$/i)) {
      setError("Unsupported format. Please upload JPG, PNG, WEBP, or SVG.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit. Please choose a smaller image.");
      return;
    }

    setActiveFile(file);
    setError(null);
    setIsSearching(true);
    setResults([]);

    // Local preview
    const reader = new FileReader();
    reader.onload = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(file);

    try {
      const data = await apiVisualSearchByFile(file, token, {
        top_k: 8,
        min_similarity: 0.0,
      });
      setResults(data);
    } catch (err) {
      let msg = "Visual search failed. Please try again.";
      if (err instanceof Error) {
        if (err.message.includes("401") || err.message.includes("Unauthorized")) {
          msg = "Please log in to use Visual Vector Search.";
        } else if (err.message.includes("422")) {
          msg = "Không nhận diện được sản phẩm trong ảnh. Hãy thử chụp rõ hơn hoặc căn giữa sản phẩm.";
        } else {
          msg = err.message;
        }
      }
      setError(msg);
    } finally {
      setIsSearching(false);
    }
  };

  // Capture frame from webcam
  const handleSnapPhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError("Failed to capture image snapshot.");
          return;
        }
        const capturedFile = new File([blob], `snap_${Date.now()}.jpg`, { type: "image/jpeg" });
        stopCamera();
        setMode("upload");
        executeSearch(capturedFile);
      },
      "image/jpeg",
      0.95
    );
  };

  // Reset target
  const handleReset = () => {
    setActiveFile(null);
    setPreviewUrl(null);
    setResults([]);
    setError(null);
    if (mode === "camera") {
      startCamera();
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="atelier-plate relative w-full max-w-2xl bg-[var(--color-paper-card)] border border-[var(--color-terminal-cyan)]/40 rounded-xl shadow-2xl p-6 overflow-hidden max-h-[90vh] flex flex-col font-mono">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--color-rule)]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[var(--color-terminal-cyan)]/10 border border-[var(--color-terminal-cyan)] text-[var(--color-terminal-cyan)]">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-fraunces font-bold text-lg text-[var(--color-ink)] flex items-center gap-2">
                Visual Vector Search
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[var(--color-atelier-brass)]/20 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/40 uppercase tracking-widest font-semibold">
                  YOLOv8 + SigLIP
                </span>
              </h3>
              <p className="text-[11px] text-[var(--color-ink-muted)]">
                Chụp ảnh hoặc tải hình lên để tìm sản phẩm / biến thể tương đồng
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] rounded-lg hover:bg-[var(--color-paper-sub)] transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all border ${
              mode === "upload"
                ? "bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)] border-[var(--color-terminal-cyan)]"
                : "bg-[var(--color-paper-terminal)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:text-[var(--color-ink)]"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Tải ảnh lên (Upload)</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("camera")}
            className={`flex-1 py-2 px-3 rounded-md text-xs font-mono font-semibold flex items-center justify-center gap-2 transition-all border ${
              mode === "camera"
                ? "bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)] border-[var(--color-terminal-cyan)]"
                : "bg-[var(--color-paper-terminal)] text-[var(--color-ink-muted)] border-[var(--color-rule)] hover:text-[var(--color-ink)]"
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Chụp ảnh trực tiếp (Live Camera)</span>
          </button>
        </div>

        {/* Body Area */}
        <div className="mb-4">
          {mode === "camera" ? (
            /* Camera Live View */
            <div className="relative rounded-lg border border-[var(--color-rule)] bg-black overflow-hidden flex flex-col items-center justify-center min-h-[260px]">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full max-h-[280px] object-contain ${cameraActive ? "block" : "hidden"}`}
              />
              <canvas ref={canvasRef} className="hidden" />

              {!cameraActive && !cameraError && (
                <div className="py-12 flex flex-col items-center justify-center text-center text-xs text-[var(--color-ink-dim)] space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-terminal-cyan)]" />
                  <span>Đang kết nối camera...</span>
                </div>
              )}

              {cameraError && (
                <div className="p-6 text-center text-xs text-[var(--color-restricted-red)] flex flex-col items-center justify-center space-y-2">
                  <VideoOff className="w-8 h-8 opacity-60" />
                  <p className="max-w-xs">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-2 atelier-btn atelier-btn-ghost !py-1.5 !px-3 text-xs"
                  >
                    Thử lại
                  </button>
                </div>
              )}

              {cameraActive && (
                <div className="absolute bottom-3 inset-x-0 flex justify-center items-center gap-3 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2">
                  <button
                    type="button"
                    onClick={handleSnapPhoto}
                    className="px-5 py-2 rounded-full bg-[var(--color-terminal-cyan)] text-black font-mono text-xs font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Chụp &amp; Tìm kiếm</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Upload / Drag-and-Drop Area */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file) executeSearch(file);
              }}
              className={`border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center transition-all bg-[var(--color-paper-terminal)] relative ${
                isDragOver
                  ? "border-[var(--color-terminal-cyan)] bg-[var(--color-terminal-cyan)]/5 scale-[1.01]"
                  : "border-[var(--color-rule)] hover:border-[var(--color-terminal-cyan)]/80"
              }`}
            >
              {previewUrl ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={previewUrl}
                      alt="Target query"
                      className="w-16 h-16 object-cover rounded-lg border border-[var(--color-rule)]"
                    />
                    <div className="text-left font-mono text-xs">
                      <div className="text-[var(--color-terminal-green)] flex items-center gap-1 font-semibold mb-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Ảnh đã nạp vào Vector Pipeline
                      </div>
                      <div className="text-[10px] text-[var(--color-ink-muted)] truncate max-w-[200px] sm:max-w-xs">
                        {activeFile?.name || "Target Image"}
                      </div>
                      {activeFile?.size && (
                        <div className="text-[9px] text-[var(--color-ink-dim)]">
                          {(activeFile.size / 1024).toFixed(1)} KB
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="nav-visual-upload-input"
                      className="atelier-btn atelier-btn-ghost !py-1.5 !px-3 text-xs font-mono cursor-pointer border border-[var(--color-rule)] hover:border-[var(--color-terminal-cyan)]"
                    >
                      Đổi ảnh khác
                    </label>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] border border-transparent hover:border-[var(--color-restricted-red)]/30 transition-colors"
                      title="Clear image"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="nav-visual-upload-input"
                  className="w-full flex flex-col items-center justify-center cursor-pointer text-center py-3"
                >
                  <Upload
                    className={`w-8 h-8 text-[var(--color-terminal-cyan)] mb-2 transition-transform ${
                      isDragOver ? "scale-125 animate-bounce" : ""
                    }`}
                  />
                  <span className="font-mono text-xs text-[var(--color-ink)] font-semibold mb-1">
                    Kéo &amp; thả ảnh vào đây, hoặc nhấn để duyệt file
                  </span>
                  <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">
                    Hỗ trợ JPG, PNG, WEBP, GIF, SVG · Tối đa 10MB
                  </span>
                </label>
              )}
              <input
                id="nav-visual-upload-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/avif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) executeSearch(file);
                }}
                className="hidden"
              />
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-[var(--color-restricted-red)]/10 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] text-xs font-mono rounded flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-2 pr-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {activeFile && (
              <button
                type="button"
                onClick={() => executeSearch(activeFile)}
                className="underline hover:text-[var(--color-ink)] font-bold whitespace-nowrap ml-2"
              >
                Thử lại
              </button>
            )}
          </div>
        )}

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[160px] max-h-[320px]">
          {isSearching ? (
            <div className="py-12 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-muted)] space-y-2">
              <RefreshCw className="w-7 h-7 animate-spin text-[var(--color-terminal-cyan)]" />
              <span className="text-[var(--color-ink)] font-semibold">
                Đang nhận diện vật thể (YOLO) &amp; Trích xuất vector (SigLIP)...
              </span>
              <span className="text-[10px] text-[var(--color-ink-dim)]">
                So khớp Cosine Distance trên pgvector database
              </span>
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between font-mono text-[10px] text-[var(--color-ink-dim)] uppercase tracking-wider pb-1 border-b border-[var(--color-rule-subtle)]">
                <span>Kết quả khớp hàng đầu ({results.length})</span>
                <span>Thứ tự độ tương đồng cao nhất</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.map((res) => (
                  <Link
                    key={res.matched_image_id}
                    href={`/products/${res.product_id}`}
                    onClick={() => {
                      stopCamera();
                      onClose();
                    }}
                    className="p-3 rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-sub)] hover:border-[var(--color-terminal-cyan)] hover:bg-[var(--color-paper-hover)] transition-all flex items-center gap-3 group"
                  >
                    <div className="w-14 h-14 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] overflow-hidden shrink-0">
                      {res.matched_image_url ? (
                        <img
                          src={res.matched_image_url}
                          alt={res.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <Cpu className="w-full h-full p-3 text-[var(--color-ink-dim)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 font-mono text-xs">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-[var(--color-ink)] truncate group-hover:text-[var(--color-terminal-cyan)] transition-colors">
                          {res.product_name}
                        </span>
                        {res.variant_id && (
                          <span className="shrink-0 text-[8px] uppercase tracking-wider font-semibold px-1 py-0.2 rounded bg-[var(--color-atelier-brass)]/15 text-[var(--color-atelier-brass)] border border-[var(--color-atelier-brass)]/30">
                            Variant
                          </span>
                        )}
                      </div>

                      {(res.variant_model || res.variant_color) && (
                        <div className="text-[11px] text-[var(--color-terminal-cyan)] font-semibold truncate">
                          {res.variant_model || "Variant"} {res.variant_color ? `· ${res.variant_color}` : ""}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-[var(--color-rule-subtle)]">
                        {res.variant_price !== null && res.variant_price !== undefined ? (
                          <div className="text-[11px] text-[var(--color-atelier-brass)] font-semibold">
                            ${res.variant_price.toFixed(2)}
                          </div>
                        ) : (
                          <div className="text-[10px] text-[var(--color-ink-dim)]">Base Product</div>
                        )}
                        <div className="px-1.5 py-0.2 text-[9px] rounded bg-[var(--color-terminal-cyan)]/10 text-[var(--color-terminal-cyan)] border border-[var(--color-terminal-cyan)]/30 font-bold">
                          {(res.similarity_score * 100).toFixed(1)}% MATCH
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : previewUrl && !error ? (
            <div className="py-10 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-muted)] space-y-3">
              <Boxes className="w-8 h-8 text-[var(--color-ink-dim)] opacity-50" />
              <div>
                <div className="text-[var(--color-ink)] font-semibold mb-1">
                  Không tìm thấy sản phẩm tương đồng
                </div>
                <p className="text-[10px] text-[var(--color-ink-dim)] max-w-xs">
                  Không có sản phẩm nào trong cơ sở dữ liệu khớp với hình ảnh này trên ngưỡng độ tương đồng.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleReset}
                  className="atelier-btn atelier-btn-ghost !py-1 !px-3 text-xs"
                >
                  Thử ảnh khác
                </button>
              </div>
            </div>
          ) : (
            <div className="py-10 flex flex-col items-center justify-center text-center font-mono text-xs text-[var(--color-ink-dim)] space-y-2">
              <Camera className="w-8 h-8 opacity-30 text-[var(--color-terminal-cyan)]" />
              <p>Chụp hoặc tải ảnh lên để hệ thống AI nhận diện và đối soát kho sản phẩm.</p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-4 border-t border-[var(--color-rule)] flex items-center justify-between">
          <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">
            Powered by YOLOv8m + SigLIP 768-d Vector
          </span>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="atelier-btn atelier-btn-ghost !py-1.5 !px-4 text-xs font-mono"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
