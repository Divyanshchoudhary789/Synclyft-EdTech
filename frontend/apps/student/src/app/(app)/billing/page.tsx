"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@synclyft/ui/components/Badge";
import { Button } from "@synclyft/ui/components/Button";
import { SkeletonBlock } from "@synclyft/ui/components/SkeletonBlock";
import { useInvoices, useCurrentSubscription } from "@synclyft/lib/api/hooks";
import { API_BASE_URL, toApiError } from "@synclyft/lib/api";
import { planLabel } from "@synclyft/lib/utils";
import { CreditCard, Download, FileText, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const STATUS_VARIANT: Record<string, "verdant" | "amber" | "coral" | "neutral"> = {
  completed: "verdant", paid: "verdant",
  pending: "amber", processing: "amber",
  failed: "coral", overdue: "coral",
};

function money(n: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(n);
  } catch {
    return `₹${n}`;
  }
}

export default function BillingPage() {
  const { data: invoices, isLoading, isError, refetch } = useInvoices();
  const { data: current } = useCurrentSubscription();
  const [downloading, setDownloading] = useState<string | null>(null);

  const sub = current?.subscription ?? null;

  const download = async (id: string) => {
    setDownloading(id);
    try {
      const res = await fetch(`${API_BASE_URL}/billing/invoices/${id}/download-pdf`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Could not download invoice");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <p className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>Billing</p>
          <h1 className="text-[1.65rem] sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Invoices &amp; billing
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--th-text-faint)" }}>Your subscription status and downloadable GST invoices</p>
        </div>

        {/* Current plan */}
        <div className="rounded-2xl border p-6 flex flex-wrap items-center gap-4" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <div className="p-2.5 rounded-xl bg-blue-500/10"><CreditCard size={18} className="text-blue-600 dark:text-blue-400" /></div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>
              {sub ? planLabel(sub.planType) : "No active subscription"}
            </p>
            <p className="text-xs" style={{ color: "var(--th-text-faint)" }}>
              {sub ? `Status: ${sub.status}${sub.endDate ? ` · renews ${new Date(sub.endDate).toLocaleDateString("en-IN")}` : ""}` : "You're on the free trial"}
            </p>
          </div>
          <Link href="/subscription"><Button variant="secondary">{sub ? "Manage plan" : "See plans"}</Button></Link>
        </div>

        {/* Invoices */}
        <div className="rounded-2xl border overflow-hidden" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: "var(--th-border)" }}>
            <h3 className="text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>Invoice history</h3>
          </div>

          {isLoading ? (
            <div className="p-6 space-y-3">
              <SkeletonBlock height="h-10" /><SkeletonBlock height="h-10" /><SkeletonBlock height="h-10" />
            </div>
          ) : isError ? (
            <div className="p-8 text-center">
              <AlertCircle size={22} className="mx-auto mb-2 text-amber-500" />
              <p className="text-xs mb-3" style={{ color: "var(--th-text-muted)" }}>Couldn&apos;t load invoices.</p>
              <Button variant="secondary" onClick={() => refetch()}>Retry</Button>
            </div>
          ) : !invoices || invoices.length === 0 ? (
            <div className="p-10 text-center">
              <FileText size={24} className="mx-auto mb-2" style={{ color: "var(--th-text-faint)" }} />
              <p className="text-xs" style={{ color: "var(--th-text-muted)" }}>No invoices yet. They&apos;ll appear here after your first payment.</p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--th-border)" }}>
              {invoices.map((inv) => (
                <div key={inv._id} className="px-6 py-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: "var(--th-text-primary)" }}>
                      {inv.invoiceNumber ?? `Invoice ${inv._id.slice(-6)}`}
                    </p>
                    <p className="text-[11px] font-mono" style={{ color: "var(--th-text-faint)" }}>
                      {new Date(inv.invoiceDate ?? inv.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <span className="font-mono text-sm font-bold" style={{ color: "var(--th-text-primary)" }}>
                    {money(inv.totalAmount, inv.currency)}
                  </span>
                  <Badge variant={STATUS_VARIANT[inv.paymentStatus] ?? "neutral"}>{inv.paymentStatus}</Badge>
                  <button
                    onClick={() => download(inv._id)}
                    disabled={downloading === inv._id}
                    className="p-2 rounded-lg transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.03] disabled:opacity-50"
                    title="Download PDF">
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
