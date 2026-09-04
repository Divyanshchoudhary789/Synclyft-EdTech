"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { QuestionPalette, type PaletteState } from "@/components/interview/QuestionPalette";
import { useInterviewSession, useRoundState } from "@/lib/interviewSession";
import { useAuthStore } from "@synclyft/lib/store/auth";
import { interviewService } from "@synclyft/lib/api/services";
import { toApiError } from "@synclyft/lib/api";
import { cn } from "@synclyft/lib/utils";
import toast from "react-hot-toast";
import {
  ChevronRight, ChevronLeft, Loader2, AlertTriangle, Brain, Check, X,
  Flag, LayoutGrid, CircleCheck, CircleDashed,
} from "lucide-react";

const TOPICS = [
  { id: "quantitative", label: "Quantitative Ability" },
  { id: "logical", label: "Logical Reasoning" },
  { id: "verbal", label: "English / Verbal" },
  { id: "data-interpretation", label: "Data Interpretation" },
  { id: "cs-fundamentals", label: "Computer Knowledge" },
];
const QUESTIONS_PER_TOPIC = 15;

type Phase = "resolving" | "select" | "loading" | "ready" | "error" | "done";

interface AptQuestion {
  questionId: string;
  text: string;
  topic?: string;
  level?: string;
  options: { id: string; text: string }[];
}
interface Submitted { answer: string; isCorrect?: boolean; explanation?: string }

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
  const [batchSessionId, setBatchSessionId] = useState("");
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [total, setTotal] = useState(0);

  const [current, setCurrent] = useState(1);
  const [qByPage, setQByPage] = useState<Record<number, AptQuestion>>({});
  const [pageToQid, setPageToQid] = useState<Record<number, string>>({});
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<Record<string, Submitted>>({});
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [navBusy, setNavBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const resolvedRef = useRef(false);

  const question = qByPage[current] ?? null;
  const qid = question?.questionId ?? pageToQid[current] ?? "";
  const localAnswer = qid ? answers[qid] ?? "" : "";
  const sub = qid ? submitted[qid] : undefined;

  const answeredCount = useMemo(
    () => new Set(Object.keys(submitted)).size,
    [submitted]
  );

  const setPageQ = useCallback((p: number, q: AptQuestion) => {
    setQByPage((m) => ({ ...m, [p]: q }));
    if (q.questionId) setPageToQid((m) => ({ ...m, [p]: q.questionId }));
  }, []);

  const fetchPage = useCallback(
    async (p: number, bsid: string) => {
      const res = await interviewService.aptitudeQuestion(session!.sessionId, bsid, p);
      if (typeof res.totalItems === "number" && res.totalItems > 0) setTotal(res.totalItems);
      if (res.exhausted || !res.question) return null;
      const q = normalizeQuestion(res.question);
      if (!q.questionId || q.options.length === 0) return null;
      setPageQ(p, q);
      return q;
    },
    [session, setPageQ]
  );

  // ── Resolve: resume or select ──
  useEffect(() => {
    if (!session || roundState.loading || resolvedRef.current) return;
    resolvedRef.current = true;

    (async () => {
      try {
        const prog = await interviewService.aptitudeProgress(session.sessionId);
        if (prog.status === "completed" || roundState.forceEnded) {
          setPhase("done");
          return;
        }
        if (prog.endsAt) setEndsAt(prog.endsAt);
        else if (roundState.endsAt) setEndsAt(roundState.endsAt);

        // Round already running → restore the palette.
        if (prog.total > 0 && roundState.providerSessionId) {
          setTotal(prog.total);
          setBatchSessionId(roundState.providerSessionId);
          const subMap: Record<string, Submitted> = {};
          const ansMap: Record<string, string> = {};
          const p2q: Record<number, string> = {};
          for (const a of prog.answered) {
            if (a.page) p2q[a.page] = a.questionId;
            if (a.isAttempted && a.studentAnswer) {
              subMap[a.questionId] = { answer: a.studentAnswer };
              ansMap[a.questionId] = a.studentAnswer;
            }
          }
          setSubmitted(subMap);
          setAnswers(ansMap);
          setPageToQid(p2q);
          const firstUnanswered =
            Array.from({ length: prog.total }, (_, i) => i + 1).find(
              (n) => !p2q[n] || !subMap[p2q[n]]
            ) ?? 1;
          setCurrent(firstUnanswered);
          await fetchPage(firstUnanswered, roundState.providerSessionId);
          setPhase("ready");
          return;
        }

        setPhase("select");
      } catch (err) {
        setErrorMsg(toApiError(err).message);
        setPhase("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, roundState.loading]);

  const start = async () => {
    if (!session || selectedTopics.length === 0) return;
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
      setTotal(selectedTopics.length * QUESTIONS_PER_TOPIC);
      setCurrent(1);
      await fetchPage(1, bsid);
      setPhase("ready");
    } catch (err) {
      setErrorMsg(toApiError(err).message);
      setPhase("error");
    }
  };

  // Fire-and-forget submit; palette + review update when it resolves.
  const pushSubmit = useCallback(
    async (questionId: string, answer: string) => {
      if (!session || !questionId || !answer) return;
      if (submitted[questionId]?.answer === answer) return;
      setPending((s) => new Set(s).add(questionId));
      try {
        const r = await interviewService.submitAptitude(session.sessionId, questionId, answer);
        setSubmitted((m) => ({ ...m, [questionId]: { answer, isCorrect: r.isCorrect, explanation: r.explanation } }));
      } catch (err) {
        const e = toApiError(err);
        if (e.code === "ROUND_TIME_UP") setPhase("done");
        else toast.error(e.message);
      } finally {
        setPending((s) => {
          const n = new Set(s);
          n.delete(questionId);
          return n;
        });
      }
    },
    [session, submitted]
  );

  const goTo = useCallback(
    async (p: number) => {
      if (p < 1 || p > total || p === current || navBusy) return;
      // flush the current answer if it changed
      if (qid && localAnswer && submitted[qid]?.answer !== localAnswer) {
        pushSubmit(qid, localAnswer);
      }
      setReviewOpen(false);
      setPaletteOpen(false);
      setCurrent(p);
      if (!qByPage[p] && batchSessionId) {
        setNavBusy(true);
        try {
          await fetchPage(p, batchSessionId);
        } catch (err) {
          toast.error(toApiError(err).message);
        } finally {
          setNavBusy(false);
        }
      }
    },
    [total, current, navBusy, qid, localAnswer, submitted, pushSubmit, qByPage, batchSessionId, fetchPage]
  );

  const pick = (optId: string) => {
    if (!qid) return;
    setAnswers((m) => ({ ...m, [qid]: optId }));
  };

  const submitCurrent = () => {
    if (!qid || !localAnswer) return;
    pushSubmit(qid, localAnswer);
    setReviewOpen(true);
  };

  const toggleFlag = () => {
    setFlagged((s) => {
      const n = new Set(s);
      if (n.has(current)) n.delete(current);
      else n.add(current);
      return n;
    });
  };

  const finish = () => {
    if (qid && localAnswer && submitted[qid]?.answer !== localAnswer) pushSubmit(qid, localAnswer);
    setPhase("done");
  };

  useEffect(() => {
    if (phase === "done" && session) {
      const t = setTimeout(() => session.goNext("aptitude"), 1400);
      return () => clearTimeout(t);
    }
  }, [phase, session]);

  // Keyboard: 1-9 / A-I pick, Enter submit, arrows navigate
  useEffect(() => {
    if (phase !== "ready" || !question) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") { goTo(current + 1); return; }
      if (e.key === "ArrowLeft") { goTo(current - 1); return; }
      if (e.key === "Enter" && localAnswer) { submitCurrent(); return; }
      const idx = /^[1-9]$/.test(e.key)
        ? Number(e.key) - 1
        : /^[a-iA-I]$/.test(e.key)
          ? e.key.toLowerCase().charCodeAt(0) - 97
          : -1;
      if (idx >= 0 && idx < question.options.length) pick(question.options[idx].id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, question, current, localAnswer]);

  const stateFor = useCallback(
    (p: number): PaletteState => {
      const q = pageToQid[p];
      if (q && pending.has(q)) return "pending";
      if (q && submitted[q]) return "answered";
      if (q && answers[q]) return "selected";
      return "unanswered";
    },
    [pageToQid, pending, submitted, answers]
  );

  if (!session || phase === "resolving") {
    return (
      <div className="flex h-screen items-center justify-center gap-2 bg-[var(--iv-bg)] text-sm text-[var(--iv-text-faint)]">
        <Loader2 size={16} className="animate-spin" /> Preparing your aptitude round…
      </div>
    );
  }

  return (
    <InterviewShell
      round="aptitude"
      roundLabel="Aptitude"
      questionCounter={phase === "ready" ? `${answeredCount} / ${total} answered` : undefined}
      pulseMode="steady"
      totalSeconds={endsAt ? undefined : (total || 30) * 60}
      endsAt={endsAt}
      onExit={() => router.push("/dashboard")}
      onTimeUp={() => { if (phase !== "done") { toast("Time's up — submitting what you have"); finish(); } }}
    >
      {phase === "select" && (
        <div className="h-full overflow-y-auto">
          <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
            <div className="mb-2 flex items-center gap-3">
              <Brain size={20} className="text-[#0062FF]" />
              <h2 className="text-lg font-medium text-[var(--iv-text)]">Pick your aptitude topics</h2>
            </div>
            <p className="mb-6 text-sm text-[var(--iv-text-faint)]">
              {QUESTIONS_PER_TOPIC} questions per topic · {selectedTopics.length * QUESTIONS_PER_TOPIC} total ·
              ~{selectedTopics.length * QUESTIONS_PER_TOPIC} min · answer in any order
            </p>
            <div className="space-y-2">
              {TOPICS.map((t) => {
                const on = selectedTopics.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTopics((p) => (p.includes(t.id) ? p.filter((x) => x !== t.id) : [...p, t.id]))}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all",
                      on ? "border-[#0062FF] bg-[#0062FF]/6" : "border-[var(--iv-border)] bg-[var(--iv-elevated)] hover:border-[var(--iv-text-faintest)]"
                    )}
                  >
                    <div className={cn("flex h-4 w-4 items-center justify-center rounded border", on ? "border-[#0062FF] bg-[#0062FF]" : "border-[var(--iv-text-faintest)]")}>
                      {on && <Check size={10} className="text-white" />}
                    </div>
                    <span className={cn("text-sm", on ? "text-[var(--iv-text)]" : "text-[var(--iv-text-muted)]")}>{t.label}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={start} disabled={selectedTopics.length === 0} className="btn-primary mt-6 w-full justify-center disabled:opacity-40" data-testid="start-aptitude">
              Start aptitude round
            </button>
          </div>
        </div>
      )}

      {phase === "loading" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--iv-text-faint)]">
          <Loader2 size={24} className="animate-spin text-[#0062FF]" />
          <p className="text-sm">Generating your question set… this can take a few seconds.</p>
        </div>
      )}

      {phase === "error" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
          <AlertTriangle size={26} className="text-[#FF5C5C]" />
          <p className="text-sm text-[var(--iv-text)]">Couldn&apos;t load the aptitude round</p>
          <p className="max-w-sm text-xs text-[var(--iv-text-faint)]">{errorMsg}</p>
          <div className="mt-2 flex gap-2">
            <button onClick={() => { resolvedRef.current = false; setPhase("resolving"); }} className="btn-secondary">Retry</button>
            <button onClick={() => session.goNext("aptitude")} className="btn-primary">Skip round</button>
          </div>
        </div>
      )}

      {phase === "done" && (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-[var(--iv-text-faint)]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#3DDC84]/12">
            <Check size={20} className="text-[#3DDC84]" />
          </div>
          <p className="text-sm text-[var(--iv-text)]">Aptitude round complete</p>
          <p className="text-xs">{answeredCount} of {total} answered · moving on…</p>
        </div>
      )}

      {phase === "ready" && (
        <div className="flex h-full flex-col lg:flex-row">
          {/* Question column */}
          <div className="flex min-h-0 flex-1 flex-col">
            {/* mobile toolbar */}
            <div className="flex shrink-0 items-center gap-2 border-b border-[var(--iv-border)] px-3 py-2 lg:px-6">
              <button
                onClick={() => setPaletteOpen((o) => !o)}
                className="flex items-center gap-1.5 rounded-md border border-[var(--iv-border)] px-2.5 py-1.5 text-xs font-medium text-[var(--iv-text-secondary)] lg:hidden"
              >
                <LayoutGrid size={13} /> {current}/{total}
              </button>
              <div className="hidden items-center gap-2 text-xs text-[var(--iv-text-faint)] lg:flex">
                <span className="font-mono text-sm text-[var(--iv-text-secondary)]">Question {current}</span>
                <span>of {total}</span>
                {question?.topic && <span className="rounded bg-[var(--iv-elevated)] px-1.5 py-0.5">{question.topic}</span>}
              </div>
              <button
                onClick={toggleFlag}
                className={cn(
                  "ml-auto flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors",
                  flagged.has(current)
                    ? "border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B]"
                    : "border-[var(--iv-border)] text-[var(--iv-text-faint)] hover:text-[var(--iv-text-secondary)]"
                )}
              >
                <Flag size={12} className={flagged.has(current) ? "fill-current" : ""} />
                {flagged.has(current) ? "Flagged" : "Flag"}
              </button>
            </div>

            {/* mobile palette sheet */}
            {paletteOpen && (
              <div className="border-b border-[var(--iv-border)] bg-[var(--iv-panel)] p-3 lg:hidden">
                <QuestionPalette total={total} current={current} stateFor={stateFor} flagged={flagged} onJump={goTo} />
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10">
              <div className="mx-auto max-w-2xl space-y-5">
                {navBusy || !question ? (
                  <div className="flex flex-col items-center gap-3 py-24 text-[var(--iv-text-faint)]">
                    <Loader2 size={22} className="animate-spin text-[#0062FF]" />
                    <p className="text-sm">Loading question {current}…</p>
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      {question.level && (
                        <span className="rounded bg-[#0062FF]/10 px-2 py-0.5 font-mono text-[0.65rem] uppercase tracking-wider text-[#0062FF]">
                          {question.level}
                        </span>
                      )}
                      {question.topic && <span className="text-[11px] uppercase tracking-wider text-[var(--iv-text-faintest)]">{question.topic}</span>}
                    </div>
                    <h2 className="text-base leading-relaxed text-[var(--iv-text)] sm:text-lg" data-testid="question-text">
                      {question.text}
                    </h2>

                    <div className="space-y-2.5" data-testid="options-list">
                      {question.options.map((opt, i) => {
                        const selected = localAnswer === opt.id;
                        const showReview = reviewOpen && !!sub;
                        const correct = showReview && sub?.isCorrect && selected;
                        const wrong = showReview && sub?.isCorrect === false && selected;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => pick(opt.id)}
                            className={cn(
                              "flex w-full items-start gap-3 rounded-lg border p-3.5 text-left transition-all",
                              correct && "border-[#3DDC84] bg-[#3DDC84]/8",
                              wrong && "border-[#FF5C5C] bg-[#FF5C5C]/8",
                              !correct && !wrong && selected && "border-[#0062FF] bg-[#0062FF]/6",
                              !selected && "border-[var(--iv-border)] bg-[var(--iv-elevated)] hover:border-[var(--iv-text-faintest)]"
                            )}
                            data-testid={`option-${opt.id}`}
                          >
                            <span className={cn(
                              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                              correct ? "border-[#3DDC84] bg-[#3DDC84] text-white"
                                : wrong ? "border-[#FF5C5C] bg-[#FF5C5C] text-white"
                                  : selected ? "border-[#0062FF] bg-[#0062FF] text-white"
                                    : "border-[var(--iv-border)] text-[var(--iv-text-faint)]"
                            )}>
                              {correct ? <Check size={11} /> : wrong ? <X size={11} /> : opt.id.toUpperCase()}
                            </span>
                            <span className={cn("text-sm leading-relaxed", selected || correct ? "text-[var(--iv-text)]" : "text-[var(--iv-text-muted)]")}>
                              {opt.text}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {reviewOpen && sub && (
                      <div className={cn(
                        "rounded-lg border p-3.5 text-sm",
                        sub.isCorrect ? "border-[#3DDC84]/25 bg-[#3DDC84]/5" : "border-[#F59E0B]/25 bg-[#F59E0B]/5"
                      )}>
                        <p className={cn("mb-1 flex items-center gap-1.5 font-semibold", sub.isCorrect ? "text-[#3DDC84]" : "text-[#F59E0B]")}>
                          {sub.isCorrect ? <Check size={14} /> : <X size={14} />}
                          {sub.isCorrect ? "Correct" : "Review this one"}
                        </p>
                        {sub.explanation && <p className="leading-relaxed text-[var(--iv-text-secondary)]">{sub.explanation}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* bottom nav */}
            <div className="flex shrink-0 items-center gap-2 border-t border-[var(--iv-border)] px-3 py-2.5 sm:px-6">
              <button
                onClick={() => goTo(current - 1)}
                disabled={current <= 1 || navBusy}
                className="flex items-center gap-1 rounded-md border border-[var(--iv-border)] px-3 py-2 text-xs font-medium text-[var(--iv-text-secondary)] disabled:opacity-30"
              >
                <ChevronLeft size={14} /> Prev
              </button>

              <button
                onClick={submitCurrent}
                disabled={!localAnswer || (qid ? pending.has(qid) : false)}
                className="flex items-center gap-1.5 rounded-md bg-[#0062FF] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0053d6] disabled:opacity-40"
                data-testid="submit-answer"
              >
                {qid && pending.has(qid) ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                {sub ? "Update answer" : "Submit answer"}
              </button>

              {current < total ? (
                <button
                  onClick={() => goTo(current + 1)}
                  disabled={navBusy}
                  className="ml-auto flex items-center gap-1 rounded-md border border-[var(--iv-border)] px-3 py-2 text-xs font-medium text-[var(--iv-text-secondary)] disabled:opacity-30"
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={finish} className="ml-auto flex items-center gap-1.5 rounded-md bg-[#3DDC84] px-4 py-2 text-xs font-semibold text-[#062012] hover:bg-[#35c778]">
                  <CircleCheck size={14} /> Finish round
                </button>
              )}
            </div>
          </div>

          {/* Desktop palette sidebar */}
          <aside className="hidden w-64 shrink-0 flex-col border-l border-[var(--iv-border)] bg-[var(--iv-panel)] lg:flex">
            <div className="border-b border-[var(--iv-border)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--iv-text-faintest)]">Question palette</p>
              <p className="mt-1 flex items-center gap-2 text-xs text-[var(--iv-text-muted)]">
                <CircleCheck size={13} className="text-[#3DDC84]" /> {answeredCount} answered
                <CircleDashed size={13} className="ml-1" /> {total - answeredCount} left
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <QuestionPalette total={total} current={current} stateFor={stateFor} flagged={flagged} onJump={goTo} />
            </div>
            <div className="border-t border-[var(--iv-border)] p-4">
              <button onClick={finish} className="flex w-full items-center justify-center gap-1.5 rounded-md bg-[#3DDC84] px-4 py-2 text-xs font-semibold text-[#062012] hover:bg-[#35c778]">
                <CircleCheck size={14} /> Finish round
              </button>
            </div>
          </aside>
        </div>
      )}

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
