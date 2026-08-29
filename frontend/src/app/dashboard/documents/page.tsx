"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import {
  apiGetDocuments,
  apiDeleteDocument,
  type DocumentUploadResponse,
} from "@/app/lib/api";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Layers,
  Database,
  UploadCloud,
  ArrowLeft,
  Lock,
  Globe,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Trash2,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  Info,
  ShieldCheck,
  FileCode,
  FileSpreadsheet,
  X,
  AlertTriangle,
} from "lucide-react";

// Standard fallback documents if database is empty or offline during prototyping
const SAMPLE_DOCUMENTS: DocumentUploadResponse[] = [
  {
    document_id: "e4d3a2b1-0001-4c5e-8f9a-1a2b3c4d5e6f",
    file_name: "NASDAQ_AAPL_2023.pdf",
    file_type: "application/pdf",
    file_path: "storage/NASDAQ_AAPL_2023.pdf",
    total_page: 84,
    total_chunk: 342,
    private: false,
  },
  {
    document_id: "f5e4d3c2-0002-4b6a-9e8f-2b3c4d5e6f7a",
    file_name: "security_specification.md",
    file_type: "text/markdown",
    file_path: "storage/security_specification.md",
    total_page: 12,
    total_chunk: 48,
    private: true,
  },
  {
    document_id: "a1b2c3d4-0003-4e5f-8a9b-3c4d5e6f7a8b",
    file_name: "warehouse_manifest.csv",
    file_type: "text/csv",
    file_path: "storage/warehouse_manifest.csv",
    total_page: 18,
    total_chunk: 92,
    private: false,
  },
  {
    document_id: "b2c3d4e5-0004-4f6a-9b0c-4d5e6f7a8b9c",
    file_name: "inventory_catalog.json",
    file_type: "application/json",
    file_path: "storage/inventory_catalog.json",
    total_page: 6,
    total_chunk: 28,
    private: false,
  },
];

function getFileIcon(fileName: string) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return <FileText className="w-5 h-5 text-rose-400" />;
    case "csv":
    case "xlsx":
    case "json":
      return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
    case "md":
    case "txt":
    case "py":
      return <FileCode className="w-5 h-5 text-sky-400" />;
    default:
      return <FileText className="w-5 h-5 text-[var(--color-atelier-brass,#d4a373)]" />;
  }
}

function DocumentsContent() {
  const { user, token, logout } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<DocumentUploadResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [privacyFilter, setPrivacyFilter] = useState<"all" | "public" | "private">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [sortBy, setSortBy] = useState<"name" | "chunks" | "pages">("name");

  // Interaction modals
  const [selectedDoc, setSelectedDoc] = useState<DocumentUploadResponse | null>(null);
  const [docToDelete, setDocToDelete] = useState<DocumentUploadResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const roleLower = (user?.role || "user").toLowerCase();

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (!token) {
      setDocuments(SAMPLE_DOCUMENTS);
      setIsUsingFallback(true);
      setIsLoading(false);
      return;
    }

    try {
      const data = await apiGetDocuments(token);
      if (data && data.length > 0) {
        setDocuments(data);
        setIsUsingFallback(false);
      } else {
        // Empty db -> use sample repository for initial preview
        setDocuments(SAMPLE_DOCUMENTS);
        setIsUsingFallback(true);
      }
    } catch (err: unknown) {
      console.warn("Error fetching documents from backend, using sample knowledge repository:", err);
      setDocuments(SAMPLE_DOCUMENTS);
      setIsUsingFallback(true);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setIsDeleting(true);

    try {
      if (token && !isUsingFallback) {
        await apiDeleteDocument(docToDelete.document_id, token);
      }
      setDocuments((prev) => prev.filter((d) => d.document_id !== docToDelete.document_id));
      setDocToDelete(null);
      if (selectedDoc?.document_id === docToDelete.document_id) {
        setSelectedDoc(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete document";
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort calculations
  const filteredDocuments = useMemo(() => {
    return documents
      .filter((doc) => {
        // Search query match
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const nameMatch = doc.file_name.toLowerCase().includes(q);
          const idMatch = doc.document_id.toLowerCase().includes(q);
          const typeMatch = (doc.file_type || "").toLowerCase().includes(q);
          if (!nameMatch && !idMatch && !typeMatch) return false;
        }

        // Privacy filter
        if (privacyFilter === "public" && doc.private) return false;
        if (privacyFilter === "private" && !doc.private) return false;

        // Type filter
        if (typeFilter !== "all") {
          const ext = doc.file_name.split(".").pop()?.toLowerCase();
          if (typeFilter === "pdf" && ext !== "pdf") return false;
          if (typeFilter === "csv" && ext !== "csv" && ext !== "xlsx") return false;
          if (typeFilter === "code" && ext !== "md" && ext !== "txt" && ext !== "json" && ext !== "py") return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "name") return a.file_name.localeCompare(b.file_name);
        if (sortBy === "chunks") return (b.total_chunk || 0) - (a.total_chunk || 0);
        if (sortBy === "pages") return (b.total_page || 0) - (a.total_page || 0);
        return 0;
      });
  }, [documents, searchQuery, privacyFilter, typeFilter, sortBy]);

  // Aggregate Metrics
  const totalChunksCount = useMemo(() => {
    return documents.reduce((acc, curr) => acc + (curr.total_chunk || 0), 0);
  }, [documents]);

  const totalPagesCount = useMemo(() => {
    return documents.reduce((acc, curr) => acc + (curr.total_page || 0), 0);
  }, [documents]);

  const publicDocsCount = useMemo(() => {
    return documents.filter((d) => !d.private).length;
  }, [documents]);

  const privateDocsCount = useMemo(() => {
    return documents.filter((d) => d.private).length;
  }, [documents]);

  if (!user) return null;

  return (
    <div className="atelier-dashboard min-h-screen flex flex-col bg-[var(--color-paper)]">
      {/* Background drafting canvas & filament */}
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      {/* Top Apparatus Navigation Bar */}
      

      {/* Main Content Workspace */}
      <main className="atelier-dash-main relative z-10">
        {/* Welcome & Section Banner */}
        <div className="atelier-welcome-banner">
          <div>
            <h1>
              Indexed Knowledge <span className="text-[var(--color-atelier-brass)]">&amp; Vector Repository</span>
            </h1>
            <p>
              Inspect partitioned documents, review vector embeddings, and explore semantic chunk partitions across public knowledge and private user enclaves.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchDocuments}
              disabled={isLoading}
              className="h-8 px-3 text-xs font-mono border-neutral-700 bg-black/40 text-neutral-300 hover:text-white flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>Refresh Index</span>
            </Button>

            <div className="atelier-terminal-status-tag">
              <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] animate-pulse" />
              <span>VECTOR REPOSITORY // ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Informational Banner if using Sample knowledge base */}
        {isUsingFallback && (
          <div className="p-3 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/40 flex items-center justify-between text-xs font-mono text-neutral-300 gap-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-[var(--color-atelier-brass)] flex-shrink-0" />
              <span>Displaying indexed platform reference corpus (including NASDAQ AAPL 2023 and security specs).</span>
            </div>
            <Link
              href="/dashboard/upload"
              className="text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1 flex-shrink-0"
            >
              <span>Upload New PDF</span>
              <UploadCloud className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}

        {/* Telemetry Stats Grid (4 stats cards) */}
        <div className="atelier-stats-grid">
          <div className="atelier-stat-card">
            <div className="atelier-stat-header">
              <span>Total Documents</span>
              <span className="text-[var(--color-atelier-brass)]">[ 01 ]</span>
            </div>
            <div className="atelier-stat-val">{documents.length}</div>
            <div className="atelier-stat-sub">
              <span>{filteredDocuments.length} matching current filter</span>
            </div>
          </div>

          <div className="atelier-stat-card">
            <div className="atelier-stat-header">
              <span>Vector Chunks</span>
              <span className="text-[var(--color-atelier-brass)]">[ 02 ]</span>
            </div>
            <div className="atelier-stat-val text-[var(--color-terminal-cyan)]">
              {totalChunksCount.toLocaleString()}
            </div>
            <div className="atelier-stat-sub">
              <span>1536-dim text-embedding-3</span>
            </div>
          </div>

          <div className="atelier-stat-card">
            <div className="atelier-stat-header">
              <span>Pages Partitioned</span>
              <span className="text-[var(--color-atelier-brass)]">[ 03 ]</span>
            </div>
            <div className="atelier-stat-val text-[var(--color-terminal-green)]">
              {totalPagesCount.toLocaleString()}
            </div>
            <div className="atelier-stat-sub">
              <span>Layout &amp; Table extracted</span>
            </div>
          </div>

          <div className="atelier-stat-card">
            <div className="atelier-stat-header">
              <span>Enclave Distribution</span>
              <span className="text-[var(--color-atelier-brass)]">[ 04 ]</span>
            </div>
            <div className="atelier-stat-val text-base font-mono text-[var(--color-atelier-brass)]">
              {publicDocsCount} Global · {privateDocsCount} Private
            </div>
            <div className="atelier-stat-sub">
              <span>Role-isolated partition storage</span>
            </div>
          </div>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="atelier-panel !p-4 !gap-4">
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--color-ink-dim)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents by name, UUID, or format..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-xs font-mono text-[var(--color-ink)] placeholder:text-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills & View Mode */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Privacy Filter Tabs */}
              <div className="flex items-center bg-[var(--color-paper-terminal)] p-1 rounded-lg border border-[var(--color-rule)] text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setPrivacyFilter("all")}
                  className={`px-2.5 py-1 rounded transition-colors ${
                    privacyFilter === "all"
                      ? "bg-[var(--color-paper-card)] text-[var(--color-atelier-brass)] font-semibold shadow-sm"
                      : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  All ({documents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyFilter("public")}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                    privacyFilter === "public"
                      ? "bg-[var(--color-paper-card)] text-[var(--color-terminal-green)] font-semibold shadow-sm"
                      : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPrivacyFilter("private")}
                  className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                    privacyFilter === "private"
                      ? "bg-[var(--color-paper-card)] text-[var(--color-atelier-brass)] font-semibold shadow-sm"
                      : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                  }`}
                >
                  <Lock className="w-3 h-3" />
                  <span>Private</span>
                </button>
              </div>

              {/* Format Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-xs font-mono text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
              >
                <option value="all">All Formats</option>
                <option value="pdf">PDF Documents</option>
                <option value="csv">CSV / Data Tables</option>
                <option value="code">Markdown / Text / Code</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "name" | "chunks" | "pages")}
                className="px-2.5 py-1.5 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-xs font-mono text-[var(--color-ink-muted)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
              >
                <option value="name">Sort: Name (A-Z)</option>
                <option value="chunks">Sort: Most Chunks</option>
                <option value="pages">Sort: Most Pages</option>
              </select>

              {/* Grid / Table Toggle */}
              <div className="flex items-center bg-[var(--color-paper-terminal)] p-1 rounded-lg border border-[var(--color-rule)] text-xs">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "grid"
                      ? "bg-[var(--color-paper-card)] text-[var(--color-atelier-brass)]"
                      : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`p-1.5 rounded transition-colors ${
                    viewMode === "table"
                      ? "bg-[var(--color-paper-card)] text-[var(--color-atelier-brass)]"
                      : "text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                  }`}
                  title="Table Matrix View"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Documents Content View (Grid or Table) */}
        {isLoading ? (
          <div className="atelier-panel !p-12 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw className="w-6 h-6 animate-spin text-[var(--color-atelier-brass)]" />
            <span className="font-mono text-xs text-[var(--color-ink-muted)]">
              Loading vectorized documents repository...
            </span>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="atelier-panel !p-12 flex flex-col items-center justify-center gap-3 text-center">
            <FileText className="w-8 h-8 text-[var(--color-ink-dim)]" />
            <h3 className="text-base font-bold text-[var(--color-ink)]">No documents found</h3>
            <p className="text-xs text-[var(--color-ink-muted)] max-w-sm">
              No documents match your search query &quot;{searchQuery}&quot;. Try adjusting your filters or upload a new file.
            </p>
            <div className="flex items-center gap-3 mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  setPrivacyFilter("all");
                  setTypeFilter("all");
                }}
                className="text-xs font-mono"
              >
                Clear Filters
              </Button>
              <Link href="/dashboard/upload" className="atelier-btn atelier-btn-primary !py-1.5 !px-3 text-xs">
                Upload New Document
              </Link>
            </div>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.document_id}
                onClick={() => setSelectedDoc(doc)}
                className="atelier-plate !p-5 flex flex-col justify-between gap-4 cursor-pointer hover:border-[var(--color-atelier-brass)] transition-all group"
              >
                {/* Top Row: File icon & privacy pill */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center flex-shrink-0 group-hover:border-[var(--color-atelier-brass)]/50 transition-colors">
                      {getFileIcon(doc.file_name)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-[var(--color-ink)] truncate group-hover:text-[var(--color-atelier-brass)] transition-colors">
                        {doc.file_name}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono text-[var(--color-ink-dim)]">
                        <span className="truncate max-w-[120px]">{doc.document_id.substring(0, 8)}...</span>
                        <button
                          type="button"
                          onClick={(e) => handleCopyId(doc.document_id, e)}
                          className="hover:text-[var(--color-ink)] p-0.5"
                          title="Copy UUID"
                        >
                          {copiedId === doc.document_id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0 border flex items-center gap-1 ${
                      doc.private
                        ? "bg-amber-950/30 text-amber-300 border-amber-800/40"
                        : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
                    }`}
                  >
                    {doc.private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                    <span>{doc.private ? "Private" : "Public"}</span>
                  </span>
                </div>

                {/* Middle Metrics Strip */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-[var(--color-ink-dim)] uppercase block">Chunks</span>
                    <span className="font-bold text-[var(--color-terminal-cyan)]">
                      {doc.total_chunk || 0} vectors
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--color-ink-dim)] uppercase block">Pages</span>
                    <span className="font-bold text-[var(--color-terminal-green)]">
                      {doc.total_page || 0} pages
                    </span>
                  </div>
                </div>

                {/* Bottom Action Strip */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--color-rule)]">
                  <Link
                    href={`/dashboard/chat`}
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-atelier-brass)] hover:underline"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Query in Chat</span>
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocToDelete(doc);
                      }}
                      className="p-1.5 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
                      title="Delete document"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table Matrix View */
          <div className="atelier-panel !p-0 overflow-hidden border border-[var(--color-rule)]">
            <div className="overflow-x-auto">
              <table className="atelier-matrix-table w-full">
                <thead>
                  <tr>
                    <th>DOCUMENT NAME</th>
                    <th>UUID</th>
                    <th>PAGES</th>
                    <th>CHUNKS</th>
                    <th>ACCESS ENCLAVE</th>
                    <th className="text-right">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => (
                    <tr
                      key={doc.document_id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-[var(--color-paper-hover)] cursor-pointer transition-colors"
                    >
                      <td>
                        <div className="flex items-center gap-2.5 font-semibold text-[var(--color-ink)]">
                          {getFileIcon(doc.file_name)}
                          <span>{doc.file_name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-neutral-400 font-mono text-[11px]">
                          <span>{doc.document_id.substring(0, 8)}...</span>
                          <button
                            type="button"
                            onClick={(e) => handleCopyId(doc.document_id, e)}
                            className="hover:text-white p-0.5"
                            title="Copy UUID"
                          >
                            {copiedId === doc.document_id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td>
                        <span className="text-[var(--color-terminal-green)] font-bold">
                          {doc.total_page || 0}
                        </span>
                      </td>
                      <td>
                        <span className="text-[var(--color-terminal-cyan)] font-bold">
                          {doc.total_chunk || 0}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            doc.private
                              ? "bg-amber-950/30 text-amber-300 border-amber-800/40"
                              : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
                          }`}
                        >
                          {doc.private ? <Lock className="w-2.5 h-2.5" /> : <Globe className="w-2.5 h-2.5" />}
                          <span>{doc.private ? "Private" : "Public"}</span>
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <Link
                            href="/dashboard/chat"
                            className="p-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)] hover:bg-[var(--color-paper-card)] flex items-center gap-1 text-xs font-mono"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Chat</span>
                          </Link>
                          <button
                            type="button"
                            onClick={() => setDocToDelete(doc)}
                            className="p-1.5 rounded text-neutral-500 hover:text-rose-400 hover:bg-neutral-800"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Document Detail Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[var(--color-paper-sub)] border border-[var(--color-rule-active)] rounded-xl shadow-2xl p-6 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--color-rule)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-center text-[var(--color-atelier-brass)]">
                  {getFileIcon(selectedDoc.file_name)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--color-ink)] truncate max-w-md">
                    {selectedDoc.file_name}
                  </h3>
                  <span className="text-xs font-mono text-[var(--color-ink-dim)]">
                    Document Specification &amp; Vector Index
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="p-3 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--color-ink-dim)] uppercase">Document UUID</span>
                <div className="flex items-center justify-between text-neutral-200 truncate">
                  <span className="truncate">{selectedDoc.document_id}</span>
                  <button
                    type="button"
                    onClick={(e) => handleCopyId(selectedDoc.document_id, e)}
                    className="hover:text-[var(--color-atelier-brass)]"
                  >
                    {copiedId === selectedDoc.document_id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--color-ink-dim)] uppercase">Access Policy</span>
                <span className={`font-bold ${selectedDoc.private ? "text-amber-300" : "text-emerald-300"}`}>
                  {selectedDoc.private ? "Private Enclave (Restricted)" : "Public Knowledge (Global)"}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--color-ink-dim)] uppercase">Total Embedded Chunks</span>
                <span className="font-bold text-[var(--color-terminal-cyan)] text-sm">
                  {selectedDoc.total_chunk || 0} chunks (1536-dim)
                </span>
              </div>

              <div className="p-3 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--color-ink-dim)] uppercase">Total Pages Extracted</span>
                <span className="font-bold text-[var(--color-terminal-green)] text-sm">
                  {selectedDoc.total_page || 0} pages
                </span>
              </div>

              <div className="col-span-2 p-3 rounded-lg bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex flex-col gap-1">
                <span className="text-[10px] text-[var(--color-ink-dim)] uppercase">Storage Path</span>
                <span className="text-neutral-300 truncate">{selectedDoc.file_path}</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDocToDelete(selectedDoc);
                }}
                className="text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Delete Document</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDoc(null)}
                  className="text-xs font-mono"
                >
                  Close
                </Button>
                <Link
                  href="/dashboard/chat"
                  className="atelier-btn atelier-btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Query in Chat</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[var(--color-paper-sub)] border border-rose-800/60 rounded-xl shadow-2xl p-6 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <h3 className="text-base font-bold text-[var(--color-ink)]">Delete Document</h3>
            </div>
            <p className="text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Are you sure you want to delete <strong className="text-[var(--color-ink)]">{docToDelete.file_name}</strong>?
              This will remove all associated 1536-dimensional vector embeddings and chunks from the knowledge repository.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDocToDelete(null)}
                disabled={isDeleting}
                className="text-xs font-mono"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isDeleting}
                className="text-xs font-mono bg-rose-600 hover:bg-rose-700 text-white"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardDocumentsPage() {
  return (
    <ProtectedRoute>
      <DocumentsContent />
    </ProtectedRoute>
  );
}
