"use client";

/**
 * Shared notification UI for every SyncLyft dashboard (student / officer / admin).
 *
 *  - <NotificationBell />        topbar bell + dropdown preview
 *  - <NotificationsInbox />      full-page inbox with tabs, day grouping and row actions
 *
 * Both are self-contained: they read from `useNotifications` / `useNotificationActions`
 * (real API, 60s polling) — no props required beyond routing hints.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle, Archive, ArchiveRestore, Armchair, ArrowRight, Bell,
  BriefcaseBusiness, CalendarClock, CheckCheck, CheckCircle2, ClipboardList,
  Clock, CreditCard, FileText, Inbox, Megaphone, Settings, ShieldCheck,
  ShieldX, Sparkles, TrendingDown, Trash2, Trophy, UserCog, Users, Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@synclyft/lib/utils";
import type { AppNotification } from "@synclyft/lib/api/models";
import { useNotifications, useNotificationActions } from "@synclyft/lib/api/hooks";
import { Button } from "./Button";
import { SkeletonBlock } from "./SkeletonBlock";

/* ─────────────────────────  type → icon / tone  ───────────────────────── */

type Tone = "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, { fg: string; bg: string }> = {
  success: { fg: "#15a34a", bg: "rgba(21,163,74,0.13)" },
  warning: { fg: "#d97706", bg: "rgba(217,119,6,0.15)" },
  danger: { fg: "#e11d48", bg: "rgba(225,29,72,0.13)" },
  info: { fg: "var(--th-primary)", bg: "color-mix(in srgb, var(--th-primary) 13%, transparent)" },
};

const TYPE_META: Record<string, { icon: LucideIcon; tone: Tone }> = {
  interview_scheduled: { icon: CalendarClock, tone: "info" },
  interview_completed: { icon: CheckCircle2, tone: "success" },
  result_available: { icon: FileText, tone: "success" },
  subscription_expiring: { icon: CreditCard, tone: "warning" },
  subscription_expired: { icon: CreditCard, tone: "danger" },
  payment_due: { icon: CreditCard, tone: "warning" },
  payment_reminder: { icon: CreditCard, tone: "warning" },
  seat_allocated: { icon: Armchair, tone: "success" },
  seat_released: { icon: Armchair, tone: "warning" },
  profile_update: { icon: UserCog, tone: "info" },
  system_alert: { icon: AlertTriangle, tone: "warning" },
  achievement_unlocked: { icon: Trophy, tone: "success" },
  campaign_opened: { icon: Megaphone, tone: "info" },
  offer_available: { icon: BriefcaseBusiness, tone: "success" },
  deadline_approaching: { icon: Clock, tone: "warning" },
  deadline_reminder: { icon: Clock, tone: "warning" },
  account_approved: { icon: ShieldCheck, tone: "success" },
  account_rejected: { icon: ShieldX, tone: "danger" },
  assessment_assigned: { icon: ClipboardList, tone: "info" },
  performance_alert: { icon: TrendingDown, tone: "warning" },
  placement_drive_announcement: { icon: Megaphone, tone: "info" },
  follow_up_pending: { icon: Clock, tone: "warning" },
  recommendation_assigned: { icon: Sparkles, tone: "info" },
  recommendation_created: { icon: Sparkles, tone: "info" },
  batch_readiness_alert: { icon: Users, tone: "warning" },
  declining_student_alert: { icon: TrendingDown, tone: "danger" },
};

function metaFor(n: AppNotification): { icon: LucideIcon; tone: Tone } {
  const base = TYPE_META[n.type ?? ""] ?? { icon: Bell, tone: "info" as Tone };
  if ((n.priority === "high" || n.priority === "urgent") && base.tone === "info") {
    return { icon: base.icon, tone: "warning" };
  }
  return base;
}

/* ─────────────────────────────  time helpers  ─────────────────────────── */

function relTime(iso: string) {
  const t = new Date(iso).getTime();
  if (!t || Number.isNaN(t)) return "";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function fullTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function dayBucket(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Older";
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(new Date()) - startOf(d)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Earlier this week";
  if (days < 30) return "Earlier this month";
  return "Older";
}

const BUCKET_ORDER = ["Today", "Yesterday", "Earlier this week", "Earlier this month", "Older"];

/* ─────────────────────────────  shared bits  ─────────────────────────── */

function EmptyState({ compact, label }: { compact?: boolean; label?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-1.5 px-6 py-10" : "gap-2 px-6 py-16")}>
      <span
        className="grid place-items-center rounded-full"
        style={{
          width: compact ? 40 : 52, height: compact ? 40 : 52,
          background: "color-mix(in srgb, var(--th-primary) 10%, transparent)", color: "var(--th-primary)",
        }}
      >
        <Inbox size={compact ? 18 : 22} />
      </span>
      <p className={cn("font-semibold", compact ? "text-xs" : "text-sm")} style={{ color: "var(--th-text-secondary)" }}>
        {label ?? "You're all caught up"}
      </p>
      {!compact && (
        <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>
          New alerts about interviews, results and your account will show up here.
        </p>
      )}
    </div>
  );
}

type RowActions = {
  onRead?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
  onDelete?: () => void;
  onNavigate?: () => void;
};

function NotifRow({
  n, compact, href, onRead, onArchive, onRestore, onDelete, onNavigate,
}: { n: AppNotification; compact?: boolean; href?: string } & RowActions) {
  const { icon: Icon, tone } = metaFor(n);
  const c = TONE[tone];
  const unread = n.status === "unread";
  const urgent = n.priority === "urgent";
  const high = n.priority === "high";

  const iconChip = (
    <span
      className="relative mt-0.5 grid shrink-0 place-items-center rounded-full"
      style={{ width: compact ? 30 : 38, height: compact ? 30 : 38, background: c.bg, color: c.fg }}
    >
      <Icon size={compact ? 15 : 18} />
    </span>
  );

  const textBlock = (
    <span className="min-w-0 flex-1">
      {n.title && (
        <span className={cn("block truncate font-semibold", compact ? "text-[13px]" : "text-sm")} style={{ color: "var(--th-text-primary)" }}>
          {n.title}
        </span>
      )}
      <span
        className={cn("block", compact ? "line-clamp-2 text-xs" : "text-[13px] leading-relaxed")}
        style={{ color: "var(--th-text-secondary)" }}
      >
        {n.message}
      </span>
      {!compact && n.description && (
        <span className="mt-0.5 block text-xs" style={{ color: "var(--th-text-faint)" }}>{n.description}</span>
      )}
      <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="text-[11px] tabular-nums" style={{ color: "var(--th-text-faint)" }} title={fullTime(n.createdAt)}>
          {relTime(n.createdAt)}
        </span>
        {(urgent || high) && (
          <span
            className="rounded-full px-1.5 py-px text-[9px] font-bold uppercase tracking-wide"
            style={{ background: TONE.danger.bg, color: TONE.danger.fg }}
          >
            {urgent ? "Urgent" : "Priority"}
          </span>
        )}
        {href && (
          <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: "var(--th-primary)" }}>
            {n.actionText ?? "View"} <ArrowRight size={11} />
          </span>
        )}
      </span>
    </span>
  );

  const bodyCls = cn(
    "flex flex-1 items-start gap-3 text-left outline-none transition-colors",
    compact ? "px-3.5 py-3" : "px-4 py-4 sm:px-5",
  );
  const rowStyle = {
    background: unread ? "color-mix(in srgb, var(--th-primary) 5%, transparent)" : "transparent",
  } as const;

  const body = href ? (
    <Link href={href} onClick={() => { onRead?.(); onNavigate?.(); }} className={bodyCls}>
      {iconChip}
      {textBlock}
    </Link>
  ) : (
    <button
      type="button"
      onClick={() => onRead?.()}
      className={cn(bodyCls, "hover:bg-[color:var(--th-hover-bg)]")}
    >
      {iconChip}
      {textBlock}
    </button>
  );

  return (
    <div
      className="group relative flex items-stretch border-b last:border-b-0"
      style={{ borderColor: "var(--th-border)", ...rowStyle }}
    >
      {unread && (
        <span className="absolute left-0 top-0 h-full w-[3px]" style={{ background: "var(--th-primary)" }} />
      )}
      {body}
      <div
        className={cn(
          "flex shrink-0 items-center gap-0.5 pr-2 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100",
          compact ? "pr-1.5" : "pr-2.5",
        )}
      >
        {unread && onRead && (
          <IconBtn label="Mark read" onClick={onRead}><Check size={14} /></IconBtn>
        )}
        {onRestore && n.status === "archived" && (
          <IconBtn label="Restore" onClick={onRestore}><ArchiveRestore size={14} /></IconBtn>
        )}
        {onArchive && n.status !== "archived" && (
          <IconBtn label="Archive" onClick={onArchive}><Archive size={14} /></IconBtn>
        )}
        {onDelete && (
          <IconBtn label="Delete" danger onClick={onDelete}><Trash2 size={14} /></IconBtn>
        )}
      </div>
    </div>
  );
}

function IconBtn({
  children, label, danger, onClick,
}: { children: React.ReactNode; label: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      className="grid h-7 w-7 place-items-center rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10"
      style={{ color: danger ? "#e11d48" : "var(--th-text-muted)" }}
    >
      {children}
    </button>
  );
}

/* ────────────────────────────  <NotificationBell>  ──────────────────────── */

export function NotificationBell({
  allHref,
  resolveHref,
  panelAlign = "right",
}: {
  allHref: string;
  resolveHref?: (url?: string) => string | undefined;
  panelAlign?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useNotifications();
  const actions = useNotificationActions();

  const active = (data?.items ?? []).filter((n) => n.status !== "archived");
  const unread = active.filter((n) => n.status === "unread").length;
  const preview = active.slice(0, 7);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative grid h-9 w-9 place-items-center rounded-lg border transition-colors hover:bg-[color:var(--th-hover-bg)]"
        style={{ color: "var(--th-text-muted)", borderColor: "var(--th-nav-border)" }}
      >
        <motion.span
          key={unread}
          animate={unread ? { rotate: [0, -12, 10, -6, 0] } : { rotate: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Bell size={16} />
        </motion.span>
        <AnimatePresence>
          {unread > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -right-1.5 -top-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full px-1 text-[9px] font-bold text-white"
              style={{ background: "#e11d48", boxShadow: "0 0 0 2px var(--th-nav-bg)" }}
            >
              {unread > 9 ? "9+" : unread}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            role="dialog"
            aria-label="Notifications"
            className={cn(
              // Mobile: pinned to the viewport edges so it can never cause horizontal scroll.
              // >= sm: a normal dropdown anchored to the bell.
              "fixed inset-x-2 top-[3.75rem] z-50 overflow-hidden rounded-xl border shadow-2xl",
              "sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-[22rem]",
              panelAlign === "right" ? "sm:right-0" : "sm:left-0",
            )}
            style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}
          >
            <div className="flex items-center justify-between gap-2 border-b px-4 py-3" style={{ borderColor: "var(--th-card-border)" }}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Notifications</span>
                {unread > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: "color-mix(in srgb, var(--th-primary) 14%, transparent)", color: "var(--th-primary)" }}
                  >
                    {unread} new
                  </span>
                )}
              </div>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={() => actions.markAllRead.mutate()}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold transition-colors hover:underline"
                  style={{ color: "var(--th-primary)" }}
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
            </div>

            <div className="max-h-[24rem] overflow-y-auto overscroll-contain">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {[0, 1, 2, 3].map((i) => <SkeletonBlock key={i} height="h-14" />)}
                </div>
              ) : preview.length === 0 ? (
                <EmptyState compact />
              ) : (
                <ul>
                  <AnimatePresence initial={false}>
                    {preview.map((n) => (
                      <motion.li
                        key={n._id}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <NotifRow
                          n={n}
                          compact
                          href={resolveHref ? resolveHref(n.actionUrl) : n.actionUrl}
                          onRead={() => n.status === "unread" && actions.markRead.mutate(n._id)}
                          onDelete={() => actions.remove.mutate(n._id)}
                          onNavigate={() => setOpen(false)}
                        />
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            <Link
              href={allHref}
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 border-t py-2.5 text-[11px] font-semibold transition-colors hover:bg-[color:var(--th-hover-bg)]"
              style={{ borderColor: "var(--th-card-border)", color: "var(--th-primary)" }}
            >
              View all notifications <ArrowRight size={12} />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ────────────────────────────  <NotificationsInbox>  ───────────────────── */

type InboxTab = "all" | "unread" | "archived";

export function NotificationsInbox({
  className,
  settingsHref,
  resolveHref,
}: {
  className?: string;
  settingsHref?: string;
  resolveHref?: (url?: string) => string | undefined;
}) {
  const { data, isLoading, isError, refetch, isFetching } = useNotifications();
  const actions = useNotificationActions();
  const [tab, setTab] = useState<InboxTab>("all");

  const items = data?.items ?? [];
  const counts = {
    all: items.filter((n) => n.status !== "archived").length,
    unread: items.filter((n) => n.status === "unread").length,
    archived: items.filter((n) => n.status === "archived").length,
  };

  const groups = useMemo(() => {
    const filtered = items.filter((n) =>
      tab === "all" ? n.status !== "archived"
        : tab === "unread" ? n.status === "unread"
          : n.status === "archived",
    );
    const map = new Map<string, AppNotification[]>();
    for (const n of filtered) {
      const k = dayBucket(n.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(n);
    }
    return BUCKET_ORDER.filter((b) => map.has(b)).map((b) => [b, map.get(b)!] as const);
  }, [items, tab]);

  return (
    <div className={cn("mx-auto w-full max-w-3xl space-y-5", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em]" style={{ color: "var(--th-text-faint)" }}>Inbox</p>
          <h1
            className="text-2xl font-bold tracking-tight sm:text-[1.9rem]"
            style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}
          >
            Notifications
          </h1>
          <p className="mt-0.5 text-sm" style={{ color: "var(--th-text-faint)" }}>
            {counts.unread > 0
              ? `${counts.unread} unread notification${counts.unread > 1 ? "s" : ""}`
              : "You're all caught up"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {counts.unread > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => actions.markAllRead.mutate()}
              loading={actions.markAllRead.isPending}
            >
              <CheckCheck size={14} /> Mark all read
            </Button>
          )}
          {settingsHref && (
            <Link href={settingsHref}>
              <Button variant="ghost" size="sm"><Settings size={14} /> Preferences</Button>
            </Link>
          )}
        </div>
      </div>

      {/* tabs */}
      <div
        className="flex gap-1 rounded-xl border p-1"
        style={{ borderColor: "var(--th-card-border)", background: "var(--th-card-bg)" }}
      >
        {(["all", "unread", "archived"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className="relative flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition-colors"
            style={{ color: tab === t ? "var(--th-primary)" : "var(--th-text-muted)" }}
          >
            {tab === t && (
              <motion.span
                layoutId="notif-inbox-tab"
                className="absolute inset-0 rounded-lg"
                style={{ background: "color-mix(in srgb, var(--th-primary) 12%, transparent)" }}
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative">
              {t}
              {counts[t] > 0 && <span className="ml-1 opacity-60">{counts[t]}</span>}
            </span>
          </button>
        ))}
      </div>

      {/* body */}
      <div
        className="overflow-hidden rounded-2xl border"
        style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}
      >
        {isError ? (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <AlertTriangle size={22} className="text-amber-500" />
            <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>Couldn&apos;t load your notifications.</p>
            <Button variant="secondary" size="sm" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : isLoading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => <SkeletonBlock key={i} height="h-16" />)}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            label={
              tab === "unread" ? "No unread notifications"
                : tab === "archived" ? "Nothing archived"
                  : "You're all caught up"
            }
          />
        ) : (
          <div>
            {groups.map(([bucket, rows]) => (
              <div key={bucket}>
                <div
                  className="border-b px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] sm:px-5"
                  style={{
                    color: "var(--th-text-faint)",
                    borderColor: "var(--th-border)",
                    background: "color-mix(in srgb, var(--th-text-primary) 3%, transparent)",
                  }}
                >
                  {bucket}
                </div>
                <AnimatePresence initial={false}>
                  {rows.map((n) => (
                    <motion.div
                      key={n._id}
                      layout
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.16 }}
                    >
                      <NotifRow
                        n={n}
                        href={resolveHref ? resolveHref(n.actionUrl) : n.actionUrl}
                        onRead={() => actions.markRead.mutate(n._id)}
                        onArchive={() => actions.archive.mutate(n._id)}
                        onRestore={() => actions.restore.mutate(n._id)}
                        onDelete={() => actions.remove.mutate(n._id)}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </div>

      {isFetching && !isLoading && (
        <p className="text-center text-[11px]" style={{ color: "var(--th-text-faint)" }}>Syncing…</p>
      )}
    </div>
  );
}
