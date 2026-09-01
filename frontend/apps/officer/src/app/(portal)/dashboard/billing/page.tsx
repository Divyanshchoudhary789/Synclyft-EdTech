"use client";

import { CreditCard } from "lucide-react";

export default function OfficerBillingPage() {
  return (
    <div className="p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-lg font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
          Billing &amp; Subscription
        </h1>
        <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>
          Seats, invoices and plan management for your institute.
        </p>
      </div>
      <div
        className="flex flex-col items-center justify-center gap-3 rounded-xl border py-20 text-center"
        style={{ borderColor: "var(--th-border)", color: "var(--th-text-muted)" }}
      >
        <CreditCard size={28} />
        <p className="text-sm">Billing management is being wired to the backend billing APIs.</p>
      </div>
    </div>
  );
}
