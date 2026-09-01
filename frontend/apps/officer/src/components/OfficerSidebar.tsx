"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, BarChart3, FileText, Settings, MessageSquare, CreditCard, LogOut } from "lucide-react";
import { Logo } from "@synclyft/ui/components/Logo";
import { useAuthStore } from "@synclyft/lib/store/auth";

function LogoutButton() {
  const logout = useAuthStore((s) => s.logout);
  return (
    <button
      onClick={() => logout()}
      className="flex items-center gap-2 text-xs transition-colors"
      style={{ color: "var(--th-text-faint)" }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--th-text-primary)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--th-text-faint)"; }}
    >
      <LogOut size={13} /> Sign out
    </button>
  );
}

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Students", href: "/dashboard/students", icon: Users },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Reports", href: "/dashboard/reports", icon: FileText },
  { label: "Query AI", href: "/dashboard/query", icon: MessageSquare },
  { label: "Billing", href: "/dashboard/billing", icon: CreditCard },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export function OfficerSidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="sticky top-0 flex h-screen min-h-screen w-56 shrink-0 flex-col overflow-y-auto border-r"
      style={{
        backgroundColor: "var(--th-bg-secondary)",
        borderColor: "var(--th-border)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 border-b px-5 py-4"
        style={{ borderColor: "var(--th-border)" }}
      >
        <Logo size={28} />

        <div>
          <div
            className="text-xs font-semibold"
            style={{
              fontFamily: "var(--font-inter-tight), sans-serif",
              color: "var(--th-text-primary)",
            }}
          >
            SyncLyft
          </div>

          <div
            className="text-[0.6rem] font-mono uppercase tracking-wider"
            style={{ color: "var(--th-text-faint)" }}
          >
            Officer Portal
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded px-3 py-2 text-sm transition-all"
              style={{
                backgroundColor: isActive
                  ? "color-mix(in srgb, var(--th-primary) 12%, transparent)"
                  : "transparent",
                color: isActive
                  ? "var(--th-primary)"
                  : "var(--th-text-secondary)",
                border: isActive
                  ? "1px solid color-mix(in srgb, var(--th-primary) 20%, transparent)"
                  : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "var(--th-hover-bg)";
                  e.currentTarget.style.color = "var(--th-text-primary)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--th-text-secondary)";
                }
              }}
            >
              <item.icon size={15} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="border-t px-4 py-4"
        style={{ borderColor: "var(--th-border)" }}
      >
        <LogoutButton />
      </div>
    </aside>
  );
}
