'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import ProctorCamera from './ProctorCamera';
import PermissionSetup from './PermissionSetup';
import { useAudioProctor } from './hooks/useAudioProctor';
export default function InterviewWorkspace() {
    const activeRound = "coding"; 

    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [riskScore, setRiskScore] = useState(0);
    const [currentAlert, setCurrentAlert] = useState("");
    
    const socketRef = useRef(null);
    const cameraEngineRef = useRef(null);
    const eventCooldowns = useRef({});

    const fireTelemetryPayload = useCallback((violationKey, structuredDebugData = {}) => {
        const now = Date.now();
        // Telemetry Safeguard: Rate-limit event emissions per key to 3 seconds
        if (eventCooldowns.current[violationKey] && (now - eventCooldowns.current[violationKey] < 3000)) {
            return;
        }
        eventCooldowns.current[violationKey] = now;

        if (socketRef.current?.connected) {
            let base64Snapshot = '';
            if (cameraEngineRef.current) {
                base64Snapshot = cameraEngineRef.current.captureSnapshotBase64();
            }

            socketRef.current.emit('PROCTOR_EVENT', {
                type: violationKey,
                roundType: activeRound,
                imageCapture: base64Snapshot, 
                rawData: {
                    browserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
                    screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown',
                    ...structuredDebugData
                }
            });
        }
    }, [activeRound]);

    useEffect(() => {
        if (!isSetupComplete || typeof window === 'undefined') return;

        // Establish production WebSocket handshake connection Securely
        socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8080', {
            transports: ['websocket'],
            upgrade: false
        });

        socketRef.current.on('connect', () => {
            const identityConfig = { sessionId: "64a7c1b5f210d32104889abc", candidateId: "CAN_9982" };
            socketRef.current.emit('START_PROCTORING', identityConfig);
        });

        socketRef.current.on('RISK_SCORE_UPDATE', (data) => {
            setRiskScore(data.riskScore);
            setCurrentAlert(data.message);
            const timer = setTimeout(() => setCurrentAlert(""), 4500);
            return () => clearTimeout(timer);
        });

        socketRef.current.on('TERMINATE_SESSION', (data) => {
            alert(data.reason || "Session revoked due to multiple compliance failures.");
            window.location.href = '/session-revoked';
        });

        // Anti-Cheat Browser Event Decoupled Handlers
        const handleVisibility = () => { if (document.hidden) fireTelemetryPayload('tab_switch'); };
        const handleBlur = () => fireTelemetryPayload('window_minimize');
        const handlePaste = (e) => { e.preventDefault(); fireTelemetryPayload('paste_attempt'); };
        const handleContextMenu = (e) => e.preventDefault(); // Lock context menu inspector

        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('blur', handleBlur);
        document.addEventListener('paste', handlePaste);
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('blur', handleBlur);
            document.removeEventListener('paste', handlePaste);
            document.removeEventListener('contextmenu', handleContextMenu);
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, [isSetupComplete, fireTelemetryPayload]);

    // Track Vocal Anomalies
    useAudioProctor(isSetupComplete, useCallback(() => {
        fireTelemetryPayload('multiple_voices');
    }, [fireTelemetryPayload]));

    // AI Vision Target Validation
    const handleVisionMetrics = useCallback((metrics) => {
        if (metrics.faceAbsent) fireTelemetryPayload('face_absence');
        else if (metrics.multipleFaces) fireTelemetryPayload('multiple_faces');
        else if (metrics.gazeDeviated) fireTelemetryPayload('gaze_deviation');
    }, [fireTelemetryPayload]);

    if (!isSetupComplete) {
        return <PermissionSetup onVerificationPassed={() => setIsSetupComplete(true)} />;
    }

    const computeBorder = () => {
        if (riskScore > 65) return '4px solid #dc2626'; 
        if (riskScore > 30) return '4px solid #d97706'; 
        return '4px solid #16a34a'; 
    };

    return (
        <div style={{ position: 'relative', minHeight: '100vh', background: '#f8fafc', padding: '30px', fontFamily: 'sans-serif' }}>
            {currentAlert && (
                <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#1e293b', color: '#f87171', padding: '16px 32px', borderRadius: '12px', zIndex: 99999, fontWeight: 'bold', border: '1px solid #ef4444', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                    COMPLIANCE FAULT: {currentAlert}
                    <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Session Threat Level: {riskScore} / 100</div>
                </div>
            )}

            <div style={{ width: '70%', background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h2 style={{ margin: '0 0 5px 0', color: '#0f172a' }}>Round 2: Algorithmic Architecture Challenge</h2>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Maintain absolute eye contact with the active workspace environment. Telemetry streams are active.</p>
                <textarea placeholder="// Write your high-performance code architecture here..." style={{ width: '100%', height: '400px', margin: '20px 0', padding: '15px', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'monospace', fontSize: '14px', outline: 'none', background: '#f8fafc' }} />
            </div>

            <div style={{ position: 'fixed', bottom: '25px', right: '25px', width: '280px', background: '#0f172a', padding: '12px', borderRadius: '16px', border: computeBorder(), boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff', fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' }}>
                    <span>Monitoring Stream</span>
                    <span style={{ color: riskScore > 50 ? '#f87171' : '#34d399' }}>Threat: {riskScore}%</span>
                </div>
                <div style={{ width: '100%', height: '190px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                    <ProctorCamera ref={cameraEngineRef} onMetricsDetected={handleVisionMetrics} />
                </div>
            </div>
        </div>
    );
}