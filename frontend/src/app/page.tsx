"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";

type RoleType = "admin" | "staff" | "user";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleType>("admin");

  const roleSpecs: Record<RoleType, {
    scope: string;
    command: string;
    model: string;
    chunks: Array<{ id: string; similarity: string; text: string; source: string }>;
    stats: Array<{ label: string; value: string }>;
  }> = {
    admin: {
      scope: "ADMIN (FULL ACCESS TO ALL VECTORS & SETTINGS)",
      command: "search.corpus --index=all_documents --sync-embeddings",
      model: "text-embedding-3-large (3072 dimensions)",
      chunks: [
        {
          id: "DOC-0091",
          similarity: "96.4% match",
          source: "company_financial_audit.pdf",
          text: "Enterprise financial accounts maintained strict security boundaries across decentralized database partitions...",
        },
        {
          id: "DOC-0142",
          similarity: "91.8% match",
          source: "security_protocol.md",
          text: "JWT authorization tokens are verified on every request before semantic similarity scoring is performed...",
        },
      ],
      stats: [
        { label: "INDEXED VECTORS", value: "842,910" },
        { label: "CONTEXT WINDOW", value: "128,000 tokens" },
        { label: "AVG SEARCH TIME", value: "38.4ms" },
      ],
    },
    staff: {
      scope: "STAFF (DOCUMENT UPLOADS & CHUNKING)",
      command: "documents.ingest --split=markdown --chunk-size=512",
      model: "bge-reranker-large",
      chunks: [
        {
          id: "DOC-0318",
          similarity: "89.2% match",
          source: "warehouse_manifest.md",
          text: "Fulfillment routing triggers real-time stock deductions once packaging manifests confirm carrier handoff...",
        },
        {
          id: "DOC-0419",
          similarity: "85.4% match",
          source: "inventory_catalog.json",
          text: "Cross-dock inventory nodes categorize high-velocity products with automatic re-indexing triggers...",
        },
      ],
      stats: [
        { label: "QUEUED DOCUMENTS", value: "48" },
        { label: "CHUNKS / MINUTE", value: "1,420" },
        { label: "ACCURACY RATE", value: "98.4%" },
      ],
    },
    user: {
      scope: "USER (SEARCH & VIEW AUTHORIZED KNOWLEDGE)",
      command: "query.search --filter='public_knowledge'",
      model: "MiniLM-L6 (Hybrid Keyword + Vector)",
      chunks: [
        {
          id: "DOC-0812",
          similarity: "92.7% match",
          source: "customer_faq.txt",
          text: "Direct order tracking links are sent by email immediately upon order payment confirmation...",
        },
        {
          id: "DOC-0941",
          similarity: "88.1% match",
          source: "return_policy.pdf",
          text: "Standard customer returns are automatically processed and approved within 48 hours of intake scan...",
        },
      ],
      stats: [
        { label: "SEARCHES TODAY", value: "14" },
        { label: "RELEVANCE SCORE", value: "94.2%" },
        { label: "RESPONSE TIME", value: "18.2ms" },
      ],
    },
  };

  const activeSpec = roleSpecs[selectedRole];

  return (
    <div className="min-h-screen relative flex flex-col bg-[var(--color-paper)]">
      {/* Atelier Drafting Canvas Grid & Filament Glow */}
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      {/* Navigation · Atelier Apparatus */}
      <header className="atelier-nav">
        <div className="atelier-nav-inner">
          <Link href="/" className="atelier-logo">
            <div className="atelier-logo-stamp">
              <svg width="18" height="18" viewBox="0 0 40 40" fill="none">
                <path
                  d="M20 4L4 12V28L20 36L36 28V12L20 4Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M20 4V36M4 12L36 28M36 12L4 28"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  opacity="0.6"
                />
              </svg>
            </div>
            <span>Electron Gate</span>
          </Link>

          <nav className="atelier-nav-links">
            <Link href="/products" className="atelier-nav-link">Products</Link>
            <a href="#workbench" className="atelier-nav-link">Interactive Demo</a>
            <a href="#features" className="atelier-nav-link">Features</a>
            <a href="#endpoints" className="atelier-nav-link">API Endpoints</a>
          </nav>

          <div className="flex items-center gap-3">
            {isLoading ? null : user ? (
              <Link href="/dashboard" className="atelier-btn atelier-btn-primary">
                Open Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="atelier-btn atelier-btn-secondary">
                  Sign In
                </Link>
                <Link href="/signup" className="atelier-btn atelier-btn-primary">
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section: Editorial Atelier Manifesto + Terminal RAG Workbench */}
      <section className="atelier-hero">
        {/* Left: Editorial Manifesto */}
        <div className="atelier-hero-left">
          <div className="atelier-plate-tag">
            <span>●</span>
            <span>AI KNOWLEDGE PLATFORM · ROLE-BASED ACCESS</span>
          </div>

          <h1 className="atelier-hero-title">
            Intelligent RAG search with <span className="accent">role-based access control.</span>
          </h1>

          <p className="atelier-hero-desc">
            Electron Gate is a fast, secure search platform for your documents and knowledge base.
            Manage vector embeddings, automate document chunking, and ensure staff and customers
            only see information they are authorized to access.
          </p>

          <div className="atelier-hero-actions">
            {isLoading ? null : user ? (
              <Link href="/dashboard" className="atelier-btn atelier-btn-primary text-[13px] px-6 py-3">
                Open Your Dashboard →
              </Link>
            ) : (
              <>
                <Link href="/login" className="atelier-btn atelier-btn-primary text-[13px] px-6 py-3">
                  Sign In to Platform →
                </Link>
                <a href="#features" className="atelier-btn atelier-btn-secondary text-[13px] px-5 py-3">
                  Explore Features
                </a>
              </>
            )}
          </div>

          <div className="atelier-spec-strip">
            <div className="atelier-spec-item">
              <span className="dot">✦</span>
              <span>Hybrid Search (Keyword + Vector)</span>
            </div>
            <div className="atelier-spec-item">
              <span className="dot">✦</span>
              <span>Fast Re-ranking (&lt;40ms)</span>
            </div>
            <div className="atelier-spec-item">
              <span className="dot">✦</span>
              <span>Role-Based JWT Security</span>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Terminal RAG Workbench */}
        <div id="workbench" className="terminal-rag-workbench">
          <div className="terminal-topbar">
            <div className="terminal-title-area">
              <span className="terminal-status-indicator" />
              <span>LIVE RAG SEARCH &amp; PERMISSION DEMO</span>
            </div>

            {/* Role Switcher Tabs */}
            <div className="terminal-role-tabs">
              <button
                type="button"
                onClick={() => setSelectedRole("admin")}
                className={`terminal-role-btn ${selectedRole === "admin" ? "active" : ""}`}
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("staff")}
                className={`terminal-role-btn ${selectedRole === "staff" ? "active" : ""}`}
              >
                Staff
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole("user")}
                className={`terminal-role-btn ${selectedRole === "user" ? "active" : ""}`}
              >
                User
              </button>
            </div>
          </div>

          <div className="terminal-rag-body">
            {/* Terminal Command Line Prompt */}
            <div className="terminal-command-prompt">
              <div>
                <span className="terminal-prompt-prefix">❯</span>
                <span className="terminal-prompt-cmd">{activeSpec.command}</span>
              </div>
              <span className="terminal-prompt-meta">{activeSpec.model}</span>
            </div>

            {/* Scope Identifier */}
            <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
              <span className="text-[var(--color-ink-dim)]">CURRENT USER ROLE</span>
              <span className="text-[var(--color-atelier-brass)] font-semibold">{activeSpec.scope}</span>
            </div>

            {/* Retrieved Vector Chunks Preview */}
            <div>
              <div className="text-[11px] text-[var(--color-ink-dim)] uppercase tracking-wider mb-2 font-mono font-semibold">
                Retrieved Knowledge Snippets (Top Matches)
              </div>
              <div className="rag-vector-chunk-list">
                {activeSpec.chunks.map((chunk) => (
                  <div key={chunk.id} className="rag-chunk-card">
                    <div className="rag-chunk-header">
                      <span className="rag-chunk-id">{chunk.id} · {chunk.source}</span>
                      <span className="rag-similarity-score">{chunk.similarity}</span>
                    </div>
                    <div className="rag-chunk-text">{chunk.text}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Module Telemetry Row */}
            <div>
              <div className="text-[11px] text-[var(--color-ink-dim)] uppercase tracking-wider mb-2 font-mono font-semibold">
                Search Performance &amp; Metrics
              </div>
              <div className="rag-telemetry-row">
                {activeSpec.stats.map((st) => (
                  <div key={st.label} className="rag-stat-tile">
                    <div className="rag-stat-kicker">{st.label}</div>
                    <div className="rag-stat-metric">{st.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bento Architecture Plates Section */}
      <section id="features" className="atelier-section">
        <div className="atelier-section-header">
          <div className="atelier-section-tag">PLATFORM CAPABILITIES</div>
          <h2>Intelligent Retrieval &amp; Secure Permissions</h2>
          <p>
            Built for high-accuracy document search, sub-second response times,
            and reliable separation of user permissions.
          </p>
        </div>

        <div className="atelier-plates-grid">
          {/* Plate 1: Direct Authentication & Vector Endpoints (Wide) */}
          <div id="endpoints" className="atelier-plate">
            <span className="atelier-plate-corner">[ API 01 ]</span>
            <h3>Authentication &amp; Search Endpoints</h3>
            <p>
              Stateless OAuth2 password authentication with secure JWT tokens that enforce
              user role permissions across all search and ingestion APIs.
            </p>
            <table className="atelier-matrix-table">
              <thead>
                <tr>
                  <th>METHOD</th>
                  <th>ENDPOINT</th>
                  <th>ALLOWED ROLES</th>
                  <th>AUTH TYPE</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><span className="terminal-pill-tag post">POST</span></td>
                  <td>/auth/token</td>
                  <td>Public (Login)</td>
                  <td>Password Form</td>
                </tr>
                <tr>
                  <td><span className="terminal-pill-tag get">GET</span></td>
                  <td>/auth/me</td>
                  <td>Admin, Staff, User</td>
                  <td>Bearer Token</td>
                </tr>
                <tr>
                  <td><span className="terminal-pill-tag post">POST</span></td>
                  <td>/auth/</td>
                  <td>Public (Register)</td>
                  <td>JSON Body</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Plate 2: Hybrid Retrieval Engine */}
          <div className="atelier-plate">
            <span className="atelier-plate-corner">[ FEATURE 02 ]</span>
            <h3>Hybrid Search (Keyword + Vector)</h3>
            <p>
              Combines exact keyword matching with semantic vector embeddings using
              Reciprocal Rank Fusion (RRF) for the highest retrieval accuracy.
            </p>
            <div className="mt-auto p-3 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--color-ink-dim)]">SEARCH ALGORITHM</span>
              <span className="text-[var(--color-terminal-cyan)] font-bold">Hybrid RRF Fusion</span>
            </div>
          </div>

          {/* Plate 3: Semantic Document Pipelines */}
          <div className="atelier-plate">
            <span className="atelier-plate-corner">[ FEATURE 03 ]</span>
            <h3>Smart Document Chunking</h3>
            <p>
              Automatically splits PDFs, markdown, and documents into contextual sections
              with sliding overlap so AI models receive complete meaning.
            </p>
            <div className="mt-auto flex items-center gap-2 font-mono text-xs text-[var(--color-ink-muted)]">
              <span className="px-2 py-1 bg-[var(--color-paper-terminal)] rounded border border-[var(--color-rule)]">Uploaded</span>
              <span>→</span>
              <span className="px-2 py-1 bg-[var(--color-paper-terminal)] rounded border border-[var(--color-rule)]">Chunked</span>
              <span>→</span>
              <span className="px-2 py-1 bg-[var(--color-paper-terminal)] rounded border border-[var(--color-rule)] text-[var(--color-terminal-green)]">Search Ready</span>
            </div>
          </div>

          {/* Plate 4: Zero-Trust Enclave Guard (Wide) */}
          <div className="atelier-plate">
            <span className="atelier-plate-corner">[ FEATURE 04 ]</span>
            <h3>Role-Based Page &amp; Data Protection</h3>
            <p>
              Protects frontend pages and backend endpoints. Users only see, search, and
              manage data authorized for their specific role.
            </p>
            <div className="mt-auto flex items-center justify-between p-3 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)]" />
                <span className="text-[var(--color-ink)]">Protected Route Guard</span>
              </div>
              <span className="text-[var(--color-atelier-brass)] font-semibold">AUTOMATIC ROLE ENFORCEMENT</span>
            </div>
          </div>
        </div>
      </section>

      {/* Colophon Footer · Atelier Apparatus */}
      <footer className="atelier-footer">
        <div className="atelier-footer-inner">
          <div className="flex items-center gap-3">
            <div className="atelier-logo-stamp !w-6 !h-6">
              <svg width="12" height="12" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L4 12V28L20 36L36 28V12L20 4Z" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <span className="font-semibold text-[var(--color-ink)]">Electron Gate · AI Knowledge &amp; Search Platform</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] inline-block" />
            <span>ALL SERVICES ONLINE</span>
          </div>

          <div className="atelier-footer-links">
            <Link href="/products">Products</Link>
            <Link href="/login">Sign In</Link>
            <Link href="/signup">Sign Up</Link>
            <Link href="/dashboard">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}


