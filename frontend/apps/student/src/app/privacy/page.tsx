import Link from "next/link";
import { Logo } from "@synclyft/ui/components/Logo";

const SECTIONS = [
  { title: "Data we collect", body: "We collect your profile information, interview responses (audio and text), code submissions, platform usernames, and usage data. We do not sell your data to third parties." },
  { title: "How we use it", body: "Your data is used to generate readiness scores, calibrate AI question difficulty, produce reports, and improve the Synclyft adaptive engine. Proctoring data is deleted 30 days after session completion." },
  { title: "Retention", body: "Interview sessions and reports are retained for 12 months. You can request deletion at any time via your account settings." },
  { title: "Your rights", body: "You have the right to access, correct, or delete your data under the DPDP Act 2023. Contact privacy@synclyft.io for requests." },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "var(--font-inter), sans-serif", backgroundColor: "var(--th-bg)", color: "var(--th-text-secondary)" }}>
      <nav className="sticky top-0 z-50 backdrop-blur-sm border-b" style={{ backgroundColor: "color-mix(in srgb, var(--th-bg) 90%, transparent)", borderColor: "var(--th-border)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={26} />
            <span className="font-semibold text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Synclyft</span>
          </Link>
          <Link href="/" className="text-sm" style={{ color: "var(--th-text-faint)" }}>← Back</Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 space-y-7">
        <div>
          <p className="label-caption mb-2" style={{ color: "var(--th-text-faint)" }}>Legal</p>
          <h1 className="text-2xl sm:text-[2rem] font-bold tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>Privacy Policy</h1>
          <p className="text-sm mt-1" style={{ color: "var(--th-text-faint)" }}>Last updated: February 2025</p>
        </div>
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <h2 className="font-semibold mb-2" style={{ fontFamily: "var(--font-inter-tight), sans-serif", color: "var(--th-text-primary)" }}>{section.title}</h2>
            <p className="text-sm leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
