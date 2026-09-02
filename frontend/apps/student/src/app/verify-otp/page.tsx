"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CheckCircle2, ShieldCheck, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@synclyft/ui/components/Logo";
import { cn } from "@synclyft/lib/utils";
import {api} from "@synclyft/lib/api"
import { useAuthStore } from "@synclyft/lib/store/auth";

const ORBS = [
  { w: 450, h: 450, left: "-5%", top: "-10%", color: "rgba(0,98,255,0.05)" },
  { w: 300, h: 300, left: "75%", top: "60%", color: "rgba(0,145,255,0.03)" },
];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15, filter: "blur(3px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 100, damping: 20 },
  },
} as const;

const shakeVariants = {
  shake: {
    x: [0, -10, 10, -10, 10, -5, 5, 0],
    transition: { duration: 0.4 },
  },
};

export default function VerifyOtpPage() {
  const router = useRouter();
  const [otp, setOtp] = useState<string[]>(new Array(6).fill(""));
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [shouldShake, setShouldShake] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [isResending, setIsResending] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Countdown timer logic
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setTimeout(() => {
        setCanResend(true);
      }, 0);
    }
  }, [resendTimer]);

  // Focus the first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleChange = (val: string, index: number) => {
    // Keep only numbers
    const cleanVal = val.replace(/[^0-9]/g, "");
    if (!cleanVal) return;

    const newOtp = [...otp];
    // Take only the last character if double character is typed
    newOtp[index] = cleanVal.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newOtp = [...otp];

      if (otp[index]) {
        // If current box is filled, clear it
        newOtp[index] = "";
        setOtp(newOtp);
      } else if (index > 0) {
        // If current box is empty, clear previous and focus previous
        newOtp[index - 1] = "";
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "").slice(0, 6);
    if (!pastedData) return;

    const newOtp = [...otp];
    for (let i = 0; i < 6; i++) {
      if (pastedData[i]) {
        newOtp[i] = pastedData[i];
      }
    }
    setOtp(newOtp);

    // Focus last filled box or last index
    const nextFocusIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextFocusIndex]?.focus();
  };

  const triggerVerification = useCallback(async (currentOtp: string[]) => {
  setIsVerifying(true);
  setErrorMsg(null);
  setSuccessMsg(null);

  const code = currentOtp.join("");
  const email = sessionStorage.getItem("email");
  const accountType = sessionStorage.getItem("account_type") || "student";

  try {
    if (code.length < 6) return;

    const endpoint = accountType === "company"
      ? "/auth/signup/college-admin/verify-otp"
      : "/auth/signup/student/verify-otp";

    await api.post(endpoint, { email, otp: code });

    if (accountType === "company") {
      // College-admin signup: no session; awaits super-admin approval.
      setIsSuccess(true);
      router.replace("/login?message=" + encodeURIComponent("Registration submitted. Your account is pending Synclyft approval — we'll email you when it's active."));
      return;
    }

    // Student signup: the verify response set our auth cookies. Load the user.
    const user = await useAuthStore.getState().fetchUser(true);
    setIsSuccess(true);
    if (user && user.role && user.role !== "student") {
      router.replace("/login?message=" + encodeURIComponent("This portal is for students."));
    } else {
      router.replace("/onboarding");
    }
  } catch (error) {
    setErrorMsg(
      (error as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Invalid or expired code"
    );
    setIsVerifying(false);
    setShouldShake(true);
    setTimeout(() => setShouldShake(false), 500);
  }
}, [router]);

  // Auto-trigger submit when all 6 fields are filled
  useEffect(() => {
    if (otp.every((digit) => digit !== "")) {
      const timer = setTimeout(() => {
        triggerVerification(otp);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [otp, triggerVerification]);

  const handleResend = async () => {
    if (!canResend || isResending) return;

    const email = sessionStorage.getItem("email");
    if (!email) {
      setErrorMsg("Registration session expired. Please sign up again.");
      return;
    }

    setIsResending(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await api.post("/auth/otp/resend", { email, type: "Signup" });
      setResendTimer(60);
      setCanResend(false);
      setOtp(new Array(6).fill(""));
      inputRefs.current[0]?.focus();
      setSuccessMsg("Verification code resent to your email.");
    } catch (error) {
      setErrorMsg(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Failed to resend code. Please try again."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div
      className={cn("min-h-screen", "flex", "flex-col", "justify-between", "relative", "overflow-hidden", "p-6", "lg:p-12")}
      style={{
        backgroundColor: "var(--th-bg)",
        color: "var(--th-text-primary)",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* ── Background Elements ── */}
      <div className={cn("fixed", "inset-0", "pointer-events-none", "z-0")} aria-hidden>
        {ORBS.map((orb, i) => (
          <motion.div
            key={i}
            className={cn("absolute", "rounded-full")}
            style={{
              width: orb.w,
              height: orb.h,
              left: orb.left,
              top: orb.top,
              background: `radial-gradient(circle, ${orb.color}, transparent 70%)`,
            }}
            animate={{ scale: [1, 1.15, 1], x: [0, 15, -15, 0], y: [0, -10, 10, 0] }}
            transition={{ duration: 12 + i * 4, ease: "easeInOut", repeat: Infinity, delay: i * 0.5 }}
          />
        ))}
        {/* Dot grid */}
        <svg className={cn("absolute", "inset-0", "w-full", "h-full", "opacity-[0.025]")} xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="otpgrid" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="var(--th-text-muted)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#otpgrid)" />
        </svg>
      </div>

      {/* ── Top Navigation ── */}
      <div className={cn("relative", "z-10", "flex", "items-center", "justify-between", "shrink-0")}>
        <Link href="/login" className={cn("flex", "items-center", "gap-2.5")}>
          <Logo size={28} />
          <span className={cn("font-bold", "text-sm")} style={{ color: "var(--th-text-primary)" }}>
            SyncLyft
          </span>
        </Link>
        <Link
          href="/login"
          className={cn("flex", "items-center", "gap-1.5", "text-xs", "font-semibold", "transition-colors", "hover:opacity-80")}
          style={{ color: "var(--th-text-muted)" }}
        >
          <ArrowLeft size={14} />
          Back to Login
        </Link>
      </div>

      {/* ── Main Verification Card ── */}
      <div className={cn("flex-1", "flex", "items-center", "justify-center", "relative", "z-10", "py-10")}>
        <motion.div
          variants={containerVariants}
          initial={false}
          animate="show"
          className="w-full max-w-[420px] p-8 rounded-2xl border text-center shadow-2xl relative overflow-hidden"
          style={{
            backgroundColor: "var(--th-card-bg)",
            borderColor: "var(--th-card-border)",
            backdropFilter: "blur(12px)",
          }}
        >
          <AnimatePresence mode="wait">
            {!isSuccess ? (
              <motion.div
                key="verify-form"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, y: -20, filter: "blur(4px)" }}
                className="space-y-6"
              >
                {/* Visual Icon */}
                <motion.div
                  variants={itemVariants}
                  className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-2"
                  style={{
                    backgroundColor: "rgba(0, 98, 255, 0.08)",
                    border: "1px solid rgba(0, 98, 255, 0.2)",
                  }}
                >
                  <ShieldCheck size={22} className="text-[#0062FF]" />
                </motion.div>

                {/* Typography Header */}
                <motion.div variants={itemVariants} className="space-y-2">
                  <h1
                    className="text-xl font-extrabold tracking-tight"
                    style={{
                      fontFamily: "var(--font-inter-tight), sans-serif",
                      color: "var(--th-text-primary)",
                    }}
                  >
                    Security Verification
                  </h1>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
                    We sent a 6-digit One-Time Password to your email. Enter the verification code below to authorize this session.
                  </p>
                </motion.div>

                {/* 6-Digit Code Inputs */}
                <motion.div
                  variants={itemVariants}
                  animate={shouldShake ? "shake" : ""}
                  className="flex justify-between items-center gap-2 py-2"
                >
                  {otp.map((digit, index) => (
                    <motion.div
                      key={index}
                      animate={{
                        boxShadow:
                          focusedIndex === index
                            ? "0 0 0 2px rgba(0,98,255,0.25)"
                            : "0 0 0 0px transparent",
                      }}
                      className="rounded-xl flex-1 max-w-[50px] aspect-square"
                    >
                      <input
                        ref={(el) => {
                          inputRefs.current[index] = el;
                        }}
                        type="text"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleChange(e.target.value, index)}
                        onKeyDown={(e) => handleKeyDown(e, index)}
                        onPaste={handlePaste}
                        onFocus={() => setFocusedIndex(index)}
                        onBlur={() => setFocusedIndex(null)}
                        disabled={isVerifying || isResending}
                        className={cn(
                          "w-full h-full text-center text-lg font-bold rounded-xl outline-none border transition-colors focus:border-[#0062FF]"
                        )}
                        style={{
                          backgroundColor: "var(--th-input-bg)",
                          borderColor: focusedIndex === index ? "var(--th-primary)" : "var(--th-input-border)",
                          color: "var(--th-text-primary)",
                        }}
                        data-testid={`otp-input-${index}`}
                      />
                    </motion.div>
                  ))}
                </motion.div>

                {/* Error & Success Banners */}
                <AnimatePresence mode="wait">
                  {errorMsg ? (
                    <motion.div
                      key="error-banner"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-xs font-medium text-[#FF5C5C] bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 rounded-xl p-3"
                    >
                      {errorMsg}
                    </motion.div>
                  ) : successMsg ? (
                    <motion.div
                      key="success-banner"
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="text-xs font-medium text-[#3DDC84] bg-[#3DDC84]/10 border border-[#3DDC84]/20 rounded-xl p-3"
                    >
                      {successMsg}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                {/* Loading / Submitting State */}
                <motion.div variants={itemVariants}>
                  {isVerifying ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold opacity-85">
                      <RefreshCw className="animate-spin h-4 w-4 text-[#0062FF]" />
                      <span>Verifying credentials...</span>
                    </div>
                  ) : isResending ? (
                    <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-semibold opacity-85">
                      <RefreshCw className="animate-spin h-4 w-4 text-[#0062FF]" />
                      <span>Resending code...</span>
                    </div>
                  ) : (
                    <div className="text-xs pt-1" style={{ color: "var(--th-text-muted)" }}>
                      {canResend ? (
                        <p>
                          Didn&apos;t receive the email?{" "}
                          <button
                            onClick={handleResend}
                            className="font-semibold hover:underline"
                            style={{ color: "var(--th-primary)" }}
                          >
                            Resend code
                          </button>
                        </p>
                      ) : (
                        <p>
                          Resend code in{" "}
                          <span className="font-mono font-medium">
                            0:{resendTimer.toString().padStart(2, "0")}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="verify-success"
                initial={{ opacity: 0, scale: 0.9, filter: "blur(4px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ type: "spring", stiffness: 120, damping: 15 }}
                className="space-y-4 py-6"
              >
                <div className="w-16 h-16 rounded-full bg-[#3DDC84]/10 border border-[#3DDC84]/20 flex items-center justify-center mx-auto mb-2 animate-bounce">
                  <CheckCircle2 size={32} className="text-[#3DDC84]" />
                </div>
                <h2
                  className="text-xl font-extrabold tracking-tight"
                  style={{
                    fontFamily: "var(--font-inter-tight), sans-serif",
                    color: "var(--th-text-primary)",
                  }}
                >
                  Verification Complete
                </h2>
                <p className="text-xs" style={{ color: "var(--th-text-secondary)" }}>
                  Your session has been securely authenticated. Redirecting you to the SyncLyft console...
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Footer Info ── */}
      <div
        className={cn("relative", "z-10", "flex", "items-center", "justify-between", "text-[0.6rem]", "font-mono", "uppercase", "tracking-widest", "shrink-0")}
        style={{ color: "var(--th-text-muted)" }}
      >
        <span>© 2025 SyncLyft Technologies</span>
        <div className={cn("flex", "items-center", "gap-1.5")}>
          <span className={cn("w-1.5", "h-1.5", "rounded-full", "bg-[#3DDC84]", "animate-pulse")} />
          <span>All connections secured</span>
        </div>
      </div>
    </div>
  );
}
