"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef, useMemo } from "react";
import {
  Menu, X, Settings, Plus, Sparkles, ChevronRight,
  LayoutDashboard, LineChart, FileText, PlayCircle, Wrench, CreditCard,
  PanelLeftClose, PanelLeftOpen, BookOpen, Megaphone, GraduationCap,
} from "lucide-react";
import { cn, planLabel } from "@synclyft/lib/utils";
import { Button } from "@synclyft/ui/components/Button";
import { Logo } from "@synclyft/ui/components/Logo";
import { ThemeToggle } from "@synclyft/ui/components/ThemeToggle";
import { NotificationBell } from "@synclyft/ui/components/NotificationKit";
import { resolveStudentHref } from "@/lib/notificationHref";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { useCurrentSubscription, useStudyPlanList } from "@synclyft/lib/api/hooks";

type NavItem = { label: string; href: string; icon: typeof LayoutDashboard; badgeKey?: "studyPlans" };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Prepare",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Practice", href: "/practice/single-round", icon: PlayCircle },
      { label: "Study Plan", href: "/study-plan", icon: BookOpen, badgeKey: "studyPlans" },
    ],
  },
  {
    title: "Track",
    items: [
      { label: "Progress", href: "/progress", icon: LineChart },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    title: "Career",
    items: [
      { label: "Resume", href: "/resume", icon: FileText },
      { label: "Resume Tools", href: "/tools/ats-analyzer", icon: Wrench },
    ],
  },
  {
    title: "Account",
    items: [
      { label: "Subscription", href: "/subscription", icon: CreditCard },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

function initials(name?: string) {
  if (!name) return "S";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

/* ── plan / trial widget (real entitlement) ─────────────────────────────── */

function PlanWidget({ collapsed }: { collapsed: boolean }) {
  const { data } = useCurrentSubscription();
  const ent = data?.entitlement;

  const view = useMemo(() => {
    if (!ent) return null;
    if (ent.source === "individual" && ent.plan) {
      return { kind: "plan" as const, title: planLabel(ent.plan.planType), sub: "Active subscription", pct: null as number | null };
    }
    if (ent.source === "seat" && ent.seat) {
      return { kind: "seat" as const, title: "College seat", sub: ent.seat.organizationName, pct: null };
    }
    if (ent.source === "trial") {
      const b = ent.trials?.mockInterviews;
      const total = b?.total ?? 3;
      const used = b?.used ?? 0;
      return {
        kind: "trial" as const,
        title: "Free trial",
        sub: `${Math.max(total - used, 0)} of ${total} mock interviews left`,
        pct: total > 0 ? Math.min((used / total) * 100, 100) : 0,
      };
    }
    if (ent.source === "pending") return { kind: "pending" as const, title: "Payment pending", sub: "Finish checkout to unlock", pct: null };
    return { kind: "none" as const, title: "No active plan", sub: "Start a free trial", pct: null };
  }, [ent]);

  if (!view) return null;

  if (collapsed) {
    return (
      <Link
        href="/subscription"
        title={`${view.title} — ${view.sub}`}
        className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-lg"
        style={{ backgroundColor: "color-mix(in srgb, var(--th-primary) 12%, transparent)", color: "var(--th-primary)" }}
      >
        {view.kind === "seat" ? <GraduationCap size={16} /> : <Sparkles size={16} />}
      </Link>
    );
  }

  return (
    <Link
      href="/subscription"
      className="mx-3 mb-3 block rounded-xl border p-3 transition-colors hover:border-[color:var(--th-primary)]"
      style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>
          {view.kind === "seat" ? (
            <GraduationCap size={13} style={{ color: "var(--th-primary)" }} />
          ) : (
            <Sparkles size={13} style={{ color: "var(--th-primary)" }} />
          )}
          {view.title}
        </span>
        <ChevronRight size={13} style={{ color: "var(--th-text-faint)" }} />
      </div>
      <p className="mt-1 truncate text-[11px]" style={{ color: "var(--th-text-muted)" }}>{view.sub}</p>
      {view.pct !== null && (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--th-bg-secondary)" }}>
          <span className="block h-full rounded-full" style={{ width: `${100 - view.pct}%`, backgroundColor: "var(--th-primary)" }} />
        </span>
      )}
      {(view.kind === "trial" || view.kind === "none" || view.kind === "pending") && (
        <span className="mt-2 inline-block text-[11px] font-semibold" style={{ color: "var(--th-primary)" }}>
          View plans →
        </span>
      )}
    </Link>
  );
}

/* ── nav ───────────────────────────────────────────────────────────────── */

function SidebarNav({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { data: studyPlansData } = useStudyPlanList();

  const badges = useMemo(() => {
    const plans = Array.isArray(studyPlansData)
      ? (studyPlansData as { status?: string }[]).filter((p) => (p.status ?? "active") === "active").length
      : 0;
    return { studyPlans: plans };
  }, [studyPlansData]);

  return (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4 scrollbar-hide">
      {NAV_GROUPS.map((group) => (
        <div key={group.title}>
          {!collapsed && (
            <p
              className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: "var(--th-text-faint)" }}
            >
              {group.title}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.icon;
              const count = link.badgeKey ? badges[link.badgeKey] : 0;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  title={collapsed ? link.label : undefined}
                  className={cn(
                    "group relative flex items-center rounded-lg text-sm font-medium transition-all",
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
                      className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r"
                      style={{ backgroundColor: "var(--th-primary)" }}
                    />
                  )}
                  <Icon
                    size={18}
                    className={cn("shrink-0 transition-transform", !isActive && "group-hover:scale-110")}
                  />
                  {!collapsed && <span className="flex-1 whitespace-nowrap">{link.label}</span>}
                  {!collapsed && count > 0 && (
                    <span
                      className="grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold"
                      style={{
                        backgroundColor: isActive ? "var(--th-primary)" : "color-mix(in srgb, var(--th-primary) 16%, transparent)",
                        color: isActive ? "#fff" : "var(--th-primary)",
                      }}
                    >
                      {count}
                    </span>
                  )}
                  {collapsed && count > 0 && (
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--th-primary)" }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const profilePic = user?.profilePicture || user?.avatarUrl || user?.avatar;

  useEffect(() => {
    // Read the persisted preference after mount so SSR and first client paint
    // agree (both render expanded), then adjust — avoids a hydration mismatch
    // on the sidebar width.
    try {
      if (localStorage.getItem("synclyft-sidebar-collapsed") === "1") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCollapsed(true);
      }
    } catch { /* ignore */ }
  }, []);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("synclyft-sidebar-collapsed", c ? "0" : "1"); } catch { /* ignore */ }
      return !c;
    });
  };

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (profileRef.current && !profileRef.current.contains(t)) setProfileOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  const ProfileMenu = (
    <div
      className="w-56 overflow-hidden rounded-xl border p-1 shadow-2xl"
      style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
    >
      <div className="flex items-center gap-2.5 border-b px-3 py-2.5" style={{ borderColor: "var(--th-card-border)" }}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-tr from-[#0062FF] to-[#4D7CFF] text-[11px] font-bold text-white">
          {profilePic
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={profilePic} alt={user?.name || "Profile"} className="h-full w-full object-cover" />
            : initials(user?.name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>{user?.name || "Student"}</p>
          <p className="truncate text-[10px]" style={{ color: "var(--th-text-faint)" }}>{user?.email}</p>
        </div>
      </div>
      {[
        { label: "Profile & Settings", href: "/settings" },
        { label: "Billing & Plan", href: "/billing" },
        { label: "Progress & History", href: "/progress" },
        { label: "Resume History", href: "/tools/resumehistory" },
        { label: "Notifications", href: "/notifications" },
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
        <PlanWidget collapsed={collapsed} />
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

          <div className="flex items-center gap-2 lg:gap-3">
            <Link href="/interview/setup">
              <Button icon={<Plus size={14} />} size="sm" className="font-semibold">Start Interview</Button>
            </Link>
            <ThemeToggle size="sm" />
            <NotificationBell allHref="/notifications" resolveHref={resolveStudentHref} />

            <div className="relative" ref={profileRef}>
              <button onClick={() => setProfileOpen((o) => !o)} className="flex items-center rounded-full" aria-label="Account menu">
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
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full z-50 mt-2"
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
            <ThemeToggle size="sm" />
            <NotificationBell allHref="/notifications" resolveHref={resolveStudentHref} />
            <button onClick={() => setMobileOpen(true)} className="rounded-lg p-2" style={{ color: "var(--th-text-muted)" }} aria-label="Open menu">
              <Menu size={20} />
            </button>
          </div>
        </header>

        {/* Mobile drawer */}
        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="absolute inset-0 bg-black/50"
                onClick={() => setMobileOpen(false)}
              />
              <motion.div
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.22, ease: "easeOut" }}
                className="absolute left-0 top-0 flex h-full w-[82%] max-w-xs flex-col"
                style={{ backgroundColor: "var(--th-bg-secondary)" }}
              >
                <div className="flex h-14 items-center justify-between border-b px-4" style={{ borderColor: "var(--th-border)" }}>
                  <div className="flex items-center gap-2">
                    <Logo size={22} />
                    <span className="text-xs font-semibold" style={{ color: "var(--th-text-primary)" }}>Synclyft AI</span>
                  </div>
                  <button onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} style={{ color: "var(--th-text-primary)" }} /></button>
                </div>
                <SidebarNav collapsed={false} onNavigate={() => setMobileOpen(false)} />
                <PlanWidget collapsed={false} />
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
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <main className="flex-1">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
