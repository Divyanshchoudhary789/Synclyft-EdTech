"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { api, toApiError } from "@synclyft/lib/api";
import { Logo } from "@synclyft/ui/components/Logo";

const detailsSchema = z.object({
  name: z.string().min(2, "Enter your full name"),
  organization: z.string().min(2, "Enter your institute name"),
  email: z.string().email("Use your official institute email"),
  password: z.string().min(8, "At least 8 characters"),
});
type DetailsForm = z.infer<typeof detailsSchema>;

export default function OfficerRegisterPage() {
  const [step, setStep] = useState<"details" | "otp" | "done">("details");
  const [details, setDetails] = useState<DetailsForm | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DetailsForm>({ resolver: zodResolver(detailsSchema) });

  const submitDetails = async (data: DetailsForm) => {
    setBusy(true);
    try {
      await api.post("/auth/signup/college-admin/send-otp", data);
      setDetails(data);
      setStep("otp");
      toast.success("OTP sent to your email");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (!details || otp.length < 4) return;
    setBusy(true);
    try {
      await api.post("/auth/signup/college-admin/verify-otp", { email: details.email, otp });
      setStep("done");
    } catch (err) {
      toast.error(toApiError(err).message);
    } finally {
      setBusy(false);
    }
  };

  const resendOtp = async () => {
    if (!details) return;
    try {
      await api.post("/auth/otp/resend", { email: details.email, type: "Signup" });
      toast.success("Code resent");
    } catch (err) {
      toast.error(toApiError(err).message);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)" }}
    >
      <div
        className="w-full max-w-[420px] rounded-2xl border p-6 shadow-xl"
        style={{ borderColor: "var(--th-border)", backgroundColor: "var(--th-bg-secondary)" }}
      >
        <div className="mb-5 flex flex-col items-center text-center">
          <Logo size={30} />
          <h1 className="mt-3 text-xl font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
            Register your placement cell
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--th-text-secondary)" }}>
            Accounts are reviewed by the Synclyft team before activation.
          </p>
        </div>

        {step === "details" && (
          <form onSubmit={handleSubmit(submitDetails)} className="space-y-3">
            {[
              { name: "name" as const, label: "Your name", type: "text", ph: "Placement Officer name" },
              { name: "organization" as const, label: "Institute", type: "text", ph: "e.g. NIT Trichy" },
              { name: "email" as const, label: "Official email", type: "email", ph: "you@institute.ac.in" },
              { name: "password" as const, label: "Password", type: "password", ph: "••••••••" },
            ].map((f) => (
              <div key={f.name} className="space-y-1">
                <label className="text-[0.7rem] font-semibold uppercase tracking-widest" style={{ color: "var(--th-text-muted)" }}>
                  {f.label}
                </label>
                <input
                  {...register(f.name)}
                  type={f.type}
                  placeholder={f.ph}
                  className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none"
                  style={{ backgroundColor: "var(--th-surface)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
                />
                {errors[f.name] && (
                  <p className="text-xs" style={{ color: "#FF5C5C" }}>{errors[f.name]?.message}</p>
                )}
              </div>
            ))}
            <button
              type="submit"
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--th-primary)" }}
            >
              {busy ? "Sending OTP…" : "Continue"} {!busy && <ArrowRight size={15} />}
            </button>
          </form>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>
              Enter the 6-digit code sent to <strong>{details?.email}</strong>.
            </p>
            <input
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="______"
              className="w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.5em] outline-none"
              style={{ backgroundColor: "var(--th-surface)", borderColor: "var(--th-input-border)", color: "var(--th-text-primary)" }}
            />
            <button
              onClick={verifyOtp}
              disabled={busy || otp.length < 4}
              className="w-full rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "var(--th-primary)" }}
            >
              {busy ? "Verifying…" : "Verify & create account"}
            </button>
            <div className="flex items-center justify-between text-xs" style={{ color: "var(--th-text-muted)" }}>
              <button onClick={() => setStep("details")}>← Change details</button>
              <button onClick={resendOtp} className="font-semibold" style={{ color: "var(--th-primary)" }}>Resend code</button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 size={40} style={{ color: "#3DDC84" }} />
            <h2 className="text-base font-semibold">Account created — pending approval</h2>
            <p className="text-sm" style={{ color: "var(--th-text-secondary)" }}>
              We&apos;ll email you once the Synclyft team verifies your institute. You can then sign in.
            </p>
            <Link
              href="/login"
              className="mt-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "var(--th-primary)" }}
            >
              Go to sign in
            </Link>
          </div>
        )}

        <p className="mt-4 text-center text-xs" style={{ color: "var(--th-text-muted)" }}>
          Already approved?{" "}
          <Link href="/login" className="font-semibold hover:underline" style={{ color: "var(--th-primary)" }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
