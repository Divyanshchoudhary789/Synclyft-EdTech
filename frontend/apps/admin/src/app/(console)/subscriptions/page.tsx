"use client";

import { useCallback, useEffect, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { planLabel, formatMoney } from "@synclyft/lib/utils";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { PageHeader } from "@/components/PageHeader";
import { AlertCircle, CreditCard, IndianRupee, Ban, RefreshCw, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";

interface Sub {
  _id: string;
  planType?: string;
  status: string;
  ownerType?: string;
  ownerName?: string;
  amount?: number;
  currency?: string;
  billingCycle?: string;
  totalSeats?: number;
  usedSeats?: number;
  autoRenew?: boolean;
  startDate?: string;
  endDate?: string;
}
interface Stats {
  totalActive: number; totalPending: number; totalGracePeriod: number; totalSuspended: number;
  totalCancelled: number; totalExpired: number; expiringIn30Days: number; autoRenewOn: number;
  mrr: number; arr: number; bookedRevenue: number;
  planBreakdown: { _id: string; count: number; seats: number; usedSeats: number }[];
  cycleBreakdown: { _id: string; count: number }[];
}

const STATUS: Record<string, "verdant" | "amber" | "coral" | "neutral"> = {
  active: "verdant", pending: "amber", grace_period: "amber", suspended: "coral", expired: "coral", inactive: "neutral", cancelled: "neutral",
};
const STATUSES = ["", "active", "grace_period", "pending", "suspended", "cancelled", "expired"];
const PLAN_COLORS = ["#0062FF", "#3DDC84", "#8B5CF6", "#F59E0B", "#EC4899", "#14B8A6"];
const PAGE_SIZE = 40;
const money = (n: number, c = "INR") => formatMoney(n, c);
const cycleShort: Record<string, string> = { monthly: "mo", quarterly: "qtr", yearly: "yr" };

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const load = useCallback(async (opts: { page: number; status: string }) => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.allSettled([
        superAdminService.allSubscriptions({ page: opts.page, limit: PAGE_SIZE, status: opts.status || undefined }),
        superAdminService.subscriptionStats(),
      ]);
      if (list.status === "fulfilled") {
        setSubs(list.value.items as unknown as Sub[]);
        setTotal(list.value.total);
        setPage(opts.page);
      } else setError(toApiError(list.reason).message);
      if (s.status === "fulfilled") setStats(s.value as unknown as Stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load({ page: 1, status: "" }); }, [load]);
  useEffect(() => { load({ page: 1, status }); }, [status, load]);

  const cancel = async (id: string, reason: string) => {
    setCancelId(id);
    try {
      await superAdminService.cancelSubscription(id, reason || undefined);
      toast.success("Subscription cancelled");
      load({ page, status });
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setCancelId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const payingBase = (stats?.totalActive ?? 0) + (stats?.totalGracePeriod ?? 0);
  const planMix = stats?.planBreakdown ?? [];
  const planMax = Math.max(...planMix.map((p) => p.count), 1);
  const seatTotals = planMix.reduce((a, p) => ({ seats: a.seats + p.seats, used: a.used + p.usedSeats }), { seats: 0, used: 0 });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Revenue"
        title="Subscriptions"
        subtitle="Recurring revenue, plan mix and every subscription across the platform"
        actions={
          <select value={status} onChange={(e) => setStatus(e.target.value)}
            className="rounded-lg border px-2 py-2 text-xs"
            style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-border-strong)", color: "var(--th-text-primary)" }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s ? s.replace(/_/g, " ") : "All statuses"}</option>)}
          </select>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={() => load({ page, status })} className="ml-auto text-xs text-blue-600 dark:text-blue-400">Retry</button>
        </div>
      )}

      {loading && !stats ? (
        <SubsSkeleton />
      ) : stats ? (
        <>
          {/* Revenue headline */}
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
            {[
              { label: "Monthly recurring (MRR)", value: stats.mrr, hint: `${payingBase} paying account${payingBase === 1 ? "" : "s"}`, icon: IndianRupee, accent: "var(--th-primary)" },
              { label: "Annualised (ARR)", value: stats.arr, hint: "MRR × 12", icon: TrendingUp, accent: "#3DDC84" },
              { label: "Booked revenue", value: stats.bookedRevenue, hint: "all-time, incl. one-off", icon: CreditCard, accent: "#8B5CF6" },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>
                  <c.icon size={12} style={{ color: c.accent }} /> {c.label}
                </p>
                <p className="mt-2 text-2xl font-bold sm:text-3xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                  ₹<CountUp end={Number(c.value)} />
                </p>
                <p className="mt-1 text-[11px]" style={{ color: "var(--th-text-faint)" }}>{c.hint}</p>
              </div>
            ))}
          </div>

          {/* Status pills */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
            {[
              { label: "Active", value: stats.totalActive, color: "#3DDC84" },
              { label: "Grace period", value: stats.totalGracePeriod, color: "#F59E0B" },
              { label: "Pending", value: stats.totalPending, color: "#F59E0B" },
              { label: "Cancelled", value: stats.totalCancelled, color: "#9CA3AF" },
              { label: "Auto-renew on", value: stats.autoRenewOn, color: "#0062FF" },
              { label: "Expiring 30d", value: stats.expiringIn30Days, color: "#FF5C5C" },
            ].map((k) => (
              <div key={k.label} className="rounded-2xl border p-4" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                <p className="mt-1.5 text-xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: k.value > 0 && (k.label === "Expiring 30d") ? "#FF5C5C" : "var(--th-text-primary)" }}>
                  <CountUp end={k.value} />
                </p>
              </div>
            ))}
          </div>

          {/* Plan mix + billing cycle + seats */}
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="mb-4 text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Plan mix <span className="text-[11px] font-normal" style={{ color: "var(--th-text-faint)" }}>active + grace</span></h3>
              {planMix.length === 0 ? (
                <p className="py-6 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>No paying subscriptions yet.</p>
              ) : (
                <div className="space-y-3">
                  {planMix.map((p, i) => (
                    <div key={p._id}>
                      <div className="mb-1 flex items-center justify-between text-[11px]" style={{ color: "var(--th-text-secondary)" }}>
                        <span className="font-semibold">{planLabel(p._id)}</span>
                        <span className="font-mono">{p.count} · {p.seats} seats ({p.usedSeats} used)</span>
                      </div>
                      <div className="h-2 rounded-full" style={{ backgroundColor: "var(--th-bg-tertiary)" }}>
                        <div className="h-full rounded-full" style={{ width: `${(p.count / planMax) * 100}%`, backgroundColor: PLAN_COLORS[i % PLAN_COLORS.length] }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <h3 className="mb-4 text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Billing cadence</h3>
              <div className="space-y-2.5 text-xs">
                {(["monthly", "quarterly", "yearly"] as const).map((c) => {
                  const n = stats.cycleBreakdown.find((x) => x._id === c)?.count ?? 0;
                  return (
                    <div key={c} className="flex items-center justify-between">
                      <span className="capitalize" style={{ color: "var(--th-text-secondary)" }}>{c}</span>
                      <span className="font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>{n}</span>
                    </div>
                  );
                })}
                <div className="mt-2 flex items-center justify-between border-t pt-2.5" style={{ borderColor: "var(--th-border)" }}>
                  <span style={{ color: "var(--th-text-faint)" }}>Seats sold</span>
                  <span className="font-mono font-bold" style={{ color: "var(--th-text-primary)" }}>{seatTotals.used}/{seatTotals.seats}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1fr_1fr_0.8fr] border-b px-6 py-3 text-[10px] font-bold uppercase tracking-wider" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
            <span>Owner</span><span>Plan</span><span>Seats</span><span>Amount</span><span>Status</span><span>Renews</span><span />
          </div>
          {loading ? (
            <div className="space-y-3 p-6"><SkeletonBlock height="h-7" /><SkeletonBlock height="h-7" /><SkeletonBlock height="h-7" /></div>
          ) : subs.length === 0 ? (
            <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
              <CreditCard size={22} className="mx-auto mb-2 opacity-40" /> No subscriptions match.
            </div>
          ) : (
            subs.map((s) => {
              const cancellable = ["active", "grace_period", "pending"].includes(s.status);
              return (
                <div key={s._id} className="grid grid-cols-[2fr_1fr_1fr_1.2fr_1fr_1fr_0.8fr] items-center border-b px-6 py-3 text-xs last:border-0" style={{ borderColor: "var(--th-border)" }}>
                  <div className="min-w-0">
                    <p className="truncate" style={{ color: "var(--th-text-primary)" }}>{s.ownerName ?? "—"}</p>
                    <p className="text-[10px] capitalize" style={{ color: "var(--th-text-faint)" }}>
                      {s.ownerType ?? "—"}{s.startDate ? ` · since ${new Date(s.startDate).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}` : ""}
                    </p>
                  </div>
                  <span style={{ color: "var(--th-text-secondary)" }}>{planLabel(s.planType)}</span>
                  <span className="font-mono" style={{ color: "var(--th-text-secondary)" }}>
                    {s.totalSeats ? `${s.usedSeats ?? 0}/${s.totalSeats}` : "—"}
                  </span>
                  <span className="font-mono" style={{ color: "var(--th-text-secondary)" }}>
                    {s.amount ? `${money(s.amount, s.currency)} / ${cycleShort[s.billingCycle ?? "monthly"] ?? "mo"}` : "—"}
                  </span>
                  <Badge variant={STATUS[s.status] ?? "neutral"}>{s.status.replace(/_/g, " ")}</Badge>
                  <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>
                    {s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" }) : "—"}
                    {s.autoRenew === false && <span className="ml-1 text-[9px] uppercase" style={{ color: "var(--th-text-faint)" }}>· no renew</span>}
                    {s.autoRenew && <RefreshCw size={9} className="ml-1 inline" style={{ color: "#3DDC84" }} />}
                  </span>
                  <div className="flex justify-end">
                    {cancellable && (
                      <button disabled={cancelId === s._id}
                        onClick={() => { const r = window.prompt("Cancel this subscription? Optional reason:"); if (r !== null) cancel(s._id, r); }}
                        className="flex items-center gap-1 rounded border border-rose-500/25 px-2 py-1 text-[10px] font-bold text-rose-600 disabled:opacity-50 dark:text-rose-400">
                        <Ban size={10} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1 || loading} onClick={() => load({ page: page - 1, status })}>Previous</Button>
          <span className="text-xs" style={{ color: "var(--th-text-faint)" }}>Page {page} of {totalPages}</span>
          <Button variant="secondary" disabled={page >= totalPages || loading} onClick={() => load({ page: page + 1, status })}>Next</Button>
        </div>
      )}
    </div>
  );
}

const sc = "rounded-2xl border p-5";
const scStyle = { backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" };

function SubsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className={sc} style={scStyle}>
            <SkeletonBlock height="h-3" width="w-32" />
            <SkeletonBlock height="h-8" width="w-24" className="mt-3" />
            <SkeletonBlock height="h-2.5" width="w-20" className="mt-2" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-4" style={scStyle}>
            <SkeletonBlock height="h-2.5" width="w-16" />
            <SkeletonBlock height="h-6" width="w-10" className="mt-2" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className={`${sc} p-6 lg:col-span-2`} style={scStyle}>
          <SkeletonBlock height="h-4" width="w-24" />
          <div className="mt-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <SkeletonBlock key={i} height="h-6" />)}</div>
        </div>
        <div className={`${sc} p-6`} style={scStyle}>
          <SkeletonBlock height="h-4" width="w-24" />
          <div className="mt-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} height="h-3" />)}</div>
        </div>
      </div>
    </div>
  );
}
