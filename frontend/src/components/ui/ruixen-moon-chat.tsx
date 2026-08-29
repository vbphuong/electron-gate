"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiRAGQuery,
  apiGetDocuments,
  type SourceChunk,
  type RAGQueryResponse,
  type DocumentUploadResponse,
} from "@/app/lib/api";
import Link from "next/link";
import {
  ArrowUpIcon,
  Paperclip,
  Code2,
  Palette,
  Layers,
  Rocket,
  CircleUserRound,
  MonitorIcon,
  FileUp,
  ImageIcon,
  Sparkles,
  Database,
  SlidersHorizontal,
  Copy,
  Check,
  RotateCcw,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  Search,
  FileText,
  Clock,
  Terminal,
  ExternalLink,
  Lock,
  Globe,
  X,
  Filter,
} from "lucide-react";

interface AutoResizeProps {
  minHeight: number;
  maxHeight?: number;
}

export function useAutoResizeTextarea({ minHeight, maxHeight }: AutoResizeProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      if (reset) {
        textarea.style.height = `${minHeight}px`;
        return;
      }

      textarea.style.height = `${minHeight}px`; // reset first
      const newHeight = Math.max(
        minHeight,
        Math.min(textarea.scrollHeight, maxHeight ?? Infinity)
      );
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight]
  );

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);

  return { textareaRef, adjustHeight };
}

export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  timestamp: string;
  durationMs?: number;
  isSimulated?: boolean;
}

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}

export function QuickAction({ icon, label, onClick }: QuickActionProps) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-neutral-700/80 bg-black/60 text-neutral-300 hover:text-white hover:bg-neutral-800/90 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:border-[var(--color-atelier-brass,#d4a373)] shadow-sm text-xs px-3.5 py-1.5 h-auto"
    >
      {icon}
      <span>{label}</span>
    </Button>
  );
}

export default function ElectronGateChat() {
  const { token, user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const [useMultiQuery, setUseMultiQuery] = useState(true);
  const [topK, setTopK] = useState(5);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [availableDocs, setAvailableDocs] = useState<DocumentUploadResponse[]>([]);
  const [docDropdownOpen, setDocDropdownOpen] = useState(false);
  const [docSearchFilter, setDocSearchFilter] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "search">("chat");

  const dropdownRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 240,
  });

  // Fetch available documents for scoping
  useEffect(() => {
    if (token) {
      apiGetDocuments(token)
        .then((docs) => {
          if (docs && docs.length > 0) {
            setAvailableDocs(docs);
          }
        })
        .catch((err) => {
          console.warn("Could not fetch available documents for chat scoping:", err);
        });
    }
  }, [token]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDocDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSources = (msgId: string) => {
    setExpandedSources((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const toggleDocSelection = (id: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const selectAllDocs = () => {
    setSelectedDocIds(availableDocs.map((d) => d.document_id));
  };

  const clearAllDocs = () => {
    setSelectedDocIds([]);
  };

  const handleSend = async (queryText?: string) => {
    const textToSend = (queryText ?? message).trim();
    if (!textToSend || isLoading) return;

    if (!token) {
      const errorMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: "⚠️ Authentication required. Please log in to query the knowledge base.",
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
      return;
    }

    const userMessageId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMessageId,
      sender: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    adjustHeight(true);
    setIsLoading(true);

    const startTime = performance.now();

    try {
      const res: RAGQueryResponse = await apiRAGQuery(
        {
          query: textToSend,
          document_ids: selectedDocIds.length > 0 ? selectedDocIds : undefined,
          use_multi_query: useMultiQuery,
          top_k: topK,
        },
        token
      );

      const elapsed = Math.round(performance.now() - startTime);

      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: res.answer || "No answer generated.",
        sources: res.sources || [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        durationMs: elapsed,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate answer";
      const assistantMsg: ChatMessage = {
        id: `assistant-${Date.now()}`,
        sender: "assistant",
        content: `⚠️ RAG query error: ${errorMsg}`,
        sources: [],
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  return (
    <div
      className="relative w-full h-[calc(100vh-68px)] max-h-[calc(100vh-68px)] bg-cover bg-center flex flex-col items-center justify-between font-sans selection:bg-[var(--color-atelier-brass)] selection:text-black overflow-hidden"
      style={{
        backgroundImage:
          "linear-gradient(to bottom, rgba(14, 16, 21, 0.88), rgba(9, 11, 15, 0.97)), url('https://pub-940ccf6255b54fa799a9b01050e6c227.r2.dev/ruixen_moon_2.png')",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-radial from-[rgba(212,163,115,0.06)] via-transparent to-transparent pointer-events-none" />

      {/* Top Status & Controls Header */}
      <div className="w-full max-w-6xl px-6 pt-4 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 border border-neutral-800 backdrop-blur-md text-[11px] font-mono text-neutral-300">
            <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green,#10b981)] animate-pulse" />
            <span>HYBRID RAG ENGINE // READY</span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-neutral-800 text-[11px] font-mono text-neutral-400">
            <Cpu className="w-3 h-3 text-[var(--color-atelier-brass)]" />
            <span>text-emb-3 + GPT-4o</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="h-8 px-2.5 text-xs font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 rounded-lg flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Chat</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className={cn(
              "h-8 px-3 text-xs font-mono rounded-lg border-neutral-700 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-800 flex items-center gap-1.5 transition-all",
              (showSettings || selectedDocIds.length > 0) && "border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]"
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>RAG Config</span>
            {selectedDocIds.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-[var(--color-atelier-brass)] text-black font-bold text-[10px]">
                {selectedDocIds.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Settings Modal Drawer */}
      {showSettings && (
        <div className="w-full max-w-6xl px-6 mt-2 z-30 transition-all flex-shrink-0">
          <div className="p-4 rounded-xl bg-black/90 border border-neutral-700 backdrop-blur-xl shadow-2xl grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
            {/* 1. Multi-Query Toggle */}
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-200">Multi-Query RRF</span>
                <input
                  type="checkbox"
                  checked={useMultiQuery}
                  onChange={(e) => setUseMultiQuery(e.target.checked)}
                  className="rounded border-neutral-700 accent-[var(--color-atelier-brass,#d4a373)] cursor-pointer"
                />
              </div>
              <p className="text-[11px] text-neutral-400 font-sans">
                Generates 3 query variations to retrieve chunks from multiple semantic angles.
              </p>
            </div>

            {/* 2. Top-K Selector */}
            <div className="flex flex-col gap-1.5 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-200">Top-K Sources: {topK}</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                value={topK}
                onChange={(e) => setTopK(parseInt(e.target.value))}
                className="w-full accent-[var(--color-atelier-brass,#d4a373)] cursor-pointer mt-1"
              />
              <div className="flex justify-between text-[10px] text-neutral-500">
                <span>1 (Fast)</span>
                <span>5 (Balanced)</span>
                <span>15 (Deep)</span>
              </div>
            </div>

            {/* 3. Multi-Select Document Dropdown Menu */}
            <div
              ref={dropdownRef}
              className="relative flex flex-col gap-1.5 p-3 rounded-lg bg-neutral-900/60 border border-neutral-800"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-200">
                  Scope Documents ({selectedDocIds.length === 0 ? "All Global" : `${selectedDocIds.length} Selected`})
                </span>
                {selectedDocIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAllDocs}
                    className="text-[10px] text-rose-400 hover:underline font-mono"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              {/* Dropdown Trigger Button */}
              <button
                type="button"
                onClick={() => setDocDropdownOpen(!docDropdownOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-black/70 border border-neutral-700 hover:border-[var(--color-atelier-brass)] text-left text-xs transition-colors"
              >
                <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                  <FileText className="w-3.5 h-3.5 text-[var(--color-atelier-brass,#d4a373)] flex-shrink-0" />
                  <span className="truncate text-neutral-200 font-mono text-[11px]">
                    {selectedDocIds.length === 0
                      ? "All Documents (Global Corpus)"
                      : selectedDocIds.length === 1
                      ? (availableDocs.find((d) => d.document_id === selectedDocIds[0])?.file_name || "1 Document Selected")
                      : `${selectedDocIds.length} Documents Selected`}
                  </span>
                </div>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 text-neutral-400 flex-shrink-0 transition-transform duration-200",
                    docDropdownOpen && "rotate-180 text-[var(--color-atelier-brass)]"
                  )}
                />
              </button>

              {/* Floating Multi-Select Dropdown Menu */}
              {docDropdownOpen && (
                <div className="absolute left-0 right-0 top-full mt-1.5 z-50 p-2.5 rounded-xl bg-neutral-950/95 border border-neutral-700 shadow-2xl backdrop-blur-xl flex flex-col gap-2 max-h-72 animate-in fade-in zoom-in-95 duration-100">
                  {/* Search inside dropdown */}
                  <div className="relative">
                    <Search className="w-3 h-3 text-neutral-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={docSearchFilter}
                      onChange={(e) => setDocSearchFilter(e.target.value)}
                      placeholder="Search documents by name..."
                      className="w-full pl-7 pr-2 py-1.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-200 placeholder:text-neutral-500 focus:outline-none focus:border-[var(--color-atelier-brass)] font-mono"
                    />
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between text-[10px] font-mono px-1 text-neutral-400 border-b border-neutral-800/80 pb-1.5">
                    <button
                      type="button"
                      onClick={selectAllDocs}
                      className="hover:text-[var(--color-atelier-brass)] transition-colors"
                    >
                      Select All ({availableDocs.length})
                    </button>
                    <button
                      type="button"
                      onClick={clearAllDocs}
                      className="hover:text-rose-400 transition-colors"
                    >
                      Clear (Search All)
                    </button>
                  </div>

                  {/* Checkbox Options List */}
                  <div className="flex flex-col gap-1 overflow-y-auto max-h-44 scrollbar-thin scrollbar-thumb-neutral-800 pr-1">
                    {availableDocs.length === 0 ? (
                      <div className="text-center py-4 text-[11px] text-neutral-500 font-mono">
                        No uploaded documents found.
                      </div>
                    ) : (
                      availableDocs
                        .filter((d) =>
                          d.file_name.toLowerCase().includes(docSearchFilter.toLowerCase())
                        )
                        .map((doc) => {
                          const isSelected = selectedDocIds.includes(doc.document_id);
                          return (
                            <label
                              key={doc.document_id}
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-xs font-mono select-none",
                                isSelected
                                  ? "bg-[var(--color-paper-card,#1b1f2b)] text-white border border-[var(--color-atelier-brass)]/40"
                                  : "hover:bg-neutral-900 text-neutral-300 border border-transparent"
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleDocSelection(doc.document_id)}
                                className="rounded border-neutral-700 accent-[var(--color-atelier-brass,#d4a373)] cursor-pointer"
                              />
                              <div className="flex items-center justify-between flex-1 min-w-0 gap-2">
                                <span className="truncate text-[11px] font-medium">
                                  {doc.file_name}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <span
                                    className={`text-[9px] px-1.5 py-0.2 rounded border ${
                                      doc.private
                                        ? "bg-amber-950/30 text-amber-300 border-amber-800/40"
                                        : "bg-emerald-950/30 text-emerald-300 border-emerald-800/40"
                                    }`}
                                  >
                                    {doc.private ? "Private" : "Public"}
                                  </span>
                                  <span className="text-[10px] text-neutral-500">
                                    {doc.total_chunk || 0} chunks
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 w-full max-w-6xl px-6 py-6 flex flex-col justify-start overflow-y-auto z-10 scrollbar-thin scrollbar-thumb-neutral-800">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center my-auto text-center py-12">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-700 text-neutral-300 text-xs font-mono mb-6 shadow-inner">
              <Sparkles className="w-3.5 h-3.5 text-[var(--color-atelier-brass,#d4a373)]" />
              <span>Electron Gate · Knowledge Retrieval</span>
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-semibold text-white tracking-tight drop-shadow-md">
              Electron Gate <span className="text-[var(--color-atelier-brass,#d4a373)] font-serif italic">Chat</span>
            </h1>

            <p className="mt-4 max-w-xl text-neutral-300 text-base sm:text-lg leading-relaxed font-sans">
              Ask questions across your indexed documents, inspect retrieved vector chunks, and explore cited answers.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6 pb-6">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-2 transition-all",
                  msg.sender === "user" ? "items-end" : "items-start"
                )}
              >
                {/* Sender Header */}
                <div className="flex items-center gap-2 px-1">
                  {msg.sender === "user" ? (
                    <>
                      <span className="text-[11px] font-mono text-neutral-400">{msg.timestamp}</span>
                      <span className="text-xs font-mono font-semibold text-neutral-200">
                        {user?.full_name || user?.email || "You"}
                      </span>
                      <div className="w-6 h-6 rounded-full bg-[var(--color-atelier-brass,#d4a373)] text-black flex items-center justify-center text-[10px] font-bold">
                        {(user?.full_name || user?.email || "U").charAt(0).toUpperCase()}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 text-black flex items-center justify-center text-[10px] font-bold shadow">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-mono font-semibold text-[var(--color-atelier-brass,#d4a373)]">
                        Electron Gate
                      </span>
                      {msg.durationMs && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800/80 text-neutral-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {msg.durationMs}ms
                        </span>
                      )}
                      {msg.isSimulated && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-800/50">
                          LOCAL CACHE
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-neutral-500">{msg.timestamp}</span>
                    </>
                  )}
                </div>

                {/* Message Bubble */}
                <div
                  className={cn(
                    "relative max-w-[94%] sm:max-w-[88%] rounded-2xl p-5 sm:p-6 shadow-lg leading-relaxed text-sm backdrop-blur-md",
                    msg.sender === "user"
                      ? "bg-[var(--color-paper-card,#1b1f2b)] border border-[var(--color-rule-active,rgba(212,163,115,0.4))] text-white rounded-tr-sm"
                      : "bg-black/75 border border-neutral-700/80 text-neutral-100 rounded-tl-sm"
                  )}
                >
                  <div className="font-sans text-[15px] leading-relaxed [&_a]:text-[var(--color-atelier-brass,#d4a373)] [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:border-neutral-600 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-300 [&_code]:rounded [&_code]:bg-neutral-800/90 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:mt-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-3 [&_h3]:text-lg [&_h3]:font-semibold [&_li]:my-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-3 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-neutral-950 [&_pre]:p-3 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>

                  {/* Actions & Sources Footer for AI Responses */}
                  {msg.sender === "assistant" && (
                    <div className="mt-4 pt-3 border-t border-neutral-800/90 flex flex-col gap-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {/* Sources Toggle Button */}
                        {msg.sources && msg.sources.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleSources(msg.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--color-atelier-brass,#d4a373)] hover:text-amber-200 transition-colors"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>
                              {msg.sources.length} Retrieved Source{msg.sources.length > 1 ? "s" : ""}
                            </span>
                            {expandedSources[msg.id] ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-neutral-500">No external sources required</span>
                        )}

                        {/* Copy text button */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors text-xs flex items-center gap-1 font-mono"
                            title="Copy answer"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[11px] text-emerald-400">Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span className="text-[11px]">Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Source Chunks Cards */}
                      {expandedSources[msg.id] && msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-col gap-2.5 mt-1 pt-2 border-t border-neutral-800/60 font-mono text-xs">
                          {msg.sources.map((source, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 flex flex-col gap-1.5 shadow-sm"
                            >
                              <div className="flex items-center justify-between text-[11px]">
                                <div className="flex items-center gap-1.5 text-amber-300 font-semibold truncate max-w-[70%]">
                                  <FileText className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">
                                    {source.metadata?.source || `Source Chunk #${sIdx + 1}`}
                                  </span>
                                  {source.metadata?.page && (
                                    <span className="text-neutral-400 font-normal">
                                      (Page {source.metadata.page})
                                    </span>
                                  )}
                                </div>
                                {source.score !== undefined && source.score !== null && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-terminal-cyan)]/15 text-[var(--color-terminal-cyan)] font-bold">
                                    {(source.score * 100).toFixed(1)}% match
                                  </span>
                                )}
                              </div>
                              <p className="font-sans text-[12px] text-neutral-300 leading-snug line-clamp-4 bg-black/40 p-2 rounded border border-neutral-800/80">
                                {source.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading Indicator with glowing shimmer */}
            {isLoading && (
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-2 px-1">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-600 to-amber-300 text-black flex items-center justify-center text-[10px] font-bold">
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  </div>
                  <span className="text-xs font-mono font-semibold text-[var(--color-atelier-brass,#d4a373)]">
                    Electron Gate
                  </span>
                  <span className="text-[11px] font-mono text-neutral-400 animate-pulse">
                    Retrieving vector chunks &amp; synthesizing answer...
                  </span>
                </div>
                <div className="max-w-[80%] rounded-2xl rounded-tl-sm p-4 bg-black/75 border border-neutral-700/80 text-neutral-400 flex items-center gap-3 backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-brass)] animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-brass)] animate-ping [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-[var(--color-atelier-brass)] animate-ping [animation-delay:0.4s]" />
                  </div>
                  <span className="text-xs font-mono text-neutral-300">
                    Executing Reciprocal Rank Fusion over vector embeddings...
                  </span>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        )}
      </div>

      {/* Input Box Section (Pinned to bottom with backdrop blur) */}
      <div className="w-full max-w-6xl px-6 pb-6 pt-2 z-20 flex-shrink-0">
        {/* Active contextual quick suggestions if chat is active */}
        {messages.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-1 scrollbar-none">
            <QuickAction
              icon={<Sparkles className="w-3 h-3 text-[var(--color-atelier-brass)]" />}
              label="Key Takeaways"
              onClick={() => handleSend("What are the key takeaways from the retrieved documents?")}
            />
            <QuickAction
              icon={<Search className="w-3 h-3 text-[var(--color-terminal-cyan)]" />}
              label="Detail Metrics"
              onClick={() => handleSend("Break down the exact numeric metrics and percentages mentioned above.")}
            />
            <QuickAction
              icon={<FileText className="w-3 h-3 text-emerald-400" />}
              label="Source Verification"
              onClick={() => handleSend("Which source documents provide the highest confidence score for this answer?")}
            />
          </div>
        )}

        {/* Input Box Outer Container */}
        <div className="relative bg-black/75 backdrop-blur-xl rounded-2xl border border-neutral-700/90 shadow-2xl transition-all focus-within:border-[var(--color-atelier-brass)] focus-within:ring-1 focus-within:ring-[var(--color-atelier-brass)]/40">
          {/* Active scoped document chips */}
          {selectedDocIds.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap px-4 pt-3 pb-1.5 border-b border-neutral-800/60 font-mono text-[11px]">
              <span className="text-neutral-400 flex items-center gap-1">
                <Filter className="w-3 h-3 text-[var(--color-atelier-brass,#d4a373)]" />
                <span>Scoped to:</span>
              </span>
              {selectedDocIds.map((docId) => {
                const doc = availableDocs.find((d) => d.document_id === docId);
                return (
                  <span
                    key={docId}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass,#d4a373)]"
                  >
                    <span className="truncate max-w-[120px]">{doc?.file_name || docId.substring(0, 8)}</span>
                    <button
                      type="button"
                      onClick={() => toggleDocSelection(docId)}
                      className="hover:text-white p-0.5 cursor-pointer"
                      title="Remove filter"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                onClick={clearAllDocs}
                className="text-neutral-500 hover:text-rose-400 text-[10px] ml-1 cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              adjustHeight();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question or enter a research prompt (e.g. 'What are the main 2023 revenue drivers?')..."
            className={cn(
              "w-full px-5 py-4 resize-none border-none",
              "bg-transparent text-white text-[15px] font-sans",
              "focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-neutral-400 min-h-[56px]"
            )}
            style={{ overflow: "hidden" }}
          />

          {/* Footer Controls Strip */}
          <div className="flex items-center justify-between p-2.5 pt-0 border-t border-neutral-800/40">
            <div className="flex items-center gap-1.5">
              <Link href="/dashboard/upload">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400 hover:text-white hover:bg-neutral-800/80 rounded-lg"
                  title="Upload Document for Ingestion"
                >
                  <Paperclip className="w-4 h-4" />
                  <span className="sr-only">Attach or Upload Document</span>
                </Button>
              </Link>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className={cn(
                  "h-8 px-2 text-[11px] font-mono text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/80 rounded-lg flex items-center gap-1",
                  selectedDocIds.length > 0 && "text-[var(--color-atelier-brass,#d4a373)]"
                )}
                title="Configure Retrieval Parameters"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span className="hidden sm:inline">k={topK}</span>
                {selectedDocIds.length > 0 && (
                  <span className="hidden sm:inline text-[var(--color-atelier-brass,#d4a373)] font-semibold">
                    · {selectedDocIds.length} doc{selectedDocIds.length > 1 ? "s" : ""}
                  </span>
                )}
                {useMultiQuery && <span className="hidden md:inline text-[var(--color-terminal-green)]">· RRF</span>}
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-neutral-500 hidden sm:inline">
                Shift + Enter for new line
              </span>

              <Button
                type="button"
                disabled={!message.trim() || isLoading}
                onClick={() => handleSend()}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl transition-all h-8 text-xs font-mono font-semibold",
                  message.trim() && !isLoading
                    ? "bg-[var(--color-atelier-brass,#d4a373)] text-black hover:bg-[#deb081] shadow-md cursor-pointer hover:scale-105"
                    : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
                )}
              >
                <span>Send</span>
                <ArrowUpIcon className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Metadata Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 mt-2 px-1">
          <span>Electron Gate · Multi-Query RAG Intelligence</span>
          <Link href="/dashboard" className="hover:text-neutral-300 transition-colors">
            Back to Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}

export { ElectronGateChat, ElectronGateChat as RuixenMoonChat };
