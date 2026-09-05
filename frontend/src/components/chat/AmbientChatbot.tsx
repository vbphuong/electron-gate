"use client";

import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { apiRAGQuery, type SourceChunk } from "@/app/lib/api";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  ChevronDown,
  ChevronUp,
  FileText,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Minimize2,
  Maximize2,
  RotateCcw,
} from "lucide-react";

interface Message {
  id: string;
  sender: "user" | "assistant";
  content: string;
  sources?: SourceChunk[];
  timestamp: string;
}

const QUICK_PROMPTS = [
  "Compare tactile brass switches vs linear switches",
  "Which keyboards support hot-swappable switches?",
  "Explain shipping providers and delivery TTL",
  "Check audio DAC specs and impedance range",
];

export function AmbientChatbot() {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "assistant",
      content:
        "Welcome to the **Electron Gate Neural Enclave**. I am your hardware intelligence assistant. Ask me about mechanical switch actuation, technical component specs, warehouse stock, or delivery protocols.",
      timestamp: "Ready",
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom();
    }
  }, [messages, isOpen, isMinimized]);

  // Keyboard shortcut: Cmd+K / Ctrl+K or Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setIsMinimized(false);
      }
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Window custom events for trigger from products and dashboard
  useEffect(() => {
    const handleAskEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ query: string; autoSend?: boolean }>;
      if (!customEvent.detail) return;
      const { query, autoSend } = customEvent.detail;
      setIsOpen(true);
      setIsMinimized(false);
      if (autoSend) {
        handleSend(query);
      } else {
        setInput(query);
      }
    };

    const handleOpenEvent = () => {
      setIsOpen(true);
      setIsMinimized(false);
    };

    window.addEventListener("ambient-chatbot-ask", handleAskEvent);
    window.addEventListener("open-ambient-chatbot", handleOpenEvent);
    return () => {
      window.removeEventListener("ambient-chatbot-ask", handleAskEvent);
      window.removeEventListener("open-ambient-chatbot", handleOpenEvent);
    };
  }, []);

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || isLoading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    if (!token) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `auth-${Date.now()}`,
            sender: "assistant",
            content:
              "Authentication required. Please **[sign in](/login)** or **[create an account](/signup)** to query the neural RAG knowledge base and verify document citations.",
            timestamp: "Auth Required",
          },
        ]);
        setIsLoading(false);
      }, 200);
      return;
    }

    try {
      const response = await apiRAGQuery(
        {
          query: queryText,
          top_k: 4,
        },
        token
      );

      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: "assistant",
        content: response.answer,
        sources: response.sources,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errMsg: Message = {
        id: `err-${Date.now()}`,
        sender: "assistant",
        content:
          "Unable to query the vector knowledge base at this moment. Please verify connection or try again shortly.",
        timestamp: "Error",
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "assistant",
        content: "Conversation history cleared. Ready for your next hardware inquiry.",
        timestamp: "Ready",
      },
    ]);
  };

  return (
    <>
      {/* Ambient Floating Trigger Badge */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setIsMinimized(false);
          }}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/40 text-[var(--color-ink)] rounded-md shadow-2xl hover:border-[var(--color-atelier-brass)] hover:bg-[var(--color-paper-hover)] hover:-translate-y-0.5 transition-all duration-150 group font-mono text-xs"
          aria-label="Open AI Hardware Assistant"
        >
          <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] shadow-[0_0_8px_var(--color-terminal-green)]" />
          <span className="text-[var(--color-atelier-brass)] font-semibold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Assistant</span>
          </span>
          <span className="text-[var(--color-ink-dim)] hidden sm:inline text-[10px] uppercase tracking-wider ml-1 bg-[var(--color-paper-terminal)] px-1.5 py-0.5 rounded border border-[var(--color-rule)]">
            ⌘K
          </span>
        </button>
      )}

      {/* Slide-out Terminal Drawer */}
      {isOpen && (
        <div
          className={`fixed bottom-0 right-0 sm:bottom-6 sm:right-6 z-50 w-full sm:w-[420px] bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] sm:rounded-lg shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] flex flex-col transition-all duration-200 overflow-hidden ${
            isMinimized ? "h-14" : "h-[90vh] sm:h-[620px] max-h-[92vh]"
          }`}
        >
          {/* Console Header */}
          <div className="px-4 py-3 bg-[var(--color-paper-sub)] border-b border-[var(--color-rule)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-terminal-green)] shadow-[0_0_8px_var(--color-terminal-green)]" />
              <div>
                <div className="font-mono text-xs font-bold text-[var(--color-ink)] flex items-center gap-1.5">
                  <span>❯ RAG Hardware Enclave</span>
                </div>
                <div className="font-mono text-[10px] text-[var(--color-terminal-cyan)]">
                  pgvector HNSW · grounded answers
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={clearChat}
                title="Reset session"
                className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)] transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsMinimized((prev) => !prev)}
                title={isMinimized ? "Expand" : "Minimize"}
                className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)] transition-colors"
              >
                {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-card)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-xs">
                {messages.map((msg) => {
                  const isUser = msg.sender === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1`}
                    >
                      <div className="flex items-center gap-2 px-1">
                        <span className="font-mono text-[10px] text-[var(--color-ink-dim)] uppercase">
                          {isUser ? user?.full_name || "Enthusiast" : "Enclave Assistant"}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--color-ink-dim)]">
                          {msg.timestamp}
                        </span>
                      </div>

                      <div
                        className={`p-3.5 rounded-md max-w-[90%] leading-relaxed ${
                          isUser
                            ? "bg-[var(--color-atelier-brass)] text-white font-medium"
                            : "bg-[var(--color-paper-card)] text-[var(--color-ink)] border border-[var(--color-rule)]"
                        }`}
                      >
                        <div className={`prose prose-xs max-w-none break-words ${isUser ? "text-white" : "text-[var(--color-ink)]"}`}>
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>

                        {/* Citations Accordion */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-[var(--color-rule)]">
                            <div className="font-mono text-[10px] text-[var(--color-atelier-brass)] font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified Citations ({msg.sources.length})</span>
                            </div>
                            <div className="space-y-1.5">
                              {msg.sources.map((src, i) => {
                                const isExpanded = expandedSource === `${msg.id}-${i}`;
                                return (
                                  <div
                                    key={i}
                                    className="bg-[var(--color-paper-terminal)] p-2 rounded border border-[var(--color-rule)] font-mono text-[11px]"
                                  >
                                    <div
                                      onClick={() =>
                                        setExpandedSource(isExpanded ? null : `${msg.id}-${i}`)
                                      }
                                      className="flex items-center justify-between cursor-pointer text-[var(--color-terminal-cyan)] hover:text-[var(--color-ink)]"
                                    >
                                      <span className="truncate max-w-[200px] flex items-center gap-1">
                                        <FileText className="w-3 h-3 shrink-0 text-[var(--color-atelier-brass)]" />
                                        <span>{src.metadata?.filename || `Document Chunk #${i + 1}`}</span>
                                      </span>
                                      <div className="flex items-center gap-1.5 shrink-0">
                                        {typeof src.score === "number" && (
                                          <span className="text-[10px] text-[var(--color-terminal-green)]">
                                            {(src.score * 100).toFixed(1)}% match
                                          </span>
                                        )}
                                        {isExpanded ? (
                                          <ChevronUp className="w-3 h-3" />
                                        ) : (
                                          <ChevronDown className="w-3 h-3" />
                                        )}
                                      </div>
                                    </div>
                                    {isExpanded && (
                                      <p className="mt-1.5 pt-1.5 border-t border-[var(--color-rule-subtle)] text-[11px] text-[var(--color-ink-muted)] font-sans leading-normal">
                                        {src.content}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-2 text-[var(--color-terminal-cyan)] font-mono text-xs p-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-cyan)] animate-ping" />
                    <span>Searching vector corpus and generating grounded response...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompts (shown when messages count is low) */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 bg-[var(--color-paper-sub)]/80 border-t border-[var(--color-rule)] flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSend(prompt)}
                      className="font-mono text-[10.5px] px-2.5 py-1 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:text-[var(--color-atelier-brass)] hover:border-[var(--color-atelier-brass)]/40 transition-colors text-left"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              )}

              {/* Console Input Bar */}
              <div className="p-3 bg-[var(--color-paper-sub)] border-t border-[var(--color-rule)]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-terminal-green)] font-mono text-xs">
                      ❯
                    </span>
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about switches, specs, or hardware..."
                      className="w-full bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] rounded py-2 pl-7 pr-3 text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)] font-sans"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || !input.trim()}
                    className="p-2 bg-[var(--color-atelier-brass)] hover:bg-[var(--color-atelier-amber)] text-white rounded font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
