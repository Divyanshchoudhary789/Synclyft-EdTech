"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@synclyft/lib/api";
import { CheckCircle2, XCircle, Loader2, ShieldCheck, ArrowRight } from "lucide-react";
import Footer from "@/components/layout/Footer";

function SuccessPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Extract payment details
  const razorpayOrderId = searchParams.get("razorpay_order_id") || "";
  const razorpayPaymentId = searchParams.get("razorpay_payment_id") || "";
  const razorpaySignature = searchParams.get("razorpay_signature") || "";

  const [verifying, setVerifying] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [verificationData, setVerificationData] = useState<any>(null);

  const handleVerifyPayment = async () => {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      alert("Missing query parameters from payment gateway.");
      return;
    }

    setVerifying(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const payload = {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        signature: razorpaySignature,
      };

      console.log("Verifying payment payload:", payload);
      const res = await api.post("/billing/verify-payment", payload);
      console.log("Payment verification response:", res);

      setVerificationData(res.data);
      setStatus("success");
      
      // Clear checkout data from localStorage on success
      localStorage.removeItem("checkout_data");
    } catch (err: any) {
      console.error("Payment verification failed:", err);
      setStatus("error");
      setErrorMsg(err.response?.data?.message || err.message || "Failed to verify payment with server");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full px-6 py-12 text-center">
      <div className="p-8 md:p-10 rounded-3xl border border-[var(--th-card-border)] bg-[var(--th-card-bg)] shadow-2xl space-y-8 relative overflow-hidden backdrop-blur-md">
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-blue-600 to-indigo-500" />

        {status === "idle" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto">
              <ShieldCheck size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[var(--th-text-primary)]">
                Payment Authorized
              </h2>
              <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed">
                Your payment has been successfully authorized at the gateway. Please click below to verify and activate your subscription plan.
              </p>
            </div>

            <div className="bg-[var(--th-bg-secondary)] p-4 rounded-2xl border border-[var(--th-border)] text-left space-y-2.5 text-[11px]">
              <h4 className="font-bold text-[var(--th-text-primary)] uppercase tracking-wider">Transaction References</h4>
              <div className="space-y-1.5 font-mono text-[var(--th-text-secondary)]">
                <div className="flex justify-between">
                  <span>Order ID:</span>
                  <span className="text-[var(--th-text-primary)] font-bold">{razorpayOrderId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment ID:</span>
                  <span className="text-[var(--th-text-primary)] font-bold">{razorpayPaymentId}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleVerifyPayment}
              disabled={verifying}
              className="w-full py-4 rounded-2xl bg-[#0062FF] hover:bg-[#004BE6] text-white text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 border-0 shadow-lg shadow-blue-500/10 disabled:opacity-60"
            >
              {verifying ? (
                <>
                  <Loader2 className="animate-spin" size={14} />
                  <span>Verifying Payment...</span>
                </>
              ) : (
                <>
                  <span>Verify Payment</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[var(--th-text-primary)]">
                Subscription Activated!
              </h2>
              <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed">
                {verificationData?.message || "Your payment was verified successfully and your active tier is updated."}
              </p>
            </div>

            {verificationData && (
              <div className="bg-[var(--th-bg-secondary)] p-4 rounded-2xl border border-[var(--th-border)] text-left space-y-2 text-[10px] font-mono text-[var(--th-text-primary)] overflow-x-auto max-h-40">
                <pre>{JSON.stringify(verificationData, null, 2)}</pre>
              </div>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <XCircle size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-[var(--th-text-primary)]">
                Verification Failed
              </h2>
              <p className="text-xs text-[var(--th-text-secondary)] leading-relaxed">
                We couldn&apos;t verify your payment with the server. Please check the logs or try verifying again.
              </p>
            </div>

            <div className="bg-rose-50/5 border border-rose-500/20 text-rose-600 p-4 rounded-2xl text-[11px] leading-relaxed text-left">
              <strong>Error:</strong> {errorMsg}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleVerifyPayment}
                className="flex-1 py-4 rounded-2xl bg-[#0062FF] hover:bg-[#004BE6] text-white text-xs font-black uppercase tracking-widest transition-all border-none cursor-pointer"
              >
                Retry Verification
              </button>
              <button
                type="button"
                onClick={() => router.push("/billing")}
                className="flex-1 py-4 rounded-2xl bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-[var(--th-text-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800 text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Back to Billing
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--th-bg)] flex flex-col justify-between relative overflow-hidden" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <main className="relative z-10 flex-1 flex items-center justify-center py-12">
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin text-[#0062FF]" size={36} />
            <p className="text-xs text-[var(--th-text-faint)] font-bold uppercase tracking-widest">Loading Gateway Ref...</p>
          </div>
        }>
          <SuccessPageContent />
        </Suspense>
      </main>

      <Footer />
    </div>
  );
}
