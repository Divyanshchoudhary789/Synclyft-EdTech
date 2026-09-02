"use client";

import { Suspense } from "react";
import { LoginForm } from "@synclyft/ui/auth/LoginForm";

export default function OfficerLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm
        heading="Placement Cell sign in"
        subheading="Access your college's Synclyft command centre"
        expectedRole="college-admin"
        redirectTo="/dashboard"
        registerHref="/register"
        artTitle="Cohort readiness, at a glance."
        artPoints={[
          "Batch dashboards & per-student drill-downs",
          "AI-generated placement readiness reports",
          "Natural-language queries across your cohort",
        ]}
      />
    </Suspense>
  );
}
