"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { useInterviewSession, useRoundState } from "@/lib/interviewSession";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { cn } from "@synclyft/lib/utils";
import toast from "react-hot-toast";
import { ChevronRight, Loader2, AlertTriangle, Brain, Check } from "lucide-react";

const TOPICS = [
  { id: "quantitative", label: "Quantitative Aptitude" },
  { id: "logical", label: "Logical Reasoning" },
  { id: "verbal", label: "Verbal Ability" },
  { id: "data-interpretation", label: "Data Interpretation" },
  { id: "cs-fundamentals", label: "CS Fundamentals" },
];
const QUESTIONS_PER_TOPIC = 15;

type Phase = "resolving" | "select" | "loading" | "question" | "error" | "done";

interface AptQuestion {
  questionId: string;
  text: string;
  topic?: string;
  level?: string;
  options: { id: string; text: string }[];
}

function normalizeQuestion(raw: Record<string, unknown>): AptQuestion {
  const opts = (raw.options ?? []) as unknown[];
  const options = opts.map((o, i) => {
    if (typeof o === "string") return { id: String.fromCharCode(97 + i), text: o };
    const obj = o as Record<string, unknown>;
    return { id: String(obj.id ?? obj.key ?? String.fromCharCode(97 + i)), text: String(obj.text ?? obj.value ?? obj.option ?? o) };
  });
  return {
    questionId: String(raw.question_id ?? raw.questionId ?? raw.id ?? ""),
    text: String(raw.question ?? raw.questionText ?? raw.text ?? ""),
    topic: raw.topic as string | undefined,
    level: (raw.level ?? raw.difficulty) as string | undefined,
    options,
  };
}

export default function AptitudeRoundPage() {
  const router = useRouter();
  const session = useInterviewSession();
  const userId = useAuthStore((s) => s.user?._id ?? "");
  const roundState = useRoundState(session?.sessionId, "aptitude");

  const [phase, setPhase] = useState<Phase>("resolving");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["quantitative", "logical"]);
  const [batchSessionId, setBatchSessionId] = useState<string>("");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [topicCount, setTopicCount] = useState(2);
  const [page, setPage] = useState(1);
  const [question, setQuestion] = useState<AptQuestion | null>(null);
  const [answer, setAnswer] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const resolvedRef = useRef(false);

  const totalQuestions = useMemo(() => topicCount * QUESTIONS_PER_TOPIC, [topicCount]);

  const loadQuestion = useCallback(
    async (p: number, bsid: string) => {
      if (!session) return;
      setPhase("loading");
      try {
        const res = await interviewService.aptitudeQuestion(session.sessionId, bsid, p);
        const q = res.question ? normalizeQuestion(res.question) : null;
        if (!q || !q.questionId || q.options.length === 0) {
          setPhase("done");
          return;
        }
        setQuestion(q);
        setAnswer("");
        setPage(p);
        setPhase("question");
      } catch (err) {
        setErrorMsg(toApiError(err).message);
        setPhase("error");
      }
    },
    [session]
  );

  // ── Resume-or-start resolution ──
  useEffect(() => {
    if (!session || roundState.loading || resolvedRef.current) return;
    resolvedRef.current = true;

    if (roundState.status === "completed" || roundState.forceEnded) {
      setPhase("done");
      return;
    }

    if (roundState.status === "active" && roundState.providerSessionId) {
      // Resume: pick up where the candidate left off.
      const topics = roundState.aptitudeTopics.length ? roundState.aptitudeTopics : selectedTopics;
      setSelectedTopics(topics);
      setTopicCount(topics.length || 2);
      setBatchSessionId(roundState.providerSessionId);
      setEndsAt(roundState.endsAt);
      loadQuestion(Math.max(1, roundState.answeredCount + 1), roundState.providerSessionId);
      return;
    }

    setPhase("select");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, roundState.loading]);

  const start = async () => {
    if (!session || selectedTopics.length === 0) return;
    setTopicCount(selectedTopics.length);
    setPhase("loading");
    try {
      const res = await interviewService.initAptitudeBatch(session.sessionId, selectedTopics);
      if (res.endsAt) setEndsAt(Number(res.endsAt));
      const data = (res.data ?? {}) as Record<string, unknown>;
      const bsid = String(
        data.sessionId ?? data.session_id ?? data.batchSessionId ?? data.id ?? data.batch_id ??
        (data.data as Record<string, unknown> | undefined)?.sessionId ??
        (data.data as Record<string, unknown> | undefined)?.session_id ?? ""
      );
      if (!bsid) throw new Error("The aptitude service did not return a session id.");
      setBatchSessionId(bsid);
      await loadQuestion(1, bsid);
    } catch (err) {
      setErrorMsg(toApiError(err).message);
      setPhase("error");
    }
  };

  const submitAndNext = async () => {
    if (!session || !question) return;
    setSubmitting(true);
    try {
      if (answer) {
        await interviewService.submitAptitude(session.sessionId, question.questionId, answer);
      }
      const nextPage = page + 1;
      if (nextPage > totalQuestions) setPhase("done");
      else await loadQuestion(nextPage, batchSessionId);
    } catch (err) {
      const e = toApiError(err);
      if (e.code === "ROUND_TIME_UP") setPhase("done");
      else toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (phase === "done" && session) {
      const t = setTimeout(() => session.goNext("aptitude"), 1200);
      return () => clearTimeout(t);
    }
  }, [phase, session]);

  if (!session || phase === "resolving") {
    return <div className="flex h-screen items-center justify-center bg-[#0B0D10] text-[#6B7280] text-sm gap-2">
      <Loader2 size={16} className="animate-spin" /> Preparing your aptitude round…
    </div>;
  }

  return (
    <InterviewShell
      round="aptitude"
      roundLabel="Aptitude"
      questionCounter={phase === "question" ? `Q ${page}/${totalQuestions}` : undefined}
      pulseMode="steady"
      totalSeconds={endsAt ? undefined : totalQuestions * 60}
      endsAt={endsAt}
      onExit={() => router.push("/dashboard")}
      onTimeUp={() => { if (phase !== "done") { toast("Time's up — moving on"); setPhase("done"); } }}
    >
      <div className="h-full overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-10">
          {phase === "select" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Brain size={20} className="text-[#0062FF]" />
                <h2 className="text-[#E8EAF0] text-lg font-medium" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                  Pick your aptitude topics
                </h2>
              </div>
              <p className="text-[#6B7280] text-sm">15 questions per topic · {selectedTopics.length * QUESTIONS_PER_TOPIC} total · ~{selectedTopics.length * QUESTIONS_PER_TOPIC} min</p>
              <div className="space-y-2">
                {TOPICS.map((t) => {
                  const on = selectedTopics.includes(t.id);
                  return (
                    <button key={t.id}
                      onClick={() => setSelectedTopics((prev) => (prev.includes(t.id) ? prev.filter((x) => x !== t.id) : [...prev, t.id]))}
                      className={cn("w-full text-left p-4 rounded-lg border transition-all flex items-center gap-3",
                        on ? "border-[#0062FF] bg-[rgba(0,98,255,0.06)]" : "border-[#2A2F38] bg-[#1B1F26] hover:border-[#4A5260]")}>
                      <div className={cn("w-4 h-4 rounded border flex items-center justify-center", on ? "bg-[#0062FF] border-[#0062FF]" : "border-[#4A5260]")}>
                        {on && <Check size={10} className="text-white" />}
                      </div>
                      <span className={cn("text-sm", on ? "text-[#E8EAF0]" : "text-[#9CA3AF]")}>{t.label}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={start} disabled={selectedTopics.length === 0}
                className="btn-primary w-full justify-center disabled:opacity-40" data-testid="start-aptitude">
                Start aptitude round
              </button>
            </div>
          )}

          {phase === "loading" && (
            <div className="flex flex-col items-center gap-3 py-24 text-[#6B7280]">
              <Loader2 size={24} className="animate-spin text-[#0062FF]" />
              <p className="text-sm">{question ? "Loading next question…" : "Generating your questions…"}</p>
            </div>
          )}

          {phase === "error" && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <AlertTriangle size={26} className="text-[#FF5C5C]" />
              <p className="text-[#E8EAF0] text-sm">Couldn&apos;t load the aptitude round</p>
              <p className="text-[#6B7280] text-xs max-w-sm">{errorMsg}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => (batchSessionId ? loadQuestion(page, batchSessionId) : start())} className="btn-secondary">Retry</button>
                <button onClick={() => session.goNext("aptitude")} className="btn-primary">Skip round</button>
              </div>
            </div>
          )}

          {phase === "question" && question && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <span className="label-caption text-[#4A5260]">{question.topic ?? "Aptitude"}</span>
                {question.level && (
                  <span className="px-2 py-0.5 rounded text-[0.65rem] font-mono uppercase tracking-wider text-[#0062FF] bg-[rgba(0,98,255,0.1)]">
                    {question.level}
                  </span>
                )}
              </div>
              <h2 className="text-[#E8EAF0] text-base sm:text-lg leading-relaxed" data-testid="question-text">{question.text}</h2>
              <div className="space-y-3" data-testid="options-list">
                {question.options.map((opt) => {
                  const sel = answer === opt.id;
                  return (
                    <button key={opt.id} onClick={() => setAnswer(opt.id)}
                      className={cn("w-full text-left p-4 rounded-lg border transition-all flex items-start gap-3",
                        sel ? "border-[#0062FF] bg-[rgba(0,98,255,0.06)]" : "border-[#2A2F38] bg-[#1B1F26] hover:border-[#4A5260]")}
                      data-testid={`option-${opt.id}`}>
                      <div className={cn("w-5 h-5 rounded-full border shrink-0 flex items-center justify-center mt-0.5", sel ? "border-[#0062FF] bg-[#0062FF]" : "border-[#2A2F38]")}>
                        {sel && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className={cn("text-sm leading-relaxed", sel ? "text-[#E8EAF0]" : "text-[#9CA3AF]")}>
                        <span className="font-mono text-[#4A5260] mr-2">{opt.id.toUpperCase()}.</span>{opt.text}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="font-mono text-xs text-[#4A5260]">{page} / {totalQuestions}</span>
                <button onClick={submitAndNext} disabled={submitting} className="btn-primary flex items-center gap-2" data-testid="next-question">
                  {submitting ? <Loader2 size={14} className="animate-spin" /> : null}
                  {page >= totalQuestions ? "Finish round" : "Submit & next"} <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {phase === "done" && (
            <div className="flex flex-col items-center gap-3 py-24 text-[#6B7280]">
              <div className="w-12 h-12 rounded-full bg-[rgba(61,220,132,0.12)] flex items-center justify-center">
                <Check size={20} className="text-[#3DDC84]" />
              </div>
              <p className="text-[#E8EAF0] text-sm">Aptitude round complete</p>
              <p className="text-xs">Moving to the next round…</p>
            </div>
          )}
        </div>
      </div>
      {userId && (
        <ProctoringOverlay
          sessionId={session.sessionId}
          candidateId={userId}
          roundType="aptitude"
          onTerminate={(reason) => { toast.error(reason); session.goReport(); }}
        />
      )}
    </InterviewShell>
  );
}
