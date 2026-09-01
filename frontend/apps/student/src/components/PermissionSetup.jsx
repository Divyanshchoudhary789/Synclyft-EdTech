'use client';

import React, { useState } from 'react';

export default function PermissionSetup({ onVerificationPassed }) {
    const [status, setStatus] = useState({ mic: 'pending', cam: 'pending', processing: false });

    const runHardwareHandshake = async () => {
        setStatus(prev => ({ ...prev, processing: true }));
        try {
            const streams = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStatus({ mic: 'verified', cam: 'verified', processing: false });
            // Clean up permission streams immediately after verification handshake
            streams.getTracks().forEach(track => track.stop()); 
            onVerificationPassed();
        } catch (e) {
            alert("Hardware initialization blocked! Active Camera and Microphone verification is mandatory to enter the secure perimeter.");
            setStatus({ mic: 'failed', cam: 'failed', processing: false });
        }
    };

    return (
        <div style={{ maxWidth: '500px', margin: '100px auto', padding: '40px', background: '#fff', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'sans-serif', border: '1px solid #e2e8f0' }}>
            <h2 style={{ margin: '0 0 10px 0', color: '#0f172a', fontSize: '22px', fontWeight: '700' }}>Hardware Configuration Handshake</h2>
            <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                The examination layer requires background biometric verification telemetry streams to assert candidate tracking profiles.
            </p>
            
            <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ color: '#334155', fontSize: '14px' }}>Integrated Camera Sensor:</span>
                    <span style={{ fontWeight: '600', color: status.cam === 'verified' ? '#16a34a' : '#b45309' }}>
                        {status.cam === 'verified' ? 'Ready' : 'Waiting'}
                    </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '12px' }}>
                    <span style={{ color: '#334155', fontSize: '14px' }}>Vocal Audio Processor:</span>
                    <span style={{ fontWeight: '600', color: status.mic === 'verified' ? '#16a34a' : '#b45309' }}>
                        {status.mic === 'verified' ? 'Ready' : 'Waiting'}
                    </span>
                </div>
            </div>

            <button 
                onClick={runHardwareHandshake} 
                disabled={status.processing}
                style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#2563eb'}
            >
                {status.processing ? 'Verifying Hardware...' : 'Trigger Diagnostic Verification'}
            </button>
        </div>
    );
}