"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { cn, planLabel } from "@synclyft/lib/utils";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { subscriptionService, billingService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { usePlans, useCurrentSubscription } from "@synclyft/lib/api/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { openRazorpay } from "@synclyft/lib/razorpay";
import toast from "react-hot-toast";
import { Check, X, Sparkles, ShieldCheck, ArrowRight, Building2, Clock, Gauge } from "lucide-react";

type Cycle = "monthly" | "yearly";
const fmtLimit = (n: number) => (n < 0 ? "Unlimited" : n);

const PLAN_ORDER = ["STUDENT_BASIC", "STUDENT_PRO", "STUDENT_PREMIUM"];
const PLAN_ID_MAP: Record<string, string> = {
  STUDENT_BASIC: "student_basic", STUDENT_PRO: "student_pro", STUDENT_PREMIUM: "student_premium",
};
const FEATURE_LABELS: Record<string, string> = {
  mockInterviews: "AI mock interviews", proctoring: "Live proctoring", aiEvaluation: "AI evaluation & feedback",
  placementIntelligence: "Placement intelligence", studentReports: "Performance reports",
  advancedAnalytics: "Advanced analytics", apiAccess: "API access", customBranding: "Custom branding",
};

function QuotaBar({ label, used, limit, unlimited }: { label: string; used: number; limit: number; unlimited: boolean }) {
  const pct = unlimited ? 100 : limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-1" style={{ color: "var(--th-text-secondary)" }}>
        <span>{label}</span>
        <span className="font-mono">{unlimited ? "Unlimited" : `${Math.max(0, limit - used)} / ${limit} left`}</span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--th-bg-tertiary)" }}>
        <div className="h-full rounded-full" style={{ width: `${unlimited ? 12 : pct}%`, backgroundColor: pct > 85 && !unlimited ? "#FF5C5C" : "var(--th-primary)" }} />
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [busyPlan, setBusyPlan] = useState<string | null>(null);

  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: current, isLoading: curLoading } = useCurrentSubscription();

  const ent = current?.entitlement;
  const showPlanGrid = !ent || ent.source === "trial" || ent.source === "none" || ent.source === "pending";

  const subscribe = async (planKey: string) => {
    setBusyPlan(planKey);
    try {
      const { paymentLink } = await subscriptionService.create({
        planId: PLAN_ID_MAP[planKey],
        billingCycle: cycle === "yearly" ? "yearly" : "monthly",
      });
      const success = await openRazorpay(paymentLink, { name: user?.name, email: user?.email });
      const t = toast.loading("Verifying payment…");
      await billingService.verifyPayment({
        orderId: success.razorpay_order_id,
        paymentId: success.razorpay_payment_id,
        signature: success.razorpay_signature,
      });
      toast.success("Subscription activated!", { id: t });
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["student"] });
      router.push("/dashboard");
    } catch (err) {
      const msg = toApiError(err).message;
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setBusyPlan(null);
    }
  };

  const orderedPlans = plans ? PLAN_ORDER.filter((k) => plans[k]).map((k) => ({ key: k, ...plans[k] })) : [];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="text-center">
        <p className="label-caption mb-2" style={{ color: "var(--th-text-faint)" }}>Plan &amp; access</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
          {ent?.source === "seat" ? "Your access" : ent?.source === "individual" ? "Your plan" : "Choose your plan"}
        </h1>
      </div>

      {curLoading ? (
        <SkeletonCard className="h-32" />
      ) : ent?.source === "seat" && ent.seat ? (
        /* ── Institution-allocated seat ── */
        <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10"><Building2 size={18} className="text-emerald-600 dark:text-emerald-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>
                Access provided by {ent.seat.organizationName}
              </p>
              <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>
                {ent.seat.organizationName} has allocated you a seat on their {planLabel(ent.seat.planType)} plan — you have full access to mock interviews and proctoring at no cost.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Seat active</span>
          </div>
          {ent.quota && (
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <QuotaBar label="Mock interviews this month" {...ent.quota.mockInterviews} />
              <QuotaBar label="Performance reports this month" {...ent.quota.studentReports} />
            </div>
          )}
          <p className="mt-4 text-[11px] flex items-center gap-1.5" style={{ color: "var(--th-text-faint)" }}>
            <ShieldCheck size={12} className="text-emerald-500" /> Your institution manages billing and quota. You don&apos;t need a personal plan.
          </p>
        </div>
      ) : ent?.source === "individual" && ent.plan ? (
        /* ── Own paid plan ── */
        <div className="rounded-2xl border p-6" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10"><Sparkles size={18} className="text-blue-600 dark:text-blue-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{planLabel(ent.plan.planType)}</p>
              <p className="text-xs flex items-center gap-2" style={{ color: "var(--th-text-faint)" }}>
                <span className="capitalize">{ent.plan.status}</span>
                {ent.plan.endDate && <span className="flex items-center gap-1"><Clock size={11} /> renews {new Date(ent.plan.endDate).toLocaleDateString("en-IN")}</span>}
                {ent.plan.autoRenew === false && <span className="text-amber-500">auto-renew off</span>}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">Active</span>
          </div>
          {ent.quota && (
            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <QuotaBar label="Mock interviews this month" {...ent.quota.mockInterviews} />
              <QuotaBar label="Performance reports this month" {...ent.quota.studentReports} />
            </div>
          )}
          {ent.plan.limits && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(FEATURE_LABELS).filter(([k]) => ent.plan?.features?.[k]).map(([, label]) => (
                <span key={label} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/5 text-blue-600 dark:text-blue-400 border border-blue-500/15">{label}</span>
              ))}
            </div>
          )}
        </div>
      ) : ent?.source === "pending" ? (
        <div className="rounded-2xl border p-6 flex flex-wrap items-center gap-3" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <Clock size={18} className="text-amber-500" />
          <p className="text-sm flex-1" style={{ color: "var(--th-text-primary)" }}>
            Payment pending for <strong>{planLabel(ent.plan?.planType ?? "")}</strong>. Complete the payment below to activate it.
          </p>
        </div>
      ) : ent?.source === "trial" && ent.trials ? (
        <div className="rounded-2xl border p-5" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <p className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: "var(--th-text-primary)" }}>
            <Gauge size={13} className="text-blue-500" /> Free trial
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {([
              ["Mock interviews", ent.trials.mockInterviews],
              ["Performance reports", ent.trials.studentReports],
              ["AI evaluations", ent.trials.aiEvaluation],
            ] as const).map(([label, b]) => b && (
              <QuotaBar key={label} label={label} used={b.used} limit={b.total} unlimited={false} />
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: "var(--th-text-faint)" }}>Upgrade for higher monthly limits, proctoring and detailed analytics.</p>
        </div>
      ) : (
        <div className="rounded-2xl border p-5 text-sm text-center" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          You don&apos;t have an active plan or an institution seat yet. Pick a plan below, or ask your placement cell to allocate you a seat.
        </div>
      )}

      {/* ── Plan grid ── */}
      {showPlanGrid && (
        <>
          <div className="flex justify-center">
            <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--th-border)" }}>
              {(["monthly", "yearly"] as const).map((c) => (
                <button key={c} onClick={() => setCycle(c)}
                  className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{ backgroundColor: cycle === c ? "var(--th-primary)" : "transparent", color: cycle === c ? "#fff" : "var(--th-text-secondary)" }}>
                  {c === "monthly" ? "Monthly" : "Yearly"}{c === "yearly" && <span className="ml-1 opacity-80">· save ~17%</span>}
                </button>
              ))}
            </div>
          </div>

          {plansLoading ? (
            <div className="grid md:grid-cols-3 gap-6"><SkeletonCard className="h-96" /><SkeletonCard className="h-96" /><SkeletonCard className="h-96" /></div>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {orderedPlans.map((plan, i) => {
                const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                const perMonth = cycle === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
                const highlight = i === 1;
                return (
                  <div key={plan.key}
                    className={cn("relative rounded-2xl border p-6 flex flex-col", highlight && "ring-1 ring-blue-500/30")}
                    style={{ backgroundColor: "var(--th-card-bg)", borderColor: highlight ? "rgba(0,98,255,0.4)" : "var(--th-card-border)" }}>
                    {highlight && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white" style={{ backgroundColor: "var(--th-primary)" }}>Most popular</span>
                    )}
                    <div className="flex items-center gap-2">
                      <Sparkles size={16} style={{ color: "var(--th-primary)" }} />
                      <h3 className="font-bold text-sm" style={{ color: "var(--th-text-primary)" }}>{plan.name}</h3>
                    </div>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-3xl font-black" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>₹{perMonth}</span>
                      <span className="text-xs mb-1" style={{ color: "var(--th-text-faint)" }}>/mo</span>
                    </div>
                    <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>{cycle === "yearly" ? `₹${price} billed yearly` : "billed monthly"}</p>
                    <div className="mt-3 text-xs font-semibold" style={{ color: "var(--th-text-secondary)" }}>
                      {fmtLimit(plan.limits.mockInterviewsPerMonth)} mock interviews / mo · {fmtLimit(plan.limits.studentReportsPerMonth)} reports / mo
                    </div>
                    <ul className="mt-4 space-y-2 flex-1">
                      {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                        const on = plan.features[key];
                        return (
                          <li key={key} className="flex items-center gap-2 text-xs" style={{ color: on ? "var(--th-text-secondary)" : "var(--th-text-faint)" }}>
                            {on ? <Check size={13} className="text-emerald-500 shrink-0" /> : <X size={13} className="opacity-40 shrink-0" />}
                            {label}
                          </li>
                        );
                      })}
                    </ul>
                    <Button className="mt-5 w-full justify-center" variant={highlight ? "primary" : "secondary"}
                      loading={busyPlan === plan.key} onClick={() => subscribe(plan.key)} icon={<ArrowRight size={14} />}>
                      Subscribe
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-center text-[11px]" style={{ color: "var(--th-text-faint)" }}>
            Payments processed securely by Razorpay. GST invoice available in Billing.
          </p>
        </>
      )}
    </div>
  );
}
