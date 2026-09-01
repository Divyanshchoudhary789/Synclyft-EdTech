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
      />
    </Suspense>
  );
}
