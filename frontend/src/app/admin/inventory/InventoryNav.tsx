/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/* Hallmark · genre: editorial-modern-minimal · theme: atelier-terminal · typography: Fraunces-Geist-JetBrainsMono */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Warehouse,
  Boxes,
  MapPin,
  ArrowLeftRight,
  BookmarkCheck,
  LayoutDashboard,
} from "lucide-react";

interface InventoryNavProps {
  activeTab?: "overview" | "stock" | "locations" | "movements" | "reservations";
}

export function InventoryNav({ activeTab }: InventoryNavProps) {
  const pathname = usePathname();

  const navItems = [
    {
      label: "Overview",
      href: "/admin/inventory",
      icon: LayoutDashboard,
      active: activeTab ? activeTab === "overview" : pathname === "/admin/inventory",
    },
    {
      label: "Stock Levels",
      href: "/admin/inventory/stock",
      icon: Boxes,
      active: activeTab ? activeTab === "stock" : pathname === "/admin/inventory/stock",
    },
    {
      label: "Locations",
      href: "/admin/inventory/locations",
      icon: MapPin,
      active: activeTab ? activeTab === "locations" : pathname === "/admin/inventory/locations",
    },
    {
      label: "Movements Audit",
      href: "/admin/inventory/movements",
      icon: ArrowLeftRight,
      active: activeTab ? activeTab === "movements" : pathname === "/admin/inventory/movements",
    },
    {
      label: "Reservations",
      href: "/admin/inventory/reservations",
      icon: BookmarkCheck,
      active: activeTab ? activeTab === "reservations" : pathname === "/admin/inventory/reservations",
    },
  ];

  return (
    <div className="w-full border-b border-[var(--color-rule)] bg-[var(--color-paper-sub)]/60 backdrop-blur-sm px-4 lg:px-8">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar py-2 font-mono text-xs">
        <div className="flex items-center gap-1.5 text-[var(--color-atelier-brass)] font-semibold pr-3 border-r border-[var(--color-rule)]">
          <Warehouse className="w-4 h-4 text-[var(--color-atelier-brass)]" />
          <span className="hidden sm:inline">INVENTORY PROTOCOL</span>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded transition-all flex items-center gap-2 whitespace-nowrap ${
                item.active
                  ? "bg-[var(--color-paper-card)] border border-[var(--color-atelier-brass)]/40 text-[var(--color-atelier-brass)] font-semibold shadow-xs"
                  : "text-[var(--color-ink-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-paper-hover)] border border-transparent"
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${item.active ? "text-[var(--color-atelier-brass)]" : "text-[var(--color-ink-dim)]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
