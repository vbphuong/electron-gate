"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import ProtectedRoute from "@/app/components/ProtectedRoute";
import {
  Boxes,
  Tag,
  Camera,
  Warehouse,
  Package,
  Layers,
  Repeat,
  Clock,
  CreditCard,
  Truck,
  FileText,
  MessageSquare,
  Sparkles,
  Users,
  ShieldCheck,
  Globe,
  MapPin,
  Search,
  ExternalLink,
  ChevronRight,
  Database,
  Cpu,
  CheckCircle2,
  Terminal,
  Activity,
  SlidersHorizontal,
} from "lucide-react";

interface EndpointItem {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  summary: string;
  targetHref: string;
  actionLabel: string;
}

interface DomainGroup {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  badge: string;
  managementHref: string;
  endpoints: EndpointItem[];
}

const DOMAIN_GROUPS: DomainGroup[] = [
  {
    id: "catalog",
    title: "Catalog & Media Engine",
    subtitle: "Product SKUs, multi-attribute variants, dynamic specs, and CLIP 512d vector image matching",
    icon: <Boxes className="w-5 h-5 text-[var(--color-atelier-brass)]" />,
    accentColor: "border-[var(--color-atelier-brass)]/40",
    badge: "5 ENDPOINTS",
    managementHref: "/admin/products",
    endpoints: [
      { method: "GET", path: "/products", summary: "Query catalog with category & keyword filters", targetHref: "/admin/products", actionLabel: "Products Hub" },
      { method: "POST", path: "/products", summary: "Create new product record in catalog", targetHref: "/admin/products", actionLabel: "Add SKU" },
      { method: "GET", path: "/products/{id}/variants", summary: "Retrieve multi-attribute variants (switches, colors)", targetHref: "/admin/products", actionLabel: "Variants" },
      { method: "GET", path: "/categories", summary: "Taxonomy tree and category classifications", targetHref: "/admin/categories", actionLabel: "Categories" },
      { method: "POST", path: "/products/{id}/images/upload", summary: "Upload media & generate 512d CLIP vector", targetHref: "/admin/products", actionLabel: "Image Sync" },
    ],
  },
  {
    id: "inventory",
    title: "Warehouse Inventory (5 Subsystems)",
    subtitle: "Multi-facility stock nodes, audit movement ledgers, TTL reservations, and replenishment thresholds",
    icon: <Warehouse className="w-5 h-5 text-[var(--color-terminal-green)]" />,
    accentColor: "border-[var(--color-terminal-green)]/40",
    badge: "5 SUB-MODULES",
    managementHref: "/admin/inventory",
    endpoints: [
      { method: "GET", path: "/inventory-locations", summary: "Warehouse physical nodes and capacity", targetHref: "/admin/inventory/locations", actionLabel: "Locations" },
      { method: "GET", path: "/inventory/stock", summary: "Real-time stock levels (available vs reserved)", targetHref: "/admin/inventory/stock", actionLabel: "Stock Grid" },
      { method: "POST", path: "/inventory/stock/transfer", summary: "Inter-facility stock movement ledger", targetHref: "/admin/inventory/movements", actionLabel: "Transfer" },
      { method: "GET", path: "/inventory/movements", summary: "Append-only immutable audit movement ledger", targetHref: "/admin/inventory/movements", actionLabel: "Audit Trail" },
      { method: "GET", path: "/inventory/reservations", summary: "TTL checkout stock locks & cleanup worker", targetHref: "/admin/inventory/reservations", actionLabel: "TTL Holds" },
    ],
  },
  {
    id: "orders",
    title: "Orders, Payments & 3PL Logistics",
    subtitle: "Customer order state machines, payment settlements, and third-party delivery dispatch",
    icon: <Package className="w-5 h-5 text-[var(--color-terminal-cyan)]" />,
    accentColor: "border-[var(--color-terminal-cyan)]/40",
    badge: "6 ENDPOINTS",
    managementHref: "/admin/orders",
    endpoints: [
      { method: "GET", path: "/orders", summary: "All customer orders across all lifecycle states", targetHref: "/admin/orders", actionLabel: "Orders Hub" },
      { method: "PUT", path: "/orders/{id}/status", summary: "Transition state (Pending -> Paid -> Shipped)", targetHref: "/admin/orders", actionLabel: "Update State" },
      { method: "GET", path: "/orders/{id}/history", summary: "State audit log and change timestamps", targetHref: "/admin/orders", actionLabel: "Audit History" },
      { method: "GET", path: "/payments", summary: "Transaction logs and payment gateway receipts", targetHref: "/admin/payments", actionLabel: "Payments" },
      { method: "GET", path: "/shipments", summary: "Waybills, tracking codes, and dispatch status", targetHref: "/admin/shipments", actionLabel: "Shipments" },
      { method: "GET", path: "/delivery-providers", summary: "Integrated logistics carriers & service tiers", targetHref: "/admin/delivery-providers", actionLabel: "Carriers" },
    ],
  },
  {
    id: "ai",
    title: "AI Knowledge Enclave (RAG)",
    subtitle: "Distributed Celery ingestion pipeline, HNSW vector cosine search, and grounded GPT-4o-mini generation",
    icon: <Sparkles className="w-5 h-5 text-[var(--color-enclave-violet)]" />,
    accentColor: "border-[var(--color-enclave-violet)]/40",
    badge: "5 ENDPOINTS",
    managementHref: "/dashboard/documents",
    endpoints: [
      { method: "POST", path: "/ingestion/upload", summary: "Multimodal document parser (PDF, Tables, Text)", targetHref: "/dashboard/documents", actionLabel: "Ingest PDF" },
      { method: "GET", path: "/ingestion/documents", summary: "Enclave corpus document index and status", targetHref: "/dashboard/documents", actionLabel: "Corpus Docs" },
      { method: "GET", path: "/ingestion/documents/{id}/chunks", summary: "Inspect 1536d chunk embeddings & text slices", targetHref: "/dashboard/documents", actionLabel: "Chunk View" },
      { method: "POST", path: "/rag/query", summary: "Execute hybrid vector/keyword retrieval & RRF", targetHref: "/dashboard/chat", actionLabel: "RAG Query" },
      { method: "GET", path: "/rag/conversations", summary: "Customer AI consultation session audit logs", targetHref: "/dashboard/chat", actionLabel: "Chat Logs" },
    ],
  },
  {
    id: "governance",
    title: "Platform Governance & Geography",
    subtitle: "RBAC authorization matrix, platform user identities, global country/city territories, and address books",
    icon: <ShieldCheck className="w-5 h-5 text-[var(--color-restricted-red)]" />,
    accentColor: "border-[var(--color-restricted-red)]/40",
    badge: "4 MODULES",
    managementHref: "/admin/users",
    endpoints: [
      { method: "GET", path: "/people/users", summary: "Platform users, email records, and assigned roles", targetHref: "/admin/users", actionLabel: "User Directory" },
      { method: "GET", path: "/people/roles", summary: "Role permissions and RBAC access scopes", targetHref: "/admin/roles", actionLabel: "Roles Matrix" },
      { method: "GET", path: "/locations/countries", summary: "Active sovereign territories and postal codes", targetHref: "/admin/locations", actionLabel: "Territories" },
      { method: "GET", path: "/addresses", summary: "Customer shipping addresses and location ties", targetHref: "/admin/locations", actionLabel: "Address Index" },
    ],
  },
];

function AdminDashboardContent() {
  const { user } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  const filteredDomains = DOMAIN_GROUPS.map((group) => {
    if (selectedDomain !== "all" && group.id !== selectedDomain) {
      return null;
    }
    if (!searchFilter.trim()) {
      return group;
    }
    const query = searchFilter.toLowerCase();
    const matchesGroup =
      group.title.toLowerCase().includes(query) || group.subtitle.toLowerCase().includes(query);
    const matchedEndpoints = group.endpoints.filter(
      (ep) =>
        ep.path.toLowerCase().includes(query) ||
        ep.summary.toLowerCase().includes(query) ||
        ep.method.toLowerCase().includes(query)
    );
    if (matchesGroup || matchedEndpoints.length > 0) {
      return {
        ...group,
        endpoints: matchedEndpoints.length > 0 ? matchedEndpoints : group.endpoints,
      };
    }
    return null;
  }).filter(Boolean) as DomainGroup[];

  const totalEndpoints = DOMAIN_GROUPS.reduce((acc, g) => acc + g.endpoints.length, 0);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Drafting Grid Texture */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-35" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col relative z-10">
        {/* Executive Header Plate */}
        <section className="mb-8">
          <div className="atelier-plate relative p-6 sm:p-8 rounded-lg overflow-hidden border border-[var(--color-rule)] bg-[var(--color-paper-sub)]">
            <div className="atelier-filament-glow" />
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 relative z-10">
              <div className="max-w-3xl">
                <div className="font-mono text-xs text-[var(--color-atelier-brass)] uppercase tracking-wider mb-2 flex items-center gap-2 font-semibold">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>OPERATIONS COMMAND CENTER // API WORKBENCH</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-fraunces font-extrabold tracking-tight text-[var(--color-ink)] mb-3">
                  API Domain Management &amp; System Flow
                </h1>
                <p className="text-sm text-[var(--color-ink-muted)] font-sans leading-relaxed">
                  Unified governance across all 25 FastAPI endpoints, vector HNSW similarity spaces,
                  multi-facility inventory nodes, and RAG document ingestion queues.
                </p>
              </div>

              {/* System Telemetry Badges */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-3 bg-[var(--color-paper-card)] p-3 rounded border border-[var(--color-rule)] font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Endpoints</div>
                    <div className="text-base font-bold text-[var(--color-terminal-green)]">
                      {totalEndpoints} Active
                    </div>
                  </div>
                  <div className="h-7 w-px bg-[var(--color-rule)]" />
                  <div>
                    <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Domains</div>
                    <div className="text-base font-bold text-[var(--color-atelier-brass)]">
                      5 Sectors
                    </div>
                  </div>
                  <div className="h-7 w-px bg-[var(--color-rule)]" />
                  <div>
                    <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Architecture</div>
                    <div className="text-base font-bold text-[var(--color-terminal-cyan)]">
                      FastAPI + pgvector
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Domain Navigation Tabs & Filter Bar */}
        <section className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Domain Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              <button
                onClick={() => setSelectedDomain("all")}
                className={`px-3 py-1.5 rounded font-mono text-xs transition-all whitespace-nowrap ${
                  selectedDomain === "all"
                    ? "bg-[var(--color-atelier-brass)] text-white font-bold shadow"
                    : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-rule)]"
                }`}
              >
                All Domains ({totalEndpoints})
              </button>
              {DOMAIN_GROUPS.map((g) => (
                <button
                  key={g.id}
                  onClick={() => setSelectedDomain(g.id)}
                  className={`px-3 py-1.5 rounded font-mono text-xs transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    selectedDomain === g.id
                      ? "bg-[var(--color-atelier-brass)] text-white font-bold shadow"
                      : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] border border-[var(--color-rule)]"
                  }`}
                >
                  {g.title.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter by route or method..."
                className="w-full bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded pl-9 pr-3 py-1.5 text-xs font-mono text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Structured Domain Plates */}
        <section className="space-y-6">
          {filteredDomains.map((group) => (
            <div
              key={group.id}
              className="bg-[var(--color-paper-sub)] border border-[var(--color-rule)] hover:border-[var(--color-rule-active)] rounded-lg p-5 sm:p-6 transition-all duration-200"
            >
              {/* Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 mb-4 border-b border-[var(--color-rule)]">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)]">
                    {group.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-fraunces text-lg sm:text-xl font-bold text-[var(--color-ink)]">
                        {group.title}
                      </h2>
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--color-paper-card)] border border-[var(--color-rule)] text-[var(--color-atelier-brass)] font-semibold">
                        {group.badge}
                      </span>
                    </div>
                    <p className="font-sans text-xs text-[var(--color-ink-muted)] mt-0.5">
                      {group.subtitle}
                    </p>
                  </div>
                </div>

                <Link
                  href={group.managementHref}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-[var(--color-atelier-brass)]/10 hover:bg-[var(--color-atelier-brass)]/20 border border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)] font-mono text-xs font-semibold self-start sm:self-center transition-colors"
                >
                  <span>Open Dedicated Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Endpoints Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--color-rule)] text-[11px] text-[var(--color-ink-dim)] uppercase">
                      <th className="py-2.5 px-3 w-20">Method</th>
                      <th className="py-2.5 px-3 w-72">Route Endpoint</th>
                      <th className="py-2.5 px-3">Description &amp; Capability</th>
                      <th className="py-2.5 px-3 text-right w-36">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-rule-subtle)]">
                    {group.endpoints.map((ep, idx) => {
                      const methodColor =
                        ep.method === "GET"
                          ? "bg-[rgba(16,185,129,0.15)] text-[var(--color-terminal-green)] border-[rgba(16,185,129,0.3)]"
                          : ep.method === "POST"
                          ? "bg-[rgba(56,189,248,0.15)] text-[var(--color-terminal-cyan)] border-[rgba(56,189,248,0.3)]"
                          : ep.method === "PUT"
                          ? "bg-[rgba(224,159,62,0.15)] text-[var(--color-atelier-amber)] border-[rgba(224,159,62,0.3)]"
                          : "bg-[rgba(239,68,68,0.15)] text-[var(--color-restricted-red)] border-[rgba(239,68,68,0.3)]";

                      return (
                        <tr
                          key={idx}
                          className="hover:bg-[var(--color-paper-hover)]/40 transition-colors group"
                        >
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-block font-bold text-[10px] px-2 py-0.5 rounded border ${methodColor}`}
                            >
                              {ep.method}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--color-ink)] font-semibold">
                            <code>{ep.path}</code>
                          </td>
                          <td className="py-2.5 px-3 text-[var(--color-ink-muted)] font-sans text-xs">
                            {ep.summary}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Link
                              href={ep.targetHref}
                              className="inline-flex items-center gap-1 text-xs text-[var(--color-ink-dim)] group-hover:text-[var(--color-atelier-brass)] transition-colors"
                            >
                              <span>{ep.actionLabel}</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}

          {filteredDomains.length === 0 && (
            <div className="p-8 text-center bg-[var(--color-paper-sub)] border border-[var(--color-rule)] rounded-lg font-mono text-xs text-[var(--color-ink-muted)]">
              No API domains or endpoints match &quot;{searchFilter}&quot;.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Staff"]}>
      <AdminDashboardContent />
    </ProtectedRoute>
  );
}
