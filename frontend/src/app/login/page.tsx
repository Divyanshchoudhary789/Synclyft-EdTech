"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { cn } from "../../lib/utils";
import { api } from "@/lib/api/api";
import { useTheme } from "@/lib/theme";
import { useAuthStore } from "@/lib/store/auth";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
    transition: { type: "spring" as const, stiffness: 95, damping: 18 },
  },
} as const;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [paramsMessage, setParamsMessage] = useState<string | null>(null);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const msg = searchParams.get("message");
      if (msg) {
        setTimeout(() => {
          setParamsMessage(msg);
        }, 0);
      }
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await useAuthStore.getState().fetchUser();
        if (user) {
          const role = user.role;
          if (role === "super-admin" || role === "admin") {
            router.push("/super-admin");
          } else if (role === "officer" || role === "college-admin") {
            router.push("/officer");
          } else {
            router.push("/dashboard");
          }
        }
      } catch (err) {
        console.error("Auth check on login page failed:", err);
      }
    };
    checkAuth();

    setTimeout(() => {
      setMounted(true);
    }, 0);
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (_data: FormData) => {
    setLoading(true);
    try {
      console.log('_data: ', _data);
      const res = await api.post('/auth/login', {
        email: _data.email,
        password: _data.password,
      });
      console.log('res: ', res);
      if (res.status === 200) {

        let user = res.data.user || res.data;
        if (!user || !user.email) {
          user = {
            name: _data.email.split("@")[0],
            email: _data.email,
            role: "student",
          };
        }

        useAuthStore.getState().setUser(user);

        try {
          const fetchedUser = await useAuthStore.getState().fetchUser(true);
          if (fetchedUser) {
            user = fetchedUser;
          }
        } catch (fetchErr) {
          console.error("Failed to fetch full user profile on login:", fetchErr);
        }

        console.log("User: ", user);
        const role = user?.role;
        if (role === "super-admin" || role === "admin") {
          router.push("/super-admin");
        } else if (role === "college-admin") {
          router.push("/officer");
        } else {
          router.push("/dashboard");
        }
      } else {
        setLoading(false);
        return res.data.message;
      }
      await new Promise((r) => setTimeout(r, 1000));
      setLoading(false);
    } catch (error: any) {
      console.log("Status:", error.response?.status);
      alert(error.response?.data.message)
      console.log("Headers:", error.response?.headers);
      await new Promise((r) => setTimeout(r, 1000));
      setLoading(false);
    }
  };

  const loginwithGoogle = async() => {
    const backendUrl = process.env.NEXT_PUBLIC_Backend_URL || "https://ed-tech-backend-0awj.onrender.com/api";
    window.location.href = `${backendUrl}/auth/google`;
  };

  const loginWithGithub = () => {
    const backendUrl = process.env.NEXT_PUBLIC_Backend_URL || "https://ed-tech-backend-0awj.onrender.com/api";
    window.location.href = `${backendUrl}/auth/github`;
  };
  const loginWithLinkdin = () => {
    const backendUrl = process.env.NEXT_PUBLIC_Backend_URL || "https://ed-tech-backend-0awj.onrender.com/api";
    window.location.href = `${backendUrl}/auth/linkedin`;
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
          No account?{" "}
          <Link href="/register" className={cn('font-semibold', 'hover:underline')} style={{ color: "var(--th-primary)" }}>
            Register free
          </Link>
        </p>
      </div>

      {/* ── Split Screen Content ── */}
      <div className={cn('relative', 'z-10', 'flex-1', 'flex', 'items-center', 'justify-center', 'py-2', 'md:py-4', 'w-full', 'max-w-6xl', 'mx-auto', 'min-h-0')}>
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 items-center w-full h-full min-h-0">
          {/* Column 1: Lottie Animation */}
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

          {/* Column 2: Form Card */}
          <div className="flex items-center justify-center">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className={cn('w-full', 'max-w-[400px]', 'p-5', 'md:p-6', 'rounded-2xl', 'backdrop-blur-md', 'border', 'shadow-2xl', 'transition-all', 'duration-300')}
              style={{
                backgroundColor: isDark ? "rgba(15, 23, 42, 0.45)" : "rgba(255, 255, 255, 0.45)",
                borderColor: isDark ? "rgba(51, 65, 85, 0.3)" : "rgba(255, 255, 255, 0.5)",
              }}
            >
              {/* Header */}
              <motion.div variants={itemVariants} className={cn('mb-4', 'space-y-1', 'text-center')}>
                <h1
                  className={cn('text-2xl', 'font-extrabold', 'tracking-tight')}
                  style={{
                    fontFamily: "var(--font-inter-tight), sans-serif",
                    color: "var(--th-text-primary)",
                  }}
                >
                  Welcome back 👋
                </h1>
                <p className={cn('text-sm')} style={{ color: "var(--th-text-secondary)" }}>
                  Sign in to your Synclyft AI console
                </p>
              </motion.div>

              {paramsMessage && (
                <div className="mb-4 p-3 rounded-xl border border-blue-500/20 bg-blue-500/10 text-xs font-semibold text-blue-500 text-center">
                  {paramsMessage}
                </div>
              )}

              {/* Social logins */}
              <motion.div variants={itemVariants} className={cn('space-y-2', 'mb-3.5')}>
                <motion.button
                  whileHover={{ scale: 1.015, backgroundColor: "var(--th-hover-bg)" }}
                  whileTap={{ scale: 0.98 }}
                  className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-3', 'px-4', 'py-2.5', 'rounded-xl', 'border', 'text-sm', 'font-medium', 'transition-colors')}
                  style={{
                    backgroundColor: "var(--th-surface)",
                    borderColor: "var(--th-border)",
                    color: "var(--th-text-primary)",
                  }}
                  onClick={() => loginwithGoogle()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.015, backgroundColor: "var(--th-hover-bg)" }}
                  whileTap={{ scale: 0.98 }}
                  className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-3', 'px-4', 'py-2.5', 'rounded-xl', 'border', 'text-sm', 'font-medium', 'transition-colors')}
                  style={{
                    backgroundColor: "var(--th-surface)",
                    borderColor: "var(--th-border)",
                    color: "var(--th-text-primary)",
                  }}
                  onClick={() => loginWithGithub()}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.604-3.369-1.342-3.369-1.342-.454-1.154-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.026A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.026 2.747-1.026.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                  </svg>
                  Continue with GitHub
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.015, backgroundColor: "var(--th-hover-bg)" }}
                  whileTap={{ scale: 0.98 }}
                  className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-3', 'px-4', 'py-2.5', 'rounded-xl', 'border', 'text-sm', 'font-medium', 'transition-colors')}
                  style={{
                    backgroundColor: "var(--th-surface)",
                    borderColor: "var(--th-border)",
                    color: "var(--th-text-primary)",
                  }}
                  onClick={() => loginWithLinkdin()}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M20.447 20.452H16.89v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.346V9h3.414v1.561h.049c.476-.9 1.637-1.85 3.369-1.85 3.601 0 4.269 2.37 4.269 5.455v6.286zM5.337 7.433a2.063 2.063 0 110-4.126 2.063 2.063 0 010 4.126zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  Continue with Linkdin
                </motion.button>
              </motion.div>

              {/* Divider */}
              <motion.div variants={itemVariants} className={cn('flex', 'items-center', 'gap-3', 'mb-3.5')}>
                <div className={cn('flex-1', 'h-px')} style={{ backgroundColor: "var(--th-border)" }} />
                <span className={cn('text-[0.62rem]', 'uppercase', 'tracking-widest', 'font-semibold')} style={{ color: "var(--th-text-muted)" }}>or email</span>
                <div className={cn('flex-1', 'h-px')} style={{ backgroundColor: "var(--th-border)" }} />
              </motion.div>

              {/* Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
                {/* Email */}
                <motion.div variants={itemVariants} className="space-y-1">
                  <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>Email</label>
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

                {/* Password */}
                <motion.div variants={itemVariants} className="space-y-1">
                  <div className={cn('flex', 'items-center', 'justify-between')}>
                    <label className={cn('text-[0.7rem]', 'font-semibold', 'uppercase', 'tracking-widest')} style={{ color: "var(--th-text-muted)" }}>Password</label>
                    <Link href="/forgot-password" className={cn('text-[0.7rem]', 'hover:underline', 'font-semibold')} style={{ color: "var(--th-primary)" }}>Forgot?</Link>
                  </div>
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
                      className={cn('absolute', 'right-3.5', 'top-1/2', '-translate-y-1/2', 'opacity-50 hover:opacity-95 transition-opacity')}
                      style={{ color: "var(--th-text-primary)" }}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </motion.div>
                  <AnimatePresence>
                    {errors.password && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                        className={cn('text-[#FF5C5C]', 'text-xs')}
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
                    className={cn('w-full', 'flex', 'items-center', 'justify-center', 'gap-2', 'disabled:opacity-60', 'disabled:cursor-not-allowed', 'text-white', 'font-semibold', 'text-sm', 'py-3', 'px-6', 'rounded-xl', 'transition-colors', 'shadow-lg')}
                    style={{
                      backgroundColor: "var(--th-primary)",
                      boxShadow: "0 4px 14px rgba(0, 98, 255, 0.15)",
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {loading ? (
                        <motion.span key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn('flex', 'items-center', 'gap-2')}>
                          <svg className={cn('animate-spin', 'h-4', 'w-4')} viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Signing in...
                        </motion.span>
                      ) : (
                        <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className={cn('flex', 'items-center', 'gap-2')}>
                          Sign in <ArrowRight size={15} />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              </form>

              {/* Trust badges */}
              <motion.div variants={itemVariants} className={cn('mt-4', 'flex', 'items-center', 'justify-center', 'gap-4', 'flex-wrap')}>
                {["TLS encrypted", "Zero data retention", "SOC 2 ready"].map((t) => (
                  <span key={t} className={cn('flex', 'items-center', 'gap-1', 'text-[0.6rem]', 'font-mono', 'uppercase', 'tracking-wider')} style={{ color: "var(--th-text-muted)" }}>
                    <CheckCircle size={9} className="text-[#3DDC84]" />
                    {t}
                  </span>
                ))}
              </motion.div>

              <motion.p variants={itemVariants} className={cn('mt-4', 'text-center', 'text-[0.65rem]')} style={{ color: "var(--th-text-muted)" }}>
                By signing in you agree to our{" "}
                <Link href="/privacy" className={cn('hover:underline transition-colors')} style={{ color: "var(--th-text-secondary)" }}>Privacy Policy</Link>
              </motion.p>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
