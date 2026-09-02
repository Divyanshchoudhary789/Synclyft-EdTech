"use client";

import Link from "next/link";
import { useState } from "react";
import FirstNav from "@/components/layout/Firstnav";
import Footer from "@/components/layout/Footer";
import { SkeletonCard } from "@synclyft/ui/components/SkeletonBlock";
import { usePublicPlans, usePublicOrgPlans } from "@synclyft/lib/api/hooks";
import { Check, X, Sparkles, ArrowRight, Building2 } from "lucide-react";

type Cycle = "monthly" | "yearly";

const PLAN_ORDER = ["STUDENT_BASIC", "STUDENT_PRO", "STUDENT_PREMIUM"];
const ORG_PLAN_ORDER = ["BASIC", "PRO", "ENTERPRISE"];
const ORG_PLAN_COPY: Record<string, { desc: string; cta: string }> = {
  BASIC: { desc: "For placement cells and coaching institutes starting out.", cta: "Request demo" },
  PRO: { desc: "For established placement teams running batch-wide drives.", cta: "Request demo" },
  ENTERPRISE: { desc: "For large universities needing custom integrations and scale.", cta: "Contact sales" },
};
const ORG_FEATURE_LABELS: Record<string, string> = {
  studentReports: "Batch & student performance reports",
  placementIntelligence: "Placement intelligence & AI insights",
  batchManagement: "Batch management & campaigns",
  proctoring: "Proctored assessments",
  advancedAnalytics: "Advanced analytics",
  apiAccess: "API access",
  customBranding: "Custom branding",
};

const FEATURE_LABELS: Record<string, string> = {
  mockInterviews: "AI mock interviews",
  aiEvaluation: "AI evaluation & feedback",
  studentReports: "Performance reports",
  proctoring: "Live proctoring",
  placementIntelligence: "Placement intelligence",
  advancedAnalytics: "Advanced analytics & percentile",
};

function limitLabel(v: number) {
  return v === -1 ? "Unlimited" : String(v);
}

export default function PricingPage() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const [audience, setAudience] = useState<"student" | "org">("student");
  const { data: plans, isLoading } = usePublicPlans();
  const { data: orgPlans, isLoading: orgLoading } = usePublicOrgPlans();

  const ordered = plans ? PLAN_ORDER.filter((k) => plans[k]).map((k) => ({ key: k, ...plans[k] })) : [];
  const orgOrdered = orgPlans ? ORG_PLAN_ORDER.filter((k) => orgPlans[k]).map((k) => ({ key: k, ...orgPlans[k] })) : [];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--th-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      <FirstNav />

      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="label-caption" style={{ color: "var(--th-text-faint)" }}>Pricing</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-sm" style={{ color: "var(--th-text-muted)" }}>
            Start with a free trial — no card required. Upgrade any time; cancel any time.
          </p>
        </div>

        {/* audience toggle */}
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}>
            {(["student", "org"] as const).map((a) => (
              <button
                key={a}
                onClick={() => setAudience(a)}
                className="rounded-full px-5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors"
                style={{ backgroundColor: audience === a ? "var(--th-primary)" : "transparent", color: audience === a ? "#fff" : "var(--th-text-muted)" }}
              >
                {a === "student" ? "For students" : "For institutions"}
              </button>
            ))}
          </div>
        </div>

        {audience === "student" ? (
          <>
            {/* billing cycle */}
            <div className="mt-6 flex justify-center">
              <div className="inline-flex rounded-full border p-1" style={{ borderColor: "var(--th-border)" }}>
                {(["monthly", "yearly"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCycle(c)}
                    className="rounded-full px-4 py-1.5 text-xs font-semibold transition-colors"
                    style={{ backgroundColor: cycle === c ? "var(--th-primary)" : "transparent", color: cycle === c ? "#fff" : "var(--th-text-secondary)" }}
                  >
                    {c === "monthly" ? "Monthly" : "Yearly"}
                    {c === "yearly" && <span className="ml-1 opacity-80">· save ~17%</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {isLoading
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} className="h-[420px]" />)
                : ordered.map((plan, i) => {
                    const highlight = i === 1;
                    const price = cycle === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
                    const perMonth = cycle === "yearly" ? Math.round(plan.yearlyPrice / 12) : plan.monthlyPrice;
                    return (
                      <div
                        key={plan.key}
                        className="relative flex flex-col rounded-2xl border p-6"
                        style={{
                          backgroundColor: "var(--th-card-bg)",
                          borderColor: highlight ? "var(--th-primary)" : "var(--th-card-border)",
                          boxShadow: highlight ? "0 8px 40px color-mix(in srgb, var(--th-primary) 15%, transparent)" : "none",
                        }}
                      >
                        {highlight && (
                          <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-white" style={{ backgroundColor: "var(--th-primary)" }}>
                            Most popular
                          </span>
                        )}
                        <div className="flex items-center gap-2">
                          <Sparkles size={16} style={{ color: "var(--th-primary)" }} />
                          <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>{plan.name}</h3>
                        </div>
                        <div className="mt-4 flex items-end gap-1">
                          <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>₹{perMonth}</span>
                          <span className="mb-1 text-xs" style={{ color: "var(--th-text-faint)" }}>/mo</span>
                        </div>
                        <p className="mt-0.5 text-[11px]" style={{ color: "var(--th-text-faint)" }}>
                          {cycle === "yearly" ? `₹${price} billed yearly` : "billed monthly"}
                        </p>
                        <div className="mt-3 text-xs font-semibold" style={{ color: "var(--th-text-secondary)" }}>
                          {limitLabel(plan.limits.mockInterviewsPerMonth)} mock interviews / mo · {limitLabel(plan.limits.studentReportsPerMonth)} reports / mo
                        </div>
                        <ul className="mt-4 flex-1 space-y-2">
                          {Object.entries(FEATURE_LABELS).map(([key, label]) => {
                            const on = plan.features[key];
                            return (
                              <li key={key} className="flex items-center gap-2 text-xs" style={{ color: on ? "var(--th-text-secondary)" : "var(--th-text-faint)" }}>
                                {on ? <Check size={13} className="shrink-0 text-emerald-500" /> : <X size={13} className="shrink-0 opacity-40" />}
                                {label}
                              </li>
                            );
                          })}
                        </ul>
                        <Link
                          href="/register"
                          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all"
                          style={
                            highlight
                              ? { backgroundColor: "var(--th-primary)", color: "#fff" }
                              : { border: "1px solid var(--th-border-strong)", color: "var(--th-text-primary)" }
                          }
                        >
                          Start free trial <ArrowRight size={14} />
                        </Link>
                      </div>
                    );
                  })}
            </div>
            <p className="mt-8 text-center text-[11px]" style={{ color: "var(--th-text-faint)" }}>
              Payments processed securely by Razorpay. GST invoices available in Billing.
            </p>
          </>
        ) : (
          <>
            <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-3">
              {orgLoading
                ? [0, 1, 2].map((i) => <SkeletonCard key={i} className="h-[420px]" />)
                : orgOrdered.map((plan, i) => {
                    const copy = ORG_PLAN_COPY[plan.key] ?? { desc: "", cta: "Request demo" };
                    const yearly = cycle === "yearly";
                    const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;
                    return (
                      <div
                        key={plan.key}
                        className="flex flex-col rounded-2xl border p-7"
                        style={{
                          backgroundColor: "var(--th-card-bg)",
                          borderColor: i === 1 ? "var(--th-primary)" : "var(--th-card-border)",
                          boxShadow: i === 1 ? "0 8px 40px color-mix(in srgb, var(--th-primary) 15%, transparent)" : "none",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 size={16} style={{ color: "var(--th-primary)" }} />
                          <h3 className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--th-text-primary)" }}>{plan.name}</h3>
                        </div>
                        <div className="mt-3 flex items-baseline gap-1">
                          <span className="text-3xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                            ₹{price.toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-mono" style={{ color: "var(--th-text-faint)" }}>{yearly ? "/ year" : "/ month"}</span>
                        </div>
                        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--th-text-muted)" }}>{copy.desc}</p>
                        <div className="mt-3 text-xs font-semibold" style={{ color: "var(--th-text-secondary)" }}>
                          Up to {plan.seats?.toLocaleString("en-IN")} student seats
                        </div>
                        <ul className="mt-4 flex-1 space-y-2.5">
                          <li className="flex items-center gap-2.5 text-xs" style={{ color: "var(--th-text-secondary)" }}>
                            <Check size={14} className="shrink-0 text-emerald-500" /> Officer portal with batch analytics
                          </li>
                          {Object.entries(ORG_FEATURE_LABELS).map(([key, label]) => {
                            const on = plan.features?.[key];
                            return (
                              <li key={key} className="flex items-center gap-2.5 text-xs" style={{ color: on ? "var(--th-text-secondary)" : "var(--th-text-faint)" }}>
                                {on ? <Check size={14} className="shrink-0 text-emerald-500" /> : <X size={13} className="shrink-0 opacity-40" />} {label}
                              </li>
                            );
                          })}
                        </ul>
                        <a
                          href="mailto:sales@synclyft.ai"
                          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all"
                          style={
                            i === 1
                              ? { backgroundColor: "var(--th-primary)", color: "#fff" }
                              : { border: "1px solid var(--th-border-strong)", color: "var(--th-text-primary)" }
                          }
                        >
                          {copy.cta} <ArrowRight size={14} />
                        </a>
                      </div>
                    );
                  })}
            </div>
            <p className="mt-8 text-center text-[11px]" style={{ color: "var(--th-text-faint)" }}>
              Institution plans are billed annually with GST invoicing. Seat counts and features can be tailored — talk to us.
            </p>
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
