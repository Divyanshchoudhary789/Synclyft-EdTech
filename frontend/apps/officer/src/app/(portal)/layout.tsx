"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { OfficerSidebar } from "@/components/OfficerSidebar";
import { useAuthStore } from "@synclyft/lib/store/auth";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, fetchUser } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    (async () => {
      const u = await fetchUser();
      if (!u) {
        router.replace("/login");
        return;
      }
      if (u.role !== "college-admin") {
        // Wrong portal for this account.
        router.replace("/login?message=" + encodeURIComponent("This account can't access the college portal."));
        return;
      }
      setChecked(true);
    })();
  }, [fetchUser, router]);

  if (!checked || !user) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ backgroundColor: "var(--th-bg)", color: "var(--th-text-faint)" }}
      >
        <div className="animate-pulse text-sm font-mono">Loading portal…</div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col md:flex-row"
      style={{
        backgroundColor: "var(--th-bg)",
        color: "var(--th-text-primary)",
        fontFamily: "var(--font-inter), sans-serif",
      }}
    >
      <OfficerSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
