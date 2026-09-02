"use client";

import Link from "next/link";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { useNotifications, useNotificationActions } from "@synclyft/lib/api/hooks";
import { Bell, Check, Archive, Trash2, AlertCircle, ExternalLink } from "lucide-react";

const DOT: Record<string, string> = { high: "bg-rose-500", medium: "bg-amber-500", low: "bg-blue-500" };

export default function NotificationsPage() {
  const { data, isLoading, isError, refetch } = useNotifications();
  const { markRead, markAllRead, archive, remove } = useNotificationActions();

  const items = data?.items ?? [];
  const unread = items.filter((n) => n.status === "unread").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Inbox</p>
            <h1 className="text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
              Notifications
            </h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>
              {unread > 0 ? `${unread} unread` : "You're all caught up"}
            </p>
          </div>
          <div className="flex gap-2">
            {unread > 0 && (
              <Button variant="secondary" onClick={() => markAllRead.mutate()} loading={markAllRead.isPending}>
                <Check size={13} /> Mark all read
              </Button>
            )}
            <Link href="/settings"><Button variant="ghost">Preferences</Button></Link>
          </div>
        </div>

        {isError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border p-4 text-sm"
            style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
            <span className="flex items-center gap-2"><AlertCircle size={16} className="text-amber-500" /> Couldn&apos;t load notifications.</span>
            <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
          </div>
        )}

        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          {isLoading ? (
            <div className="p-6 space-y-3"><SkeletonBlock height="h-12" /><SkeletonBlock height="h-12" /><SkeletonBlock height="h-12" /></div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={24} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
              <p className="text-sm" style={{ color: "var(--th-text-muted)" }}>No notifications yet.</p>
            </div>
          ) : (
            items.map((n) => (
              <div key={n._id} className="flex items-start gap-3 px-5 py-4 border-b last:border-0"
                style={{ borderColor: "var(--th-border)", backgroundColor: n.status === "unread" ? "color-mix(in srgb, var(--th-primary) 4%, transparent)" : "transparent" }}>
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[n.priority ?? "low"]}`} />
                <div className="flex-1 min-w-0">
                  {n.title && <p className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{n.title}</p>}
                  <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>{n.message}</p>
                  <div className="mt-1 flex items-center gap-3">
                    <span className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                      {new Date(n.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {n.actionUrl && (
                      <Link href={n.actionUrl} className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-0.5">
                        {n.actionText ?? "View"} <ExternalLink size={10} />
                      </Link>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1">
                  {n.status === "unread" && (
                    <button onClick={() => markRead.mutate(n._id)} title="Mark read" className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5">
                      <Check size={13} style={{ color: "var(--th-text-secondary)" }} />
                    </button>
                  )}
                  <button onClick={() => archive.mutate(n._id)} title="Archive" className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5">
                    <Archive size={13} style={{ color: "var(--th-text-secondary)" }} />
                  </button>
                  <button onClick={() => remove.mutate(n._id)} title="Delete" className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5">
                    <Trash2 size={13} className="text-rose-500" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
    </div>
  );
}
