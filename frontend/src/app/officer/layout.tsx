import { OfficerSidebar } from "./OfficerSidebar";

export default function OfficerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-primary)", fontFamily: "var(--font-inter), sans-serif" }}>
      <OfficerSidebar />
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
