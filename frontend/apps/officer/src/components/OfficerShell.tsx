"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Users, BarChart3, FileText, Settings, MessageSquare, CreditCard,
  LogOut, Layers, Megaphone, Armchair, Menu, X, Sparkles,
} from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { ThemeToggle } from "@synclyft/ui/components/ThemeToggle";
import { NotificationBell } from "@synclyft/ui/components/NotificationKit";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { cn } from "@synclyft/lib/utils";
import { resolveOfficerHref } from "@/lib/notificationHref";

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

function initials(name?: string) {
  if (!name) return "O";
  const p = name.trim().split(/\s+/);
  return (p.length >= 2 ? p[0][0] + p[p.length - 1][0] : name.slice(0, 2)).toUpperCase();
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  return (
    <>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
        <button onClick={() => logout()} className="flex items-center gap-2 text-xs transition-colors" style={{ color: "var(--th-text-faint)" }}>
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
        <div className="text-xs font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>SyncLyft</div>
        <div className="text-[0.6rem] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>Officer Portal</div>
      </div>
    </div>
  );
}

export function OfficerShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col overflow-hidden border-r md:flex"
        style={{ backgroundColor: "var(--th-bg-secondary)", borderColor: "var(--th-border)" }}>
        <Brand />
        <NavList />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur"
          style={{ backgroundColor: "var(--th-nav-bg)", borderColor: "var(--th-nav-border)" }}>
          <div className="flex items-center gap-2">
            <button onClick={() => setDrawerOpen(true)} className="rounded-lg p-2 md:hidden" style={{ color: "var(--th-text-muted)" }} aria-label="Open menu">
              <Menu size={20} />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
              <Logo size={22} />
              <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Officer Portal</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle size="sm" />
            <NotificationBell allHref="/dashboard/notifications" resolveHref={resolveOfficerHref} />

            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center rounded-full" aria-label="Account menu">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-[#0062FF] to-[#4D7CFF] text-[11px] font-bold text-white">
                  {initials(user?.name)}
                </span>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 z-50 w-52 overflow-hidden rounded-xl border p-1 shadow-2xl"
                  style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                  <div className="border-b px-3 py-2.5" style={{ borderColor: "var(--th-card-border)" }}>
                    <p className="truncate text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>{user?.name || "Officer"}</p>
                    <p className="truncate text-[10px]" style={{ color: "var(--th-text-faint)" }}>{user?.email}</p>
                  </div>
                  {[
                    { label: "Organization settings", href: "/dashboard/settings" },
                    { label: "Billing & plans", href: "/dashboard/billing" },
                    { label: "Notifications", href: "/dashboard/notifications" },
                  ].map((i) => (
                    <Link key={i.href} href={i.href} onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[color:var(--th-hover-bg)]" style={{ color: "var(--th-text-secondary)" }}>
                      {i.label}
                    </Link>
                  ))}
                  <button onClick={() => { setProfileOpen(false); logout(); }}
                    className="mt-1 block w-full rounded-lg border-t px-3 py-2 text-left text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
                    style={{ borderColor: "var(--th-card-border)" }}>
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-64 flex-col" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
              <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--th-border)" }}>
                <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Menu</span>
                <button onClick={() => setDrawerOpen(false)} aria-label="Close menu"><X size={18} style={{ color: "var(--th-text-primary)" }} /></button>
              </div>
              <NavList onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
