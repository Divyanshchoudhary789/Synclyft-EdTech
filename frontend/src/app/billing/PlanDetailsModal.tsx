"use client";

import React from "react";
import { Check, Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: Record<string, number>;
  billingText: Record<string, string>;
  description: string;
  features: PlanFeature[];
}

interface PlanDetailsModalProps {
  plan: Plan | null;
  cycle: "monthly" | "quarterly" | "yearly";
  onClose: () => void;
  onCheckout?: (selectedCycle: "monthly" | "quarterly" | "yearly", autoRenew: boolean) => void;
  submitting?: boolean;
}

export function PlanDetailsModal({ plan, cycle: initialCycle, onClose, onCheckout, submitting = false }: PlanDetailsModalProps) {
  const [prevCycle, setPrevCycle] = React.useState(initialCycle);
  const [prevPlan, setPrevPlan] = React.useState(plan);
  const [localCycle, setLocalCycle] = React.useState(initialCycle);
  const [autoRenew, setAutoRenew] = React.useState<boolean>(true);

  if (initialCycle !== prevCycle || plan !== prevPlan) {
    setPrevCycle(initialCycle);
    setPrevPlan(plan);
    setLocalCycle(initialCycle);
  }

  if (!plan) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg p-6 rounded-3xl border space-y-6 shadow-2xl relative bg-[var(--th-card-bg)] border-[var(--th-card-border)] text-left animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1 text-[var(--th-text-faint)] hover:text-[var(--th-text-primary)] transition-colors border-0 bg-transparent cursor-pointer"
          disabled={submitting}
        >
          <X size={18} />
        </button>

        <div className="space-y-2 border-b pb-4 border-[var(--th-border)]">
          <h3 className="text-lg font-extrabold text-[var(--th-text-primary)] flex items-center gap-2">
            <Sparkles size={18} className="text-[#0062FF]" />
            <span>{plan.name} Features & Details</span>
          </h3>
          <p className="text-xs text-[var(--th-text-secondary)]">{plan.description}</p>
        </div>

        <div className="space-y-4">
          {/* Cycle Selector within Modal */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold text-[var(--th-text-secondary)] tracking-wider">Billing Cycle</label>
            <div className="flex bg-[var(--th-bg-secondary)] p-1 rounded-2xl border border-[var(--th-border-strong)] max-w-sm relative">
              {(["monthly", "quarterly", "yearly"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setLocalCycle(c)}
                  className={cn(
                    "flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-350 cursor-pointer relative z-10 border-0 bg-transparent",
                    localCycle === c ? "bg-[#0062FF] text-white shadow-md font-black" : "text-[var(--th-text-secondary)] hover:text-[var(--th-text-primary)]"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Pricing Mode</span>
              <p className="text-xs font-semibold text-[var(--th-text-primary)]">
                ₹{plan.price[localCycle]} / month
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Billing Type</span>
              <p className="text-xs font-semibold text-[var(--th-text-primary)] capitalize">{plan.billingText[localCycle]}</p>
            </div>
          </div>

          {/* Auto Renew Toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-[var(--th-bg-secondary)] border border-[var(--th-border)]">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-[var(--th-text-primary)]">Auto-Renew Subscription</span>
              <p className="text-[10px] text-[var(--th-text-faint)]">Automatically renew when cycle ends</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoRenew(!autoRenew)}
              className={cn(
                "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
                autoRenew ? "bg-[#0062FF]" : "bg-gray-200 dark:bg-neutral-800"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  autoRenew ? "translate-x-5" : "translate-x-0"
                )}
              />
            </button>
          </div>

          <div className="bg-[var(--th-bg-secondary)] p-4 rounded-2xl border border-[var(--th-border)] space-y-2.5">
            <h4 className="text-[10px] uppercase font-bold text-[var(--th-text-faint)]">Included Features Checklist</h4>
            <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {plan.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-2 text-[11px] text-[var(--th-text-primary)]">
                  <Check size={12} className={cn(feat.included ? "text-emerald-500" : "text-gray-400 opacity-40")} />
                  <span className={cn(!feat.included && "line-through text-[var(--th-text-faint)]")}>{feat.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-[var(--th-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-[var(--th-text-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
            disabled={submitting}
          >
            Close
          </button>
          {onCheckout && (
            <button
              type="button"
              onClick={() => onCheckout(localCycle, autoRenew)}
              disabled={submitting}
              className="px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer bg-[#0062FF] hover:bg-[#004BE6] text-white border-0 shadow-md flex items-center gap-1.5 disabled:opacity-60"
            >
              {submitting ? "Processing..." : "Select & Checkout"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
