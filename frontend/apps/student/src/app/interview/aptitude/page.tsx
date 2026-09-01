"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { mockMCQs } from "@/lib/api/mock";
import { useInterviewStore } from "@synclyft/lib/store/interview";
import { ChevronLeft, ChevronRight, Flag } from "lucide-react";
import { cn } from "@synclyft/lib/utils";

export default function AptitudeRoundPage() {
  const router = useRouter();
  const { currentQuestionIndex, selectedAnswers, selectAnswer, nextQuestion, prevQuestion } =
    useInterviewStore();

  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const questions = mockMCQs;
  const currentQ = questions[Math.min(currentQuestionIndex, questions.length - 1)];
  const totalQ = questions.length;

  const selectedOption = currentQ ? selectedAnswers[currentQ.id] : undefined;

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestionIndex)) next.delete(currentQuestionIndex);
      else next.add(currentQuestionIndex);
      return next;
    });
  };

  const handleSubmit = () => {
    router.push("/interview/coding");
  };

  const answeredCount = Object.keys(selectedAnswers).length;

  return (
    <InterviewShell
      round="aptitude"
      roundLabel="Aptitude"
      questionCounter={`Q ${currentQuestionIndex + 1}/${totalQ}`}
      pulseMode="steady"
      totalSeconds={1800}
      onExit={() => router.push("/dashboard")}
    >
      <div className="flex h-full">
        {/* Sidebar — question map */}
        <aside className="hidden lg:flex flex-col w-52 border-r border-[#2A2F38] p-4 shrink-0">
          <p className="label-caption text-[#4A5260] mb-3">Questions</p>
          <div className="grid grid-cols-5 gap-1.5 mb-4">
            {questions.map((_, idx) => {
              const answered = !!selectedAnswers[questions[idx].id];
              const isCurrent = idx === currentQuestionIndex;
              const isFlagged = flagged.has(idx);
              return (
                <button
                  key={idx}
                  onClick={() => useInterviewStore.setState({ currentQuestionIndex: idx })}
                  className={cn(
                    "w-full aspect-square text-xs font-mono rounded transition-all",
                    isCurrent
                      ? "bg-[#0062FF] text-[#0B0D10] font-medium"
                      : answered
                      ? "bg-[rgba(61,220,132,0.15)] text-[#3DDC84] border border-[rgba(61,220,132,0.2)]"
                      : isFlagged
                      ? "bg-[rgba(255,92,92,0.12)] text-[#FF5C5C] border border-[rgba(255,92,92,0.15)]"
                      : "bg-[#1B1F26] text-[#4A5260] border border-[#2A2F38] hover:border-[#4A5260]"
                  )}
                  data-testid={`q-nav-${idx}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          <div className="mt-auto space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[rgba(61,220,132,0.15)] border border-[rgba(61,220,132,0.2)]" />
              <span className="text-[#4A5260]">Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[rgba(255,92,92,0.12)] border border-[rgba(255,92,92,0.15)]" />
              <span className="text-[#4A5260]">Flagged ({flagged.size})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-[#1B1F26] border border-[#2A2F38]" />
              <span className="text-[#4A5260]">Not answered ({totalQ - answeredCount})</span>
            </div>
          </div>
        </aside>

        {/* Main question area */}
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
          <div className="max-w-2xl mx-auto w-full px-6 py-8">
            {currentQ && (
              <>
                {/* Category label */}
                <div className="flex items-center gap-3 mb-6">
                  <span className="label-caption text-[#4A5260]">{currentQ.category}</span>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[0.65rem] font-mono uppercase tracking-wider",
                    currentQ.difficulty === "hard"
                      ? "text-[#FF5C5C] bg-[rgba(255,92,92,0.1)]"
                      : currentQ.difficulty === "medium"
                      ? "text-[#0062FF] bg-[rgba(0, 98, 255, 0.1)]"
                      : "text-[#3DDC84] bg-[rgba(61,220,132,0.1)]"
                  )}>
                    {currentQ.difficulty}
                  </span>
                  <button
                    onClick={toggleFlag}
                    className={cn(
                      "ml-auto p-1.5 rounded transition-colors",
                      flagged.has(currentQuestionIndex)
                        ? "text-[#FF5C5C] bg-[rgba(255,92,92,0.1)]"
                        : "text-[#4A5260] hover:text-[#6B7280]"
                    )}
                    data-testid="flag-question"
                    aria-label="Flag for review"
                  >
                    <Flag size={14} />
                  </button>
                </div>

                {/* Question text */}
                <h2
                  className="text-[#E8EAF0] text-lg leading-relaxed mb-8"
                  style={{ fontFamily: "var(--font-inter), sans-serif" }}
                  data-testid="question-text"
                >
                  {currentQ.text}
                </h2>

                {/* Options */}
                <div className="space-y-3" data-testid="options-list">
                  {currentQ.options.map((option) => {
                    const isSelected = selectedOption === option.id;
                    return (
                      <button
                        key={option.id}
                        onClick={() => selectAnswer(currentQ.id, option.id)}
                        className={cn(
                          "w-full text-left p-4 rounded-[8px] border transition-all flex items-start gap-3",
                          isSelected
                            ? "border-[#0062FF] bg-[rgba(0, 98, 255, 0.06)]"
                            : "border-[#2A2F38] bg-[#1B1F26] hover:border-[#4A5260] hover:bg-[#2A2F38]"
                        )}
                        data-testid={`option-${option.id}`}
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-full border shrink-0 flex items-center justify-center mt-0.5 transition-all",
                          isSelected
                            ? "border-[#0062FF] bg-[#0062FF]"
                            : "border-[#2A2F38]"
                        )}>
                          {isSelected && (
                            <div className="w-2 h-2 rounded-full bg-[#0B0D10]" />
                          )}
                        </div>
                        <span className={cn(
                          "text-sm leading-relaxed",
                          isSelected ? "text-[#E8EAF0]" : "text-[#9CA3AF]"
                        )}>
                          <span className="font-mono text-[#4A5260] mr-2">{option.id.toUpperCase()}.</span>
                          {option.text}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Navigation footer */}
          <div className="sticky bottom-0 border-t border-[#2A2F38] bg-[#0B0D10] px-6 py-4 flex items-center justify-between gap-4 mt-auto">
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="btn-secondary flex items-center gap-2 disabled:opacity-30"
              data-testid="prev-question"
            >
              <ChevronLeft size={15} /> Previous
            </button>

            <div className="font-mono text-xs text-[#4A5260]">
              {answeredCount}/{totalQ} answered
            </div>

            {currentQuestionIndex < totalQ - 1 ? (
              <button
                onClick={nextQuestion}
                className="btn-primary flex items-center gap-2"
                data-testid="next-question"
              >
                Next <ChevronRight size={15} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="btn-primary flex items-center gap-2 !bg-[#3DDC84] !text-[#0B0D10]"
                data-testid="submit-aptitude"
              >
                Submit round <ChevronRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      <ProctoringOverlay />
    </InterviewShell>
  );
}
