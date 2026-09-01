'use client';

import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

const ProctorCamera = forwardRef(({ onMetricsDetected }, ref) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const modelRef = useRef(null);
    const frameLoopRef = useRef(null);
    const streamRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Expose snapshot mechanism securely to parent
    useImperativeHandle(ref, () => ({
        captureSnapshotBase64() {
            if (canvasRef.current && videoRef.current && videoRef.current.readyState === 4) {
                const context = canvasRef.current.getContext('2d');
                canvasRef.current.width = 320;
                canvasRef.current.height = 240;

                // Mirror effect for snapshot to match video visual
                context.translate(320, 0);
                context.scale(-1, 1);
                context.drawImage(videoRef.current, 0, 0, 320, 240);

                // Reset transformation
                context.setTransform(1, 0, 0, 1, 0, 0);
                return canvasRef.current.toDataURL('image/jpeg', 0.7);
            }
            return '';
        }
    }));
    useEffect(() => {
        let isMounted = true;

        const runPredictionLoop = async () => {
            if (!videoRef.current || !modelRef.current || videoRef.current.paused) {
                frameLoopRef.current = requestAnimationFrame(runPredictionLoop);
                return;
            }

            tf.engine().startScope();

            try {
                const faces = await modelRef.current.estimateFaces(videoRef.current);

                const packet = {
                    faceAbsent: faces.length === 0,
                    multipleFaces: faces.length > 1,
                    gazeDeviated: false
                };

                if (faces.length === 1) {
                    const keypoints = faces[0].keypoints;
                    const leftIris = keypoints.find(k => k.name === 'leftIris');
                    const leftEye = keypoints.find(k => k.name === 'leftEye');

                    if (leftIris && leftEye) {
                        const deviation = Math.abs(leftIris.x - leftEye.x);
                        if (deviation > 14 || deviation < 2.5) {
                            packet.gazeDeviated = true;
                        }
                    }
                }

                onMetricsDetected(packet);
            } catch (err) {
                console.error("In-loop analytics failure:", err);
            } finally {
                tf.engine().endScope();
                frameLoopRef.current = requestAnimationFrame(runPredictionLoop);
            }
        };

        const startWebcamStream = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } }
                });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.onloadedmetadata = () => {
                        videoRef.current.play().then(runPredictionLoop);
                    };
                }
            } catch (err) {
                console.error("Webcam hardware access denied:", err);
                setError("Camera access is blocked or unavailable.");
            }
        };

        const initTensorFlowAndModels = async () => {
            try {
                if (typeof window === 'undefined') return;

                await tf.setBackend('webgl');
                await tf.ready();

                const loadedModel = await faceLandmarksDetection.createDetector(
                    faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh,
                    { runtime: 'tfjs', refineLandmarks: true }
                );

                if (isMounted) {
                    modelRef.current = loadedModel;
                    setLoading(false);
                    await startWebcamStream();
                }
            } catch (err) {
                console.error("TFJS Initialization Failure:", err);
                if (isMounted) setError("Failed to initialize AI models.");
            }
        };

        initTensorFlowAndModels();

        return () => {
            isMounted = false;
            cleanUpResources();
        };
    }, [onMetricsDetected]);

    const cleanUpResources = () => {
        if (frameLoopRef.current) cancelAnimationFrame(frameLoopRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
    };

    if (error) {
        return (
            <div style={{ background: '#ef4444', color: '#fff', padding: '12px', fontSize: '13px', borderRadius: '8px' }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
            {loading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', color: '#94a3b8', fontSize: '12px', zIndex: 10 }}>
                    Syncing matrix tensors...
                </div>
            )}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
            />
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
});

ProctorCamera.displayName = 'ProctorCamera';
export default ProctorCamera;
