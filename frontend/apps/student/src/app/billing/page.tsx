"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layout/Footer";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { api } from "@synclyft/lib/api";
import {
  Check, Sparkles, Zap, Shield,
  HelpCircle, ArrowLeft, Loader2, CreditCard, X
} from "lucide-react";
import { cn } from "@synclyft/lib/utils";
import { PlanDetailsModal } from "./PlanDetailsModal";
import { json } from "zod";

type BillingCycle = "monthly" | "quarterly" | "yearly";

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: Record<BillingCycle, number>;
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
    id: " student_pro",
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
    id: "basic",
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
    id: "pro ",
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
    id: "enterprise",
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

export default function BillingPage() {
  const router = useRouter();
  const { user, fetchUser, loading: authLoading } = useAuthStore();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [submittingSub, setSubmittingSub] = useState(false);
  const [detailModalPlan, setDetailModalPlan] = useState<Plan | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [pendingSubscription, setPendingSubscription] = useState<any>(null);
  const [pendingPopupData, setPendingPopupData] = useState<{ subscription: any; invoice: any } | null>(null);
  const [organization, setOrganization] = useState<any>(null);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Determine user category/audience
  const isCollegeUser = user?.role === "college-admin";
  const activePlans = isCollegeUser ? COLLEGE_PLANS : STUDENT_PLANS;

  const [prevIsCollegeUser, setPrevIsCollegeUser] = useState(isCollegeUser);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(() => {
    const defaultPlan = activePlans.find(p => p.id === "student_pro" || p.id === "college_pro") || activePlans[0];
    return defaultPlan || null;
  });
  const [seatsCount, setSeatsCount] = useState<number>(() => {
    const defaultPlan = activePlans.find(p => p.id === "student_pro" || p.id === "college_pro") || activePlans[0];
    if (!defaultPlan) return 1;
    return defaultPlan.id === "college_pro" ? 500 : defaultPlan.id === "college_basic" ? 50 : defaultPlan.id === "college_enterprise" ? 5000 : 1;
  });

  if (isCollegeUser !== prevIsCollegeUser) {
    setPrevIsCollegeUser(isCollegeUser);
    const defaultPlan = activePlans.find(p => p.id === "student_pro" || p.id === "college_pro") || activePlans[0];
    setSelectedPlan(defaultPlan || null);
    setSeatsCount(defaultPlan ? (defaultPlan.id === "college_pro" ? 500 : defaultPlan.id === "college_basic" ? 50 : defaultPlan.id === "college_enterprise" ? 5000 : 1) : 1);
  }

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setDetailModalPlan(plan);
    console.log("Plan", plan)
    if (plan.id === "enterprise") {
      setSeatsCount(5000);
    } else if (plan.id === "college_pro") {
      setSeatsCount(500);
    } else if (plan.id === "college_basic") {
      setSeatsCount(50);
    } else {
      setSeatsCount(1);
    }
  };

  const triggerNormalCheckout = async (finalCycle: BillingCycle, autoRenew: boolean) => {
    if (!selectedPlan) return;
    setSubmittingSub(true);
    try {
      const apiPlanId = selectedPlan.id;

      const payload = {
        planId: apiPlanId,
        seats: seatsCount,
        billingCycle: finalCycle,
        autoRenew: autoRenew
      };

      console.log("Submitting billing checkout payload:", payload);
      const res = await api.post("/subscriptions/create", payload);
      console.log("Checkout successful response:", res);
      const dataToStore = res.data || res;
      sessionStorage.setItem("checkout_data", JSON.stringify(dataToStore));
      setCheckoutResult(dataToStore);
      alert(`Subscription for ${selectedPlan.name} created successfully!`);
    } catch (err: any) {
      console.error("Subscription purchase failed:", err);
      alert("Purchase failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingSub(false);
    }
  };

  const triggerUserCheckout = async (finalCycle: BillingCycle, autoRenew: boolean) => {
    if (!selectedPlan) return;
    setSubmittingSub(true);
    try {
      const apiPlanId = selectedPlan.id;

      const payload = {
        planId: apiPlanId,
        seats: seatsCount,
        billingCycle: finalCycle,
        autoRenew: autoRenew
      };

      console.log("Submitting user billing checkout payload:", payload);
      const res = await api.post("/subscriptions/self/create", payload);
      console.log("User checkout successful response:", res);
      const dataToStore = res.data || res;
      sessionStorage.setItem("checkout_data", JSON.stringify(dataToStore));
      setCheckoutResult(dataToStore);
      alert(`Subscription for ${selectedPlan.name} created successfully!`);
    } catch (err: any) {
      console.error("User subscription purchase failed:", err);
      alert("Purchase failed: " + (err.response?.data?.message || err.message));
    } finally {
      setSubmittingSub(false);
    }
  };

  const handlecurrentSubscription = async (orgId: any, finalCycle: any, autoRenew: boolean = true) => {
    try {
      console.log(`Checking current subscription for org ID: ${orgId}`);
      const res = await api.get(`/subscriptions/current/${orgId}`);
      console.log("Current subscription fetch response:", res);

      const subData = res.data?.data || res.data;
      const subscription = subData?.subscription || subData;
      console.log("res", res.data);

      if (res.data?.statusCode === 404 || (res.data?.success === false && res.data?.statusCode !== 500) || !subscription) {
        triggerNormalCheckout(finalCycle, autoRenew);
      } else {
        try {
          const invoiceRes = await api.get("/billing/invoices?status=pending&page=1");
          console.log("Pending invoices response:", invoiceRes.data);
          setPendingPopupData({
            subscription: subscription,
            invoice: invoiceRes.data?.data || invoiceRes.data
          });
        } catch (invoiceErr) {
          console.error("Failed to fetch pending invoices:", invoiceErr);
          setPendingPopupData({
            subscription: subscription,
            invoice: null
          });
        }
      }

      // Otherwise show resume alert banner if available
      if (subData && (subData.paymentLink || subData.billing)) {
        setPendingSubscription(res.data);
      }
    } catch (err: any) {
      console.error("No current subscription setup found or error fetching:", err);
      // Fallback to normal checkout on 404
      if (err.response?.status === 404) {
        triggerNormalCheckout(finalCycle, autoRenew);
      } else {
        alert(err?.message || "Error fetching current subscription. Proceeding to checkout...");
        triggerNormalCheckout(finalCycle, autoRenew);
      }
    }
  };

  const handleUserCurrentSubscription = async (finalCycle: BillingCycle, autoRenew: boolean = true) => {
    try {
      console.log("Checking current user subscription...");
      const res = await api.get("/subscriptions/self/current");
      console.log("Current user subscription fetch response:", res);

      const subData = res.data?.data || res.data;
      
      // Check if subscription list/data is empty
      const isEmpty = !subData || (Array.isArray(subData) && subData.length === 0) || res.data?.statusCode === 404;

      if (isEmpty) {
        await triggerUserCheckout(finalCycle, autoRenew);
      } else {
        const subscription = Array.isArray(subData) ? subData[0] : (subData?.subscription || subData);
        if (!subscription) {
          await triggerUserCheckout(finalCycle, autoRenew);
          return;
        }

        try {
          const invoiceRes = await api.get("/billing/invoices?status=pending&page=1");
          console.log("Pending invoices response:", invoiceRes.data);
          setPendingPopupData({
            subscription: subscription,
            invoice: invoiceRes.data?.data || invoiceRes.data
          });
        } catch (invoiceErr) {
          console.error("Failed to fetch pending invoices:", invoiceErr);
          setPendingPopupData({
            subscription: subscription,
            invoice: null
          });
        }

        if (subData && (subData.paymentLink || subData.billing)) {
          setPendingSubscription(res.data);
        }
      }
    } catch (err: any) {
      console.error("Error checking user subscription:", err);
      if (err.response?.status === 404 || err.response?.data?.statusCode === 404) {
        await triggerUserCheckout(finalCycle, autoRenew);
      } else {
        alert(err?.message || "Error fetching current subscription. Proceeding to checkout...");
        await triggerUserCheckout(finalCycle, autoRenew);
      }
    }
  };

  const handleCheckout = async (selectedCycle?: BillingCycle, autoRenew: boolean = true) => {
    if (!selectedPlan) return;
    const finalCycle = selectedCycle || cycle;

    const storedData = sessionStorage.getItem("checkout_data");
    console.log(`Stored Data ${storedData}`);
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        console.log("Using checkout data retrieved from localStorage:", parsedData);
        setCheckoutResult(parsedData);
        return;
      } catch (err) {
        console.error("Failed to parse stored checkout data from sessionStorage:", err);
      }
    }

    if (user?.role === "college-admin") {
      let orgId = organization?._id || (typeof organization === "string" ? organization : "");
      if (!orgId) {
        try {
          const orgRes = await api.get("college-admin/organization/me");
          orgId = orgRes.data?.data?.organization?._id || orgRes.data?.organization?._id;
          console.log(`org ID resolved: ${orgId}`);
          setOrganization(orgId);
        } catch (e: any) {
          console.error("Failed to fetch organization details:", e);
          triggerNormalCheckout(finalCycle, autoRenew);
          return;
        }
      }

      if (orgId) {
        await handlecurrentSubscription(orgId, finalCycle, autoRenew);
      } else {
        triggerNormalCheckout(finalCycle, autoRenew);
      }
    } else {
      // Students call current subscription check, and then fallback to triggerUserCheckout
      await handleUserCurrentSubscription(finalCycle, autoRenew);
    }
  };

  const handleInitiatePayment = () => {
    const paymentLink = checkoutResult?.data?.paymentLink;
    if (!paymentLink) {
      alert("Payment details not found in the checkout response.");
      return;
    }

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const options = {
        key: paymentLink.key,
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        name: paymentLink.name,
        description: paymentLink.description,
        order_id: paymentLink.order_id,
        handler: function (response: any) {
          const url = new URL(paymentLink.callback_url);
          url.searchParams.append("razorpay_payment_id", response.razorpay_payment_id);
          url.searchParams.append("razorpay_order_id", response.razorpay_order_id);
          url.searchParams.append("razorpay_signature", response.razorpay_signature);
          window.location.href = url.toString();
        },
        prefill: {
          email: paymentLink.customer_email || "",
          contact: paymentLink.customer_phone || ""
        },
        theme: {
          color: paymentLink.theme?.color || "#0062FF"
        }
      };
      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    };
    document.body.appendChild(script);
  };

  const handleCancelCheckout = async () => {
    const subscriptionId = checkoutResult?.data?.subscription?._id;
    // if (!subscriptionId) {
    //   sessionStorage.removeItem("checkout_data");
    //   setPendingSubscription(null);
    //   setCheckoutResult(null);
    //   return;
    // }

    const reason = prompt("Please tell us why you are cancelling this subscription setup:");
    if (reason === null) {
      // User clicked "Cancel" on the prompt dialog box, do not proceed
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      console.log(`Cancel ${trimmedReason}`);
      alert("A cancellation reason is required to proceed.");
      return;
    }
    console.log(`Cancel ${trimmedReason}`);

    try {
      console.log("Cancelling subscription checkout for ID:", subscriptionId);
      const res = await api.put("/subscriptions/cancel", {
        subscriptionId: `${subscriptionId}`,
        reason: `${trimmedReason}`
      });
      console.log("Cancellation response:", res);
      alert("Subscription checkout cancelled successfully.");
    } catch (err: any) {
      console.error("Failed to cancel subscription checkout:", err);
      alert("Failed to cancel subscription: " + (err.response?.data?.message || err.message));
    } finally {
      sessionStorage.removeItem("checkout_data");
      setPendingSubscription(null);
      setCheckoutResult(null);
    }
  };

  const handleResumePayment = async () => {
    if (!pendingPopupData) return;
    const subId = pendingPopupData.subscription?._id || pendingPopupData.subscription?.id;

    // Attempt to extract invoice ID
    let invoiceId = "";
    if (pendingPopupData.invoice) {
      const invList = pendingPopupData.invoice.invoices || (Array.isArray(pendingPopupData.invoice) ? pendingPopupData.invoice : []);
      const invObj = invList[0] || pendingPopupData.invoice;
      invoiceId = invObj?._id || invObj?.id || "";
    }

    let customerEmail = pendingPopupData.subscription?.contactEmail || user?.email || "";
    if (!customerEmail) {
      const inputEmail = prompt("Please enter your email to proceed with payment:");
      if (!inputEmail) {
        alert("Email is required to proceed.");
        return;
      }
      customerEmail = inputEmail.trim();
    }

    let customerPhone = pendingPopupData.subscription?.contactPhone || (user as any)?.phone || "";
    if (!customerPhone) {
      const inputPhone = prompt("Please enter your contact phone number to proceed with payment:");
      if (!inputPhone) {
        alert("Phone number is required to proceed.");
        return;
      }
      customerPhone = inputPhone.trim();
    }

    try {
      console.log(`Initiating payment resumption for subscription ${subId} and invoice ${invoiceId}`);
      const res = await api.post("/billing/initiate-payment", {
        subscriptionId: subId,
        invoiceId: invoiceId,
        customerEmail,
        customerPhone
      });
      console.log("Initiate payment response:", res);

      const paymentLink = res.data?.paymentLink || res.data?.data?.paymentLink || res.data;
      if (!paymentLink) {
        alert("Payment link details not returned by initiate-payment API.");
        return;
      }

      // Close the pending popup
      setPendingPopupData(null);

      // Trigger Razorpay Checkout
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      script.onload = () => {
        const options = {
          key: paymentLink.key,
          amount: paymentLink.amount,
          currency: paymentLink.currency,
          name: paymentLink.name,
          description: paymentLink.description,
          order_id: paymentLink.order_id,
          handler: function (response: any) {
            const callbackUrl = paymentLink.callback_url || "https://ed-tech-frontend-eight.vercel.app//payment/success";
            const url = new URL(callbackUrl);
            url.searchParams.append("razorpay_payment_id", response.razorpay_payment_id);
            url.searchParams.append("razorpay_order_id", response.razorpay_order_id);
            url.searchParams.append("razorpay_signature", response.razorpay_signature);
            window.location.href = url.toString();
          },
          prefill: {
            email: paymentLink.customer_email || "",
            contact: paymentLink.customer_phone || ""
          },
          theme: {
            color: paymentLink.theme?.color || "#0062FF"
          }
        };
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      };
      document.body.appendChild(script);

    } catch (err: any) {
      console.error("Resume payment failed:", err);
      alert("Failed to initiate payment: " + (err.response?.data?.message || err.message));
    }
  };

  const handleCancelPendingSubscription = async () => {
    if (!pendingPopupData) return;
    const subId = pendingPopupData.subscription?._id || pendingPopupData.subscription?.id;

    const reason = prompt("Please tell us why you are cancelling this pending subscription:");
    if (reason === null) {
      return;
    }

    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      alert("A cancellation reason is required to proceed.");
      return;
    }

    try {
      console.log("Cancelling pending subscription ID:", subId);
      const res = await api.put("/subscriptions/cancel", {
        subscriptionId: `${subId}`,
        reason: `${trimmedReason}`
      });
      console.log("Cancellation response:", res);
      alert("Pending subscription cancelled successfully.");
      setPendingPopupData(null);
    } catch (err: any) {
      console.error("Failed to cancel pending subscription:", err);
      alert("Failed to cancel: " + (err.response?.data?.message || err.message));
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--th-bg)]">
        <Loader2 className="animate-spin text-[#0062FF]" size={36} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--th-bg)] flex flex-col justify-between relative overflow-hidden" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
        <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-20 right-10 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col">
        <div>
          <button type="button" onClick={() => router.back()} className="p-2 m-5 rounded-md"><ArrowLeft size={20} /></button>
        </div>

        <main className="max-w-6xl mx-auto w-full px-6 py-4 md:py-3 flex-1 flex flex-col justify-center space-y-12">
          {pendingSubscription && (
            <div className="max-w-4xl mx-auto w-full p-5 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in duration-200">
              <div className="text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0062FF] bg-[#0062FF]/10 px-2.5 py-1 rounded-full">
                  Pending Order Detected
                </span>
                <p className="text-xs text-[var(--th-text-secondary)] mt-2">
                  You have an incomplete checkout setup for plan: <strong className="uppercase text-blue-500">{pendingSubscription.data?.subscription?.planType || pendingSubscription.subscription?.planType || "Selected Package"}</strong>. Resume your transaction to finalize activation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCheckoutResult(pendingSubscription);
                  sessionStorage.setItem("checkout_data", JSON.stringify(pendingSubscription));
                }}
                className="px-5 py-2.5 bg-[#0062FF] hover:bg-[#004BE6] text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer border-0 shadow-md whitespace-nowrap"
              >
                Resume your billing
              </button>
            </div>
          )}

          {/* Header section */}
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-[var(--th-text-primary)]" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
              Unlock Pro Capabilities
            </h1>
            <p className="text-xs md:text-sm text-[var(--th-text-secondary)] leading-relaxed max-w-lg mx-auto">
              Pricing dynamically configured for: <strong className="text-blue-500 font-bold capitalize">{isCollegeUser ? "College Administrator" : "Student / Candidate"}</strong>
            </p>
          </div>

          <div className="space-y-8">
            {/* Plans Selection container */}
            <div className="p-6 md:p-8 rounded-3xl border border-[var(--th-card-border)] bg-[var(--th-card-bg)] shadow-xl relative overflow-hidden backdrop-blur-md max-w-4xl mx-auto">
              <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500 opacity-60" />

              <h3 className="text-xs uppercase tracking-wider font-extrabold text-[var(--th-text-faint)] flex items-center gap-2 mb-6">
                <Sparkles size={14} className="text-blue-500" />
                <span>Choose Your Subscription Plan</span>
              </h3>

              <div className="grid md:grid-cols-3 gap-6">
                {activePlans.map((plan) => {
                  const isSelected = selectedPlan?.id === plan.id;
                  const Icon = plan.icon;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan)}
                      className={cn(
                        "p-6 rounded-2xl border transition-all duration-300 cursor-pointer flex flex-col justify-between relative group hover:scale-[1.02] hover:shadow-lg text-left min-h-[220px]",
                        isSelected
                          ? "border-blue-500 bg-blue-500/5 shadow-inner"
                          : "border-[var(--th-border)] bg-[var(--th-bg-secondary)] hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40"
                      )}
                    >
                      {plan.badge && (
                        <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full text-[7px] font-black uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                          {plan.badge}
                        </span>
                      )}

                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm"
                            style={{ backgroundColor: `${plan.color}15` }}
                          >
                            <Icon size={18} style={{ color: plan.color }} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-[var(--th-text-primary)]">{plan.name}</h4>
                            <span className="text-[8px] uppercase font-bold tracking-widest text-blue-500 hover:underline">
                              click to view details
                            </span>
                          </div>
                        </div>
                        <p className="text-[10px] text-[var(--th-text-faint)] leading-normal mt-1">{plan.description}</p>
                      </div>

                      <div className="mt-6 border-t pt-4 border-[var(--th-border)] flex justify-between items-baseline">
                        <div>
                          <span className="text-lg font-black text-[var(--th-text-primary)]">₹{plan.price[cycle]}</span>
                          <span className="text-[9px] text-[var(--th-text-faint)]"> {isCollegeUser ? "/ mo" : "/ seat / mo"}</span>
                        </div>
                        <span className="text-[9px] font-bold text-[#0062FF] uppercase tracking-wider group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                          Details &rarr;
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Plan Details Popup Modal */}
      <PlanDetailsModal
        plan={detailModalPlan}
        cycle={cycle}
        onClose={() => setDetailModalPlan(null)}
        onCheckout={(selectedCycle, autoRenew) => {
          setDetailModalPlan(null);
          handleCheckout(selectedCycle, autoRenew);
        }}
        submitting={submittingSub}
      />

      {/* Full Screen Subscription & Payment Popup Modal */}
      {checkoutResult && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--th-bg)] flex flex-col animate-in fade-in duration-250">
          <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
            <div className="absolute top-10 left-10 w-96 h-96 rounded-full bg-blue-500/10 blur-[100px] animate-pulse" />
            <div className="absolute bottom-20 right-10 w-[500px] h-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />
          </div>

          <div className="relative z-10 max-w-4xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-between">
            {/* Header */}
            <div className="flex justify-between items-start border-b pb-6 border-[var(--th-border)]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#0062FF] bg-[#0062FF]/10 px-3 py-1 rounded-full">
                  Checkout Invoice
                </span>
                <h2 className="text-2xl md:text-3xl font-black text-[var(--th-text-primary)] mt-3">
                  {checkoutResult.message || "Complete your payment details"}
                </h2>
                <p className="text-xs text-[var(--th-text-secondary)] mt-1">
                  Plan Type: <strong className="text-blue-500 uppercase">{checkoutResult.data?.subscription?.planType || selectedPlan?.name}</strong> • Billing Cycle: <strong className="capitalize">{checkoutResult.data?.subscription?.billingCycle || cycle}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelCheckout}
                className="p-2.5 rounded-full bg-[var(--th-bg-secondary)] border border-[var(--th-border)] hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X size={20} className="text-[var(--th-text-primary)]" />
              </button>
            </div>

            {/* Content Details */}
            <div className="grid md:grid-cols-2 gap-8 py-8 items-start text-left">
              {/* Left Column: Plan & Limits */}
              <div className="space-y-6">
                <div className="p-6 rounded-3xl border border-[var(--th-card-border)] bg-[var(--th-card-bg)] shadow-lg space-y-4">
                  <h4 className="text-xs font-black text-[var(--th-text-primary)] uppercase tracking-wider border-b pb-3 border-[var(--th-border)]">
                    Subscription Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Subscription ID:</span>
                      <span className="font-mono text-[10px] font-bold text-[var(--th-text-primary)]">{checkoutResult.data?.subscription?._id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Allocated Seats:</span>
                      <span className="font-bold text-[var(--th-text-primary)]">{checkoutResult.data?.subscription?.totalSeats} seat(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Start Date:</span>
                      <span className="font-bold text-[var(--th-text-primary)]">{new Date(checkoutResult.data?.subscription?.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Due Date (End):</span>
                      <span className="font-bold text-[var(--th-text-primary)]">{new Date(checkoutResult.data?.subscription?.endDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl border border-[var(--th-card-border)] bg-[var(--th-card-bg)] shadow-lg space-y-3">
                  <h4 className="text-xs font-black text-[var(--th-text-primary)] uppercase tracking-wider">
                    Allocated Resource Limits
                  </h4>
                  <div className="grid grid-cols-2 gap-3 text-[10px] text-[var(--th-text-secondary)]">
                    <div className="bg-[var(--th-bg-secondary)] p-3 rounded-xl border">
                      <p className="font-bold uppercase tracking-wider">Mock Interviews</p>
                      <p className="text-xs font-black text-[var(--th-text-primary)] mt-1">
                        {checkoutResult.data?.subscription?.limits?.mockInterviewsPerMonth === -1 ? "Unlimited" : checkoutResult.data?.subscription?.limits?.mockInterviewsPerMonth} / mo
                      </p>
                    </div>
                    <div className="bg-[var(--th-bg-secondary)] p-3 rounded-xl border">
                      <p className="font-bold uppercase tracking-wider">Reports</p>
                      <p className="text-xs font-black text-[var(--th-text-primary)] mt-1">
                        {checkoutResult.data?.subscription?.limits?.studentReportsPerMonth === -1 ? "Unlimited" : checkoutResult.data?.subscription?.limits?.studentReportsPerMonth} / mo
                      </p>
                    </div>
                    <div className="bg-[var(--th-bg-secondary)] p-3 rounded-xl border">
                      <p className="font-bold uppercase tracking-wider">API calls / day</p>
                      <p className="text-xs font-black text-[var(--th-text-primary)] mt-1">
                        {checkoutResult.data?.subscription?.limits?.apiCallsPerDay === -1 ? "Unlimited" : checkoutResult.data?.subscription?.limits?.apiCallsPerDay}
                      </p>
                    </div>
                    <div className="bg-[var(--th-bg-secondary)] p-3 rounded-xl border">
                      <p className="font-bold uppercase tracking-wider">Storage Capacity</p>
                      <p className="text-xs font-black text-[var(--th-text-primary)] mt-1">
                        {checkoutResult.data?.subscription?.limits?.storageGB} GB
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Invoice Details */}
              <div className="space-y-6">
                <div className="p-6 rounded-3xl border border-[var(--th-card-border)] bg-[var(--th-card-bg)] shadow-lg space-y-4">
                  <h4 className="text-xs font-black text-[var(--th-text-primary)] uppercase tracking-wider border-b pb-3 border-[var(--th-border)]">
                    Invoice Details
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Invoice Number:</span>
                      <span className="font-mono font-bold text-[var(--th-text-primary)]">{checkoutResult.data?.billing?.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Invoice Date:</span>
                      <span className="font-bold text-[var(--th-text-primary)]">{new Date(checkoutResult.data?.billing?.invoiceDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Due Date:</span>
                      <span className="font-bold text-[var(--th-text-primary)]">{new Date(checkoutResult.data?.billing?.dueDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--th-text-secondary)]">Customer Account:</span>
                      <span className="font-bold text-[var(--th-text-primary)]">{checkoutResult.data?.subscription?.contactEmail}</span>
                    </div>
                  </div>
                </div>

                {/* Amount details card */}
                <div className="bg-[var(--th-bg-secondary)] p-6 rounded-3xl border border-[var(--th-border-strong)] flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-black text-[var(--th-text-faint)] tracking-wider">Due Amount</p>
                    <span className="text-3xl font-black text-blue-600 mt-1 block">
                      ₹{checkoutResult.data?.paymentLink?.amount ? (checkoutResult.data.paymentLink.amount / 100).toLocaleString() : checkoutResult.data?.subscription?.amount}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase font-extrabold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-full">
                      {checkoutResult.data?.subscription?.status || "Pending"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Collapsible raw data */}
            <details className="group border rounded-2xl bg-[var(--th-card-bg)] border-[var(--th-card-border)] mb-8">
              <summary className="p-4 text-xs font-bold text-[var(--th-text-secondary)] cursor-pointer select-none flex justify-between items-center uppercase tracking-wider">
                <span>View Full Server Response Payload</span>
                <span className="transition-transform group-open:rotate-180 font-mono text-[10px]">&darr;</span>
              </summary>
              <div className="p-4 border-t border-[var(--th-border)] bg-[var(--th-bg-secondary)] text-left font-mono text-[10px] text-[var(--th-text-primary)] overflow-x-auto max-h-64">
                <pre className="whitespace-pre-wrap">{JSON.stringify(checkoutResult, null, 2)}</pre>
              </div>
            </details>

            {/* Footer Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 border-t pt-6 border-[var(--th-border)]">
              <button
                type="button"
                onClick={handleCancelCheckout}
                className="flex-1 py-4 text-xs font-black uppercase tracking-wider rounded-2xl transition-all cursor-pointer bg-[var(--th-bg-secondary)] border border-[var(--th-border-strong)] text-[var(--th-text-primary)] hover:bg-neutral-200 dark:hover:bg-neutral-800"
              >
                Go Back / Cancel
              </button>
              <button
                type="button"
                onClick={handleInitiatePayment}
                className="flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all cursor-pointer bg-[#0062FF] hover:bg-[#004BE6] text-white border-0 shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2"
              >
                <CreditCard size={14} />
                <span>Initiate Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Subscription Pop-up Modal */}
      {pendingPopupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl p-8 rounded-3xl border space-y-6 shadow-2xl relative bg-[var(--th-card-bg)] border-[var(--th-card-border)] text-left animate-in zoom-in-95 duration-250">
            <div className="space-y-2 border-b pb-4 border-[var(--th-border)]">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full">
                Action Required: Pending Checkout
              </span>
              <h3 className="text-xl font-extrabold text-[var(--th-text-primary)] mt-3">
                Complete Your Subscription Activation
              </h3>
              <p className="text-xs text-[var(--th-text-secondary)]">
                You have a pending subscription setup. Review the details below and select an action.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Subscription details */}
              <div className="p-4 rounded-2xl bg-[var(--th-bg-secondary)] border border-[var(--th-border)] space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-[var(--th-text-faint)] tracking-wider">Subscription Info</h4>
                <div className="space-y-1.5 text-xs text-[var(--th-text-secondary)]">
                  <div>Plan: <strong className="text-[var(--th-text-primary)] font-mono uppercase">{pendingPopupData.subscription.planId || pendingPopupData.subscription.planType}</strong></div>
                  <div>Seats: <strong className="text-[var(--th-text-primary)]">{pendingPopupData.subscription.seats || pendingPopupData.subscription.totalSeats || "1"}</strong></div>
                  <div>Cycle: <strong className="text-[var(--th-text-primary)] capitalize">{pendingPopupData.subscription.billingCycle}</strong></div>
                  <div>Status: <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10">{pendingPopupData.subscription.status}</span></div>
                </div>
              </div>

              {/* Invoice details */}
              <div className="p-4 rounded-2xl bg-[var(--th-bg-secondary)] border border-[var(--th-border)] space-y-3">
                <h4 className="text-[10px] uppercase font-bold text-[var(--th-text-faint)] tracking-wider">Pending Invoice Info</h4>
                {pendingPopupData.invoice ? (
                  <div className="space-y-1.5 text-xs text-[var(--th-text-secondary)]">
                    {(() => {
                      const invList = pendingPopupData.invoice.invoices || (Array.isArray(pendingPopupData.invoice) ? pendingPopupData.invoice : []);
                      const inv = invList[0] || pendingPopupData.invoice;
                      if (!inv) return <div className="text-[var(--th-text-faint)]">No pending invoice found.</div>;
                      return (
                        <>
                          <div>Invoice No: <strong className="text-[var(--th-text-primary)] font-mono">{inv.invoiceNumber}</strong></div>
                          {inv.dueDate && (
                            <div>Due Date: <strong className="text-[var(--th-text-primary)]">{new Date(inv.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</strong></div>
                          )}
                          <div>Amount Due: <strong className="text-blue-500">₹{(inv.amount / 100).toLocaleString("en-IN")}</strong></div>
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="text-xs text-[var(--th-text-faint)]">Invoice details loading...</div>
                )}
              </div>
            </div>

            {/* Collapsible raw data */}
            <details className="group border border-[var(--th-border)] rounded-2xl overflow-hidden bg-[var(--th-bg-secondary)]">
              <summary className="p-4 text-xs font-bold text-[var(--th-text-secondary)] cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-between">
                <span>View Full Gateway Responses (JSON)</span>
                <span className="transition-transform group-open:rotate-180 font-mono text-[10px]">&darr;</span>
              </summary>
              <div className="p-4 border-t border-[var(--th-border)] bg-[var(--th-bg)] text-left font-mono text-[9px] text-[var(--th-text-primary)] overflow-x-auto max-h-40">
                <pre>{JSON.stringify(pendingPopupData, null, 2)}</pre>
              </div>
            </details>

            <div className="flex gap-3 justify-end pt-4 border-t border-[var(--th-border)]">
              <button
                type="button"
                onClick={handleCancelPendingSubscription}
                className="px-5 py-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancel Subscription
              </button>
              <button
                type="button"
                onClick={handleResumePayment}
                className="px-6 py-3 rounded-xl bg-[#0062FF] hover:bg-[#004BE6] text-white border-0 text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-lg shadow-blue-500/10"
              >
                Resume Payment
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
