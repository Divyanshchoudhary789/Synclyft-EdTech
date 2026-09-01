"use client";

import { Suspense } from "react";
import { LoginForm } from "@synclyft/ui/auth/LoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm
        heading="Admin Console"
        subheading="Restricted access · Synclyft platform operations"
        expectedRole="super-admin"
        redirectTo="/dashboard"
      />
    </Suspense>
  );
}
