import type { RazorpayCheckout } from "./api/services";

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<boolean> | null = null;

function loadScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Opens Razorpay Checkout for a payment link returned by the backend and
 * resolves with the success payload (to be sent to /billing/verify-payment).
 * Rejects if the user dismisses the modal or the script fails to load.
 */
export async function openRazorpay(
  checkout: RazorpayCheckout,
  prefill?: { name?: string; email?: string; contact?: string },
): Promise<RazorpaySuccess> {
  const ok = await loadScript();
  if (!ok) throw new Error("Could not load the payment gateway. Check your connection.");

  return new Promise((resolve, reject) => {
    const rzp = new (window as unknown as { Razorpay: new (o: unknown) => { open: () => void } }).Razorpay({
      key: checkout.key,
      order_id: checkout.order_id,
      amount: checkout.amount,
      currency: checkout.currency,
      name: checkout.name || "Synclyft",
      description: checkout.description,
      theme: checkout.theme ?? { color: "#0062FF" },
      prefill: {
        name: prefill?.name ?? "",
        email: prefill?.email ?? checkout.customer_email ?? "",
        contact: prefill?.contact ?? checkout.customer_phone ?? "",
      },
      handler: (res: RazorpaySuccess) => resolve(res),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rzp.open();
  });
}
