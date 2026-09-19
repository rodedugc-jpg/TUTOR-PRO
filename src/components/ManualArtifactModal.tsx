import React from "react";
import { X, Sparkles, Image as ImageIcon, Code, Loader2 } from "lucide-react";
import { Slide } from "../types";

interface ManualArtifactModalProps {
  isOpen: boolean;
  type: "infographic" | "code";
  currentSlide: Slide;
  onClose: () => void;
  onSubmitInfographic: (data: { title: string; prompt: string; conceptSummary: string }) => Promise<void>;
  onSubmitCode: (data: { title: string; concept: string; language: string }) => Promise<void>;
}

export const ManualArtifactModal: React.FC<ManualArtifactModalProps> = ({
  isOpen,
  type,
  currentSlide,
  onClose,
  onSubmitInfographic,
  onSubmitCode,
}) => {
  const [title, setTitle] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [conceptSummary, setConceptSummary] = React.useState("");
  const [language, setLanguage] = React.useState("python");
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      if (type === "infographic") {
        setTitle(`Esquema: ${currentSlide.title}`);
        setPrompt(
          `Infografía técnica clara de: ${currentSlide.title}. Puntos principales: ${currentSlide.bulletPoints.slice(0, 3).join("; ")}`
        );
        setConceptSummary(`Diagrama conceptual para comprender ${currentSlide.title}.`);
      } else {
        setTitle(`Implementación: ${currentSlide.title}`);
        setPrompt(
          `Código explicativo conciso para ilustrar el funcionamiento de: ${currentSlide.title}`
        );
        setLanguage("python");
      }
    }
  }, [isOpen, type, currentSlide]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (type === "infographic") {
        await onSubmitInfographic({ title, prompt, conceptSummary });
      } else {
        await onSubmitCode({ title, concept: prompt, language });
      }
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            {type === "infographic" ? (
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-300">
                <ImageIcon className="h-4 w-4" />
              </div>
            ) : (
              <div className="rounded-lg bg-cyan-500/20 p-2 text-cyan-300">
                <Code className="h-4 w-4" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                {type === "infographic"
                  ? "Solicitar Infografía a Nano Banana"
                  : "Crear Artefacto de Código Explicativo"}
              </h3>
              <p className="text-xs text-neutral-400">
                Aparecerá en tu panel lateral mientras continúas tu clase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-white rounded-lg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              Título del Artefacto
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {type === "code" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Lenguaje de Programación
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="python">Python</option>
                <option value="javascript">JavaScript</option>
                <option value="typescript">TypeScript</option>
                <option value="html">HTML / Canvas Interactivo</option>
                <option value="sql">SQL</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1">
              {type === "infographic" ? "Prompt Visual para Nano Banana" : "Concepto o Algoritmo a Implementar"}
            </label>
            <textarea
              required
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {type === "infographic" && (
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">
                Resumen didáctico (para qué sirve esta infografía)
              </label>
              <input
                type="text"
                value={conceptSummary}
                onChange={(e) => setConceptSummary(e.target.value)}
                className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors ${
                type === "infographic"
                  ? "bg-amber-600 hover:bg-amber-500"
                  : "bg-cyan-600 hover:bg-cyan-500"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Procesando en segundo plano...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Crear Artefacto</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
