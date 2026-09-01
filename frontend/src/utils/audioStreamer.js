export class AudioStreamer {
    constructor(socket, sessionId) {
        this.socket = socket;
        this.sessionId = sessionId;
        this.mediaRecorder = null;
        this.stream = null;
    }

    async startStreaming() {
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // Modern browsers standard MediaRecorder options for audio packet capturing
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: 'audio/webm;codecs=opus',
            });

            this.mediaRecorder.ondataavailable = async (event) => {
                if (event.data.size > 0 && this.socket.connected) {
                    // Convert blob into pure arraybuffer before pipe streaming to backend
                    const arrayBuffer = await event.data.arrayBuffer();
                    this.socket.emit('stream-user-audio-chunk', arrayBuffer);
                }
            };

            // Capture and emit audio buffer frames every 250ms natively
            this.mediaRecorder.start(250);
            console.log("[Audio Streamer]: Hardware mic pipeline active.");
        } catch (err) {
            console.error("Failed initializing audio media capture context:", err);
            throw err;
        }
    }

    stopStreaming() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }
        console.log("[Audio Streamer]: Resources released cleanly.");
    }
}