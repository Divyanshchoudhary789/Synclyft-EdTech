// utils/techAudioStreamer.js
export class TechAudioStreamer {
    constructor(socket) {
        this.socket = socket;
        this.mediaRecorder = null;
        this.stream = null;
    }

    async startAudioPipeline() {
        try {
            // Requesting secure baseline audio streams permissions
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus',
            });

            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && this.socket.connected) {
                    const arrayBuffer = await event.data.arrayBuffer();
                    // Streaming chunk arrays into the technical processing socket cluster
                    this.socket.emit('stream-user-audio-chunk', arrayBuffer);
                }
            };

            // Capture cycles mapped strictly at 250ms boundaries for linear processing
            this.mediaRecorder.start(250);
            console.log("[Tech Streamer]: Live hardware audio capture engine bound.");
        } catch (err) {
            console.error("Audio pipeline initialization exception trace:", err);
            throw err;
        }
    }

    stopAudioPipeline() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        console.log("[Tech Streamer]: Hardware components detached.");
    }
}