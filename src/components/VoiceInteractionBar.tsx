import React from "react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Radio,
  Image as ImageIcon,
  Code,
  ArrowRight,
  HelpCircle,
  X,
  Volume2,
} from "lucide-react";
import { LiveConnectionState, Artifact } from "../types";

interface VoiceInteractionBarProps {
  liveState: LiveConnectionState;
  isMicMuted: boolean;
  onToggleMic: () => void;
  onStartLive: () => void;
  audioLevel: number;
  speakerLevel: number;
  activeArtifact: Artifact | null;
  onClearActiveArtifact: () => void;
  onSendMessage: (text: string) => void;
  lastTranscript?: string;
  isSending: boolean;
}

export const VoiceInteractionBar: React.FC<VoiceInteractionBarProps> = ({
  liveState,
  isMicMuted,
  onToggleMic,
  onStartLive,
  audioLevel,
  speakerLevel,
  activeArtifact,
  onClearActiveArtifact,
  onSendMessage,
  lastTranscript,
  isSending,
}) => {
  const [inputText, setInputText] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isSending) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const handleChipClick = (promptText: string) => {
    onSendMessage(promptText);
  };

  const isConnected = liveState !== "disconnected";
  const isSpeaking = liveState === "speaking";

  return (
    <div
      id="voice-interaction-bar"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-full max-w-4xl px-4 pointer-events-none"
    >
      <div className="pointer-events-auto rounded-2xl border border-neutral-850 bg-neutral-950/95 p-3 shadow-2xl backdrop-blur-xl ring-1 ring-neutral-800">
        {/* Active Context & Transcript Ticker */}
        <div className="flex items-center justify-between gap-3 text-xs mb-2">
          {/* Active Artifact Badge if student selected one */}
          {activeArtifact ? (
            <div className="flex items-center gap-1.5 rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300 border border-indigo-500/30 truncate">
              <span>Contexto activo:</span>
              <span className="font-semibold text-white truncate max-w-[200px]">
                {activeArtifact.title}
              </span>
              <button
                onClick={onClearActiveArtifact}
                title="Desactivar contexto de artefacto"
                className="hover:text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-neutral-400 text-[11px]">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Navegación continua por Voz y Texto</span>
            </div>
          )}

          {/* Transcript / Status snippet */}
          {lastTranscript && (
            <div className="text-[11px] text-neutral-400 truncate max-w-sm flex items-center gap-1.5 font-mono">
              <Volume2 className="h-3 w-3 text-indigo-400 shrink-0" />
              <span className="truncate italic">"{lastTranscript}"</span>
            </div>
          )}
        </div>

        {/* Quick Suggestion Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-xs">
          <button
            onClick={() => handleChipClick("Explícame los conceptos clave de esta diapositiva")}
            className="shrink-0 flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-indigo-500/40 hover:text-indigo-300 transition-colors"
          >
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Explicar Diapositiva</span>
          </button>

          <button
            onClick={() =>
              handleChipClick(
                "Genera en segundo plano con Nano Banana una infografía explicativa de esta diapositiva"
              )
            }
            className="shrink-0 flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <ImageIcon className="h-3 w-3" />
            <span>Pedir Infografía a Nano Banana</span>
          </button>

          <button
            onClick={() =>
              handleChipClick(
                "Crea una pieza de código explicativa interactiva en Python que implemente esto"
              )
            }
            className="shrink-0 flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-300 hover:bg-cyan-500/20 transition-colors"
          >
            <Code className="h-3 w-3" />
            <span>Código Explicativo</span>
          </button>

          <button
            onClick={() => handleChipClick("Ve a la siguiente diapositiva y continúa la lección")}
            className="shrink-0 flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors"
          >
            <ArrowRight className="h-3 w-3" />
            <span>Siguiente Diapositiva</span>
          </button>

          <button
            onClick={() => handleChipClick("Hazme una pregunta reflexiva para ver si he entendido el tema")}
            className="shrink-0 flex items-center gap-1 rounded-full border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-[11px] text-neutral-300 hover:border-neutral-700 hover:text-white transition-colors"
          >
            <HelpCircle className="h-3 w-3" />
            <span>Ponme a prueba</span>
          </button>
        </div>

        {/* Unified Voice + Text Input Row */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-1">
          {/* Main Voice Button / Visualizer */}
          {isConnected ? (
            <button
              type="button"
              id="live-bar-mic-toggle"
              onClick={onToggleMic}
              title={isMicMuted ? "Activar micrófono" : "Silenciar micrófono"}
              className={`relative flex h-10 items-center justify-center gap-2 rounded-xl px-3 text-xs font-semibold transition-all ${
                isMicMuted
                  ? "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"
                  : isSpeaking
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-amber-500/20 shadow-lg"
                  : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-emerald-500/20 shadow-lg"
              }`}
            >
              {isMicMuted ? (
                <>
                  <MicOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Mute</span>
                </>
              ) : (
                <>
                  <Mic className="h-4 w-4 animate-pulse" />
                  {/* Real-time Dynamic Mini Waveform */}
                  <div className="flex items-center gap-0.5 h-4">
                    {[1, 2, 3, 4, 5].map((i) => {
                      const level = isSpeaking ? speakerLevel : audioLevel;
                      const heightPercent = Math.max(20, Math.min(100, (level * 100 * (i % 2 === 0 ? 1.5 : 1.1))));
                      return (
                        <span
                          key={i}
                          style={{ height: `${heightPercent}%` }}
                          className={`w-1 rounded-full transition-all duration-75 ${
                            isSpeaking ? "bg-amber-400" : "bg-emerald-400"
                          }`}
                        />
                      );
                    })}
                  </div>
                  <span className="hidden sm:inline">
                    {isSpeaking ? "Hablando..." : "Escuchando"}
                  </span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              id="live-bar-connect"
              onClick={onStartLive}
              className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 px-3 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 hover:from-indigo-600 hover:to-violet-700 transition-all"
            >
              <Radio className="h-4 w-4" />
              <span>Activar Voz 3.8</span>
            </button>
          )}

          {/* Text Input for Hybrid Interaction */}
          <div className="relative flex-1">
            <input
              type="text"
              id="unified-chat-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Habla por voz o escribe tu pregunta / pide infografía a Nano Banana..."
              className="w-full rounded-xl border border-neutral-800 bg-neutral-900/90 px-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            id="send-message-btn"
            disabled={!inputText.trim() || isSending}
            title="Enviar mensaje"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shadow-md"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
