"use client";

import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle, Eye, EyeOff, ArrowRight, RefreshCw, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@synclyft/ui/components/Logo";
import { cn } from "@synclyft/lib/utils";
import { useTheme } from "@synclyft/lib/theme";
import { api } from "@synclyft/lib/api";

const schema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { type: "spring" as const, stiffness: 95, damping: 19 },
  },
} as const;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center" style={{ backgroundColor: "var(--th-bg)" }}>
        <RefreshCw className="animate-spin h-8 w-8 text-[#0062FF]" />
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    setMounted(true);
    if (!token) {
      setErrorMsg("Password reset token is missing or invalid. Please request a new link.");
    }
  }, [token]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  // eslint-disable-next-line react-hooks/incompatible-library
  const passwordValue = watch("password") || "";

  const checks = {
    length: passwordValue.length >= 8,
    uppercase: /[A-Z]/.test(passwordValue),
    lowercase: /[a-z]/.test(passwordValue),
    number: /[0-9]/.test(passwordValue),
    special: /[^a-zA-Z0-9]/.test(passwordValue),
  };

  let guidanceMessage = "";
  let guidanceType: "warning" | "success" = "warning";
  if (focused === "password") {
    if (!checks.length) {
      guidanceMessage = "Password must be at least 8 characters";
    } else if (!checks.uppercase) {
      guidanceMessage = "Password must contain at least one uppercase letter";
    } else if (!checks.lowercase) {
      guidanceMessage = "Password must contain at least one lowercase letter";
    } else if (!checks.number) {
      guidanceMessage = "Password must contain at least one number";
    } else if (!checks.special) {
      guidanceMessage = "Password must contain at least one special character";
    } else {
      guidanceMessage = "Password meets all requirements! ✓";
      guidanceType = "success";
    }
  }

  const onSubmit = async (_data: FormData) => {
    if (!token) {
      setErrorMsg("Cannot reset password without a valid reset token.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post("password-reset/reset", {
        token,
        password: _data.password,
      });

      if (res.status === 200 || res.status === 201) {
        setSubmitted(true);
      } else {
        setErrorMsg(res.data.message || "Failed to reset password.");
      }
    } catch (error: any) {
      console.error(error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to reset password. The link may have expired."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={cn('min-h-screen', 'w-full', 'relative', 'flex', 'flex-col', 'justify-between', 'p-6', 'overflow-hidden', 'transition-colors', 'duration-300')}
      style={{
        backgroundColor: "var(--th-bg)",
        color: "var(--th-text-primary)",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      {/* ── Background Soft Radial Wash ── */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-300">
        <div
          className={cn(
            "absolute inset-0 transition-colors duration-300",
            isDark
              ? "bg-[#090D16] [background:radial-gradient(circle_at_center,rgba(0,98,255,0.08)_0%,transparent_70%)]"
              : "bg-[#F8F9FA] [background:radial-gradient(circle_at_center,rgba(0,98,255,0.05)_0%,transparent_70%)]"
          )}
        />
      </div>

      {/* ── Top Navigation ── */}
      <div className={cn('relative', 'z-10', 'flex', 'items-center', 'justify-between', 'w-full', 'max-w-7xl', 'mx-auto')}>
        <div className={cn('flex', 'items-center', 'gap-4')}>
          <Link
            href="/login"
            className={cn('flex', 'items-center', 'gap-1', 'text-xs', 'font-semibold', 'hover:opacity-80', 'transition-all')}
            style={{ color: "var(--th-text-secondary)" }}
          >
            <ArrowLeft size={13} />
            <span>Back to Login</span>
          </Link>
          <Link href="/" className={cn('flex', 'items-center', 'gap-2.5')}>
            <Logo size={28} />
            <span className={cn('font-bold', 'text-sm')} style={{ color: "var(--th-text-primary)" }}>Synclyft AI</span>
          </Link>
        </div>
      </div>

      {/* ── Form Card Content ── */}
      <div className={cn('relative', 'z-10', 'flex-1', 'flex', 'items-center', 'justify-center', 'py-6', 'w-full', 'max-w-6xl', 'mx-auto')}>
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-stretch w-full">
          {/* Column 1: Lottie Animation */}
          <div className="hidden lg:block relative overflow-hidden rounded-3xl w-full min-h-[500px] h-full">
            <iframe
              src="https://lottie.host/embed/7a082dee-fa74-4fad-bef2-d1f25089ea93/fLe2WAeHga.lottie"
              className="absolute inset-0 w-full h-full border-none pointer-events-none scale-110"
              title="Lottie Career Animation"
            />
          </div>

          {/* Column 2: Form Card */}
          <div className="flex items-center justify-center">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className={cn('w-full', 'max-w-[410px]', 'p-6', 'md:p-8', 'rounded-2xl', 'backdrop-blur-md', 'border', 'shadow-2xl', 'transition-all', 'duration-300')}
              style={{
                backgroundColor: isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.45)",
                borderColor: isDark ? "rgba(51, 65, 85, 0.3)" : "rgba(255, 255, 255, 0.5)",
              }}
            >
              <AnimatePresence mode="wait">
                {!submitted ? (
                  <motion.div
                    key="reset-form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-5"
                  >
                    {/* Header */}
                    <motion.div variants={itemVariants} className="space-y-1.5">
                      <h1
                        className={cn('text-2xl', 'font-extrabold', 'tracking-tight')}
                        style={{
                          fontFamily: "var(--font-inter-tight), sans-serif",
                          color: "var(--th-text-primary)",
                        }}
                      >
                        Reset Password 🔑
                      </h1>
                      <p className={cn('text-sm')} style={{ color: "var(--th-text-secondary)" }}>
                        Set a secure new password for your Synclyft AI account.
                      </p>
                    </motion.div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      {/* Password */}
                      <motion.div variants={itemVariants} className="space-y-1.5">
                        <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>New Password</label>
                        <motion.div
                          animate={{ boxShadow: focused === "password" ? "0 0 0 2px rgba(0,98,255,0.25)" : "0 0 0 0px transparent" }}
                          className="relative rounded-xl"
                        >
                          <input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            disabled={!token || loading}
                            onFocus={() => setFocused("password")}
                            onBlur={() => setFocused(null)}
                            className={cn('w-full', 'rounded-xl', 'px-4', 'py-3', 'pr-11', 'text-sm', 'outline-none', 'transition-all', 'border')}
                            style={{
                              backgroundColor: isDark ? "rgba(10, 15, 29, 0.4)" : "rgba(255, 255, 255, 0.5)",
                              borderColor: focused === "password" ? "var(--th-primary)" : "var(--th-input-border)",
                              color: "var(--th-text-primary)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className={cn('absolute', 'right-3.5', 'top-1/2', '-translate-y-1/2', 'opacity-50 hover:opacity-90 transition-opacity')}
                            style={{ color: "var(--th-text-primary)" }}
                          >
                            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </motion.div>

                        {/* Password requirement guidance */}
                        <AnimatePresence mode="wait">
                          {guidanceMessage && (
                            <motion.p
                              key={guidanceMessage}
                              initial={{ opacity: 0, y: -4, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -4, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                "text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all overflow-hidden",
                                guidanceType === "success"
                                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                  : "text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/20"
                              )}
                            >
                              <span>{guidanceType === "success" ? "✓" : "○"}</span>
                              <span>{guidanceMessage}</span>
                            </motion.p>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {errors.password && !guidanceMessage && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              className={cn('text-[#FF5C5C]', 'text-xs')}
                            >{errors.password.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Confirm Password */}
                      <motion.div variants={itemVariants} className="space-y-1.5">
                        <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>Confirm New Password</label>
                        <motion.div
                          animate={{ boxShadow: focused === "confirmPassword" ? "0 0 0 2px rgba(0,98,255,0.25)" : "0 0 0 0px transparent" }}
                          className="relative rounded-xl"
                        >
                          <input
                            {...register("confirmPassword")}
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            disabled={!token || loading}
                            onFocus={() => setFocused("confirmPassword")}
                            onBlur={() => setFocused(null)}
                            className={cn('w-full', 'rounded-xl', 'px-4', 'py-3', 'pr-11', 'text-sm', 'outline-none', 'transition-all', 'border')}
                            style={{
                              backgroundColor: isDark ? "rgba(10, 15, 29, 0.4)" : "rgba(255, 255, 255, 0.5)",
                              borderColor: focused === "confirmPassword" ? "var(--th-primary)" : "var(--th-input-border)",
                              color: "var(--th-text-primary)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className={cn('absolute', 'right-3.5', 'top-1/2', '-translate-y-1/2', 'opacity-50 hover:opacity-90 transition-opacity')}
                            style={{ color: "var(--th-text-primary)" }}
                          >
                            {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </motion.div>
                        <AnimatePresence>
                          {errors.confirmPassword && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              className={cn('text-[#FF5C5C]', 'text-xs')}
                            >{errors.confirmPassword.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Error Banner */}
                      <AnimatePresence>
                        {errorMsg && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="text-xs font-medium text-[#FF5C5C] bg-[#FF5C5C]/10 border border-[#FF5C5C]/20 rounded-xl p-3"
                          >
                            {errorMsg}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Submit Button */}
                      <motion.div variants={itemVariants} className="pt-2">
                        <motion.button
                          type="submit"
                          disabled={!token || loading}
                          whileHover={token && !loading ? { scale: 1.015, boxShadow: "0 8px 30px rgba(0,98,255,0.25)" } : {}}
                          whileTap={token && !loading ? { scale: 0.98 } : {}}
                          className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-2', 'disabled:opacity-60', 'disabled:cursor-not-allowed', 'text-white', 'font-semibold', 'text-sm', 'py-3', 'px-6', 'rounded-xl', 'transition-colors', 'shadow-lg')}
                          style={{
                            backgroundColor: "var(--th-primary)",
                            boxShadow: "0 4px 14px rgba(0, 98, 255, 0.15)",
                          }}
                        >
                          {loading ? (
                            <span className={cn('flex', 'items-center', 'gap-2')}>
                              <svg className={cn('animate-spin', 'h-4', 'w-4')} viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Updating password...
                            </span>
                          ) : (
                            <span className={cn('flex', 'items-center', 'gap-2')}>
                              Reset Password <ArrowRight size={14} />
                            </span>
                          )}
                        </motion.button>
                      </motion.div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="reset-success"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 text-center"
                  >
                    <div className="flex justify-center">
                      <div className={cn('w-12', 'h-12', 'rounded-full', 'bg-[#3DDC84]/10', 'flex', 'items-center', 'justify-center', 'text-[#3DDC84]')}>
                        <Lock size={24} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className={cn('text-xl', 'font-extrabold')} style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                        Password updated! 🎉
                      </h2>
                      <p className={cn('text-sm')} style={{ color: "var(--th-text-secondary)" }}>
                        Your password has been successfully reset. You can now use your new password to sign in to your Synclyft AI account.
                      </p>
                    </div>

                    <Link
                      href="/login"
                      className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-2', 'font-semibold', 'text-sm', 'py-3', 'px-6', 'rounded-xl', 'transition-colors', 'text-white')}
                      style={{ backgroundColor: "var(--th-primary)" }}
                    >
                      Continue to login
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Trust badges */}
              <motion.div variants={itemVariants} className={cn('mt-8', 'flex', 'items-center', 'justify-center', 'gap-4', 'flex-wrap')}>
                {["TLS encrypted", "Zero data retention", "SOC 2 ready"].map((t) => (
                  <span
                    key={t}
                    className={cn('flex', 'items-center', 'gap-1', 'text-[0.6rem]', 'font-mono', 'uppercase', 'tracking-wider')}
                    style={{ color: "var(--th-text-muted)" }}
                  >
                    <CheckCircle size={9} className="text-[#3DDC84]" />
                    {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
