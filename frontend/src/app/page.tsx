"use client";

import { useState } from "react";
import { useAuth } from "@/app/context/AuthContext";
import Link from "next/link";
import {
  ShoppingBag,
  Sparkles,
  Camera,
  Warehouse,
  Boxes,
  Cpu,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Activity,
  Zap,
  SlidersHorizontal,
  ChevronRight,
  FileText,
  Package,
} from "lucide-react";

type WorkbenchTab = "hardware" | "visual" | "rag";

export default function Home() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<WorkbenchTab>("hardware");
  const [selectedSwitch, setSelectedSwitch] = useState<string>("tactile");

  const isAdmin = user?.role === "Admin" || user?.role === "Staff";

  // Interactive Switch Simulator Data
  const switchData: Record<string, { name: string; force: string; sound: string; priceAdd: number; desc: string }> = {
    tactile: {
      name: "Tactile Brass 58g",
      force: "58gf peak actuation",
      sound: "Crisp marble acoustic thock",
      priceAdd: 0,
      desc: "Factory hand-lubed copper leaf with POM stem. Sharp tactile bump at 0.5mm with zero pre-travel wobble.",
    },
    linear: {
      name: "Bespoke Linear Lubed 45g",
      force: "45gf featherweight",
      sound: "Muted deep bottom-out clack",
      priceAdd: 15,
      desc: "Ultra-smooth polycarbonate housing with custom 20mm dual-stage gold springs. Sub-1ms debounce latency.",
    },
    clicky: {
      name: "Industrial Clicky Navy 65g",
      force: "65gf heavy tactile",
      sound: "Command console tactile feedback",
      priceAdd: 10,
      desc: "Thick click-bar mechanism generating authoritative acoustic register signals on every keystroke.",
    },
  };

  const activeSwitch = switchData[selectedSwitch];
  const basePrice = 249;
  const computedPrice = basePrice + activeSwitch.priceAdd;

  return (
    <div className="min-h-screen relative flex flex-col bg-[var(--color-paper)] text-[var(--color-ink)] selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Atelier Drafting Canvas Grid & Ambient Filament Glow */}
      <div className="atelier-canvas-grid" />
      <div className="atelier-filament-glow" />

      {/* Hero Section: Asymmetric Workshop Split */}
      <section className="atelier-hero">
        {/* Left: Editorial Manifesto */}
        <div className="atelier-hero-left">
          <h1 className="atelier-hero-title">
            Artisanal Electronics &amp; <span className="accent">Neural Vector Enclave.</span>
          </h1>

          <p className="atelier-hero-desc">
            A high-precision commerce atelier for custom mechanical keyboards, audiophile DACs, and modular instrument electronics.
            Seamlessly integrated with CLIP 512-dimensional visual camera matching, grounded document RAG, and an industrial 5-subsystem warehouse inventory platform.
          </p>

          <div className="atelier-hero-actions">
            <Link
              href="/products"
              className="atelier-btn atelier-btn-primary text-xs px-6 py-3.5 flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Explore Hardware Catalog</span>
            </Link>

            <Link
              href="/dashboard/chat"
              className="atelier-btn atelier-btn-terminal text-xs px-5 py-3.5 flex items-center gap-2"
            >
              <Terminal className="w-4 h-4 text-[var(--color-terminal-green)]" />
              <span>Consult AI Assistant ❯</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                className="atelier-btn atelier-btn-secondary text-xs px-4 py-3.5 flex items-center gap-2"
              >
                <ShieldCheck className="w-4 h-4 text-[var(--color-terminal-cyan)]" />
                <span>Admin Operations Hub</span>
              </Link>
            )}
          </div>

          {/* Architectural Spec Strip */}
          <div className="atelier-spec-strip">
            <div className="atelier-spec-item">
              <span className="dot">✦</span>
              <span>CLIP 512d Visual Matching</span>
            </div>
            <div className="atelier-spec-item">
              <span className="dot">✦</span>
              <span>Grounded Document RAG</span>
            </div>
            <div className="atelier-spec-item">
              <span className="dot">✦</span>
              <span>5-Subsystem Stock Ledgers</span>
            </div>
            <div className="atelier-spec-item">
              <span className="dot">✦</span>
              <span>TTL Checkout Reservations</span>
            </div>
          </div>
        </div>

        {/* Right: Live Interactive Hardware & Neural Workbench */}
        <div id="workbench" className="terminal-rag-workbench">
          {/* Workbench Top Bar */}
          <div className="terminal-topbar">
            <div className="terminal-title-area">
              <span className="terminal-status-indicator" />
              <span className="font-mono text-xs font-bold text-[var(--color-ink)]">
                LIVE INTERACTIVE ENCLAVE CONSOLE
              </span>
            </div>

            {/* Workbench Mode Tabs */}
            <div className="terminal-role-tabs">
              <button
                type="button"
                onClick={() => setActiveTab("hardware")}
                className={`terminal-role-btn ${activeTab === "hardware" ? "active" : ""}`}
              >
                Hardware Matrix
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("visual")}
                className={`terminal-role-btn ${activeTab === "visual" ? "active" : ""}`}
              >
                CLIP Visual Search
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("rag")}
                className={`terminal-role-btn ${activeTab === "rag" ? "active" : ""}`}
              >
                RAG Citations
              </button>
            </div>
          </div>

          <div className="terminal-rag-body">
            {activeTab === "hardware" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)]">
                  <div>
                    <div className="text-[10px] text-[var(--color-ink-dim)] uppercase font-mono">
                      Selected Base Hardware
                    </div>
                    <div className="font-fraunces text-base font-bold text-[var(--color-ink)]">
                      Atelier Q1 Pro Mechanical Keyboard
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[var(--color-ink-dim)] uppercase font-mono">
                      Configured Price
                    </div>
                    <div className="font-mono text-lg font-extrabold text-[var(--color-atelier-brass)] tabular-nums">
                      ${computedPrice}.00
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[11px] text-[var(--color-ink-dim)] uppercase tracking-wider mb-2 font-mono font-semibold">
                    Mechanical Switch Actuation Profiles
                  </div>
                  <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                    {(["tactile", "linear", "clicky"] as const).map((swKey) => (
                      <button
                        key={swKey}
                        type="button"
                        onClick={() => setSelectedSwitch(swKey)}
                        className={`p-2.5 rounded text-left border transition-all ${
                          selectedSwitch === swKey
                            ? "bg-[var(--color-paper-card)] border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]"
                            : "bg-[var(--color-paper-terminal)] border-[var(--color-rule)] text-[var(--color-ink-muted)] hover:border-[var(--color-rule-active)]"
                        }`}
                      >
                        <div className="font-bold text-[11px] truncate">{switchData[swKey].name.split(" ")[0]}</div>
                        <div className="text-[9px] text-[var(--color-ink-dim)] mt-0.5">
                          {swKey === "tactile" ? "Default" : `+$${switchData[swKey].priceAdd}`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] font-mono text-xs space-y-1.5">
                  <div className="text-[var(--color-atelier-brass)] font-bold flex items-center justify-between">
                    <span>{activeSwitch.name}</span>
                    <span className="text-[10px] text-[var(--color-terminal-green)]">IN STOCK</span>
                  </div>
                  <p className="text-[11.5px] text-[var(--color-ink-muted)] font-sans leading-relaxed">
                    {activeSwitch.desc}
                  </p>
                  <div className="pt-2 border-t border-[var(--color-rule-subtle)] flex items-center justify-between text-[10.5px] text-[var(--color-ink-dim)]">
                    <span>Force: {activeSwitch.force}</span>
                    <span>Acoustics: {activeSwitch.sound}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 font-mono text-xs">
                  <span className="text-[var(--color-terminal-cyan)] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-cyan)] animate-ping" />
                    TTL Stock Lock Available
                  </span>
                  <Link
                    href="/products"
                    className="text-[var(--color-atelier-brass)] hover:underline flex items-center gap-1"
                  >
                    <span>View in Store Catalog</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "visual" && (
              <div className="space-y-4 font-mono text-xs">
                <div className="terminal-command-prompt">
                  <div>
                    <span className="terminal-prompt-prefix">❯</span>
                    <span className="terminal-prompt-cmd">clip.similarity --vector=512d --metric=cosine</span>
                  </div>
                  <span className="terminal-prompt-meta">pgvector HNSW</span>
                </div>

                <div className="p-3 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[var(--color-ink-dim)] uppercase">Visual Query Sample</span>
                    <span className="text-[var(--color-terminal-cyan)] font-bold">512-dim Normalized</span>
                  </div>
                  <div className="text-[11px] text-[var(--color-ink-muted)] font-sans">
                    Uploaded input: Macro photo of brass switch housing and leaf spring contact.
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] text-[var(--color-ink-dim)] uppercase font-semibold">
                    Top Vector Nearest-Neighbor Matches
                  </div>
                  {[
                    { name: "Tactile Brass Switch Pro", sim: "0.964", cat: "Components" },
                    { name: "Atelier Q1 Brass Edition", sim: "0.912", cat: "Keyboards" },
                    { name: "Copper Leaf Lubricated Actuator", sim: "0.875", cat: "Accessories" },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-[var(--color-ink)]">{item.name}</div>
                        <div className="text-[10px] text-[var(--color-ink-dim)]">{item.cat}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[var(--color-terminal-green)] font-bold tabular-nums">
                          {item.sim} cos
                        </div>
                        <div className="text-[9px] text-[var(--color-ink-dim)]">rank #{idx + 1}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "rag" && (
              <div className="space-y-3 font-mono text-xs">
                <div className="terminal-command-prompt">
                  <div>
                    <span className="terminal-prompt-prefix">❯</span>
                    <span className="terminal-prompt-cmd">rag.answer --hybrid --citations=strict</span>
                  </div>
                  <span className="terminal-prompt-meta">gpt-4o-mini</span>
                </div>

                <div className="p-3 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-2">
                  <div className="text-[11px] text-[var(--color-ink-dim)] uppercase">User Query</div>
                  <div className="font-sans text-xs text-[var(--color-ink)]">
                    &quot;What is the debounce latency on the custom linear switch PCB?&quot;
                  </div>
                </div>

                <div className="p-3 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] space-y-2 font-sans text-xs text-[var(--color-ink-muted)]">
                  <p className="leading-relaxed">
                    According to the factory specification datasheet [Doc #04], the debounce latency is measured at{" "}
                    <strong className="text-[var(--color-atelier-brass)] font-mono">0.82ms</strong> with anti-ghosting N-key rollover over USB-C polling at 1000Hz.
                  </p>
                  <div className="pt-2 border-t border-[var(--color-rule-subtle)] flex items-center gap-2 font-mono text-[10px] text-[var(--color-terminal-cyan)]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--color-terminal-green)]" />
                    <span>Verified Chunk: switch_latency_whitepaper.pdf (p.4) · 98.2% match</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Bento Architecture Plates: The 4 Core Pillars */}
      <section id="features" className="atelier-section">
        <div className="atelier-section-header">
          <h2 className="text-2xl sm:text-3xl font-fraunces font-extrabold tracking-tight text-[var(--color-ink)]">
            Engineered at the Intersection of Physical Craft &amp; Neural Vector Space
          </h2>
          <p className="text-sm text-[var(--color-ink-muted)] font-sans max-w-2xl leading-relaxed">
            Electron Gate delivers a unified architectural ecosystem spanning artisanal hardware production,
            high-throughput vector retrieval, and distributed multi-facility inventory tracking.
          </p>
        </div>

        <div className="atelier-plates-grid">
          {/* Plate 1: Tactile Mechanical Craftsmanship */}
          <div className="atelier-plate">
            <h3 className="font-fraunces text-xl font-bold text-[var(--color-ink)] mb-2">
              Tactile Mechanical Craftsmanship
            </h3>
            <p className="font-sans text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Every keyboard case is CNC-machined from solid 6063 architectural aluminum, anodized to satin perfection, and fitted with gasket-mounted brass switch plates for acoustic resonance dampening.
            </p>
            <div className="mt-auto pt-4 border-t border-[var(--color-rule)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--color-ink-dim)]">TOLERANCE SPEC</span>
              <span className="text-[var(--color-atelier-brass)] font-bold">±0.02mm CNC Tolerance</span>
            </div>
          </div>

          {/* Plate 2: CLIP 512d Multimodal Visual Search */}
          <div className="atelier-plate">
            <h3 className="font-fraunces text-xl font-bold text-[var(--color-ink)] mb-2">
              CLIP 512-Dimensional Visual Search
            </h3>
            <p className="font-sans text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Identify components, keycaps, and switch pinouts by uploading a phone snapshot. Powered by OpenAI CLIP visual embeddings and native PostgreSQL pgvector HNSW indexing.
            </p>
            <div className="mt-auto pt-4 border-t border-[var(--color-rule)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--color-ink-dim)]">INDEX TYPE</span>
              <span className="text-[var(--color-terminal-cyan)] font-bold">pgvector HNSW Cosine</span>
            </div>
          </div>

          {/* Plate 3: Enterprise Document RAG Enclave */}
          <div className="atelier-plate">
            <h3 className="font-fraunces text-xl font-bold text-[var(--color-ink)] mb-2">
              Grounded Neural Knowledge Base
            </h3>
            <p className="font-sans text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Single-pass document ingestion using Celery chords, extracting tables, text slices, and wiring diagrams into vector chunks for hallucination-free AI answers with strict provenance.
            </p>
            <div className="mt-auto pt-4 border-t border-[var(--color-rule)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--color-ink-dim)]">RERANKING ALGORITHM</span>
              <span className="text-[var(--color-terminal-green)] font-bold">Reciprocal Rank Fusion (RRF)</span>
            </div>
          </div>

          {/* Plate 4: Industrial 5-Subsystem Warehouse Inventory */}
          <div className="atelier-plate">
            <h3 className="font-fraunces text-xl font-bold text-[var(--color-ink)] mb-2">
              5-Subsystem Warehouse Platform
            </h3>
            <p className="font-sans text-xs text-[var(--color-ink-muted)] leading-relaxed">
              Real-time stock tracking across distributed warehouse locations, immutable movement audit ledgers, TTL-driven checkout reservations, and 3PL shipment dispatch.
            </p>
            <div className="mt-auto pt-4 border-t border-[var(--color-rule)] flex items-center justify-between font-mono text-xs">
              <span className="text-[var(--color-ink-dim)]">CONCURRENCY GUARD</span>
              <span className="text-[var(--color-atelier-amber)] font-bold">TTL Stock Reservation Locks</span>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Hardware Catalog Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full relative z-10 border-t border-[var(--color-rule)]">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-fraunces font-extrabold tracking-tight text-[var(--color-ink)]">
              Curated Hardware Instruments
            </h2>
            <p className="text-xs text-[var(--color-ink-muted)] font-sans mt-1">
              Precision mechanical electronics available with configurable switches, materials, and live inventory.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-[var(--color-atelier-brass)] hover:underline self-start sm:self-auto"
          >
            <span>View Complete 2026 Collection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "Mechanical Keyboard Pro",
              desc: "Ergonomic anodized aluminum body with hot-swappable switches, gasket mount, and south-facing RGB.",
              price: "$149.00",
              tag: "Tactile Brass 58g",
              badge: "In Stock · Ready to Dispatch",
            },
            {
              title: "Audiophile Balanced DAC Enclave",
              desc: "Dual ES9038Q2M flagship converters with balanced XLR outputs and ultra-low noise linear power filtering.",
              price: "$289.00",
              tag: "Dual DAC Architecture",
              badge: "TTL Hold Available",
            },
            {
              title: "Modular Split Ergonomic PCB",
              desc: "Columnar staggered ortholinear layout with rotary encoders and OLED display telemetry panels.",
              price: "$179.00",
              tag: "Hot-Swap Sockets",
              badge: "Limited Production Run",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-lg bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-rule-active)] transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3 font-mono text-[10px]">
                  <span className="text-[var(--color-atelier-brass)] font-semibold uppercase">{item.tag}</span>
                  <span className="text-[var(--color-terminal-green)]">{item.badge}</span>
                </div>
                <h3 className="font-fraunces text-lg font-bold text-[var(--color-ink)] group-hover:text-[var(--color-atelier-brass)] transition-colors mb-2">
                  {item.title}
                </h3>
                <p className="font-sans text-xs text-[var(--color-ink-muted)] leading-relaxed mb-4">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-[var(--color-rule-subtle)] flex items-center justify-between font-mono">
                <span className="text-base font-bold text-[var(--color-ink)] tabular-nums">
                  {item.price}
                </span>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-atelier-brass)] hover:underline"
                >
                  <span>Configure</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Colophon Footer · Atelier Apparatus */}
      <footer className="atelier-footer mt-auto">
        <div className="atelier-footer-inner">
          <div className="flex items-center gap-3">
            <div className="atelier-logo-stamp !w-7 !h-7">
              <svg width="14" height="14" viewBox="0 0 40 40" fill="none">
                <path d="M20 4L4 12V28L20 36L36 28V12L20 4Z" stroke="currentColor" strokeWidth="2.5" />
              </svg>
            </div>
            <div>
              <div className="font-fraunces font-bold text-sm text-[var(--color-ink)]">
                Electron Gate · Atelier &amp; Neural Hardware Enclave
              </div>
              <div className="font-mono text-[10.5px] text-[var(--color-ink-dim)]">
                FastAPI Asynchronous Engine · PostgreSQL pgvector HNSW · Next.js 16 App Router
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-ink-dim)]">
            <span className="w-2 h-2 rounded-full bg-[var(--color-terminal-green)] inline-block" />
            <span>SYSTEM 2.2 // NOMINAL</span>
          </div>

          <div className="atelier-footer-links">
            <Link href="/products">Storefront</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/dashboard/chat">Neural Lab</Link>
            <Link href="/admin">Admin Hub</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
