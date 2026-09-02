"use client";

// Captures the microphone and emits raw PCM signed-16-bit little-endian mono
// chunks at 16 kHz — the format Deepgram STT (and Simli) expect. Uses an
// AudioWorklet loaded from a Blob URL so there is no separate worklet file to
// serve, with a ScriptProcessor fallback for older browsers.

const WORKLET_SRC = `
class PCMDownsampler extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.targetRate = (options.processorOptions && options.processorOptions.targetRate) || 16000;
    this._buf = [];
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const channel = input[0];
    const ratio = sampleRate / this.targetRate;
    for (let i = 0; i < channel.length; i += ratio) {
      const s = channel[Math.floor(i)] || 0;
      const clamped = Math.max(-1, Math.min(1, s));
      this._buf.push(clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff);
    }
    if (this._buf.length >= 1600) { // ~100ms at 16k
      const out = new Int16Array(this._buf.splice(0, this._buf.length));
      this.port.postMessage(out.buffer, [out.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-downsampler', PCMDownsampler);
`;

export interface MicCapture {
  stop: () => void;
  stream: MediaStream;
}

export async function startMicCapture(
  onChunk: (pcm16: ArrayBuffer) => void,
  targetRate = 16000
): Promise<MicCapture> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  const source = ctx.createMediaStreamSource(stream);

  let cleanup = () => {};

  if (ctx.audioWorklet) {
    try {
      const blobUrl = URL.createObjectURL(new Blob([WORKLET_SRC], { type: "application/javascript" }));
      await ctx.audioWorklet.addModule(blobUrl);
      URL.revokeObjectURL(blobUrl);
      const node = new AudioWorkletNode(ctx, "pcm-downsampler", { processorOptions: { targetRate } });
      node.port.onmessage = (e) => onChunk(e.data as ArrayBuffer);
      source.connect(node);
      // keep the graph alive without audible output
      const sink = ctx.createGain();
      sink.gain.value = 0;
      node.connect(sink);
      sink.connect(ctx.destination);
      cleanup = () => { node.disconnect(); source.disconnect(); sink.disconnect(); };
    } catch {
      cleanup = attachScriptProcessor(ctx, source, onChunk, targetRate);
    }
  } else {
    cleanup = attachScriptProcessor(ctx, source, onChunk, targetRate);
  }

  return {
    stream,
    stop: () => {
      try { cleanup(); } catch { /* noop */ }
      stream.getTracks().forEach((t) => t.stop());
      ctx.close().catch(() => {});
    },
  };
}

function attachScriptProcessor(
  ctx: AudioContext,
  source: MediaStreamAudioSourceNode,
  onChunk: (pcm16: ArrayBuffer) => void,
  targetRate: number
): () => void {
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  const proc = ctx.createScriptProcessor(4096, 1, 1);
  proc.onaudioprocess = (e) => {
    const input = e.inputBuffer.getChannelData(0);
    const ratio = ctx.sampleRate / targetRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const s = Math.max(-1, Math.min(1, input[Math.floor(i * ratio)] || 0));
      out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    onChunk(out.buffer);
  };
  source.connect(proc);
  proc.connect(ctx.destination);
  return () => { proc.disconnect(); source.disconnect(); };
}
