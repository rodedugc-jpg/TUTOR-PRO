import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Layers,
  FileText,
  Highlighter,
  ExternalLink,
} from "lucide-react";
import { Presentation, Slide } from "../types";

interface PresentationViewerProps {
  presentation: Presentation;
  currentSlideIndex: number;
  onSlideChange: (index: number) => void;
  onExplainSlide: (slide: Slide) => void;
  onRequestInfographic: (slide: Slide) => void;
  onRequestCode: (slide: Slide) => void;
  isLiveActive: boolean;
}

export const PresentationViewer: React.FC<PresentationViewerProps> = ({
  presentation,
  currentSlideIndex,
  onSlideChange,
  onExplainSlide,
  onRequestInfographic,
  onRequestCode,
  isLiveActive,
}) => {
  const [zoomLevel, setZoomLevel] = React.useState<number>(100);
  const [showThumbnails, setShowThumbnails] = React.useState<boolean>(false);
  const [showNotes, setShowNotes] = React.useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = React.useState<boolean>(false);
  const viewerContainerRef = React.useRef<HTMLDivElement>(null);

  const currentSlide = presentation.slides[currentSlideIndex] || presentation.slides[0];
  const total = presentation.slides.length;

  const handlePrev = () => {
    if (currentSlideIndex > 0) {
      onSlideChange(currentSlideIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentSlideIndex < total - 1) {
      onSlideChange(currentSlideIndex + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      viewerContainerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight" || e.key === " ") handleNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlideIndex, total]);

  return (
    <div
      ref={viewerContainerRef}
      id="presentation-viewer-container"
      className="flex flex-col h-full bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Top Bar: Slide Title & View Controls */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/80 px-4 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex items-center gap-1 rounded-md bg-indigo-500/15 px-2 py-0.5 font-semibold text-indigo-300">
            Diapositiva {currentSlideIndex + 1} / {total}
          </span>
          <span className="text-neutral-400 font-medium truncate max-w-md">
            {currentSlide?.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
            title="Reducir zoom"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[11px] font-mono text-neutral-400 w-10 text-center">
            {zoomLevel}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
            title="Aumentar zoom"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <div className="h-3.5 w-px bg-neutral-800 mx-1" />

          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            title="Tira de miniaturas"
            className={`p-1 rounded transition-colors ${
              showThumbnails
                ? "bg-indigo-500/20 text-indigo-300"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => setShowNotes(!showNotes)}
            title="Notas del profesor"
            className={`p-1 rounded transition-colors ${
              showNotes
                ? "bg-amber-500/20 text-amber-300"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            title="Pantalla completa"
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Slide Canvas Area */}
      <div className="relative flex-1 overflow-auto bg-neutral-900/50 flex items-center justify-center p-4">
        {currentSlide && (
          <div
            style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: "center center" }}
            className="w-full max-w-4xl aspect-[16/9] rounded-xl bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-950 border border-neutral-750 shadow-2xl p-6 sm:p-8 flex flex-col justify-between transition-transform duration-150 select-none overflow-hidden relative"
          >
            {/* Ambient subtle glow background */}
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

            {/* If uploaded PDF with image */}
            {currentSlide.imageUrl ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black">
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.title}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              /* Built-in high visual pedagogical slide */
              <>
                {/* Header */}
                <div className="relative z-10">
                  <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-indigo-400/80 mb-2">
                    <span>{presentation.title}</span>
                    <span>Diapositiva #{currentSlide.pageNumber}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-1.5">
                    {currentSlide.title}
                  </h2>
                  {currentSlide.subtitle && (
                    <p className="text-sm font-medium text-indigo-200/80">
                      {currentSlide.subtitle}
                    </p>
                  )}
                </div>

                {/* Body Content & Diagram / Formula */}
                <div className="relative z-10 my-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className={`${currentSlide.formula ? "md:col-span-7" : "md:col-span-12"} space-y-2.5`}>
                    {currentSlide.bulletPoints.map((point, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="mt-1.5 h-2 w-2 rounded-full bg-indigo-400 shrink-0 ring-4 ring-indigo-500/20" />
                        <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                          {point}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Formula / Concept Callout box */}
                  {currentSlide.formula && (
                    <div className="md:col-span-5 rounded-xl border border-indigo-500/30 bg-indigo-950/20 p-4 shadow-inner">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-300 mb-2">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Formulación Matemática / Clave</span>
                      </div>
                      <div className="rounded-lg bg-neutral-950/80 p-3 font-mono text-xs text-indigo-200 text-center border border-indigo-500/20 overflow-x-auto shadow">
                        {currentSlide.formula}
                      </div>
                      <div className="mt-3 text-[11px] text-neutral-400 leading-normal">
                        Tip: Pídele a Gemini Live que desglose paso a paso esta ecuación con voz.
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="relative z-10 flex items-center justify-between border-t border-neutral-800/80 pt-3 text-[11px] text-neutral-500">
                  <span>{presentation.author}</span>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-emerald-400/90 font-mono">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Gemini 3.8 Context Ready
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Presenter Notes Overlay (if toggled) */}
      {showNotes && currentSlide?.notes && (
        <div className="border-t border-amber-500/20 bg-amber-950/20 px-4 py-2.5 text-xs text-amber-200 flex items-start gap-2.5 animate-in fade-in duration-150">
          <FileText className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold text-amber-300">Guía del Profesor para esta diapositiva: </span>
            <span>{currentSlide.notes}</span>
          </div>
        </div>
      )}

      {/* Bottom Thumbnails Rail (if toggled) */}
      {showThumbnails && (
        <div className="border-t border-neutral-800 bg-neutral-950 p-2.5 overflow-x-auto flex gap-2">
          {presentation.slides.map((s, idx) => {
            const isCurrent = idx === currentSlideIndex;
            return (
              <button
                key={s.id}
                onClick={() => onSlideChange(idx)}
                className={`relative shrink-0 w-32 aspect-[16/9] rounded-lg border text-left p-1.5 flex flex-col justify-between overflow-hidden transition-all ${
                  isCurrent
                    ? "border-indigo-500 bg-indigo-950/40 ring-2 ring-indigo-500/30"
                    : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                }`}
              >
                <div className="text-[10px] font-mono text-neutral-400">#{s.pageNumber}</div>
                <div className="text-[10px] font-medium text-neutral-200 truncate">{s.title}</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Controls & Pedagogical Quick Actions */}
      <div className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900/90 px-4 py-2.5">
        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <button
            id="prev-slide-btn"
            onClick={handlePrev}
            disabled={currentSlideIndex === 0}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-850 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Anterior</span>
          </button>

          <span className="text-xs font-mono text-neutral-400 px-1">
            {currentSlideIndex + 1} de {total}
          </span>

          <button
            id="next-slide-btn"
            onClick={handleNext}
            disabled={currentSlideIndex === total - 1}
            className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-850 px-2.5 py-1.5 text-xs font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <span className="hidden sm:inline">Siguiente</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Quick Teacher Actions */}
        <div className="flex items-center gap-2">
          <button
            id="explain-slide-btn"
            onClick={() => onExplainSlide(currentSlide)}
            title="Pedir al profesor que explique esta diapositiva con voz"
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-600/30 transition-colors shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Explicar Diapositiva</span>
          </button>

          <button
            id="request-infographic-btn"
            onClick={() => onRequestInfographic(currentSlide)}
            title="Pedir infografía a Nano Banana en segundo plano"
            className="hidden md:flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/25 transition-colors"
          >
            <span>🎨 Infografía Nano Banana</span>
          </button>

          <button
            id="request-code-btn"
            onClick={() => onRequestCode(currentSlide)}
            title="Crear código explicativo para esta diapositiva"
            className="hidden lg:flex items-center gap-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/25 transition-colors"
          >
            <span>💻 Código Explicativo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
