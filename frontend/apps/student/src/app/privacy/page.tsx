import Link from "next/link";

import { Logo } from "@synclyft/ui/components/Logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#F7F6F3]" style={{ fontFamily: "var(--font-inter), sans-serif" }}>
      <nav className="sticky top-0 bg-[#F7F6F3]/90 backdrop-blur-sm border-b border-[#E5E2D9] z-50">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-14">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={28} />
            <span className="font-semibold text-sm text-[#15171C]" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>SyncLyft</span>
          </Link>
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#15171C]">← Back</Link>
        </div>
      </nav>
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-8 text-[#4A5260]">
        <div>
          <p className="label-caption text-[#9CA3AF] mb-2">Legal</p>
          <h1 className="text-[2rem] font-bold text-[#15171C] tracking-tight" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>Privacy Policy</h1>
          <p className="text-sm text-[#9CA3AF] mt-1">Last updated: February 2025</p>
        </div>
        {[
          { title: "Data we collect", body: "We collect your profile information, interview responses (audio and text), code submissions, platform usernames, and usage data. We do not sell your data to third parties." },
          { title: "How we use it", body: "Your data is used to generate readiness scores, calibrate AI question difficulty, produce reports, and improve the SyncLyft adaptive engine. Proctoring data is deleted 30 days after session completion." },
          { title: "Retention", body: "Interview sessions and reports are retained for 12 months. You can request deletion at any time via your account settings." },
          { title: "Your rights", body: "You have the right to access, correct, or delete your data under DPDP Act 2023. Contact privacy@synclyft.io for requests." },
        ].map((section) => (
          <div key={section.title}>
            <h2 className="font-semibold text-[#15171C] mb-2" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>{section.title}</h2>
            <p className="text-sm leading-relaxed">{section.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
