"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BarChart3, FileText, Settings, MessageSquare, CreditCard,
  LogOut, Layers, Megaphone, Armchair, Menu, X, Sparkles,
} from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { useAuthStore } from "@synclyft/lib/store/auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/dashboard/students", icon: Users },
  { label: "Batches", href: "/dashboard/batches", icon: Layers },
  { label: "Campaigns", href: "/dashboard/campaigns", icon: Megaphone },
  { label: "Seats", href: "/dashboard/seats", icon: Armchair },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Insights", href: "/dashboard/insights", icon: Sparkles },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Ask AI", href: "/dashboard/query", icon: MessageSquare },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex items-center gap-3 rounded px-3 py-2 text-sm transition-all"
              style={{
                backgroundColor: isActive ? "color-mix(in srgb, var(--th-primary) 12%, transparent)" : "transparent",
                color: isActive ? "var(--th-primary)" : "var(--th-text-secondary)",
                border: isActive ? "1px solid color-mix(in srgb, var(--th-primary) 20%, transparent)" : "1px solid transparent",
              }}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t px-4 py-4" style={{ borderColor: "var(--th-border)" }}>
        <button
          onClick={() => logout()}
          className="flex items-center gap-2 text-xs transition-colors"
          style={{ color: "var(--th-text-faint)" }}
        >
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2.5 border-b px-5 py-4" style={{ borderColor: "var(--th-border)" }}>
      <Logo size={26} />
      <div>
        <div className="text-xs font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
          SyncLyft
        </div>
        <div className="text-[0.6rem] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
          Officer Portal
        </div>
      </div>
    </div>
  );
}

export function OfficerSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside
        className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-hidden border-r md:flex"
        style={{ backgroundColor: "var(--th-bg-secondary)", borderColor: "var(--th-border)" }}
      >
        <Brand />
        <NavList />
      </aside>

      {/* Mobile top bar */}
      <div
        className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden"
        style={{ backgroundColor: "var(--th-bg-secondary)", borderColor: "var(--th-border)" }}
      >
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Officer Portal</span>
        </div>
        <button onClick={() => setOpen(true)} aria-label="Open menu">
          <Menu size={20} style={{ color: "var(--th-text-primary)" }} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 top-0 flex h-full w-64 flex-col"
            style={{ backgroundColor: "var(--th-bg-secondary)" }}
          >
            <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--th-border)" }}>
              <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Close menu">
                <X size={18} style={{ color: "var(--th-text-primary)" }} />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
