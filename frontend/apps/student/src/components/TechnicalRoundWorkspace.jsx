'use client';
import React, { useEffect, useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { io } from 'socket.io-client';
import { api, toApiError } from '@synclyft/lib/api';
import { TechAudioStreamer } from '../utils/techAudioStreamer';
import toast from 'react-hot-toast';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  (process.env.NEXT_PUBLIC_Backend_URL || '').replace(/\/api\/?$/, '') ||
  'http://localhost:8080';

export default function TechnicalRoundWorkspace({ sessionId, roundId, simliSessionToken, onComplete }) {
    // Phase Management Lifecycle State: 'persona' (AI Chat) or 'coding' (Monaco Workspace)
    const [roundPhase, setRoundPhase] = useState('persona');
    const [isConnecting, setIsConnecting] = useState(true);
    const [codingQuestion, setCodingQuestion] = useState(null);
    const [userCode, setUserCode] = useState('// Write your optimized engineering solution here...\n');
    const [selectedLanguage, setSelectedLanguage] = useState('cpp');
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const [evaluationResult, setEvaluationResult] = useState(null);

    // Architectural References Cache
    const socketRef = useRef(null);
    const streamerRef = useRef(null);
    const localVideoRef = useRef(null);

    useEffect(() => {
        // 1. Instantiating secure real-time multiplex connection interface targeting backend port 8080
        socketRef.current = io(SOCKET_URL, {
            transports: ['websocket'],
            withCredentials: true,
            forceNew: true
        });

        // 2. Hardware webcam stream access parameters map mapping
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then((stream) => {
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            })
            .catch(err => console.error("Camera verification rejected:", err));

        // 3. Socket Event Registrations Lifecycle
        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-technical-live-stream', {
                sessionId,
                roundId,
                simliSessionToken
            });

            // Fire up continuous processing mic data pipe stream
            streamerRef.current = new TechAudioStreamer(socketRef.current);
            streamerRef.current.startAudioPipeline();
            setIsConnecting(false);
        });

        // 🌟 AUTOMATION TRANSITION HOOK: Trigger layout morphing when 3 questions finish
        socketRef.current.on('technical-persona-complete', async () => {
            if (streamerRef.current) streamerRef.current.stopAudioPipeline();
            setRoundPhase('coding');
            try {
                const res = await api.get(`/interview/technical-round-questions/${sessionId}`);
                if (res.data.success) {
                    const q = res.data.question?.questions?.[0]?.selectedQuestion ?? res.data.question?.selectedQuestion ?? res.data.question;
                    setCodingQuestion(q);
                }
            } catch (err) {
                toast.error(toApiError(err).message);
            }
        });

        socketRef.current.on('error-alert', (e) => toast.error(e?.msg || 'Voice service error'));

        return () => {
            if (streamerRef.current) streamerRef.current.stopAudioPipeline();
            if (socketRef.current) socketRef.current.disconnect();
        };
    }, [sessionId, roundId, simliSessionToken]);

    // Monaco Challenge Submission Pipeline Control Handler
    const handleChallengeSubmission = async () => {
        if (!codingQuestion) return;
        setIsSubmittingCode(true);
        setEvaluationResult(null);

        try {
            // Target pre-existing strict coding evaluation controller layers endpoint
            const res = await api.post(`/interview/session/${sessionId}/submit-technical`, {
                questionId: codingQuestion.questionId,
                code: userCode,
                language: selectedLanguage
            });

            if (res.data.success) {
                setEvaluationResult(res.data);
                toast.success("Technical round submitted");
                setTimeout(() => onComplete?.(), 2500);
            }
        } catch (err) {
            toast.error(toApiError(err).message);
        } finally {
            setIsSubmittingCode(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 font-sans select-none">
            {/* Header Telemetry Branding Grid Component */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-indigo-400">Synclyft AI Engineering Panel • Technical Architect Assessment</h1>
                    <p className="text-xs text-slate-500">Active Handshake Pointer: {sessionId}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`h-2 w-2 rounded-full ${roundPhase === 'persona' ? 'bg-indigo-400 animate-ping' : 'bg-amber-400'}`} />
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                        {roundPhase === 'persona' ? 'Phase 1: Dynamic Architecture Validation' : 'Phase 2: Algorithmic Hard Sandbox'}
                    </p>
                </div>
            </div>

            {/* PHASE 1 UI: Full Screen Persona Live Grid Layout */}
            {roundPhase === 'persona' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[calc(100vh-140px)]">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative flex flex-col justify-center items-center shadow-2xl">
                        {isConnecting && (
                            <div className="absolute inset-0 bg-slate-950/80 z-10 flex flex-col justify-center items-center gap-2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
                                <p className="text-xs tracking-wide text-slate-400">Mounting Cloud System Handshakes...</p>
                            </div>
                        )}
                        <iframe
                            src={`https://embed.simli.ai/${simliSessionToken}`}
                            allow="camera; microphone; autoplay; encrypted-media;"
                            className="w-full h-full min-h-[500px] border-0"
                        />
                    </div>
                    <div className="flex flex-col gap-4">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative flex-1 shadow-2xl">
                            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
                        </div>
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 text-center">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest animate-pulse">System Recruiter Streaming Active</p>
                            <p className="text-xs text-slate-500 max-w-xs">Mic nodes capturing live data pipelines boundaries securely.</p>
                        </div>
                    </div>
                </div>
            ) : (
                /* PHASE 2 UI: Splitted Monaco Editor & Miniaturized Avatar Container Dashboard layout */
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[calc(100vh-140px)] overflow-hidden">
                    
                    {/* LEFT TWO COLUMNS: Monaco Editor & Task Description Parameters Block */}
                    <div className="xl:col-span-2 flex flex-col gap-4 h-full">
                        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col gap-2 shadow-xl">
                            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md font-bold w-fit">
                                Problem Statement
                            </span>
                            <h2 className="text-md font-bold text-slate-100">{codingQuestion?.problemStatement || "Loading Algorithmic Complexities Parameters..."}</h2>
                        </div>

                        {/* Code Editor Framework Workspace Wrapper Box */}
                        <div className="flex-1 min-h-[450px] rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative bg-slate-900 flex flex-col">
                            <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex justify-between items-center">
                                <span className="text-xs font-medium text-slate-400">Production Workspace Engine</span>
                                <select 
                                    value={selectedLanguage} 
                                    onChange={(e) => setSelectedLanguage(e.target.value)}
                                    className="bg-slate-800 text-xs text-slate-300 border border-slate-700 rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-500"
                                >
                                    <option value="cpp">C++ (GCC 17)</option>
                                    <option value="java">Java (JDK 17)</option>
                                    <option value="python">Python (v3.10)</option>
                                    <option value="javascript">JavaScript (Node v18)</option>
                                </select>
                            </div>
                            <div className="flex-1 w-full">
                                <MonacoEditor
                                    height="100%"
                                    theme="vs-dark"
                                    language={selectedLanguage}
                                    value={userCode}
                                    onChange={(val) => setUserCode(val)}
                                    options={{
                                        fontSize: 14,
                                        minimap: { enabled: false },
                                        automaticLayout: true,
                                        cursorBlinking: "smooth",
                                        smoothScrolling: true
                                    }}
                                />
                            </div>
                        </div>

                        {/* Control Triggers Button Submission Bars */}
                        <div className="flex gap-4 items-center">
                            <button
                                onClick={handleChallengeSubmission}
                                disabled={isSubmittingCode}
                                className={`w-full py-3 rounded-xl font-semibold text-sm tracking-wide shadow-lg transition-all ${
                                    isSubmittingCode 
                                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white active:scale-[0.99]'
                                }`}
                            >
                                {isSubmittingCode ? "Compiling & Executing Code Context Layers..." : "Submit Code Solutions Matrix"}
                            </button>
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Miniaturized Look System Feedback Layout View Panels */}
                    <div className="xl:col-span-1 flex flex-col gap-4 h-full">
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden aspect-video shadow-xl relative group">
                            <iframe src={`https://embed.simli.ai/${simliSessionToken}`} className="w-full h-full border-0 pointer-events-none" />
                            <div className="absolute inset-x-0 bottom-0 bg-slate-950/80 backdrop-blur-xs px-4 py-2 border-t border-slate-800">
                                <p className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">Technical Evaluator Live Review Feed</p>
                            </div>
                        </div>

                        {/* Interactive Realtime Analytics Stream Outputs View logs maps */}
                        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex-1 shadow-xl flex flex-col gap-3 min-h-[250px]">
                            <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400">Sandbox Telemetry Terminal Logs</h3>
                            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-400 overflow-y-auto max-h-[300px]">
                                {evaluationResult ? (
                                    <div className="flex flex-col gap-2">
                                        <p className="text-emerald-400 font-bold">✓ Score Earned: {evaluationResult.scoreEarned}/10</p>
                                        <p className="text-slate-300">Runtime Status: {evaluationResult.metadata?.statusDescription}</p>
                                        <p className="text-slate-300">Test Cases: {evaluationResult.metadata?.testCasesPassed}/{evaluationResult.metadata?.totalTestCases} Passed</p>
                                        <div className="border-t border-slate-800 my-1 pt-1">
                                            <p className="text-indigo-400 font-semibold">Feedback Analytics Structure:</p>
                                            <p className="text-[11px] leading-relaxed mt-1 text-slate-400">{evaluationResult.metadata?.timeComplexity || "O(N)"} Space/Time bounds.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-slate-600 animate-pulse">&gt; Ready for test code compilation metrics streaming context variables loops...</p>
                                )}
                            </div>
                        </div>
                    </div>

                </div>
            )}
        </div>
    );
}