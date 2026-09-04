"use client";

import toast from "react-hot-toast";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, ArrowLeft, Building2, User, Eye, EyeOff, CheckCircle, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@synclyft/ui/components/Logo";
import { cn } from "@synclyft/lib/utils";
import { useTheme } from "@synclyft/lib/theme";
import {api} from "@synclyft/lib/api"

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  college: z.string().min(2, "College/Organization must be at least 2 characters"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
  otp: z.string().length(6, "OTP must be 6 digits").optional(),
});

type FormData = z.infer<typeof schema>;

const ORBS = [
  { w: 480, h: 480, left: "-8%", top: "-15%", color: "rgba(0,98,255,0.05)" },
  { w: 320, h: 320, left: "70%", top: "55%", color: "rgba(0,145,255,0.03)" },
];

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

export default function RegisterPage() {
  const router = useRouter();
  const [accountType, setAccountType] = useState<"student" | "company">("student");
  const [step] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, []);

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
      guidanceMessage = "Password meets all requirements";
      guidanceType = "success";
    }
  }

  const onSubmit = async (_data: FormData) => {
    setLoading(true);
    const endpoint = accountType === "company"
      ? "/auth/signup/college-admin/send-otp"
      : "/auth/signup/student/send-otp";

    try {
      await api.post(endpoint, {
        email: _data.email,
        name: _data.name,
        organization: _data.college,
        password: _data.password,
      });
      // Only the email is kept — resend re-uses the server-side OTP payload.
      sessionStorage.setItem("email", _data.email);
      sessionStorage.setItem("account_type", accountType);
      router.push("/verify-otp");
    } catch (error) {
      toast.error(
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          "Registration failed. Please check your inputs."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div
      className={cn('min-h-screen', 'w-full', 'relative', 'flex', 'flex-col', 'justify-between', 'p-4', 'md:p-5', 'overflow-y-auto', 'transition-colors', 'duration-300')}
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
      <div className={cn('relative', 'z-10', 'flex', 'items-center', 'justify-between', 'w-full', 'max-w-7xl', 'mx-auto', 'h-20', 'shrink-0')}>
        <div className={cn('flex', 'items-center', 'gap-4')}>
          <Link
            href="/"
            className={cn('flex', 'items-center', 'gap-1', 'text-xs', 'font-semibold', 'hover:opacity-80', 'transition-all')}
            style={{
              color: "var(--th-text-secondary)",
            }}
          >
            <ArrowLeft size={13} />
            <span>Back</span>
          </Link>
          <Link href="/" className={cn('flex', 'items-center', 'gap-2.5')}>
            <Logo size={28} />
            <span className={cn('font-bold', 'text-sm')} style={{ color: "var(--th-text-primary)" }}>Synclyft AI</span>
          </Link>
        </div>
        <p className={cn('text-xs')} style={{ color: "var(--th-text-muted)" }}>
          Have an account?{" "}
          <Link href="/login" className={cn('font-semibold', 'hover:underline')} style={{ color: "var(--th-primary)" }}>
            Sign in
          </Link>
        </p>
      </div>

      {/* ── Split Screen Content ── */}
      <div className={cn('relative', 'z-10', 'flex-1', 'flex', 'items-center', 'justify-center', 'py-2', 'md:py-4', 'w-full', 'max-w-6xl', 'mx-auto', 'min-h-0')}>
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center w-full h-full min-h-0">
          {/* Column 1: Form Card */}
          <div className="flex items-center justify-center">
            <motion.div
              variants={containerVariants}
              initial={false}
              animate="show"
              className={cn('w-full', 'max-w-[420px]', 'p-5', 'md:p-6', 'rounded-2xl', 'backdrop-blur-md', 'border', 'shadow-2xl', 'transition-all', 'duration-300')}
              style={{
                backgroundColor: isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.45)",
                borderColor: isDark ? "rgba(51, 65, 85, 0.3)" : "rgba(255, 255, 255, 0.5)",
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                {step === "form" ? (
                  <motion.div
                    key="register-form"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-3.5"
                  >
                    {/* Header */}
                    <motion.div variants={itemVariants} className={cn('space-y-1', 'text-center')}>
                      <h1
                        className={cn('text-2xl', 'font-extrabold', 'tracking-tight')}
                        style={{
                          fontFamily: "var(--font-inter-tight), sans-serif",
                          color: "var(--th-text-primary)",
                        }}
                      >
                        Create your account
                      </h1>
                      <p className={cn('text-sm')} style={{ color: "var(--th-text-secondary)" }}>
                        Set up your Synclyft AI profile in minutes
                      </p>
                    </motion.div>

                    {/* Account type toggle */}
                    <motion.div
                      variants={itemVariants}
                      className={cn('flex', 'gap-1.5', 'p-1', 'rounded-xl', 'border')}
                      style={{
                        backgroundColor: "var(--th-bg-secondary)",
                        borderColor: "var(--th-border)",
                      }}
                    >
                      {(["student", "company"] as const).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setAccountType(type)}
                          className={cn(
                            'flex-1', 'flex', 'items-center', 'justify-center', 'gap-2', 'py-2', 'rounded-lg', 'text-xs', 'font-semibold', 'transition-all',
                            accountType === type
                              ? "shadow-sm border font-bold"
                              : "opacity-60 hover:opacity-100"
                          )}
                          style={{
                            backgroundColor: accountType === type ? "var(--th-surface)" : "transparent",
                            color: "var(--th-text-primary)",
                            borderColor: accountType === type ? "var(--th-border)" : "transparent",
                          }}
                        >
                          {type === "student" ? <User size={13} /> : <Building2 size={13} />}
                          {type === "student" ? "Student" : "Company"}
                        </button>
                      ))}
                    </motion.div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-2.5">
                      {/* Name */}
                      <motion.div variants={itemVariants} className="space-y-0.5">
                        <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>Full Name</label>
                        <motion.div
                          animate={{ boxShadow: focused === "name" ? "0 0 0 2px rgba(0,98,255,0.25)" : "0 0 0 0px transparent" }}
                          className="rounded-xl"
                        >
                          <input
                            {...register("name")}
                            type="text"
                            placeholder="Arjun Mehta"
                            onFocus={() => setFocused("name")}
                            onBlur={() => setFocused(null)}
                            className={cn('w-full', 'rounded-xl', 'px-4', 'py-2.5', 'text-sm', 'outline-none', 'transition-all', 'border')}
                            style={{
                              backgroundColor: isDark ? "rgba(10, 15, 29, 0.4)" : "rgba(255, 255, 255, 0.5)",
                              borderColor: focused === "name" ? "var(--th-primary)" : "var(--th-input-border)",
                              color: "var(--th-text-primary)",
                            }}
                          />
                        </motion.div>
                        <AnimatePresence>
                          {errors.name && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              className={cn('text-[#FF5C5C]', 'text-xs')}
                            >{errors.name.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Email */}
                      <motion.div variants={itemVariants} className="space-y-0.5">
                        <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>Email Address</label>
                        <motion.div
                          animate={{ boxShadow: focused === "email" ? "0 0 0 2px rgba(0,98,255,0.25)" : "0 0 0 0px transparent" }}
                          className="rounded-xl"
                        >
                          <input
                            {...register("email")}
                            type="email"
                            placeholder="you@college.edu"
                            onFocus={() => setFocused("email")}
                            onBlur={() => setFocused(null)}
                            className={cn('w-full', 'rounded-xl', 'px-4', 'py-2.5', 'text-sm', 'outline-none', 'transition-all', 'border')}
                            style={{
                              backgroundColor: isDark ? "rgba(10, 15, 29, 0.4)" : "rgba(255, 255, 255, 0.5)",
                              borderColor: focused === "email" ? "var(--th-primary)" : "var(--th-input-border)",
                              color: "var(--th-text-primary)",
                            }}
                          />
                        </motion.div>
                        <AnimatePresence>
                          {errors.email && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              className={cn('text-[#FF5C5C]', 'text-xs')}
                            >{errors.email.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* College / Organization */}
                      <motion.div variants={itemVariants} className="space-y-0.5">
                        <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>
                          {accountType === "student" ? "College / University" : "Company / Organization"}
                        </label>
                        <motion.div
                          animate={{ boxShadow: focused === "college" ? "0 0 0 2px rgba(0,98,255,0.25)" : "0 0 0 0px transparent" }}
                          className="rounded-xl"
                        >
                          <input
                            {...register("college")}
                            type="text"
                            placeholder={accountType === "student" ? "IIT Bombay" : "Flipkart"}
                            onFocus={() => setFocused("college")}
                            onBlur={() => setFocused(null)}
                            className={cn('w-full', 'rounded-xl', 'px-4', 'py-2.5', 'text-sm', 'outline-none', 'transition-all', 'border')}
                            style={{
                              backgroundColor: isDark ? "rgba(10, 15, 29, 0.4)" : "rgba(255, 255, 255, 0.5)",
                              borderColor: focused === "college" ? "var(--th-primary)" : "var(--th-input-border)",
                              color: "var(--th-text-primary)",
                            }}
                          />
                        </motion.div>
                        <AnimatePresence>
                          {errors.college && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              className={cn('text-[#FF5C5C]', 'text-xs')}
                            >{errors.college.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Password */}
                      <motion.div variants={itemVariants} className="space-y-0.5">
                        <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>Password</label>
                        <motion.div
                          animate={{ boxShadow: focused === "password" ? "0 0 0 2px rgba(0,98,255,0.25)" : "0 0 0 0px transparent" }}
                          className={cn('relative', 'rounded-xl')}
                        >
                          <input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            onFocus={() => setFocused("password")}
                            onBlur={() => setFocused(null)}
                            className={cn('w-full', 'rounded-xl', 'px-4', 'py-2.5', 'pr-11', 'text-sm', 'outline-none', 'transition-all', 'border')}
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

                        {/* Dynamic Password Requirement Guidance */}
                        <AnimatePresence mode="wait">
                          {guidanceMessage && (
                            <motion.p
                              key={guidanceMessage}
                              initial={{ opacity: 0, y: -4, height: 0 }}
                              animate={{ opacity: 1, y: 0, height: "auto" }}
                              exit={{ opacity: 0, y: -4, height: 0 }}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                "mt-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 transition-all overflow-hidden",
                                guidanceType === "success"
                                  ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                  : "text-[#FF5C5C] bg-[#FF5C5C]/10 border-[#FF5C5C]/20"
                              )}
                            >
                              {guidanceType === "success" ? <CheckCircle size={12} className="shrink-0" /> : <Circle size={12} className="shrink-0" />}
                              <span>{guidanceMessage}</span>
                            </motion.p>
                          )}
                        </AnimatePresence>

                        <AnimatePresence>
                          {errors.password && !guidanceMessage && (
                            <motion.p
                              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                              className={cn('text-[#FF5C5C]', 'text-xs mt-1')}
                            >{errors.password.message}</motion.p>
                          )}
                        </AnimatePresence>
                      </motion.div>

                      {/* Submit */}
                      <motion.div variants={itemVariants} className="pt-2">
                        <motion.button
                          type="submit"
                          disabled={loading}
                          whileHover={!loading ? { scale: 1.015, boxShadow: "0 8px 30px rgba(0,98,255,0.25)" } : {}}
                          whileTap={!loading ? { scale: 0.98 } : {}}
                          className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-2', 'disabled:opacity-60', 'disabled:cursor-not-allowed', 'text-white', 'font-semibold', 'text-sm', 'py-2.5', 'px-6', 'rounded-xl', 'transition-colors', 'shadow-lg')}
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
                              Creating account...
                            </span>
                          ) : (
                            <span className={cn('flex', 'items-center', 'gap-2')}>
                              Send Verification Code <ArrowRight size={14} />
                            </span>
                          )}
                        </motion.button>
                      </motion.div>
                    </form>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Trust badges */}
              {step === "form" && (
                <motion.div variants={itemVariants} className={cn('mt-4', 'flex', 'items-center', 'justify-center', 'gap-4', 'flex-wrap')}>
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
              )}
            </motion.div>
          </div>

          {/* Column 2: Lottie Animation */}
          <div className="hidden lg:block relative overflow-visible w-full h-full flex items-center justify-center min-h-0">
            <iframe
              src="https://lottie.host/embed/7a082dee-fa74-4fad-bef2-d1f25089ea93/fLe2WAeHga.lottie"
              className="w-full h-full border-none pointer-events-none scale-[1.35]"
              title="Lottie Career Animation"
              style={{
                background: "transparent",
                filter: isDark
                  ? "drop-shadow(0 25px 40px rgba(0, 98, 255, 0.35)) drop-shadow(0 4px 12px rgba(0, 98, 255, 0.2))"
                  : "drop-shadow(0 25px 35px rgba(0, 98, 255, 0.18)) drop-shadow(0 4px 10px rgba(0, 0, 0, 0.06))",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div
        className={cn('relative', 'z-10', 'flex', 'flex-col', 'md:flex-row', 'items-center', 'justify-between', 'w-full', 'max-w-7xl', 'mx-auto', 'text-[0.6rem]', 'font-mono', 'uppercase', 'tracking-widest', 'gap-2')}
        style={{ color: "var(--th-text-muted)" }}
      >
        <span>© 2025 Synclyft AI Technologies</span>
        <div className={cn('flex', 'items-center', 'gap-1.5')}>
          <span className={cn('w-1.5', 'h-1.5', 'rounded-full', 'bg-[#3DDC84]', 'animate-pulse')} />
          <span>All systems operational</span>
        </div>
      </div>
    </div>
  );
}
