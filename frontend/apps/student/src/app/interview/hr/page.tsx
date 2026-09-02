"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useInterviewSession } from "@/lib/interviewSession";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { Loader2, AlertTriangle } from "lucide-react";

const HRInterviewScreen = dynamic(() => import("@/components/HRInterviewScreen"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 text-sm gap-2">
      <Loader2 size={18} className="animate-spin" /> Loading interview room…
    </div>
  ),
});

export default function HRRoundPage() {
  const router = useRouter();
  const session = useInterviewSession();
  const [state, setState] = useState<"init" | "ready" | "error">("init");
  const [handshake, setHandshake] = useState<{ sessionToken: string; roundId: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (!session || started.current) return;
    started.current = true;
    (async () => {
      try {
        const res = (await interviewService.initHr(session.sessionId)) as {
          sessionToken?: string;
          roundId?: string;
        };
        if (!res.sessionToken || !res.roundId) throw new Error("Interviewer service did not return a session");
        setHandshake({ sessionToken: res.sessionToken, roundId: res.roundId });
        setState("ready");
      } catch (err) {
        setErrorMsg(toApiError(err).message);
        setState("error");
      }
    })();
  }, [session]);

  if (!session || state === "init") {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400 text-sm gap-2">
        <Loader2 size={18} className="animate-spin" /> Connecting to your HR interviewer…
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-950 text-center px-6 gap-3">
        <AlertTriangle size={28} className="text-rose-500" />
        <p className="text-slate-200 text-sm">Couldn&apos;t start the HR round</p>
        <p className="text-slate-500 text-xs max-w-sm">{errorMsg}</p>
        <div className="flex gap-2 mt-2">
          <button onClick={() => { started.current = false; setState("init"); }} className="btn-secondary">Retry</button>
          <button onClick={() => session.goReport()} className="btn-primary">Finish &amp; see report</button>
        </div>
      </div>
    );
  }

  return handshake ? (
    <HRInterviewScreen
      sessionId={session.sessionId}
      roundId={handshake.roundId}
      simliSessionToken={handshake.sessionToken}
      onComplete={() => session.goReport()}
    />
  ) : null;
}
