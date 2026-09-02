"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { billingService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import Footer from "@/components/layout/Footer";

function Content() {
  const params = useSearchParams();
  const orderId = params.get("razorpay_order_id") || params.get("orderId") || "";
  const paymentId = params.get("razorpay_payment_id") || params.get("paymentId") || "";
  const signature = params.get("razorpay_signature") || params.get("signature") || "";

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    if (!orderId || !paymentId || !signature) {
      setStatus("error");
      setMessage("This page is opened automatically after a payment. No payment details were found in the link.");
      return;
    }
    billingService
      .verifyPayment({ orderId, paymentId, signature })
      .then(() => {
        setStatus("success");
        setMessage("Your payment was verified and your subscription is now active.");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(toApiError(err).message);
      });
  }, [orderId, paymentId, signature]);

  return (
    <div className="mx-auto w-full max-w-md px-6 py-16 text-center">
      <div className="rounded-3xl border p-8 md:p-10" style={{ borderColor: "var(--th-card-border)", backgroundColor: "var(--th-card-bg)" }}>
        <div className="absolute-none h-1 -mt-8 -mx-8 mb-8 rounded-t-3xl bg-gradient-to-r from-blue-600 to-indigo-500" />

        {status === "verifying" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--th-text-primary)" }}>Verifying your payment…</h1>
            <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>Please don&apos;t close this window.</p>
          </div>
        )}

        {status === "success" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={28} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--th-text-primary)" }}>Subscription activated</h1>
            <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{message}</p>
            <Link href="/dashboard" className="mt-2 btn-primary flex items-center gap-2">
              Go to dashboard <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <XCircle size={28} />
            </div>
            <h1 className="text-xl font-bold" style={{ color: "var(--th-text-primary)" }}>Payment not verified</h1>
            <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>{message}</p>
            <p className="text-[11px]" style={{ color: "var(--th-text-faint)" }}>
              If money was deducted, it will be auto-reconciled or refunded. You can also retry from the billing page.
            </p>
            <div className="flex gap-2 mt-1">
              <Link href="/billing" className="btn-secondary">Billing</Link>
              <Link href="/subscription" className="btn-primary">Plans</Link>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--th-text-muted)" }}>
          <ShieldCheck size={10} className="text-emerald-500" /> Razorpay signature verified server-side
        </div>
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--th-bg)", fontFamily: "var(--font-inter), sans-serif" }}>
      <div className="flex-1 flex items-center justify-center">
        <Suspense fallback={null}>
          <Content />
        </Suspense>
      </div>
      <Footer />
    </div>
  );
}
