'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { AudioStreamer } from '../utils/audioStreamer';

export default function HRInterviewScreen({ sessionId, roundId, simliSessionToken }) {
    const router = useRouter();
    
    // UI Local States
    const [isConnecting, setIsConnecting] = useState(true);
    const [interviewEnded, setInterviewEnded] = useState(false);
    const [isHrSpeaking, setIsHrSpeaking] = useState(false);

    // Dynamic Reference Storage Pointers
    const socketRef = useRef(null);
    const streamerRef = useRef(null);
    const localVideoRef = useRef(null);
    const simliIframeRef = useRef(null);

    useEffect(() => {
        // 1. Establish high fidelity socket connection interface targeting backend port 8080
        socketRef.current = io('https://ed-tech-backend-0awj.onrender.com', {
            transports: ['websocket'],
            forceNew: true
        });

        // 2. Request explicit local user camera hardware stream layer
        navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            .then((stream) => {
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            })
            .catch(err => console.error("Camera validation rejected:", err));

        // 3. Socket Lifecycle Registration Loops
        socketRef.current.on('connect', () => {
            console.log("[Socket Channel Mounted]: ID ->", socketRef.current.id);
            
            // Join active corporate verification room stream state matrices
            socketRef.current.emit('join-hr-live-stream', {
                sessionId,
                roundId,
                simliSessionToken
            });

            // Spin up native binary microphone streaming framework hooks
            streamerRef.current = new AudioStreamer(socketRef.current, sessionId);
            streamerRef.current.startStreaming();
            setIsConnecting(false);
        });

        // AUTOMATION HOOK LINK: 
        socketRef.current.on('live-hr-session-terminated', (data) => {
            console.log("[Session Ended Trigger Alert]: Compiling report maps data for ->", data.sessionId);
            setInterviewEnded(true);
            
            // Release device mic and video context traces gracefully
            if (streamerRef.current) streamerRef.current.stopStreaming();
            
            // Redirection to your central diagnostic report template layout
            router.push(`/student/interviews/dashboard/${data.sessionId}`);
        });

        socketRef.current.on('error-alert', (errorData) => {
            alert(`Platform Exception: ${errorData.msg}`);
        });

        // Simli Custom PostMessage Listeners to dynamically track if AI avatar is currently speaking
        const handleSimliEvents = (event) => {
            if (event.data === 'simli_started_speaking') setIsHrSpeaking(true);
            if (event.data === 'simli_stopped_speaking') setIsHrSpeaking(false);
        };
        window.addEventListener('message', handleSimliEvents);

        // 4. Resource Cleanup execution loop upon component lifecycle death unmounts
        return () => {
            window.removeEventListener('message', handleSimliEvents);
            if (streamerRef.current) streamerRef.current.stopStreaming();
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [sessionId, roundId, simliSessionToken, router]);

    return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col p-6 font-sans">
            {/* Top Navigation Header Matrix Status */}
            <div className="flex justify-between items-center border-b border-slate-800 pb-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-indigo-400">Synclyft AI • Behavioral Assessment Round</h1>
                    <p className="text-xs text-slate-400">Session Context Pointer: {sessionId}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                    <p className="text-sm font-medium text-slate-300">{isConnecting ? 'Initializing Token Framework...' : 'Secure Live Pipeline Active'}</p>
                </div>
            </div>

            {/* Split Screen Render Workspace Area Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 items-stretch">
                
                {/* LEFT PORT: The Live AI Interviewer Avatar Layer Container */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative flex flex-col justify-center items-center group shadow-2xl">
                    {isConnecting && (
                        <div className="absolute inset-0 bg-slate-950/80 z-10 flex flex-col justify-center items-center gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
                            <p className="text-sm tracking-wide text-slate-400">Synchronizing WebRTC Clusters Maps...</p>
                        </div>
                    )}
                    
                    {/* Embedded Simli WebRTC Stream Iframe Target Endpoint Renderer */}
                    <iframe
                        ref={simliIframeRef}
                        src={`https://embed.simli.ai/${simliSessionToken}`}
                        allow="camera; microphone; autoplay; encrypted-media;"
                        className="w-full h-full min-h-[500px] border-0"
                    />
                    
                    {/* Avatar State Badge Overlay indicator element */}
                    <div className="absolute bottom-4 left-4 bg-slate-950/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-700/50 flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${isHrSpeaking ? 'bg-indigo-400 animate-ping' : 'bg-slate-500'}`} />
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            {isHrSpeaking ? 'HR Manager is Speaking' : 'HR Manager Listening...'}
                        </p>
                    </div>
                </div>

                {/* RIGHT PORT: Candidate Webcam Video Feedback Layout Container */}
                <div className="flex flex-col gap-6">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative flex-1 min-h-[300px] shadow-2xl">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full h-full object-cover transform scale-x-[-1]"
                        />
                        <div className="absolute bottom-4 left-4 bg-slate-950/60 backdrop-blur-md px-4 py-1.5 rounded-xl border border-slate-800">
                            <p className="text-xs font-medium text-slate-200">Candidate (You)</p>
                        </div>
                    </div>

                    {/* Interactive Real-Time Voice Wave Animation Control Box */}
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col gap-4 items-center justify-center">
                        <p className="text-sm font-medium text-slate-400">Microphone Input Telemetry Status</p>
                        {!interviewEnded ? (
                            <div className="flex gap-1.5 items-center h-8">
                                {[...Array(8)].map((_, i) => (
                                    <span 
                                        key={i} 
                                        className={`w-1 bg-indigo-500 rounded-full transition-all duration-150 ${!isHrSpeaking ? 'animate-bounce' : 'h-1'}`}
                                        style={{ 
                                            animationDelay: `${i * 0.08}s`,
                                            height: !isHrSpeaking ? `${((i * 7) % 24) + 8}px` : '4px'
                                        }}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm font-semibold text-rose-400 uppercase tracking-widest animate-pulse">Session Closed</p>
                        )}
                        <p className="text-xs text-center text-slate-500 max-w-sm">
                            Speak naturally using the STAR behavioral framework principles. System automatically monitors context logic loops parameters.
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}