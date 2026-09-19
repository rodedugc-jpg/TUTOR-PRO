/**
 * Web Audio Service for Gemini 3.8 Live real-time bidirectional streaming
 * Input: 16kHz PCM (mic)
 * Output: 24kHz PCM (model speech)
 */

export class LiveAudioService {
  private inputAudioCtx: AudioContext | null = null;
  private outputAudioCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private speakerAnalyser: AnalyserNode | null = null;

  private nextStartTime = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onAudioInputCallback: ((base64Pcm: string) => void) | null = null;
  private isCapturing = false;

  constructor(onAudioInput?: (base64Pcm: string) => void) {
    if (onAudioInput) {
      this.onAudioInputCallback = onAudioInput;
    }
  }

  public setAudioInputCallback(callback: (base64Pcm: string) => void) {
    this.onAudioInputCallback = callback;
  }

  /**
   * Starts capturing microphone audio at 16kHz PCM
   */
  public async startMicrophone(): Promise<boolean> {
    if (this.isCapturing) return true;

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Sample rate of 16kHz for Gemini Live input
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.inputAudioCtx = new AudioCtxClass({ sampleRate: 16000 });

      const source = this.inputAudioCtx.createMediaStreamSource(this.mediaStream);
      this.micAnalyser = this.inputAudioCtx.createAnalyser();
      this.micAnalyser.fftSize = 64;

      // 4096 sample buffer size (~256ms of audio per chunk)
      this.processorNode = this.inputAudioCtx.createScriptProcessor(4096, 1, 1);

      source.connect(this.micAnalyser);
      this.micAnalyser.connect(this.processorNode);
      this.processorNode.connect(this.inputAudioCtx.destination);

      this.processorNode.onaudioprocess = (e) => {
        if (!this.isCapturing) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const base64Pcm = this.float32To16BitPcmBase64(inputData);
        if (this.onAudioInputCallback) {
          this.onAudioInputCallback(base64Pcm);
        }
      };

      this.isCapturing = true;
      return true;
    } catch (err) {
      console.error("[LiveAudioService] Failed to start microphone:", err);
      return false;
    }
  }

  /**
   * Stops microphone capture
   */
  public stopMicrophone() {
    this.isCapturing = false;
    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    if (this.inputAudioCtx && this.inputAudioCtx.state !== "closed") {
      this.inputAudioCtx.close();
      this.inputAudioCtx = null;
    }
  }

  /**
   * Initialize output audio context (24kHz for Gemini Live audio responses)
   */
  public ensureOutputAudioContext(): AudioContext {
    if (!this.outputAudioCtx || this.outputAudioCtx.state === "closed") {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.outputAudioCtx = new AudioCtxClass({ sampleRate: 24000 });
      this.speakerAnalyser = this.outputAudioCtx.createAnalyser();
      this.speakerAnalyser.fftSize = 64;
      this.speakerAnalyser.connect(this.outputAudioCtx.destination);
    }
    if (this.outputAudioCtx.state === "suspended") {
      this.outputAudioCtx.resume();
    }
    return this.outputAudioCtx;
  }

  /**
   * Queues and plays 24kHz PCM audio chunks gaplessly
   */
  public playAudioChunk(base64Pcm: string) {
    try {
      const ctx = this.ensureOutputAudioContext();
      const binaryString = atob(base64Pcm);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Convert 16-bit signed PCM little-endian to Float32 [-1, 1]
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.copyToChannel(float32Array, 0);

      const sourceNode = ctx.createBufferSource();
      sourceNode.buffer = audioBuffer;

      if (this.speakerAnalyser) {
        sourceNode.connect(this.speakerAnalyser);
      } else {
        sourceNode.connect(ctx.destination);
      }

      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, this.nextStartTime);
      sourceNode.start(startTime);
      this.nextStartTime = startTime + audioBuffer.duration;

      this.activeSources.push(sourceNode);
      sourceNode.onended = () => {
        const idx = this.activeSources.indexOf(sourceNode);
        if (idx !== -1) {
          this.activeSources.splice(idx, 1);
        }
      };
    } catch (e) {
      console.error("[LiveAudioService] Playback chunk error:", e);
    }
  }

  /**
   * Immediately stops all playing and scheduled audio (e.g. upon user interruption)
   */
  public stopPlayback() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch (e) {
        // ignore
      }
    }
    this.activeSources = [];
    if (this.outputAudioCtx) {
      this.nextStartTime = this.outputAudioCtx.currentTime;
    } else {
      this.nextStartTime = 0;
    }
  }

  /**
   * Returns normalized mic volume [0, 1]
   */
  public getMicLevel(): number {
    if (!this.micAnalyser || !this.isCapturing) return 0;
    const data = new Uint8Array(this.micAnalyser.frequencyBinCount);
    this.micAnalyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.min(1, sum / (data.length * 128));
  }

  /**
   * Returns normalized speaker volume [0, 1]
   */
  public getSpeakerLevel(): number {
    if (!this.speakerAnalyser || this.activeSources.length === 0) return 0;
    const data = new Uint8Array(this.speakerAnalyser.frequencyBinCount);
    this.speakerAnalyser.getByteFrequencyData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      sum += data[i];
    }
    return Math.min(1, sum / (data.length * 128));
  }

  /**
   * Convert Float32Array to 16-bit PCM little-endian Base64
   */
  private float32To16BitPcmBase64(input: Float32Array): string {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }
    return btoa(binary);
  }

  public dispose() {
    this.stopMicrophone();
    this.stopPlayback();
    if (this.outputAudioCtx && this.outputAudioCtx.state !== "closed") {
      this.outputAudioCtx.close();
      this.outputAudioCtx = null;
    }
  }
}
