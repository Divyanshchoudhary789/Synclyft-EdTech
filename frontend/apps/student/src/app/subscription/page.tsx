"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import FirstNav from "@/components/layout/Firstnav";
import Footer  from "@/components/layout/Footer";
import { Check, Sparkles, Zap, Shield, HelpCircle, ArrowRight, X } from "lucide-react";
import { cn } from "@synclyft/lib/utils";
import { useAuthStore } from "@synclyft/lib/store/auth";

type BillingCycle = "monthly" | "quarterly" | "yearly";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: Record<BillingCycle, number | string>;
  billingText: Record<BillingCycle, string>;
  description: string;
  icon: any;
  color: string;
  glowColor: string;
  badge?: string;
  features: PlanFeature[];
}

const STUDENT_PLANS: Plan[] = [
  {
    id: "student_basic",
    name: "Student Basic",
    price: {
      monthly: 499,
      quarterly: 449,
      yearly: 416,
    },
    billingText: {
      monthly: "billed monthly (₹499)",
      quarterly: "billed quarterly (₹1,347)",
      yearly: "billed yearly (₹4,990)",
    },
    description: "Essential prep tools for students getting started.",
    icon: Zap,
    color: "var(--th-text-primary)",
    glowColor: "rgba(156, 163, 175, 0.15)",
    features: [
      { text: "1 Seat (Individual Account)", included: true },
      { text: "Mock interviews (15/mo)", included: true },
      { text: "Student reports (3/mo)", included: true },
      { text: "API Access (100 calls/day)", included: true },
      { text: "2 GB Storage", included: true },
      { text: "AI Evaluation", included: true },
      { text: "Proctoring", included: false },
      { text: "Placement Intelligence", included: false },
      { text: "Batch Management", included: false },
      { text: "Advanced Analytics", included: false },
      { text: "Custom Branding", included: false },
    ],
  },
  {
    id: "student_pro",
    name: "Student Pro",
    price: {
      monthly: 999,
      quarterly: 899,
      yearly: 833,
    },
    billingText: {
      monthly: "billed monthly (₹999)",
      quarterly: "billed quarterly (₹2,697)",
      yearly: "billed yearly (₹9,990)",
    },
    description: "Accelerate your prep with advanced reviews and placement intelligence.",
    icon: Sparkles,
    color: "#0062FF",
    glowColor: "rgba(0, 98, 255, 0.15)",
    badge: "Most Popular",
    features: [
      { text: "1 Seat (Individual Account)", included: true },
      { text: "Mock interviews (50/mo)", included: true },
      { text: "Student reports (10/mo)", included: true },
      { text: "API Access (500 calls/day)", included: true },
      { text: "10 GB Storage", included: true },
      { text: "Proctoring & AI Evaluation", included: true },
      { text: "Placement Intelligence", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Batch Management", included: false },
      { text: "Custom Branding", included: false },
    ],
  },
  {
    id: "student_premium",
    name: "Student Premium",
    price: {
      monthly: 1999,
      quarterly: 1799,
      yearly: 1666,
    },
    billingText: {
      monthly: "billed monthly (₹1,999)",
      quarterly: "billed quarterly (₹5,397)",
      yearly: "billed yearly (₹19,990)",
    },
    description: "Unlimited preparation access with ultimate analytics and storage.",
    icon: Shield,
    color: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.15)",
    badge: "Best Value",
    features: [
      { text: "1 Seat (Individual Account)", included: true },
      { text: "Unlimited mock interviews", included: true },
      { text: "Unlimited student reports", included: true },
      { text: "Unlimited API Access", included: true },
      { text: "50 GB Storage", included: true },
      { text: "Proctoring & AI Evaluation", included: true },
      { text: "Placement Intelligence", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Batch Management", included: false },
      { text: "Custom Branding", included: false },
    ],
  },
];

const COLLEGE_PLANS: Plan[] = [
  {
    id: "college_basic",
    name: "Basic",
    price: {
      monthly: 5000,
      quarterly: 4500,
      yearly: 4167,
    },
    billingText: {
      monthly: "billed monthly (₹5,000)",
      quarterly: "billed quarterly (₹13,500)",
      yearly: "billed yearly (₹50,000)",
    },
    description: "Essential prep features for small institutions & batches.",
    icon: Zap,
    color: "var(--th-text-primary)",
    glowColor: "rgba(156, 163, 175, 0.15)",
    features: [
      { text: "Up to 50 active student seats", included: true },
      { text: "Mock interviews (100/mo)", included: true },
      { text: "Student reports (50/mo)", included: true },
      { text: "10 GB Storage", included: true },
      { text: "Proctoring", included: false },
      { text: "AI Evaluation", included: false },
      { text: "Batch Management", included: false },
      { text: "Placement Intelligence", included: false },
      { text: "Advanced Analytics", included: false },
      { text: "API Access", included: false },
      { text: "Custom Branding", included: false },
    ],
  },
  {
    id: "college_pro",
    name: "Pro",
    price: {
      monthly: 15000,
      quarterly: 13500,
      yearly: 12500,
    },
    billingText: {
      monthly: "billed monthly (₹15,000)",
      quarterly: "billed quarterly (₹40,500)",
      yearly: "billed yearly (₹150,000)",
    },
    description: "Comprehensive capabilities for active campus placements.",
    icon: Sparkles,
    color: "#0062FF",
    glowColor: "rgba(0, 98, 255, 0.15)",
    badge: "Most Popular",
    features: [
      { text: "Up to 500 active student seats", included: true },
      { text: "Mock interviews (1000/mo)", included: true },
      { text: "Student reports (500/mo)", included: true },
      { text: "API Access (1000 calls/day)", included: true },
      { text: "100 GB Storage", included: true },
      { text: "Proctoring & AI Evaluation", included: true },
      { text: "Batch Management", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Placement Intelligence", included: false },
      { text: "Custom Branding", included: false },
    ],
  },
  {
    id: "college_enterprise",
    name: "Enterprise",
    price: {
      monthly: 50000,
      quarterly: 45000,
      yearly: 41667,
    },
    billingText: {
      monthly: "billed monthly (₹50,000)",
      quarterly: "billed quarterly (₹135,000)",
      yearly: "billed yearly (₹500,000)",
    },
    description: "Maximum scale solutions for universities and corporate boards.",
    icon: Shield,
    color: "#10B981",
    glowColor: "rgba(16, 185, 129, 0.15)",
    badge: "Best Value",
    features: [
      { text: "Up to 5000 active student seats", included: true },
      { text: "Unlimited mock interviews", included: true },
      { text: "Unlimited student reports", included: true },
      { text: "Unlimited API Access", included: true },
      { text: "1000 GB Storage", included: true },
      { text: "Proctoring & AI Evaluation", included: true },
      { text: "Batch Management", included: true },
      { text: "Advanced Analytics", included: true },
      { text: "Placement Intelligence", included: true },
      { text: "Custom Branding", included: true },
    ],
  },
];

export default function SubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [audience, setAudience] = useState<"student" | "college">("student");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [seatsCount, setSeatsCount] = useState<number>(5000);

  const activePlans = audience === "student" ? STUDENT_PLANS : COLLEGE_PLANS;

  const handleOpenPlanDetails = (plan: Plan) => {
    setSelectedPlan(plan);
    if (plan.id === "college_enterprise") {
      setSeatsCount(5000);
    } else if (plan.id === "college_pro") {
      setSeatsCount(500);
    } else if (plan.id === "college_basic") {
      setSeatsCount(50);
    } else {
      setSeatsCount(1);
    }
  };


  return (
    <div className="min-h-screen bg-[var(--th-bg)] relative flex flex-col overflow-hidden" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      
      {/* Background decorations */}
      <div className="absolute top-0 left-0 right-0 h-[600px] pointer-events-none overflow-hidden -z-10" aria-hidden>
        <div className="absolute -top-40 left-1/4 w-[500px] h-[500px] bg-[#0062FF]/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -top-40 right-1/4 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px]" />
      </div>

      <FirstNav />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-16 md:py-24 text-center space-y-16 relative z-10">
        
        {/* Title */}
        <div className="max-w-2xl mx-auto space-y-4">
          <span className="text-xs font-bold uppercase tracking-widest text-[#0062FF] bg-[#0062FF]/10 px-3 py-1 rounded-full">
            Pricing Plans
          </span>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-[var(--th-text-primary)]" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
            Invest in your dream career
          </h1>
          <p className="text-sm md:text-base text-[var(--th-text-secondary)] leading-relaxed">
            Gain unlimited access to AI resume analyzers, live platform syncs, and comprehensive prep analytics tailored to your career targets.
          </p>
        </div>

        {/* Tab Selector: Students vs Colleges */}
        <div className="flex justify-center border-b max-w-xs mx-auto pb-1" style={{ borderColor: "var(--th-border)" }}>
          <button
            onClick={() => setAudience("student")}
            className={cn(
              "flex-1 pb-2 text-sm font-bold transition-all cursor-pointer border-b-2 bg-transparent border-none",
              audience === "student" ? "border-[#0062FF] text-[#0062FF]" : "border-transparent text-[var(--th-text-faint)]"
            )}
          >
            For Students
          </button>
          <button
            onClick={() => setAudience("college")}
            className={cn(
              "flex-1 pb-2 text-sm font-bold transition-all cursor-pointer border-b-2 bg-transparent border-none",
              audience === "college" ? "border-[#0062FF] text-[#0062FF]" : "border-transparent text-[var(--th-text-faint)]"
            )}
          >
            For Colleges
          </button>
        </div>

        {/* Billing Cycle Switcher */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1 bg-[var(--th-bg-secondary)] p-1 rounded-2xl border border-[var(--th-border-strong)] relative z-10">
            {(["monthly", "quarterly", "yearly"] as BillingCycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className={cn(
                  "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative",
                  cycle === c
                    ? "bg-[#0062FF] text-white shadow-md"
                    : "text-[var(--th-text-secondary)] hover:text-[var(--th-text-primary)]"
                )}
              >
                <span>{c}</span>
                {c === "yearly" && (
                  <span className="absolute -top-2.5 -right-3 px-1.5 py-0.5 text-[8px] bg-emerald-600 text-white rounded-full font-extrabold normal-case">
                    -40%
                  </span>
                )}
                {c === "quarterly" && (
                  <span className="absolute -top-2.5 -right-3 px-1.5 py-0.5 text-[8px] bg-blue-600 text-white rounded-full font-extrabold normal-case">
                    -20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch max-w-6xl mx-auto justify-center">
          {activePlans.map((plan) => {
            const Icon = plan.icon;
            const price = plan.price[cycle];
            const isCustom = typeof price === "string";

            return (
              <div
                key={plan.id}
                onClick={() => handleOpenPlanDetails(plan)}
                className={cn(
                  "rounded-3xl border p-8 flex flex-col justify-between transition-all duration-300 relative text-left bg-[var(--th-card-bg)] hover:scale-[1.01] hover:shadow-2xl cursor-pointer",
                  plan.id === "pro" || plan.id === "college_scale" ? "border-[#0062FF]/50 ring-1 ring-[#0062FF]/20" : "border-[var(--th-card-border)]"
                )}
                style={{
                  boxShadow: `0 10px 30px -15px ${plan.glowColor}`,
                }}
              >
                {plan.badge && (
                  <span className="absolute -top-3.5 right-6 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-[#0062FF] text-white shadow-md">
                    {plan.badge}
                  </span>
                )}

                <div className="space-y-6">
                  {/* Icon & Plan name */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-inner"
                      style={{ backgroundColor: `${plan.color}15` }}
                    >
                      <Icon size={18} style={{ color: plan.color }} />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-lg text-[var(--th-text-primary)]">
                        {plan.name}
                      </h3>
                      <p className="text-[10px] text-[var(--th-text-faint)] uppercase tracking-wider font-bold">
                        {plan.id === "pro" || plan.id === "college_scale" ? "Premium Access" : "Standard Tier"}
                      </p>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed h-10">
                    {plan.description}
                  </p>

                  {/* Price info */}
                  <div className="space-y-1 border-y py-5 text-left border-[var(--th-border)]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[var(--th-text-primary)]">
                        {isCustom ? price : `₹${price}`}
                      </span>
                      {!isCustom && (
                        <span className="text-xs text-[var(--th-text-faint)]">
                          / month
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                      {plan.billingText[cycle]}
                    </p>
                  </div>

                  {/* Features checklist */}
                  <div className="space-y-3.5 pt-2">
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <div className={cn(
                          "w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          feat.included 
                            ? "bg-emerald-500/10 text-emerald-500" 
                            : "bg-gray-500/10 text-gray-400 opacity-40"
                        )}>
                          <Check size={10} strokeWidth={3} />
                        </div>
                        <span className={cn(
                          "leading-normal",
                          feat.included ? "text-[var(--th-text-primary)]" : "text-[var(--th-text-faint)] line-through"
                        )}>
                          {feat.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Button Action */}
                <button
                  type="button"
                  className={cn(
                    "w-full py-3.5 mt-8 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1 border-0 shadow-md",
                    plan.id === "pro" || plan.id === "college_scale"
                      ? "bg-[#0062FF] hover:bg-[#004BE6] text-white"
                      : "bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-[var(--th-text-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
                  )}
                >
                  <span>View Plan Details</span>
                  <ArrowRight size={12} />
                </button>

              </div>
            );
          })}
        </div>

        {/* Plan Details Confirmation Modal */}
        {selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-lg p-6 rounded-3xl border space-y-6 shadow-2xl relative bg-[var(--th-card-bg)] border-[var(--th-card-border)] text-left">
              <button
                type="button"
                onClick={() => setSelectedPlan(null)}
                className="absolute right-4 top-4 p-1 text-[var(--th-text-faint)] hover:text-[var(--th-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
              >
                <X size={18} />
              </button>

              {/* Title & Info */}
              <div className="space-y-2 border-b pb-4" style={{ borderColor: "var(--th-border)" }}>
                <h3 className="text-lg font-extrabold text-[var(--th-text-primary)] flex items-center gap-2">
                  <Sparkles size={18} className="text-[#0062FF]" />
                  <span>{selectedPlan.name} Details</span>
                </h3>
                <p className="text-xs text-[var(--th-text-secondary)]">{selectedPlan.description}</p>
              </div>

              {/* Subscription config fields */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Billing Cycle</span>
                    <p className="text-xs font-semibold text-[var(--th-text-primary)] capitalize">{cycle}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Price Mode</span>
                    <p className="text-xs font-semibold text-[var(--th-text-primary)] capitalize">
                      {typeof selectedPlan.price[cycle] === "number" ? `₹${selectedPlan.price[cycle]} / month` : selectedPlan.price[cycle]}
                    </p>
                  </div>
                </div>

                {/* Seats configuration count */}
                <div className="space-y-1.5 text-left">
                  <label className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Allocated Student Seats</label>
                  {audience === "college" ? (
                    <input
                      type="number"
                      min={10}
                      value={seatsCount}
                      onChange={(e) => setSeatsCount(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg border text-xs text-[var(--th-text-primary)] bg-[var(--th-input-bg)]"
                      style={{ borderColor: "var(--th-border-strong)" }}
                    />
                  ) : (
                    <p className="text-xs font-semibold text-[var(--th-text-primary)]">1 Seat (Individual Account)</p>
                  )}
                  <p className="text-[10px] text-[var(--th-text-faint)]">
                    {audience === "college" ? "Choose seats for your organization students" : "Standard individual account seat allocation"}
                  </p>
                </div>

                {/* Plan checklist preview details */}
                <div className="bg-[var(--th-bg-secondary)] p-4 rounded-2xl border border-[var(--th-border)] space-y-2.5">
                  <h4 className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Included Features Checklist</h4>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {selectedPlan.features.filter(f => f.included).map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[11px] text-[var(--th-text-primary)]">
                        <Check size={12} className="text-emerald-500 shrink-0" />
                        <span>{feat.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedPlan(null)}
                  className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-[var(--th-text-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null);
                    if (!isAuthenticated) {
                      router.push("/login");
                    } else {
                      router.push("/billing");
                    }
                  }}
                  className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-[#0062FF] hover:bg-[#004BE6] text-white border-0 shadow-md flex items-center gap-1.5"
                >
                  <span>Proceed to Billing</span>
                  <ArrowRight size={12} />
                </button>
              </div>

            </div>
          </div>
        )}

        {/* FAQ Grid */}
        <div className="max-w-4xl mx-auto space-y-8 pt-10 border-t border-[var(--th-border)]">
          <h2 className="text-xl font-bold text-[var(--th-text-primary)]">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-6 text-left">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[var(--th-text-primary)] flex items-center gap-1.5">
                <HelpCircle size={14} className="text-[#0062FF]" /> Can I change plans later?
              </h4>
              <p className="text-[11px] text-[var(--th-text-secondary)] leading-relaxed">
                Yes, you can upgrade, downgrade, or cancel your subscription at any time directly from your billing profile page.
              </p>
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-[var(--th-text-primary)] flex items-center gap-1.5">
                <HelpCircle size={14} className="text-[#0062FF]" /> Are there any hidden setup fees?
              </h4>
              <p className="text-[11px] text-[var(--th-text-secondary)] leading-relaxed">
                No, all our subscription charges are transparent. Taxes and processing fees are bundled within the prices shown.
              </p>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
