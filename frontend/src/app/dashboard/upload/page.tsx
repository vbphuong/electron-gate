"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import { FileUploadCard, type UploadedFile } from "@/components/ui/file-upload-card";
import { Button } from "@/components/ui/button";
import { apiUploadDocument, type DocumentUploadResponse } from "@/app/lib/api";
import {
  FileText,
  Layers,
  Sparkles,
  Database,
  ArrowLeft,
  Lock,
  Globe,
  CheckCircle2,
  RefreshCw,
  Info,
  ShieldCheck,
  MessageSquare,
} from "lucide-react";

function UploadContent() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [files, setFiles] = React.useState<UploadedFile[]>([]);
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [autoUpload, setAutoUpload] = React.useState(true);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [totalEmbeddedChunks, setTotalEmbeddedChunks] = React.useState(0);
  const [totalPagesParsed, setTotalPagesParsed] = React.useState(0);
  const [recentUploads, setRecentUploads] = React.useState<DocumentUploadResponse[]>([]);

  const roleLower = (user?.role || "user").toLowerCase();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const uploadSingleFile = React.useCallback(
    async (uploadedFile: UploadedFile) => {
      if (!token) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: "error", errorMessage: "Authentication token missing. Please re-login." }
              : f
          )
        );
        return;
      }

      try {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id ? { ...f, status: "uploading", progress: 10, errorMessage: undefined } : f
          )
        );

        const result = await apiUploadDocument(
          uploadedFile.file,
          isPrivate,
          token,
          (progress) => {
            setFiles((prev) =>
              prev.map((f) => (f.id === uploadedFile.id ? { ...f, progress } : f))
            );
          }
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? {
                  ...f,
                  status: "completed",
                  progress: 100,
                  totalPages: result.total_page,
                  totalChunks: result.total_chunk,
                }
              : f
          )
        );

        setTotalEmbeddedChunks((prev) => prev + (result.total_chunk || 0));
        setTotalPagesParsed((prev) => prev + (result.total_page || 0));
        setRecentUploads((prev) => [result, ...prev]);
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, status: "error", errorMessage: errorMsg }
              : f
          )
        );
      }
    },
    [token, isPrivate]
  );

  const handleFilesChange = (newFiles: File[]) => {
    const newUploadedFiles: UploadedFile[] = newFiles.map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      file,
      progress: 0,
      status: "uploading" as const,
    }));

    setFiles((prev) => [...prev, ...newUploadedFiles]);

    if (autoUpload) {
      newUploadedFiles.forEach((f) => {
        uploadSingleFile(f);
      });
    }
  };

  const handleFileRemove = (id: string) => {
    setFiles((prev) => prev.filter((file) => file.id !== id));
  };

  const handleUploadAll = async () => {
    setIsProcessing(true);
    const pending = files.filter((f) => f.status !== "completed");
    for (const f of pending) {
      await uploadSingleFile(f);
    }
    setIsProcessing(false);
  };

  const handleClearCompleted = () => {
    setFiles((prev) => prev.filter((f) => f.status !== "completed"));
  };

  if (!user) return null;

  return (
    <div className="atelier-dashboard">
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      {/* Top Navigation Bar */}
      

      {/* Main Workspace */}
      <main className="atelier-dash-main relative z-10">
        {/* Welcome & Section Banner */}
        <div className="atelier-welcome-banner">
          <div>
            <h1>
              Document Ingestion <span className="text-[var(--color-atelier-brass)]">&amp; RAG Vectorization</span>
            </h1>
            <p>
              Upload documents to parse text, partition layouts, summarize tabular content with GPT-4o-mini, and generate 1536-dimension embeddings for semantic search.
            </p>
          </div>
          <div className="atelier-terminal-status-tag">
            <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
            <span>INGESTION PIPELINE // READY</span>
          </div>
        </div>

        {/* Upload Interface Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Upload Card (Left / 7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* File Upload Card Component */}
            <FileUploadCard
              files={files}
              onFilesChange={handleFilesChange}
              onFileRemove={handleFileRemove}
              accept=".pdf,.docx,.txt,.csv,.json,.png,.jpg,.jpeg"
              subtitle="Upload research papers, technical specs, user manuals, and dataset exports"
              allowedFormatsText="PDF, DOCX, TXT, CSV, JSON, PNG, JPEG formats up to 50 MB."
              className="bg-[var(--color-paper-sub)] border-[var(--color-rule)] shadow-xl"
            />

            {/* Ingestion Settings & Controls */}
            <div className="atelier-panel !p-5 !gap-4">
              <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-[var(--color-rule)]">
                <span className="text-xs font-mono font-semibold uppercase tracking-wider text-[var(--color-ink-dim)]">
                  Ingestion Configuration
                </span>
                <span className="text-xs font-mono text-[var(--color-atelier-brass)]">
                  Target: Supabase Vector Store
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Privacy Setting */}
                <button
                  type="button"
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                    isPrivate
                      ? "border-[var(--color-atelier-brass)] bg-[var(--color-paper-card)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper-terminal)] hover:border-[var(--color-rule-active)]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--color-paper-card)] flex items-center justify-center flex-shrink-0 text-[var(--color-atelier-brass)]">
                    {isPrivate ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                      <span>{isPrivate ? "Private Enclave" : "Public Knowledge"}</span>
                      <span className="text-[10px] uppercase text-[var(--color-atelier-brass)] font-normal">
                        [{isPrivate ? "RESTRICTED" : "GLOBAL"}]
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 leading-snug">
                      {isPrivate
                        ? "Only your account can search these document chunks."
                        : "Available across standard semantic search queries."}
                    </p>
                  </div>
                </button>

                {/* Auto-upload Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoUpload(!autoUpload)}
                  className={`p-3.5 rounded-lg border text-left flex items-start gap-3 transition-all ${
                    autoUpload
                      ? "border-[var(--color-terminal-green)] bg-[var(--color-paper-card)]"
                      : "border-[var(--color-rule)] bg-[var(--color-paper-terminal)] hover:border-[var(--color-rule-active)]"
                  }`}
                >
                  <div className="w-8 h-8 rounded-md bg-[var(--color-paper-card)] flex items-center justify-center flex-shrink-0 text-[var(--color-terminal-green)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-mono font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                      <span>{autoUpload ? "Auto-Ingestion Active" : "Manual Queue Mode"}</span>
                    </div>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 leading-snug">
                      {autoUpload
                        ? "Files automatically embed as soon as dropped."
                        : "Review files before triggering ingestion."}
                    </p>
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  {!autoUpload && files.length > 0 && (
                    <Button
                      onClick={handleUploadAll}
                      disabled={isProcessing || files.every((f) => f.status === "completed")}
                      className="atelier-btn atelier-btn-primary !py-2 !px-4 text-xs"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          <span>Vectorizing...</span>
                        </>
                      ) : (
                        <>
                          <Database className="w-3.5 h-3.5 mr-1.5" />
                          <span>Start Ingestion ({files.filter((f) => f.status !== "completed").length})</span>
                        </>
                      )}
                    </Button>
                  )}

                  {files.some((f) => f.status === "completed") && (
                    <Button
                      variant="ghost"
                      onClick={handleClearCompleted}
                      className="text-xs font-mono text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                    >
                      Clear Completed
                    </Button>
                  )}
                </div>

                <div className="text-xs font-mono text-[var(--color-ink-dim)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-terminal-green)]" />
                  <span>AES-256 Supabase Storage</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Pipeline Architecture & Live Telemetry (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Real-Time Session Telemetry */}
            <div className="atelier-panel !p-6 !gap-4">
              <div className="atelier-panel-header !p-0">
                <div className="atelier-panel-title-group">
                  <div className="atelier-panel-icon !w-10 !h-10">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-ink)]">Session Ingestion Stats</h3>
                    <p className="text-xs text-[var(--color-ink-muted)]">Live counts from current session</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="atelier-stat-card !p-3.5">
                  <div className="atelier-stat-header">
                    <span>Files Uploaded</span>
                    <span className="text-[var(--color-atelier-brass)]">[ 01 ]</span>
                  </div>
                  <div className="atelier-stat-val text-xl">
                    {files.filter((f) => f.status === "completed").length}
                  </div>
                  <div className="atelier-stat-sub text-[11px]">
                    <span>{files.length} total queued</span>
                  </div>
                </div>

                <div className="atelier-stat-card !p-3.5">
                  <div className="atelier-stat-header">
                    <span>Vector Chunks</span>
                    <span className="text-[var(--color-atelier-brass)]">[ 02 ]</span>
                  </div>
                  <div className="atelier-stat-val text-xl text-[var(--color-terminal-cyan)]">
                    {totalEmbeddedChunks}
                  </div>
                  <div className="atelier-stat-sub text-[11px]">
                    <span>1536-dim vectors</span>
                  </div>
                </div>

                <div className="atelier-stat-card !p-3.5">
                  <div className="atelier-stat-header">
                    <span>Pages Parsed</span>
                    <span className="text-[var(--color-atelier-brass)]">[ 03 ]</span>
                  </div>
                  <div className="atelier-stat-val text-xl text-[var(--color-terminal-green)]">
                    {totalPagesParsed}
                  </div>
                  <div className="atelier-stat-sub text-[11px]">
                    <span>Layouts partitioned</span>
                  </div>
                </div>

                <div className="atelier-stat-card !p-3.5">
                  <div className="atelier-stat-header">
                    <span>Model Engine</span>
                    <span className="text-[var(--color-atelier-brass)]">[ 04 ]</span>
                  </div>
                  <div className="atelier-stat-val text-base truncate font-mono text-[var(--color-atelier-brass)]">
                    text-emb-3
                  </div>
                  <div className="atelier-stat-sub text-[11px]">
                    <span>+ GPT-4o-mini Rerank</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Architecture Pipeline Explanation */}
            <div className="atelier-panel !p-6 !gap-4">
              <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[var(--color-atelier-brass)]" />
                  <h3 className="text-sm font-mono font-bold text-[var(--color-ink)] uppercase tracking-wider">
                    Automated Ingestion Pipeline
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-[var(--color-ink-dim)]">5 Steps</span>
              </div>

              <ol className="space-y-3 font-mono text-xs">
                <li className="flex items-start gap-3 p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center text-[10px] text-[var(--color-atelier-brass)] flex-shrink-0 font-bold">
                    1
                  </span>
                  <div>
                    <span className="text-[var(--color-ink)] font-semibold">Storage Persistence:</span>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 font-sans">
                      Saves binary safely to local cache and Supabase Storage bucket.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center text-[10px] text-[var(--color-atelier-brass)] flex-shrink-0 font-bold">
                    2
                  </span>
                  <div>
                    <span className="text-[var(--color-ink)] font-semibold">Partition &amp; Structural Parsing:</span>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 font-sans">
                      Extracts text, headers, code blocks, lists, and tables.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center text-[10px] text-[var(--color-atelier-brass)] flex-shrink-0 font-bold">
                    3
                  </span>
                  <div>
                    <span className="text-[var(--color-ink)] font-semibold">Semantic Title Chunking:</span>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 font-sans">
                      Creates coherent chunk boundaries around section titles.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center text-[10px] text-[var(--color-atelier-brass)] flex-shrink-0 font-bold">
                    4
                  </span>
                  <div>
                    <span className="text-[var(--color-ink)] font-semibold">LLM Table/Image Summarization:</span>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 font-sans">
                      Condenses complex data tables into high-signal searchable prose.
                    </p>
                  </div>
                </li>

                <li className="flex items-start gap-3 p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                  <span className="w-5 h-5 rounded-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center text-[10px] text-[var(--color-terminal-cyan)] flex-shrink-0 font-bold">
                    5
                  </span>
                  <div>
                    <span className="text-[var(--color-terminal-cyan)] font-semibold">Vector Embedding &amp; Indexing:</span>
                    <p className="text-[11px] text-[var(--color-ink-muted)] mt-0.5 font-sans">
                      Generates 1536-dim vectors and stores them with metadata in PostgreSQL.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Quick Actions Card */}
            <div className="atelier-panel !p-5 !gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--color-ink-dim)] uppercase font-semibold">
                  Navigation
                </span>
                <div className="flex items-center gap-4">
                  <Link
                    href="/dashboard/documents"
                    className="text-xs font-mono text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
                  >
                    <span>All Documents</span>
                  </Link>
                  <Link
                    href="/dashboard/chat"
                    className="text-xs font-mono text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
                  >
                    <span>Chat</span>
                    <MessageSquare className="w-3 h-3" />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="text-xs font-mono text-[var(--color-ink-muted)] hover:underline flex items-center gap-1"
                  >
                    <span>Overview</span>
                    <ArrowLeft className="w-3 h-3 rotate-180" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function DashboardUploadPage() {
  return (
    <ProtectedRoute>
      <UploadContent />
    </ProtectedRoute>
  );
}
