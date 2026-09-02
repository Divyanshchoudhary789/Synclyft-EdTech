"use client";

import { useEffect, useState } from "react";
import { superAdminService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { planLabel, formatMoney } from "@synclyft/lib/utils";
import { CountUp } from "@synclyft/ui/components/CountUp";
import { Badge } from "@synclyft/ui/components/Badge";
import { SkeletonBlock, SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { AlertCircle, CreditCard } from "lucide-react";

interface Sub {
  _id: string;
  planType?: string;
  status: string;
  ownerType?: string;
  ownerName?: string;
  amount?: number;
  billingCycle?: string;
  endDate?: string;
}

const STATUS: Record<string, "verdant" | "amber" | "coral" | "neutral"> = {
  active: "verdant", pending: "amber", grace_period: "amber", suspended: "coral", expired: "coral", inactive: "neutral", cancelled: "neutral",
};

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, s] = await Promise.allSettled([
        superAdminService.allSubscriptions({ limit: 100 }),
        superAdminService.subscriptionStats(),
      ]);
      if (list.status === "fulfilled") setSubs(list.value as unknown as Sub[]);
      else setError(toApiError(list.reason).message);
      if (s.status === "fulfilled") setStats(s.value as Record<string, number>);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const kpis = [
    { label: "Active", value: Number(stats?.totalActive ?? 0) },
    { label: "Pending", value: Number(stats?.totalPending ?? 0) },
    { label: "Grace period", value: Number(stats?.totalGracePeriod ?? 0) },
    { label: "Expiring 30d", value: Number(stats?.expiringIn30Days ?? 0) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Subscriptions</h1>
        <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>All active and historical subscriptions across the platform</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={load} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} className="h-24" />)}</div>
      ) : stats ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-2xl border p-5" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
                <p className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--th-text-faint)" }}>{k.label}</p>
                <p className="mt-2 text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}><CountUp end={k.value} /></p>
              </div>
            ))}
          </div>
          {Number(stats.mrr ?? 0) > 0 && (
            <div className="rounded-2xl border p-6" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>Monthly recurring revenue</p>
              <p className="mt-1 text-3xl font-black" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                ₹<CountUp end={Number(stats.mrr)} />
              </p>
            </div>
          )}
        </>
      ) : null}

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-6 py-3 text-[10px] font-bold uppercase tracking-wider border-b" style={{ borderColor: "var(--th-border)", color: "var(--th-text-faint)" }}>
          <span>Owner</span><span>Plan</span><span>Amount</span><span>Status</span><span>Renews</span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3"><SkeletonBlock height="h-7" /><SkeletonBlock height="h-7" /></div>
        ) : subs.length === 0 ? (
          <div className="p-12 text-center text-xs" style={{ color: "var(--th-text-faint)" }}>
            <CreditCard size={22} className="mx-auto mb-2 opacity-40" /> No subscriptions.
          </div>
        ) : (
          subs.map((s) => (
            <div key={s._id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] px-6 py-3 items-center border-b last:border-0 text-xs" style={{ borderColor: "var(--th-border)" }}>
              <div className="min-w-0">
                <p className="truncate" style={{ color: "var(--th-text-primary)" }}>{s.ownerName ?? "—"}</p>
                <p className="text-[10px]" style={{ color: "var(--th-text-faint)" }}>{s.ownerType ?? "—"}</p>
              </div>
              <span style={{ color: "var(--th-text-secondary)" }}>{planLabel(s.planType)}</span>
              <span className="font-mono" style={{ color: "var(--th-text-secondary)" }}>
                {s.amount ? `${formatMoney(s.amount)}/${(s.billingCycle ?? "mo").slice(0, 2)}` : "—"}
              </span>
              <Badge variant={STATUS[s.status] ?? "neutral"}>{s.status}</Badge>
              <span className="font-mono" style={{ color: "var(--th-text-muted)" }}>{s.endDate ? new Date(s.endDate).toLocaleDateString("en-IN") : "—"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
