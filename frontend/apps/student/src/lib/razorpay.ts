// Razorpay Checkout helper now lives in the shared lib so the officer app can
// reuse it. Kept as a re-export to avoid touching existing student imports.
export { openRazorpay } from "@synclyft/lib/razorpay";
export type { RazorpaySuccess } from "@synclyft/lib/razorpay";
