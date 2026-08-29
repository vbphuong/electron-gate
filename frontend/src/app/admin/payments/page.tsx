/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono · design-system: design.md */

"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/app/context/AuthContext";
import {
  apiListPayments,
  apiUpdatePayment,
  type PaymentRead,
} from "@/app/lib/api";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  RefreshCw,
  LogOut,
  AlertCircle,
  X,
  Check,
  DollarSign,
  Receipt,
  ExternalLink,
  Edit3,
} from "lucide-react";

const PAYMENT_STATUS_TABS = [
  { key: "all", label: "ALL TRANSACTIONS" },
  { key: "pending", label: "PENDING" },
  { key: "paid", label: "PAID / SETTLED" },
  { key: "failed", label: "FAILED" },
  { key: "refunded", label: "REFUNDED" },
];

function AdminPaymentsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialOrderId = searchParams.get("order_id") || "";

  const { user, token, logout, isLoading: authLoading } = useAuth();

  // State
  const [payments, setPayments] = useState<PaymentRead[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>(initialOrderId);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Edit Payment Modal
  const [editingPayment, setEditingPayment] = useState<PaymentRead | null>(null);
  const [editForm, setEditForm] = useState({
    payment_status: "paid",
    payment_method: "",
    amount: "",
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  // Role validation
  const userRole = (user?.role || "").toLowerCase();
  const isAuthorized = userRole === "admin" || userRole === "staff";

  // Load Payments
  const loadPayments = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiListPayments(token, {
        payment_status: selectedStatus === "all" ? undefined : selectedStatus,
      });
      setPayments(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load settlement transactions."
      );
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedStatus]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push("/login");
      } else if (!isAuthorized) {
        router.push("/dashboard");
      } else {
        loadPayments();
      }
    }
  }, [authLoading, user, isAuthorized, router, loadPayments]);

  // Quick Mark As Paid
  const handleQuickMarkPaid = async (paymentId: string) => {
    if (!token) return;
    try {
      await apiUpdatePayment(
        paymentId,
        {
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        },
        token
      );
      setActionSuccess("Transaction updated to [PAID / SETTLED].");
      await loadPayments();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to settle payment."
      );
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (p: PaymentRead) => {
    setEditingPayment(p);
    setEditForm({
      payment_status: p.payment_status,
      payment_method: p.payment_method,
      amount: String(p.amount),
    });
  };

  // Save Edit Payment
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingPayment) return;
    setIsSubmittingEdit(true);
    try {
      await apiUpdatePayment(
        editingPayment.payment_id,
        {
          payment_status: editForm.payment_status,
          payment_method: editForm.payment_method.trim(),
          amount: Number(editForm.amount),
          paid_at:
            editForm.payment_status === "paid" && !editingPayment.paid_at
              ? new Date().toISOString()
              : undefined,
        },
        token
      );
      setActionSuccess("Settlement transaction updated successfully.");
      setEditingPayment(null);
      await loadPayments();
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update payment record."
      );
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Filtered Payments
  const filteredPayments = useMemo(() => {
    if (!searchQuery.trim()) return payments;
    const q = searchQuery.toLowerCase().trim();
    return payments.filter(
      (p) =>
        p.payment_id.toLowerCase().includes(q) ||
        p.order_id.toLowerCase().includes(q) ||
        p.payment_method.toLowerCase().includes(q)
    );
  }, [payments, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    const totalCount = payments.length;
    const paidCount = payments.filter((p) => p.payment_status === "paid").length;
    const pendingCount = payments.filter((p) => p.payment_status === "pending").length;
    const failedCount = payments.filter((p) => p.payment_status === "failed").length;
    const totalVolume = payments
      .filter((p) => p.payment_status === "paid")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    return { totalCount, paidCount, pendingCount, failedCount, totalVolume };
  }, [payments]);

  return (
    <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col selection:bg-[var(--color-atelier-brass)] selection:text-[var(--color-paper)]">
      {/* Background canvas grid & filament */}
      <div className="atelier-canvas-grid fixed inset-0 pointer-events-none opacity-40" />
      <div className="atelier-filament-glow" />

      {/* Top Header */}
      

      {/* Main Payment Settlement Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 flex flex-col space-y-6">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-mono text-xs text-[var(--color-terminal-cyan)]">
              <span>● FINANCIAL CLEARANCE MATRIX</span>
              <span className="text-[var(--color-rule)]">/</span>
              <span>SECTION 10.1</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-fraunces font-extrabold text-[var(--color-ink)] tracking-tight">
              Payment Settlement Center
            </h1>
          </div>

          <button
            onClick={loadPayments}
            className="atelier-btn atelier-btn-ghost !py-2 !px-4 font-mono text-xs border border-[var(--color-rule)] hover:border-[var(--color-atelier-brass)] flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>

        {/* Metrics Overview */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Total Invoices</div>
            <div className="text-2xl font-bold text-[var(--color-ink)]">{metrics.totalCount}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">All transaction logs</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Settled Volume</div>
            <div className="text-2xl font-bold text-[var(--color-terminal-green)]">
              ${metrics.totalVolume.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">{metrics.paidCount} paid transactions</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Pending Clearance</div>
            <div className="text-2xl font-bold text-[var(--color-atelier-amber)]">{metrics.pendingCount}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Awaiting settlement</div>
          </div>

          <div className="p-4 rounded-lg bg-[var(--color-paper-card)] border border-[var(--color-rule)] space-y-1">
            <div className="text-[10px] text-[var(--color-ink-dim)] uppercase">Failed / Flagged</div>
            <div className="text-2xl font-bold text-[var(--color-restricted-red)]">{metrics.failedCount}</div>
            <div className="text-[10px] text-[var(--color-ink-muted)]">Requires investigation</div>
          </div>
        </section>

        {/* Alerts & Notifications */}
        {actionSuccess && (
          <div className="p-3.5 rounded-lg bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/40 text-[var(--color-terminal-green)] font-mono text-xs flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-lg bg-[var(--color-restricted-red)]/15 border border-[var(--color-restricted-red)]/40 text-[var(--color-restricted-red)] font-mono text-xs flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pt-2">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 font-mono text-xs scrollbar-none">
            {PAYMENT_STATUS_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3 py-1.5 rounded uppercase tracking-wider font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === tab.key
                    ? "bg-[var(--color-atelier-brass)] text-[var(--color-paper)] shadow-sm"
                    : "bg-[var(--color-paper-sub)] text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-card)] border border-[var(--color-rule)]"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--color-ink-dim)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Payment ID, Order ID..."
              className="w-full pl-9 pr-4 py-1.5 rounded bg-[var(--color-paper-sub)] border border-[var(--color-rule)] font-mono text-xs text-[var(--color-ink)] placeholder-[var(--color-ink-dim)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
            />
          </div>
        </div>

        {/* Transactions Table */}
        <section className="atelier-plate rounded-lg border border-[var(--color-rule)] bg-[var(--color-paper-card)] shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center font-mono text-xs text-[var(--color-ink-muted)] space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
              <span>Querying settlement transaction logs...</span>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="py-16 text-center font-mono text-xs text-[var(--color-ink-dim)] space-y-2">
              <CreditCard className="w-8 h-8 mx-auto opacity-40" />
              <p>No settlement records found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-[var(--color-paper-terminal)] border-b border-[var(--color-rule)] text-[var(--color-ink-dim)] uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Payment ID</th>
                    <th className="py-3.5 px-4 font-semibold">Linked Order ID</th>
                    <th className="py-3.5 px-4 font-semibold">Gateway Method</th>
                    <th className="py-3.5 px-4 font-semibold">Amount (USD)</th>
                    <th className="py-3.5 px-4 font-semibold">Settlement Status</th>
                    <th className="py-3.5 px-4 font-semibold">Paid Timestamp</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-rule-subtle)]">
                  {filteredPayments.map((p) => {
                    const isPaid = p.payment_status === "paid";
                    const isPending = p.payment_status === "pending";
                    const isFailed = p.payment_status === "failed";

                    return (
                      <tr
                        key={p.payment_id}
                        className="hover:bg-[var(--color-paper-hover)] transition-colors"
                      >
                        {/* Payment ID */}
                        <td className="py-3.5 px-4 font-bold text-[var(--color-ink)]">
                          {p.payment_id.slice(0, 8)}...
                        </td>

                        {/* Order ID Link */}
                        <td className="py-3.5 px-4">
                          <Link
                            href={`/admin/orders`}
                            className="text-[var(--color-terminal-cyan)] hover:underline flex items-center gap-1"
                          >
                            <span>{p.order_id.slice(0, 8)}</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </td>

                        {/* Method */}
                        <td className="py-3.5 px-4 text-[var(--color-ink)]">
                          {p.payment_method.toUpperCase()}
                        </td>

                        {/* Amount */}
                        <td className="py-3.5 px-4 font-bold text-[var(--color-atelier-brass)]">
                          ${Number(p.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              isPaid
                                ? "bg-[var(--color-terminal-green)]/15 text-[var(--color-terminal-green)] border border-[var(--color-terminal-green)]/30"
                                : isFailed
                                ? "bg-[var(--color-restricted-red)]/15 text-[var(--color-restricted-red)] border border-[var(--color-restricted-red)]/30"
                                : "bg-[var(--color-atelier-amber)]/15 text-[var(--color-atelier-amber)] border border-[var(--color-atelier-amber)]/30"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isPaid
                                  ? "bg-[var(--color-terminal-green)]"
                                  : isFailed
                                  ? "bg-[var(--color-restricted-red)]"
                                  : "bg-[var(--color-atelier-amber)] animate-pulse"
                              }`}
                            />
                            <span>{p.payment_status}</span>
                          </span>
                        </td>

                        {/* Timestamp */}
                        <td className="py-3.5 px-4 text-[var(--color-ink-muted)]">
                          {p.paid_at
                            ? new Date(p.paid_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPending && (
                              <button
                                onClick={() => handleQuickMarkPaid(p.payment_id)}
                                className="px-2.5 py-1 rounded bg-[var(--color-terminal-green)]/15 border border-[var(--color-terminal-green)]/30 text-[var(--color-terminal-green)] hover:bg-[var(--color-terminal-green)]/25 text-[11px] font-semibold transition-all"
                              >
                                Mark Paid
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEdit(p)}
                              className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]"
                              title="Edit settlement"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="atelier-plate w-full max-w-md p-6 rounded-lg border border-[var(--color-rule-active)] bg-[var(--color-paper-card)] shadow-2xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--color-rule)]">
              <h3 className="font-fraunces font-bold text-base text-[var(--color-ink)]">
                Modify Settlement Record
              </h3>
              <button
                onClick={() => setEditingPayment(null)}
                className="p-1 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-ink)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Settlement Status</label>
                <select
                  value={editForm.payment_status}
                  onChange={(e) =>
                    setEditForm({ ...editForm, payment_status: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                >
                  <option value="pending">pending</option>
                  <option value="paid">paid (settled)</option>
                  <option value="failed">failed</option>
                  <option value="refunded">refunded</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Payment Gateway / Method</label>
                <input
                  type="text"
                  value={editForm.payment_method}
                  onChange={(e) =>
                    setEditForm({ ...editForm, payment_method: e.target.value })
                  }
                  placeholder="e.g. credit_card, wire_transfer, crypto"
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[var(--color-ink-muted)]">Settled Amount (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                  className="w-full px-3 py-2 rounded bg-[var(--color-paper-terminal)] border border-[var(--color-rule)] text-[var(--color-ink)] focus:outline-none focus:border-[var(--color-atelier-brass)]"
                  required
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[var(--color-rule)]">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="atelier-btn atelier-btn-ghost !py-1.5 !px-3"
                  disabled={isSubmittingEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="atelier-btn atelier-btn-primary !py-1.5 !px-4 flex items-center gap-1.5"
                  disabled={isSubmittingEdit}
                >
                  {isSubmittingEdit ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Page Footer */}
      <footer className="mt-auto border-t border-[var(--color-rule)] py-6 bg-[var(--color-paper-terminal)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-[var(--color-ink-dim)]">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-terminal-green)]" />
            <span>ELECTRON GATE FINANCIAL CLEARANCE · SECTION 10.1</span>
          </div>
          <div>EST. 2026 // ATELIER × MONOSPACE TERMINAL ENCLAVE</div>
        </div>
      </footer>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--color-paper)] text-[var(--color-ink)] flex flex-col items-center justify-center font-mono text-xs space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--color-atelier-brass)] border-t-transparent animate-spin" />
          <span>Synchronizing settlement logs...</span>
        </div>
      }
    >
      <AdminPaymentsContent />
    </Suspense>
  );
}
