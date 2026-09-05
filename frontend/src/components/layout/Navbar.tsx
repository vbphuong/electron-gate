/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · component: Navbar · genre: editorial-modern-minimal · theme: atelier-terminal */
/* states: default · hover · focus · active · disabled */

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/context/AuthContext";
import { VisualSearchModal } from "@/components/layout/VisualSearchModal";
import {
  Users,
  Layers,
  Tag,
  Boxes,
  ShoppingCart,
  CreditCard,
  Truck,
  Warehouse,
  Globe,
  Send,
  LogOut,
  ShoppingBag,
  MessageSquare,
  FileText,
  LayoutDashboard,
  Camera,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [isVisualSearchOpen, setIsVisualSearchOpen] = useState(false);
  
  const userRole = (user?.role || "").toLowerCase();
  const isAdmin = userRole === "admin";
  const isStaff = userRole === "staff";
  const canAccessAdmin = isAdmin || isStaff;

  const isAdminRoute = pathname.startsWith("/admin");

  return (
    <div className="w-full flex flex-col z-50 sticky top-0 bg-[var(--color-paper)]/90 backdrop-blur-md border-b border-[var(--color-rule)]">
      {/* Top Main Nav */}
      <header className="w-full px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        
        {/* Brand */}
        <Link href="/" className="font-fraunces text-xl font-bold tracking-tight text-[var(--color-ink)] hover:text-[var(--color-atelier-brass)] transition-colors flex items-center gap-2 group">
          <div className="w-6 h-6 flex items-center justify-center text-[var(--color-atelier-brass)] group-hover:scale-110 transition-transform">
            <svg width="20" height="20" viewBox="0 0 40 40" fill="none">
              <path
                d="M20 4L4 12V28L20 36L36 28V12L20 4Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              <path
                d="M20 4V36M4 12L36 28M36 12L4 28"
                stroke="currentColor"
                strokeWidth="1.75"
                opacity="0.75"
              />
            </svg>
          </div>
          Electron Gate
          {isAdminRoute && (
            <>
              <span className="text-[var(--color-rule-active)] font-mono text-xs mx-1">/</span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-terminal-cyan)] font-semibold mt-1">Admin</span>
            </>
          )}
        </Link>

        {/* Global Nav Links */}
        <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto custom-scrollbar py-1 font-mono text-xs">
          <Link href="/products" className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 whitespace-nowrap ${pathname === '/products' ? 'text-[var(--color-atelier-brass)] bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/30' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]'}`}>
            <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
            Storefront
          </Link>
          
          {user && (
            <>
              <Link href="/dashboard/chat" className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 whitespace-nowrap ${pathname.includes('/chat') ? 'text-[var(--color-terminal-cyan)] bg-[var(--color-paper-card)] border border-[var(--color-terminal-cyan)]/30' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]'}`}>
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                RAG Chat
              </Link>
              <Link href="/dashboard/documents" className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 whitespace-nowrap ${pathname.includes('/documents') ? 'text-[var(--color-terminal-cyan)] bg-[var(--color-paper-card)] border border-[var(--color-terminal-cyan)]/30' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]'}`}>
                <FileText className="w-3.5 h-3.5 shrink-0" />
                Documents
              </Link>
              <Link href="/dashboard" className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 whitespace-nowrap ${pathname === '/dashboard' ? 'text-[var(--color-atelier-brass)] bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/30' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]'}`}>
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                Dashboard
              </Link>
              {canAccessAdmin && (
                <Link href="/admin" className={`px-3 py-1.5 rounded transition-all flex items-center gap-1.5 whitespace-nowrap ${pathname === '/admin' ? 'text-[var(--color-terminal-cyan)] bg-[var(--color-paper-card)] border border-[var(--color-terminal-cyan)]/30' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-sub)]'}`}>
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[var(--color-terminal-cyan)]" />
                  Admin Operations
                </Link>
              )}
            </>
          )}
        </nav>

        {/* Auth / Cart / Visual Search Actions */}
        <div className="flex items-center gap-2">
          {/* Visual Search Button */}
          <button
            type="button"
            onClick={() => setIsVisualSearchOpen(true)}
            className="px-2.5 py-1.5 rounded-lg bg-[var(--color-terminal-cyan)]/10 hover:bg-[var(--color-terminal-cyan)]/20 border border-[var(--color-terminal-cyan)]/40 hover:border-[var(--color-terminal-cyan)] text-[var(--color-terminal-cyan)] transition-all flex items-center gap-1.5 text-xs font-mono font-semibold"
            title="Chụp ảnh hoặc tải ảnh lên để tìm kiếm sản phẩm (Visual Search)"
          >
            <Camera className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">Visual Search</span>
          </button>

          <Link href="/cart" className="relative p-1.5 rounded text-[var(--color-ink-muted)] hover:text-[var(--color-atelier-brass)] hover:bg-[var(--color-paper-sub)] transition-colors" aria-label="View Cart">
            <ShoppingCart className="w-4 h-4" />
          </Link>

          {!isLoading && (
            user ? (
              <div className="flex items-center gap-3 ml-1 sm:ml-2 border-l border-[var(--color-rule)] pl-2 sm:pl-3">
                <div className="hidden sm:flex flex-col text-right font-mono text-xs">
                  <span className="text-[var(--color-ink)] font-semibold truncate max-w-[120px]">{user.email}</span>
                  <span className="text-[var(--color-atelier-brass)] uppercase tracking-wider text-[9px]">
                    ROLE: {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="p-1.5 rounded text-[var(--color-ink-dim)] hover:text-[var(--color-restricted-red)] hover:bg-[var(--color-paper-sub)] transition-colors"
                  aria-label="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 ml-1 sm:ml-2 font-mono text-xs">
                <Link href="/login" className="px-3 py-1.5 text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] transition-colors">
                  Login
                </Link>
                <Link href="/signup" className="px-3 py-1.5 bg-[var(--color-atelier-brass)] text-white font-semibold rounded hover:bg-[var(--color-atelier-amber)] transition-colors shadow-xs">
                  Sign Up
                </Link>
              </div>
            )
          )}
        </div>
      </header>

      {/* Admin Sub-Nav */}
      {canAccessAdmin && isAdminRoute && (
        <div className="w-full bg-[var(--color-paper-sub)] border-t border-[var(--color-rule-subtle)] px-4 lg:px-8 overflow-x-auto custom-scrollbar">
          <nav className="flex items-center gap-1 sm:gap-2 py-2 text-[11px] font-mono whitespace-nowrap">
            <span className="text-[var(--color-ink-dim)] uppercase tracking-widest font-semibold mr-2">Admin Console:</span>
            
            <Link href="/admin" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <LayoutDashboard className="w-3.5 h-3.5" /> All Endpoints (25)
            </Link>
            <Link href="/admin/users" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/users' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Users className="w-3.5 h-3.5" /> Users
            </Link>
            <Link href="/admin/roles" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/roles' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Layers className="w-3.5 h-3.5" /> Roles
            </Link>
            <Link href="/admin/categories" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/categories' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Tag className="w-3.5 h-3.5" /> Categories
            </Link>
            <Link href="/admin/products" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/products' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Boxes className="w-3.5 h-3.5" /> Products
            </Link>
            <Link href="/admin/orders" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/orders' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <ShoppingCart className="w-3.5 h-3.5" /> Orders
            </Link>
            <Link href="/admin/payments" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/payments' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <CreditCard className="w-3.5 h-3.5" /> Payments
            </Link>
            <Link href="/admin/shipments" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/shipments' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Truck className="w-3.5 h-3.5" /> Shipments
            </Link>
            <Link href="/admin/inventory" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname.startsWith('/admin/inventory') ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Warehouse className="w-3.5 h-3.5" /> Inventory
            </Link>
            <Link href="/admin/locations" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/locations' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Globe className="w-3.5 h-3.5" /> Regions
            </Link>
            <Link href="/admin/delivery-providers" className={`px-2.5 py-1 rounded transition-all flex items-center gap-1.5 ${pathname === '/admin/delivery-providers' ? 'bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)] text-[var(--color-atelier-brass)]' : 'text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent'}`}>
              <Send className="w-3.5 h-3.5" /> Carriers
            </Link>
          </nav>
        </div>
      )}

      {/* Visual Search Modal */}
      <VisualSearchModal
        isOpen={isVisualSearchOpen}
        onClose={() => setIsVisualSearchOpen(false)}
      />
    </div>
  );
}
