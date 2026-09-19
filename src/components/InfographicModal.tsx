import React from "react";
import { X, Download, Maximize2, Sparkles, Mic, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { InfographicArtifact } from "../types";

interface InfographicModalProps {
  artifact: InfographicArtifact | null;
  onClose: () => void;
  onAskAboutArtifact: (artifact: InfographicArtifact) => void;
}

export const InfographicModal: React.FC<InfographicModalProps> = ({
  artifact,
  onClose,
  onAskAboutArtifact,
}) => {
  const [scale, setScale] = React.useState(1);

  if (!artifact) return null;

  const handleDownload = () => {
    if (artifact.imageUrl) {
      const a = document.createElement("a");
      a.href = artifact.imageUrl;
      a.download = `${artifact.title.replace(/\s+/g, "_")}.png`;
      a.click();
    } else if (artifact.svg) {
      const blob = new Blob([artifact.svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${artifact.title.replace(/\s+/g, "_")}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative flex flex-col w-full max-w-5xl max-h-[92vh] rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-amber-500/20 p-1.5 text-amber-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {artifact.title}
              </h3>
              <p className="text-xs text-neutral-400">
                Generado con Nano Banana ({artifact.modelUsed || "gemini-3.1-flash-lite-image"})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale((s) => Math.max(0.75, s - 0.25))}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Reducir"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setScale((s) => Math.min(2.5, s + 0.25))}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Aumentar"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setScale(1)}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
              title="Restablecer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-neutral-700 hover:text-white transition-colors ml-2"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar</span>
            </button>

            <button
              onClick={() => {
                onAskAboutArtifact(artifact);
                onClose();
              }}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors shadow-md"
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Preguntar por Voz sobre esto</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / Image View */}
        <div className="flex-1 overflow-auto bg-neutral-900/60 p-6 flex items-center justify-center">
          <div
            style={{ transform: `scale(${scale})`, transformOrigin: "center center" }}
            className="transition-transform duration-150 max-w-full"
          >
            {artifact.imageUrl ? (
              <img
                src={artifact.imageUrl}
                alt={artifact.title}
                className="max-h-[65vh] w-auto rounded-xl object-contain shadow-2xl border border-neutral-800"
                referrerPolicy="no-referrer"
              />
            ) : artifact.svg ? (
              <div
                className="max-h-[65vh] w-full max-w-3xl rounded-xl bg-neutral-950 p-4 border border-neutral-800 shadow-2xl"
                dangerouslySetInnerHTML={{ __html: artifact.svg }}
              />
            ) : (
              <div className="p-8 text-neutral-400">Sin vista previa disponible</div>
            )}
          </div>
        </div>

        {/* Modal Footer: Pedagogical prompt details */}
        <div className="border-t border-neutral-800 bg-neutral-950 px-6 py-3.5 text-xs text-neutral-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-white">Prompt conceptual: </span>
            <span className="italic">{artifact.prompt}</span>
          </div>
          {artifact.conceptSummary && (
            <div className="text-[11px] text-neutral-400 max-w-md">
              <span className="font-semibold text-amber-300">Resumen didáctico: </span>
              <span>{artifact.conceptSummary}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
