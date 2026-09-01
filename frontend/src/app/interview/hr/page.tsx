"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { InterviewShell } from "@/components/interview/InterviewShell";
import { ProctoringOverlay } from "@/components/interview/ProctoringOverlay";
import { AdaptivePulse } from "@/components/ui/AdaptivePulse";
import { useInterviewStore } from "@/lib/store/interview";
import { formatTime } from "@/lib/utils";
import { Mic, MicOff, Volume2, ChevronRight, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import HRInterviewScreen from "@/components/HRInterviewScreen";

type VoiceState = "speaking" | "listening" | "processing" | "next";

const HR_QUESTIONS = [
  {
    id: "q1",
    text: "Tell me about yourself and your background in software engineering.",
    aiName: "Aria",
    silenceLimit: 45,
  },
  {
    id: "q2",
    text: "Describe a time when you had to deal with a difficult teammate or conflict within your team. How did you handle it?",
    aiName: "Aria",
    silenceLimit: 60,
  },
  {
    id: "q3",
    text: "Where do you see yourself professionally in 5 years? What's your career ambition?",
    aiName: "Aria",
    silenceLimit: 45,
  },
  {
    id: "q4",
    text: "Tell me about a project you built that you're most proud of. What was your specific contribution and what impact did it have?",
    aiName: "Aria",
    silenceLimit: 60,
  },
];

export default function HRRoundPage() {
  const router = useRouter();
  const { voiceState, setVoiceState } = useInterviewStore();
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [localVoiceState, setLocalVoiceState] = useState<VoiceState>("speaking");
  const [silenceCountdown, setSilenceCountdown] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [responses, setResponses] = useState<string[]>([]);
  const [speakingProgress, setSpeakingProgress] = useState(0);
  const silenceIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentQ = HR_QUESTIONS[currentQuestionIdx];

  // Simulate AI speaking animation
  useEffect(() => {
    let active = true;

    const setupTimer = setTimeout(() => {
      if (!active) return;
      setLocalVoiceState("speaking");
      setSpeakingProgress(0);
    }, 0);

    const totalDuration = 4000;
    const interval = setInterval(() => {
      setSpeakingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setLocalVoiceState("listening");
          setIsRecording(true);
          setSilenceCountdown(currentQ.silenceLimit);
          return 100;
        }
        return prev + 2;
      });
    }, totalDuration / 50);

    return () => {
      active = false;
      clearTimeout(setupTimer);
      clearInterval(interval);
    };
  }, [currentQuestionIdx, currentQ.silenceLimit]);

  // Silence countdown
  useEffect(() => {
    if (localVoiceState !== "listening" || !isRecording) return;

    const interval = setInterval(() => {
      setSilenceCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [localVoiceState, isRecording]);

  const handleEndResponse = () => {
    setIsRecording(false);
    setLocalVoiceState("processing");
    setResponses((prev) => [...prev, `[Response to Q${currentQuestionIdx + 1} recorded]`]);

    setTimeout(() => {
      if (currentQuestionIdx < HR_QUESTIONS.length - 1) {
        setCurrentQuestionIdx((i) => i + 1);
      } else {
        router.push("/interview/loading");
      }
    }, 1500);
  };

  const pulseMode = localVoiceState === "speaking"
    ? "speaking"
    : localVoiceState === "listening"
    ? "listening"
    : "processing";

  const silencePct = silenceCountdown / currentQ.silenceLimit;
  const isLowSilence = silenceCountdown <= 10;

  return (
    <InterviewShell
      round="hr"
      roundLabel="HR / Behavioral"
      questionCounter={`Q ${currentQuestionIdx + 1}/${HR_QUESTIONS.length}`}
      pulseMode={pulseMode}
      totalSeconds={1200}
      onExit={() => router.push("/dashboard")}
    >
      <div className="flex flex-col h-full items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl space-y-8">
          {/* AI Persona */}
          <div className="flex flex-col items-center gap-4">
            {/* Animated AI avatar ring */}
            <div className="relative">
              <div
                className={cn(
                  "w-24 h-24 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                  localVoiceState === "speaking"
                    ? "border-[#0062FF] shadow-[0_0_30px_rgba(0, 98, 255, 0.3)]"
                    : localVoiceState === "listening"
                    ? "border-[#3DDC84] shadow-[0_0_20px_rgba(61,220,132,0.2)]"
                    : "border-[#2A2F38]"
                )}
              >
                <Volume2
                  size={36}
                  className={cn(
                    "transition-colors",
                    localVoiceState === "speaking"
                      ? "text-[#0062FF]"
                      : localVoiceState === "listening"
                      ? "text-[#3DDC84]"
                      : "text-[#4A5260]"
                  )}
                />
              </div>

              {/* Pulse rings when speaking */}
              {localVoiceState === "speaking" && (
                <>
                  <div className="absolute inset-0 rounded-full border border-[#0062FF] animate-ping opacity-20" />
                  <div className="absolute -inset-3 rounded-full border border-[#0062FF] opacity-10 animate-pulse" />
                </>
              )}
            </div>

            <div className="text-center">
              <div className="font-medium text-[#E8EAF0] text-sm" style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}>
                {currentQ.aiName}
              </div>
              <div
                className="font-mono text-xs uppercase tracking-[0.12em] mt-1"
                style={{
                  color: localVoiceState === "speaking"
                    ? "#0062FF"
                    : localVoiceState === "listening"
                    ? "#3DDC84"
                    : localVoiceState === "processing"
                    ? "#4D7CFF"
                    : "#4A5260",
                }}
                data-testid="voice-state-label"
              >
                {localVoiceState === "speaking" && "Speaking"}
                {localVoiceState === "listening" && "Listening"}
                {localVoiceState === "processing" && "Processing"}
                {localVoiceState === "next" && "Next question"}
              </div>
            </div>
          </div>

          {/* Waveform */}
          <div className="w-full">
            <AdaptivePulse mode={pulseMode} intensity={localVoiceState === "speaking" ? 0.8 : 0.6} />
          </div>

          {/* Question card */}
          <div className="card-dark p-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="label-caption text-[#4A5260]">Question {currentQuestionIdx + 1} of {HR_QUESTIONS.length}</span>
            </div>
            <p className="text-[#C8CDD5] text-lg leading-relaxed" data-testid="hr-question-text">
              {currentQ.text}
            </p>
          </div>

          {/* Silence countdown */}
          {localVoiceState === "listening" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isRecording && <div className="w-2 h-2 rounded-full bg-[#FF5C5C] animate-pulse" />}
                  <span className="font-mono text-xs text-[#6B7280] uppercase tracking-wider">
                    {isRecording ? "Recording" : "Paused"}
                  </span>
                </div>
                <span
                  className={cn(
                    "font-mono text-sm font-medium",
                    isLowSilence ? "text-[#FF5C5C]" : "text-[#9CA3AF]"
                  )}
                  data-testid="silence-countdown"
                >
                  Silence: {silenceCountdown}s
                </span>
              </div>

              {/* Silence bar */}
              <div className="h-1 bg-[#2A2F38] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${silencePct * 100}%`,
                    backgroundColor: isLowSilence ? "#FF5C5C" : "#3DDC84",
                  }}
                />
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={handleEndResponse}
                  className="btn-primary flex items-center gap-2"
                  data-testid="end-response-btn"
                >
                  {currentQuestionIdx < HR_QUESTIONS.length - 1 ? (
                    <><ChevronRight size={15} /> Done, next question</>
                  ) : (
                    <><ChevronRight size={15} /> Submit HR round</>
                  )}
                </button>
              </div>
            </div>
          )}

          {localVoiceState === "processing" && (
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="w-4 h-4 border-2 border-[#4D7CFF] border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-sm text-[#4D7CFF]">Analyzing response...</span>
            </div>
          )}

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-2">
            {HR_QUESTIONS.map((_, idx) => (
              <div
                key={idx}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  idx < currentQuestionIdx
                    ? "bg-[#3DDC84]"
                    : idx === currentQuestionIdx
                    ? "bg-[#0062FF] scale-125"
                    : "bg-[#2A2F38]"
                )}
              />
            ))}
          </div>
        </div>
      </div>
      
      <HRInterviewScreen sessionId= "1234" roundId= "1234" simliSessionToken= "1234" />
      <ProctoringOverlay />
    </InterviewShell>
  );
}
