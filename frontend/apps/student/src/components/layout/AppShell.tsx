"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Menu, X, Bell, Info, CheckCircle2, AlertTriangle, Trash2, Settings, Plus,
  LayoutDashboard, LineChart, FileText, PlayCircle, Wrench, CreditCard,
  PanelLeftClose, PanelLeftOpen, BookOpen, Megaphone,
} from "lucide-react";
import { cn } from "@synclyft/lib/utils";
import { Button } from "@synclyft/ui/components/Button";
import { Logo } from "@synclyft/ui/components/Logo";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { notificationService } from "@synclyft/lib/api/services";

const NAV_LINKS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Progress", href: "/progress", icon: LineChart },
  { label: "Study Plan", href: "/study-plan", icon: BookOpen },
  { label: "Campaigns", href: "/campaigns", icon: Megaphone },
  { label: "Resume", href: "/resume", icon: FileText },
  { label: "Practice", href: "/practice/single-round", icon: PlayCircle },
  { label: "Tools", href: "/tools/ats-analyzer", icon: Wrench },
  { label: "Billing", href: "/billing", icon: CreditCard },
];

type NavNotif = { id: string; type: string; message: string; timestamp: string; read: boolean };

function initials(name?: string) {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

function relTime(iso: string) {
  const d = new Date(iso).getTime();
  if (!d) return "";
  const s = Math.round((Date.now() - d) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function normalizeNotif(raw: Record<string, unknown>): NavNotif {
  const t = String(raw.type ?? "");
  const kind =
    /reject|expired|alert|declining|disqualif/i.test(t) || raw.priority === "high"
      ? "warning"
      : /approved|completed|available|unlocked|allocated|paid/i.test(t)
        ? "success"
        : "info";
  return {
    id: String(raw._id ?? raw.id ?? ""),
    type: kind,
    message: String(raw.title ? `${raw.title}: ${raw.message ?? ""}` : raw.message ?? ""),
    timestamp: relTime(String(raw.createdAt ?? raw.timestamp ?? "")),
    read: (raw.status ?? "") === "read" || raw.read === true,
  };
}

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = [...NAV_LINKS, { label: "Settings", href: "/settings", icon: Settings }];
  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-hide">
      {items.map((link) => {
        const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            title={collapsed ? link.label : undefined}
            className={cn(
              "relative flex items-center rounded-lg text-sm font-medium transition-colors",
              collapsed ? "h-10 w-10 justify-center" : "gap-3 px-3 py-2.5",
            )}
            style={{
              color: isActive ? "var(--th-primary)" : "var(--th-text-secondary)",
              backgroundColor: isActive
                ? "color-mix(in srgb, var(--th-primary) 12%, transparent)"
                : "transparent",
            }}
          >
            {isActive && !collapsed && (
              <span
                className="absolute left-0 top-2 bottom-2 w-1 rounded-r"
                style={{ backgroundColor: "var(--th-primary)" }}
              />
            )}
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="whitespace-nowrap">{link.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NavNotif[]>([]);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const profilePic = user?.profilePicture || user?.avatarUrl || user?.avatar;
  const hasUnread = notifications.some((n) => !n.read);

  // Persist the collapsed preference.
  useEffect(() => {
    try {
      const saved = localStorage.getItem("synclyft-sidebar-collapsed");
      if (saved === "1") setCollapsed(true);
    } catch { /* ignore */ }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("synclyft-sidebar-collapsed", c ? "0" : "1"); } catch { /* ignore */ }
      return !c;
    });
  };

  const loadNotifications = async () => {
    try {
      const res = await notificationService.list({ limit: 15 });
      setNotifications(res.items.map((n) => normalizeNotif(n as unknown as Record<string, unknown>)));
    } catch { /* navbar bell is non-critical */ }
  };

  useEffect(() => { loadNotifications(); }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t)) setNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    notificationService.markAllRead().catch(() => {});
  };
  const toggleRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    notificationService.markRead(id).catch(() => {});
  };
  const removeNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    notificationService.remove(id).catch(() => {});
  };

  const NotifPanel = (
    <div
      className="max-h-[22rem] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border shadow-2xl"
      style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
    >
      <div className="flex items-center justify-between border-b px-4 py-3" style={{ borderColor: "var(--th-card-border)" }}>
        <span className="text-xs font-bold" style={{ color: "var(--th-text-primary)" }}>Notifications</span>
        {hasUnread && (
          <button onClick={markAllRead} className="text-[10px] font-semibold hover:underline" style={{ color: "var(--th-primary)" }}>
            Mark all read
          </button>
        )}
      </div>
      <div className="max-h-64 divide-y overflow-y-auto" style={{ borderColor: "var(--th-card-border)" }}>
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>You&apos;re all caught up.</p>
        ) : (
          notifications.map((n) => {
            const Icon = n.type === "success" ? CheckCircle2 : n.type === "warning" ? AlertTriangle : Info;
            const color = n.type === "success" ? "#3DDC84" : n.type === "warning" ? "#FF5C5C" : "var(--th-primary)";
            return (
              <div
                key={n.id}
                onClick={() => toggleRead(n.id)}
                className="flex cursor-pointer items-start gap-2.5 p-3 transition-colors"
                style={{ backgroundColor: n.read ? "transparent" : "color-mix(in srgb, var(--th-primary) 6%, transparent)" }}
              >
                <Icon size={14} className="mt-0.5 shrink-0" style={{ color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-snug" style={{ color: n.read ? "var(--th-text-secondary)" : "var(--th-text-primary)" }}>
                    {n.message}
                  </p>
                  <span className="text-[9px]" style={{ color: "var(--th-text-faint)" }}>{n.timestamp}</span>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeNotif(n.id); }}
                  className="shrink-0 rounded p-1 opacity-60 transition-opacity hover:opacity-100"
                  style={{ color: "var(--th-text-faint)" }}
                  aria-label="Dismiss"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            );
          })
        )}
      </div>
      <Link
        href="/notifications"
        onClick={() => setNotifOpen(false)}
        className="block border-t py-2.5 text-center text-[11px] font-semibold hover:underline"
        style={{ borderColor: "var(--th-card-border)", color: "var(--th-primary)" }}
      >
        View all notifications
      </Link>
    </div>
  );

  const ProfileMenu = (
    <div
      className="w-52 overflow-hidden rounded-xl border p-1 shadow-2xl"
      style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
    >
      <div className="border-b px-3 py-2.5" style={{ borderColor: "var(--th-card-border)" }}>
        <p className="truncate text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>{user?.name || "Student"}</p>
        <p className="truncate text-[10px]" style={{ color: "var(--th-text-faint)" }}>{user?.email}</p>
      </div>
      {[
        { label: "Profile & Settings", href: "/settings" },
        { label: "Billing & Plans", href: "/billing" },
        { label: "Progress & History", href: "/progress" },
        { label: "Resume History", href: "/tools/resumehistory" },
      ].map((i) => (
        <Link
          key={i.href}
          href={i.href}
          onClick={() => setProfileOpen(false)}
          className="block rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[color:var(--th-hover-bg)]"
          style={{ color: "var(--th-text-secondary)" }}
        >
          {i.label}
        </Link>
      ))}
      <button
        onClick={() => { setProfileOpen(false); logout(); }}
        className="mt-1 block w-full rounded-lg border-t px-3 py-2 text-left text-xs font-semibold text-red-500 transition-colors hover:bg-red-500/10"
        style={{ borderColor: "var(--th-card-border)" }}
      >
        Sign out
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)" }}>
      {/* ── Desktop sidebar ── */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
        style={{ backgroundColor: "var(--th-bg-secondary)", borderColor: "var(--th-border)" }}
      >
        <Link
          href="/dashboard"
          className={cn("flex h-16 items-center border-b", collapsed ? "justify-center px-2" : "gap-2.5 px-5")}
          style={{ borderColor: "var(--th-border)" }}
        >
          <Logo size={26} className="shrink-0" />
          {!collapsed && (
            <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              Synclyft AI
            </span>
          )}
        </Link>
        <SidebarNav collapsed={collapsed} />
      </aside>

      {/* ── Content column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Desktop header */}
        <header
          className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b px-4 backdrop-blur md:flex lg:px-6"
          style={{ backgroundColor: "var(--th-nav-bg)", borderColor: "var(--th-nav-border)" }}
        >
          <button
            onClick={toggleCollapsed}
            className="rounded-lg border p-1.5 transition-colors hover:bg-[color:var(--th-hover-bg)]"
            style={{ color: "var(--th-text-muted)", borderColor: "var(--th-nav-border)" }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>

          <div className="flex items-center gap-3">
            <Link href="/interview/setup">
              <Button icon={<Plus size={14} />} size="sm" className="font-semibold">Start Interview</Button>
            </Link>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) loadNotifications(); }}
                className="relative rounded-lg border p-2 transition-colors hover:bg-[color:var(--th-hover-bg)]"
                style={{ color: "var(--th-text-muted)", borderColor: "var(--th-nav-border)" }}
                title="Notifications"
              >
                <Bell size={16} />
                {hasUnread && (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--th-primary)" }} />
                )}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-full mt-2 z-50"
                  >
                    {NotifPanel}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center rounded-full">
                <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#0062FF] to-[#4D7CFF] text-xs font-bold text-white">
                  {profilePic
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={profilePic} alt={user?.name || "Profile"} className="h-full w-full object-cover" />
                    : initials(user?.name)}
                </span>
              </button>
              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 top-full mt-2 z-50"
                  >
                    {ProfileMenu}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Mobile header */}
        <header
          className="sticky top-0 z-30 flex h-14 items-center justify-between border-b px-4 backdrop-blur md:hidden"
          style={{ backgroundColor: "var(--th-nav-bg)", borderColor: "var(--th-nav-border)" }}
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={24} />
            <span className="text-sm font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              Synclyft AI
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) loadNotifications(); }}
                className="relative rounded-lg p-2"
                style={{ color: "var(--th-text-muted)" }}
                aria-label="Notifications"
              >
                <Bell size={17} />
                {hasUnread && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "var(--th-primary)" }} />}
              </button>
              {notifOpen && <div className="absolute right-0 top-full mt-2 z-50">{NotifPanel}</div>}
            </div>
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2" style={{ color: "var(--th-text-muted)" }} aria-label="Menu">
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
            <div className="absolute left-0 top-0 flex h-full w-72 flex-col" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
              <div className="flex h-14 items-center justify-between border-b px-4" style={{ borderColor: "var(--th-border)" }}>
                <div className="flex items-center gap-2">
                  <Logo size={22} />
                  <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Synclyft AI</span>
                </div>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} style={{ color: "var(--th-text-primary)" }} /></button>
              </div>
              <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
              <div className="border-t p-4" style={{ borderColor: "var(--th-border)" }}>
                <Link href="/interview/setup" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full justify-center" icon={<Plus size={14} />}>Start Interview</Button>
                </Link>
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="mt-3 w-full rounded-lg px-3 py-2 text-left text-xs font-semibold text-red-500 hover:bg-red-500/10"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
