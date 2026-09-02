"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useInterviewSession, useRoundState } from "@/lib/interviewSession";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Loader2, AlertTriangle } from "lucide-react";

const VoiceRound = dynamic(() => import("@/components/interview/VoiceRound").then((m) => m.VoiceRound), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-[#0B0D10] text-[#6B7280] text-sm gap-2">
      <Loader2 size={18} className="animate-spin" /> Loading interview room…
    </div>
  ),
});

interface Handshake {
  sessionToken: string;
  roundId: string;
  endsAt: number | null;
  durationSeconds: number;
}

export default function HRRoundPage() {
  const router = useRouter();
  const session = useInterviewSession();
  const roundState = useRoundState(session?.sessionId, "hr");
  const [state, setState] = useState<"init" | "ready" | "error">("init");
  const [handshake, setHandshake] = useState<Handshake | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!session || started.current || roundState.loading) return;
    if (roundState.status === "completed") { session.goReport(); return; }
    started.current = true;
    (async () => {
      try {
        const res = (await interviewService.initHr(session.sessionId)) as Partial<Handshake> & { code?: string; message?: string };
        if (!res.sessionToken || !res.roundId) {
          throw new Error(res.message || "The interviewer service did not return a session.");
        }
        setHandshake({
          sessionToken: res.sessionToken,
          roundId: res.roundId,
          endsAt: res.endsAt ? Number(res.endsAt) : null,
          durationSeconds: Number(res.durationSeconds) || 15 * 60,
        });
        setState("ready");
      } catch (err) {
        setErrorMsg(toApiError(err).message);
        setState("error");
      }
    })();
  }, [session, roundState.loading, roundState.status]);

  if (!session || state === "init" || roundState.loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0B0D10] text-[#6B7280] text-sm gap-2">
        <Loader2 size={18} className="animate-spin" /> Connecting to your HR interviewer…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-[#0B0D10] text-center px-6 gap-3">
        <AlertTriangle size={28} className="text-[#FF5C5C]" />
        <p className="text-[#E8EAF0] text-sm">Couldn&apos;t start the HR round</p>
        <p className="text-[#6B7280] text-xs max-w-sm">{errorMsg}</p>
        <div className="flex gap-2 mt-2">
          <button onClick={() => { started.current = false; setState("init"); }} className="btn-secondary">Retry</button>
          <button onClick={() => session.goReport()} className="btn-primary">Finish &amp; see report</button>
        </div>
      </div>
    );
  }

  return handshake ? (
    <VoiceRound
      sessionId={session.sessionId}
      roundId={handshake.roundId}
      simliSessionToken={handshake.sessionToken}
      roundType="hr"
      endsAt={handshake.endsAt}
      totalSeconds={handshake.durationSeconds}
      onComplete={() => session.goReport()}
      onExit={() => router.push("/dashboard")}
    />
  ) : null;
}
