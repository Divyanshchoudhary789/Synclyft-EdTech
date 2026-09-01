"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CheckCircle, Mail, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@synclyft/ui/components/Logo";
import { cn } from "@synclyft/lib/utils";
import { useTheme } from "@synclyft/lib/theme";
import { api } from "@synclyft/lib/api";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
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

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (_data: FormData) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.post('/password-reset/forgot', {
        email: _data.email,
      });
      console.log('res: ', res);
      if (res.status === 200 || res.status === 201) {
        setSubmitted(true);
      } else {
        setErrorMsg(res.data.message || "Failed to send reset link.");
      }
    } catch (error: any) {
      console.log('error: ', error);
      setErrorMsg(
        error?.response?.data?.message || "Failed to send reset link. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

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
          Remembered?{" "}
          <Link href="/login" className={cn('font-semibold', 'hover:underline')} style={{ color: "var(--th-primary)" }}>
            Sign in
          </Link>
        </p>
      </div>

      {/* ── Split Screen Content ── */}
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
                    key="forgot-form"
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
                        Forgot password? 🔒
                      </h1>
                      <p className={cn('text-sm')} style={{ color: "var(--th-text-secondary)" }}>
                        Enter your email address and we&apos;ll send you a password reset link.
                      </p>
                    </motion.div>

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                      {/* Email */}
                      <motion.div variants={itemVariants} className="space-y-1.5">
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
                            className={cn('w-full', 'rounded-xl', 'px-4', 'py-3', 'text-sm', 'outline-none', 'transition-all', 'border')}
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
                          disabled={loading}
                          whileHover={!loading ? { scale: 1.015, boxShadow: "0 8px 30px rgba(0,98,255,0.25)" } : {}}
                          whileTap={!loading ? { scale: 0.98 } : {}}
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
                              Sending request...
                            </span>
                          ) : (
                            <span className={cn('flex', 'items-center', 'gap-2')}>
                              Send Reset Link <ArrowRight size={14} />
                            </span>
                          )}
                        </motion.button>
                      </motion.div>
                    </form>
                  </motion.div>
                ) : (
                  <motion.div
                    key="forgot-success"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-6 text-center"
                  >
                    <div className="flex justify-center">
                      <div className={cn('w-12', 'h-12', 'rounded-full', 'bg-[#3DDC84]/10', 'flex', 'items-center', 'justify-center', 'text-[#3DDC84]')}>
                        <Mail size={24} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h2 className={cn('text-xl', 'font-extrabold')} style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
                        Check your email 📧
                      </h2>
                      <p className={cn('text-sm')} style={{ color: "var(--th-text-secondary)" }}>
                        We have sent a secure password reset link to your email address. Please follow the instructions to secure your account.
                      </p>
                    </div>

                    <Link 
                      href="/login" 
                      className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-2', 'font-semibold', 'text-sm', 'py-3', 'px-6', 'rounded-xl', 'transition-colors', 'text-white')}
                      style={{
                        backgroundColor: "var(--th-primary)",
                      }}
                    >
                      Return to login
                    </Link>

                    <p className={cn('text-xs')} style={{ color: "var(--th-text-muted)" }}>
                      Didn&apos;t receive the email?{" "}
                      <button onClick={() => setSubmitted(false)} className={cn('font-semibold', 'hover:underline')} style={{ color: "var(--th-primary)" }}>
                        Try again
                      </button>
                    </p>
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
