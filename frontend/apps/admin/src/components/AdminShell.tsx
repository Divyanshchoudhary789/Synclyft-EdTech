"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Building2, LogOut } from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { useAuthStore } from "@synclyft/lib/store/auth";

const NAV = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "College Approvals", href: "/pending-colleges", icon: Building2 },
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
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
              <Logo size={24} />
              <span className="text-sm font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                Admin Console
              </span>
            </div>
            <nav className="flex items-center gap-1">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className="flex items-center gap-2 rounded px-3 py-1.5 text-sm"
                    style={{
                      color: active ? "var(--th-primary)" : "var(--th-text-secondary)",
                      backgroundColor: active
                        ? "color-mix(in srgb, var(--th-primary) 12%, transparent)"
                        : "transparent",
                    }}
                  >
                    <n.icon size={14} />
                    {n.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 text-xs"
            style={{ color: "var(--th-text-faint)" }}
          >
            <LogOut size={13} /> Sign out
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-6">{children}</main>
    </div>
  );
}
