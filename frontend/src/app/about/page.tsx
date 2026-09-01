import Link from "next/link";
import { ArrowRight } from "lucide-react";
import FirstNav from "@/components/layout/Firstnav";

export default function AboutPage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-inter), sans-serif", backgroundColor: "var(--theme-bg)" }}>

      <FirstNav />
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-12">
        <div>
          <p className="label-caption text-var(--theme-text) mb-2">About Synclyft</p>
          <h1 className="text-[2.5rem] font-semibold text-var(--theme-text) tracking-tight mb-4" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
            Built for the students who take interviews seriously.
          </h1>
          <p className="text-var(--theme-text) text-lg leading-relaxed">
            Synclyft AI was built from a simple observation: the gap between campus preparation and actual interview performance isn&apos;t about effort it&apos;s about signal.
            Most platforms give you practice questions. We give you a precision instrument for measuring and improving real readiness.
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-var(--theme-text)" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>The design philosophy</h2>
          <p className="text-var(--theme-text) leading-relaxed">
            We call our visual language &quot;the focused operator&apos;s console.&quot; During active interview rounds, the UI disappears near-monochrome, minimal chrome,
            one accent color used only for state. When you&apos;re reviewing results, the interface opens up into a warm, data-rich intelligence mode.
            The palette shift itself is the UX signal that tells you whether you&apos;re under pressure or in review.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-5">
          {[
            { label: "Founded", value: "2024" },
            { label: "HQ", value: "Jaipur, India" },
            { label: "Mission", value: "Close the prep-to-placement gap" },
          ].map((item) => (
            <div key={item.label} className="card-light p-4">
              <div className="label-caption text-var(--theme-text) mb-1">{item.label}</div>
              <div className="font-semibold text-var(--theme-text) text-sm">{item.value}</div>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Link href="/register" className="btn-primary inline-flex items-center gap-2">
            Get started <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
