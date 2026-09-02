import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FirstNav from "@/components/layout/Firstnav";
import Footer from "@/components/layout/Footer";

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-inter), sans-serif", backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)" }}>
      <FirstNav />
      <div className="mx-auto max-w-3xl space-y-12 px-4 py-16 sm:px-6">
        <div>
          <p className="label-caption mb-2" style={{ color: "var(--th-text-faint)" }}>About Synclyft</p>
          <h1 className="mb-4 text-3xl font-semibold tracking-tight sm:text-[2.5rem]" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>
            Built for the students who take interviews seriously.
          </h1>
          <p className="text-lg leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
            Synclyft AI was built from a simple observation: the gap between campus preparation and actual interview
            performance isn&apos;t about effort — it&apos;s about signal. Most platforms give you practice questions.
            We give you a precision instrument for measuring and improving real readiness.
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>The design philosophy</h2>
          <p className="leading-relaxed" style={{ color: "var(--th-text-secondary)" }}>
            We call our visual language &quot;the focused operator&apos;s console.&quot; During active interview rounds the UI
            recedes — minimal chrome, one accent colour used only for state. When you review results, the interface opens
            into a warm, data-rich intelligence mode. The palette shift itself is the signal for whether you&apos;re under
            pressure or in review.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {[
            { label: "Founded", value: "2024" },
            { label: "HQ", value: "Jaipur, India" },
            { label: "Mission", value: "Close the prep-to-placement gap" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border p-4" style={{ backgroundColor: "var(--th-card-bg)", borderColor: "var(--th-card-border)" }}>
              <div className="label-caption mb-1" style={{ color: "var(--th-text-faint)" }}>{item.label}</div>
              <div className="text-sm font-semibold" style={{ color: "var(--th-text-primary)" }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="pt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-all hover:brightness-110"
            style={{ backgroundColor: "var(--th-primary)" }}
          >
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}
