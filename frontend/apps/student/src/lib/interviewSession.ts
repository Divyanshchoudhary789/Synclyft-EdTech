"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { interviewService } from "@synclyft/lib/api/services";

const ROUND_ROUTE: Record<string, string> = {
  aptitude: "/interview/aptitude",
  coding: "/interview/coding",
  technical: "/interview/technical",
  hr: "/interview/hr",
};

export interface InterviewSessionCtx {
  sessionId: string;
  rounds: string[];
  codingLanguage: string;
  /** Route to the round after `current`, or to the report if `current` was last. */
  goNext: (current: string) => void;
  goReport: () => void;
}

/**
 * Reads the interview session created on the setup page from sessionStorage.
 * Redirects to /interview/setup if there is no active session (e.g. refresh
 * into a round page with nothing set).
 */
export function useInterviewSession(): InterviewSessionCtx | null {
  const router = useRouter();
  const [ctx, setCtx] = useState<InterviewSessionCtx | null>(null);
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    fetchUser().then((u) => {
      if (!u) router.replace("/login");
    });
  }, [fetchUser, router]);

  useEffect(() => {
    let sessionId = "";
    let rounds: string[] = [];
    let codingLanguage = "python";
    try {
      sessionId = sessionStorage.getItem("interview:sessionId") ?? "";
      rounds = JSON.parse(sessionStorage.getItem("interview:rounds") ?? "[]");
      codingLanguage = sessionStorage.getItem("interview:codingLanguage") ?? "python";
    } catch {
      /* private mode */
    }

    if (!sessionId || rounds.length === 0) {
      router.replace("/interview/setup");
      return;
    }

    const goReport = () => {
      try {
        sessionStorage.setItem("interview:completedSessionId", sessionId);
      } catch { /* ignore */ }
      router.replace("/interview/report");
    };

    setCtx({
      sessionId,
      rounds,
      codingLanguage,
      goReport,
      goNext: (current: string) => {
        const idx = rounds.indexOf(current);
        const next = rounds[idx + 1];
        if (next && ROUND_ROUTE[next]) router.replace(ROUND_ROUTE[next]);
        else goReport();
      },
    });
  }, [router]);

  return ctx;
}

export interface RoundState {
  loading: boolean;
  error: string | null;
  status: "pending" | "active" | "completed" | null;
  endsAt: number | null;
  remainingSeconds: number | null;
  durationSeconds: number | null;
  forceEnded: boolean;
  answeredCount: number;
  servedCount: number;
  providerSessionId: string | null;
  aptitudeTopics: string[];
  refetch: () => void;
}

/**
 * Server-authoritative state for one round of the active session. Used by the
 * round pages to resume accurately after a refresh / reconnect.
 */
export function useRoundState(sessionId: string | undefined, roundType: string): RoundState {
  const [state, setState] = useState<RoundState>({
    loading: true, error: null, status: null, endsAt: null, remainingSeconds: null,
    durationSeconds: null, forceEnded: false, answeredCount: 0, servedCount: 0,
    providerSessionId: null, aptitudeTopics: [], refetch: () => {},
  });
  const tick = useRef(0);

  const load = useCallback(async () => {
    if (!sessionId) return;
    try {
      const data = await interviewService.state(sessionId);
      const r = data.rounds.find((x) => x.roundType === roundType);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: null,
        status: (r?.status as RoundState["status"]) ?? "pending",
        endsAt: r?.endsAt ? new Date(r.endsAt).getTime() : null,
        remainingSeconds: r?.remainingSeconds ?? null,
        durationSeconds: r?.durationSeconds ?? null,
        forceEnded: Boolean(r?.forceEnded),
        answeredCount: r?.answeredCount ?? 0,
        servedCount: r?.servedCount ?? 0,
        providerSessionId: r?.providerSessionId ?? null,
        aptitudeTopics: r?.aptitudeTopics ?? [],
      }));
    } catch (err) {
      setState((prev) => ({ ...prev, loading: false, error: (err as Error).message || "Could not load round state." }));
    }
  }, [sessionId, roundType]);

  useEffect(() => {
    load();
    setState((prev) => ({ ...prev, refetch: () => { tick.current += 1; load(); } }));
  }, [load]);

  return state;
}
