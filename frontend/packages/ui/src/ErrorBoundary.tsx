"use client";

import React from "react";

interface State {
  error: Error | null;
}

/**
 * Catches render errors anywhere below it and shows a recoverable fallback
 * instead of a blank white screen. Logs to console (kept in prod builds via
 * removeConsole exclude) so platform log drains still capture it.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ backgroundColor: "var(--th-bg, #0B0D10)", color: "var(--th-text-primary, #E8EAF0)" }}
      >
        <div className="text-2xl font-bold" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
          Something went wrong
        </div>
        <p className="max-w-md text-sm" style={{ color: "var(--th-text-secondary, #9CA3AF)" }}>
          The page hit an unexpected error. Reloading usually fixes it. If it keeps happening,
          please contact support.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => this.setState({ error: null })}
            className="rounded-xl border px-4 py-2 text-sm font-semibold"
            style={{ borderColor: "var(--th-border, #2A2F38)" }}
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "var(--th-primary, #0062FF)" }}
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
