"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, ClipboardCheck, CreditCard, ScrollText, LogOut, GraduationCap, BarChart3 } from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { useAuthStore } from "@synclyft/lib/store/auth";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "College Approvals", href: "/pending-colleges", icon: ClipboardCheck },
  { label: "Organizations", href: "/organizations", icon: Building2 },
  { label: "Students", href: "/students", icon: GraduationCap },
  { label: "Subscriptions", href: "/subscriptions", icon: CreditCard },
  { label: "Audit Log", href: "/audit-logs", icon: ScrollText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)" }}>
      <header
        className="sticky top-0 z-40 border-b"
        style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}
      >
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <div className="flex shrink-0 items-center gap-2">
              <Logo size={22} />
              <span className="hidden text-sm font-semibold sm:inline" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Admin Console
              </span>
            </div>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex shrink-0 items-center gap-1.5 rounded px-2.5 py-1.5 text-xs sm:text-sm"
                    style={{
                      color: active ? "var(--th-primary)" : "var(--th-text-secondary)",
                      backgroundColor: active
                        ? "color-mix(in srgb, var(--th-primary) 12%, transparent)"
                        : "transparent",
                    }}
                  >
                    <n.icon size={14} />
                    <span className="hidden sm:inline">{n.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            onClick={() => logout()}
            className="flex shrink-0 items-center gap-1.5 text-xs"
            style={{ color: "var(--th-text-faint)" }}
          >
            <LogOut size={13} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-5">{children}</main>
    </div>
  );
}
