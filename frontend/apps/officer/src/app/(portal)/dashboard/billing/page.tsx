"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { billingService, collegeAdminService, subscriptionService } from "@synclyft/lib/api/services";
import { API_BASE_URL, toApiError } from "@synclyft/lib/api";
import { formatMoney, planLabel } from "@synclyft/lib/utils";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { openRazorpay } from "@synclyft/lib/razorpay";
import { CreditCard, Download, FileText, AlertCircle, Check, X } from "lucide-react";
import toast from "react-hot-toast";
import { PageHeader } from "@/components/PageHeader";

const STATUS: Record<string, "verdant" | "amber" | "coral" | "neutral"> = {
  completed: "verdant", paid: "verdant", pending: "amber", processing: "amber", failed: "coral", overdue: "coral",
};

interface Invoice {
  _id: string;
  invoiceNumber?: string;
  totalAmount: number;
  currency?: string;
  paymentStatus: string;
  invoiceDate?: string;
  createdAt: string;
}

type PlanMap = Record<string, {
  name: string; monthlyPrice: number; yearlyPrice: number; seats: number;
  features: Record<string, boolean>; limits: Record<string, number>;
}>;

const PLAN_ORDER = ["BASIC", "PRO", "ENTERPRISE"];
const PLAN_ID: Record<string, string> = { BASIC: "basic", PRO: "pro", ENTERPRISE: "enterprise" };
const FEATURE_LABELS: Record<string, string> = {
  mockInterviews: "AI mock interviews", proctoring: "Live proctoring", aiEvaluation: "AI evaluation",
  batchManagement: "Batch & campaign management", advancedAnalytics: "Advanced analytics",
  placementIntelligence: "Placement intelligence", apiAccess: "API access", customBranding: "Custom branding",
};

export default function OfficerBillingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [sub, setSub] = useState<Record<string, unknown> | null>(null);
  const [plans, setPlans] = useState<PlanMap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [busyPlan, setBusyPlan] = useState<string | null>(null);
  const [cycle, setCycle] = useState<"monthly" | "yearly">("yearly");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, ctx, p] = await Promise.allSettled([
        billingService.invoices({ limit: 50 }),
        collegeAdminService.organization(),
        subscriptionService.orgPlans(),
      ]);
      if (inv.status === "fulfilled") setInvoices(inv.value as unknown as Invoice[]);
      else setError(toApiError(inv.reason).message);
      if (ctx.status === "fulfilled") setSub(((ctx.value as Record<string, unknown>)?.subscription ?? null) as Record<string, unknown> | null);
      if (p.status === "fulfilled") setPlans(p.value as PlanMap);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const subscribe = async (planKey: string) => {
    const plan = plans?.[planKey];
    if (!plan) return;
    setBusyPlan(planKey);
    try {
      const { paymentLink } = await subscriptionService.createOrg({
        planId: PLAN_ID[planKey],
        seats: plan.seats,
        billingCycle: cycle,
      });
      const success = await openRazorpay(paymentLink, { name: user?.name, email: user?.email });
      const t = toast.loading("Verifying payment…");
      await billingService.verifyPayment({
        orderId: success.razorpay_order_id,
        paymentId: success.razorpay_payment_id,
        signature: success.razorpay_signature,
      });
      toast.success("Subscription activated!", { id: t });
      router.refresh();
      load();
    } catch (err) {
      const msg = toApiError(err).message;
      if (msg !== "Payment cancelled") toast.error(msg);
    } finally {
      setBusyPlan(null);
    }
  };

  const download = async (id: string) => {
    setDownloading(id);
    try {
      const res = await fetch(`${API_BASE_URL}/billing/invoices/${id}/download-pdf`, { credentials: "include" });
      if (!res.ok) throw new Error("Could not download invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setDownloading(null);
    }
  };

  const [cancelling, setCancelling] = useState(false);
  const activeSub = sub && ["active", "grace_period"].includes(String(sub.status));
  const orderedPlans = plans ? PLAN_ORDER.filter((k) => plans[k]).map((k) => ({ key: k, ...plans[k] })) : [];

  const cancelSubscription = async () => {
    if (!sub?._id) return;
    const reason = window.prompt("Cancel your subscription? Seats stay active until the end of the current billing period.\n\nOptional: tell us why (helps us improve):") ;
    if (reason === null) return;
    setCancelling(true);
    try {
      await subscriptionService.cancel({ subscriptionId: sub._id, reason: reason || undefined });
      toast.success("Subscription cancelled. It stays active until the period ends.");
      load();
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Account"
        title="Billing & subscription"
        subtitle="Your institute's plan, seats and GST invoices"
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border p-4 text-sm" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-card-bg)", color: "var(--th-text-secondary)" }}>
          <AlertCircle size={16} className="text-amber-500" /> {error}
          <button onClick={load} className="ml-auto text-blue-600 dark:text-blue-400 text-xs">Retry</button>
        </div>
      )}

      <div className="rounded-2xl border p-6 flex flex-wrap items-center gap-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="p-2.5 rounded-xl bg-blue-500/10"><CreditCard size={18} className="text-blue-600 dark:text-blue-400" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>
            {activeSub ? planLabel(sub!.planType as string) : "No active subscription"}
          </p>
          <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>
            {activeSub
              ? `Status: ${sub!.status}${sub!.endDate ? ` · ${sub!.autoRenew ? "renews" : "ends"} ${new Date(sub!.endDate as string).toLocaleDateString("en-IN")}` : ""} · ${sub!.totalSeats ?? 0} seats`
              : sub && String(sub.status) === "cancelled"
                ? "Subscription cancelled. Re-subscribe below to keep proctored interviews running."
                : "Pick a plan below to unlock batches, campaigns and proctored interviews"}
          </p>
        </div>
        {activeSub && sub!.autoRenew !== false && (
          <Button variant="secondary" loading={cancelling} onClick={cancelSubscription}>Cancel plan</Button>
        )}
      </div>

      {/* Plan catalogue */}
      {!loading && !activeSub && orderedPlans.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Choose a plan</h3>
            <div className="inline-flex rounded-full border p-0.5" style={{ borderColor: "var(--th-border)" }}>
              {(["monthly", "yearly"] as const).map((c) => (
                <button key={c} onClick={() => setCycle(c)}
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: cycle === c ? "var(--th-primary)" : "transparent", color: cycle === c ? "#fff" : "var(--th-text-secondary)" }}>
                  {c === "monthly" ? "Monthly" : "Yearly · save ~17%"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {orderedPlans.map((plan, i) => {
              const price = cycle === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
              return (
                <div key={plan.key} className="rounded-2xl border p-5 flex flex-col" style={{ backgroundColor: "var(--th-card-bg)", borderColor: i === 1 ? "var(--th-primary)" : "var(--th-card-border)" }}>
                  <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{plan.name}</p>
                  <div className="mt-2 flex items-end gap-1">
                    <span className="text-2xl font-black" style={{ color: "var(--th-text-primary)" }}>₹{price.toLocaleString("en-IN")}</span>
                    <span className="text-xs mb-1" style={{ color: "var(--th-text-faint)" }}>/mo</span>
                  </div>
                  <p className="text-[11px] mt-0.5" style={{ color: "var(--th-text-faint)" }}>{plan.seats} student seats · billed {cycle}</p>
                  <ul className="mt-3 space-y-1.5 flex-1">
                    {Object.entries(FEATURE_LABELS).map(([k, label]) => {
                      const on = plan.features[k];
                      return (
                        <li key={k} className="flex items-center gap-2 text-[11px]" style={{ color: on ? "var(--th-text-secondary)" : "var(--th-text-faint)" }}>
                          {on ? <Check size={12} className="text-emerald-500 shrink-0" /> : <X size={12} className="opacity-40 shrink-0" />}
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                  <Button className="mt-4 w-full justify-center" variant={i === 1 ? "primary" : "secondary"}
                    loading={busyPlan === plan.key} onClick={() => subscribe(plan.key)}>
                    Subscribe
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>Payments processed securely by Razorpay. Need a custom plan or PO invoicing? Contact sales@synclyft.ai.</p>
        </div>
      )}

      <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "var(--th-border)" }}>
          <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Invoice history</h3>
        </div>
        {loading ? (
          <div className="p-6 space-y-3"><SkeletonBlock height="h-10" /><SkeletonBlock height="h-10" /></div>
        ) : invoices.length === 0 ? (
          <div className="p-10 text-center">
            <FileText size={24} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
            <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>No invoices yet.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--th-border)" }}>
            {invoices.map((inv) => (
              <div key={inv._id} className="px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-sm font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>
                    {inv.invoiceNumber ?? `Invoice ${inv._id.slice(-6)}`}
                  </p>
                  <p className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                    {new Date(inv.invoiceDate ?? inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className="font-mono text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>
                  {formatMoney(inv.totalAmount, inv.currency)}
                </span>
                <Badge variant={STATUS[inv.paymentStatus] ?? "neutral"}>{inv.paymentStatus}</Badge>
                <button onClick={() => download(inv._id)} disabled={downloading === inv._id}
                  className="p-2 rounded-lg hover:bg-black/[0.03] dark:hover:bg-white/[0.03] disabled:opacity-50" title="Download PDF">
                  <Download size={15} style={{ color: "var(--th-text-secondary)" }} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
