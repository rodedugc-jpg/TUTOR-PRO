import React from "react";
import {
  Sparkles,
  Radio,
  Mic,
  MicOff,
  Upload,
  BookOpen,
  ChevronDown,
  Cpu,
  Layers,
  CheckCircle2,
} from "lucide-react";
import { LiveConnectionState, Presentation } from "../types";

interface HeaderProps {
  presentations: Presentation[];
  currentPresentation: Presentation;
  onSelectPresentation: (p: Presentation) => void;
  onUploadClick: () => void;
  liveState: LiveConnectionState;
  onToggleLive: () => void;
  isMicMuted: boolean;
  onToggleMute: () => void;
  selectedVoice: string;
  onChangeVoice: (voice: string) => void;
  activeArtifactCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  presentations,
  currentPresentation,
  onSelectPresentation,
  onUploadClick,
  liveState,
  onToggleLive,
  isMicMuted,
  onToggleMute,
  selectedVoice,
  onChangeVoice,
  activeArtifactCount,
}) => {
  const [showPresDropdown, setShowPresDropdown] = React.useState(false);

  const getStatusBadge = () => {
    switch (liveState) {
      case "connected":
      case "listening":
        return {
          label: "Voz en Vivo",
          color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          dot: "bg-emerald-400 animate-pulse",
        };
      case "speaking":
        return {
          label: "Profesor Hablando",
          color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          dot: "bg-amber-400 animate-ping",
        };
      case "connecting":
        return {
          label: "Conectando...",
          color: "bg-blue-500/15 text-blue-300 border-blue-500/30",
          dot: "bg-blue-400 animate-spin",
        };
      case "thinking":
        return {
          label: "Pensando...",
          color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
          dot: "bg-purple-400 animate-pulse",
        };
      default:
        return {
          label: "Voz Desconectada",
          color: "bg-neutral-800 text-neutral-400 border-neutral-700",
          dot: "bg-neutral-500",
        };
    }
  };

  const status = getStatusBadge();

  return (
    <header
      id="main-header"
      className="sticky top-0 z-30 border-b border-neutral-800/80 bg-neutral-950/90 backdrop-blur-md px-4 py-2.5 transition-all"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Left: Branding & Model tags */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-white">
                Docent<span className="text-indigo-400">AI</span> Live
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-300 border border-indigo-500/20">
                <Sparkles className="h-3 w-3" /> Gemini 3.8 Live
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-300 border border-amber-500/20">
                <Cpu className="h-3 w-3" /> Nano Banana Multitask
              </span>
            </div>
            <p className="text-xs text-neutral-400 hidden sm:block">
              Tutor pedagógico interactivo con simultaneidad de voz, infografías y código
            </p>
          </div>
        </div>

        {/* Center: Presentation Selector & PDF Upload */}
        <div className="relative flex items-center gap-2">
          <div className="relative">
            <button
              id="presentation-dropdown-trigger"
              onClick={() => setShowPresDropdown(!showPresDropdown)}
              className="flex items-center gap-2 rounded-lg border border-neutral-800 bg-neutral-900/90 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:border-neutral-700 hover:bg-neutral-850 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
              <span className="max-w-[160px] sm:max-w-[240px] truncate">
                {currentPresentation.title}
              </span>
              <ChevronDown className="h-3 w-3 text-neutral-400" />
            </button>

            {showPresDropdown && (
              <div className="absolute left-0 mt-1.5 w-72 sm:w-80 rounded-xl border border-neutral-800 bg-neutral-900 p-1.5 shadow-2xl z-50">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Presentaciones disponibles
                </div>
                {presentations.map((p) => {
                  const isSelected = p.id === currentPresentation.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectPresentation(p);
                        setShowPresDropdown(false);
                      }}
                      className={`flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                        isSelected
                          ? "bg-indigo-600/15 text-indigo-300 font-medium"
                          : "text-neutral-300 hover:bg-neutral-800"
                      }`}
                    >
                      <Layers className="h-4 w-4 mt-0.5 shrink-0 text-indigo-400" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium">{p.title}</div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {p.totalSlides} diapositivas · {p.author}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 mt-0.5" />}
                    </button>
                  );
                })}

                <div className="mt-1 border-t border-neutral-800 pt-1">
                  <button
                    onClick={() => {
                      setShowPresDropdown(false);
                      onUploadClick();
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Subir presentación propia en PDF...</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            id="upload-pdf-header-btn"
            onClick={onUploadClick}
            title="Subir archivo PDF de presentación"
            className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-500/20 transition-colors"
          >
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Subir PDF</span>
          </button>
        </div>

        {/* Right: Live Session Controls */}
        <div className="flex items-center gap-2.5">
          {/* Status badge */}
          <div
            className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${status.color}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <span className="hidden sm:inline">{status.label}</span>
          </div>

          {/* Voice picker */}
          <select
            aria-label="Voz del profesor"
            value={selectedVoice}
            onChange={(e) => onChangeVoice(e.target.value)}
            disabled={liveState === "connected" || liveState === "speaking" || liveState === "listening"}
            className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs text-neutral-300 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
          >
            <option value="Zephyr">Voz Zephyr (Cálida)</option>
            <option value="Puck">Voz Puck (Dinámica)</option>
            <option value="Kore">Voz Kore (Pedagógica)</option>
            <option value="Fenrir">Voz Fenrir (Profunda)</option>
            <option value="Charon">Voz Charon (Serena)</option>
          </select>

          {/* Mic mute button */}
          {liveState !== "disconnected" && (
            <button
              id="mute-mic-btn"
              onClick={onToggleMute}
              title={isMicMuted ? "Activar micrófono" : "Silenciar micrófono"}
              className={`rounded-lg p-1.5 text-xs transition-colors border ${
                isMicMuted
                  ? "bg-red-500/20 text-red-300 border-red-500/30 hover:bg-red-500/30"
                  : "bg-neutral-900 text-neutral-300 border-neutral-800 hover:bg-neutral-800"
              }`}
            >
              {isMicMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>
          )}

          {/* Main Live Connect / Disconnect button */}
          <button
            id="toggle-live-session-btn"
            onClick={onToggleLive}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-md transition-all ${
              liveState === "disconnected"
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:from-indigo-600 hover:to-violet-700 shadow-indigo-500/20"
                : "bg-red-600/90 text-white hover:bg-red-700 shadow-red-500/20"
            }`}
          >
            <Radio className="h-3.5 w-3.5" />
            <span>{liveState === "disconnected" ? "Conectar Voz 3.8" : "Finalizar Voz"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
