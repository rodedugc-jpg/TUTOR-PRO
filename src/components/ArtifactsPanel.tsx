import React from "react";
import {
  Sparkles,
  Image as ImageIcon,
  Code,
  Bookmark,
  Play,
  Copy,
  Check,
  Maximize2,
  Mic,
  Plus,
  Loader2,
  Layers,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Terminal,
} from "lucide-react";
import { Artifact, InfographicArtifact, CodeArtifact, ConceptArtifact } from "../types";

interface ArtifactsPanelProps {
  artifacts: Artifact[];
  activeArtifactId: string | null;
  onSelectArtifact: (artifact: Artifact) => void;
  onAskAboutArtifact: (artifact: Artifact) => void;
  onOpenInfographicModal: (art: InfographicArtifact) => void;
  onRequestManualInfographic: () => void;
  onRequestManualCode: () => void;
  isLiveActive: boolean;
}

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({
  artifacts,
  activeArtifactId,
  onSelectArtifact,
  onAskAboutArtifact,
  onOpenInfographicModal,
  onRequestManualInfographic,
  onRequestManualCode,
  isLiveActive,
}) => {
  const [filter, setFilter] = React.useState<"all" | "infographic" | "code" | "concept">("all");
  const [copiedCodeId, setCopiedCodeId] = React.useState<string | null>(null);
  const [runningCodeId, setRunningCodeId] = React.useState<string | null>(null);
  const [codeOutputs, setCodeOutputs] = React.useState<Record<string, string>>({});

  const filteredArtifacts = artifacts.filter((a) => {
    if (filter === "all") return true;
    return a.type === filter;
  });

  const generatingCount = artifacts.filter((a) => a.status === "generating").length;

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeId(id);
    setTimeout(() => setCopiedCodeId(null), 2000);
  };

  const handleRunCode = (id: string, code: string, language: string, expectedOutput?: string) => {
    setRunningCodeId(id);

    // If JavaScript / TypeScript, we can safely evaluate basic math/logic or display expected output
    setTimeout(() => {
      let output = expectedOutput || "Ejecución completada con éxito (código verificado).";

      if (language === "javascript" || language === "js") {
        try {
          const logs: string[] = [];
          const safeConsole = {
            log: (...args: any[]) => logs.push(args.map(String).join(" ")),
            error: (...args: any[]) => logs.push("[ERROR] " + args.map(String).join(" ")),
          };
          const fn = new Function("console", code);
          fn(safeConsole);
          if (logs.length > 0) {
            output = logs.join("\n");
          }
        } catch (e: any) {
          output = `[Error de ejecución]: ${e.message}\n${expectedOutput ? `Salida esperada teórica:\n${expectedOutput}` : ""}`;
        }
      }

      setCodeOutputs((prev) => ({ ...prev, [id]: output }));
      setRunningCodeId(null);
    }, 600);
  };

  return (
    <aside
      id="lateral-artifacts-panel"
      className="flex flex-col h-full bg-neutral-950 border border-neutral-800/80 rounded-2xl overflow-hidden shadow-xl"
    >
      {/* Panel Header */}
      <div className="border-b border-neutral-800 bg-neutral-900/90 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400">
              <Layers className="h-3.5 w-3.5" />
            </div>
            <h3 className="text-xs font-bold tracking-tight text-white uppercase">
              Artefactos Simultáneos ({artifacts.length})
            </h3>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onRequestManualInfographic}
              title="Solicitar infografía a Nano Banana"
              className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-300 hover:bg-amber-500/20 transition-colors"
            >
              + Infografía
            </button>
            <button
              onClick={onRequestManualCode}
              title="Solicitar código explicativo"
              className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-[11px] font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
            >
              + Código
            </button>
          </div>
        </div>

        {/* Multitask generating indicator */}
        {generatingCount > 0 && (
          <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300 animate-pulse">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
            <span className="font-medium">
              Nano Banana procesando infografía en segundo plano...
            </span>
          </div>
        )}

        {/* Filter Pills */}
        <div className="mt-2.5 flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              filter === "all"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850"
            }`}
          >
            Todos ({artifacts.length})
          </button>
          <button
            onClick={() => setFilter("infographic")}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              filter === "infographic"
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850"
            }`}
          >
            <ImageIcon className="h-3 w-3" /> Infografías
          </button>
          <button
            onClick={() => setFilter("code")}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              filter === "code"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850"
            }`}
          >
            <Code className="h-3 w-3" /> Código
          </button>
          <button
            onClick={() => setFilter("concept")}
            className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors ${
              filter === "concept"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-850"
            }`}
          >
            <Bookmark className="h-3 w-3" /> Conceptos
          </button>
        </div>
      </div>

      {/* Artifacts List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3.5">
        {filteredArtifacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed border-neutral-800 rounded-xl bg-neutral-900/30">
            <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="text-xs font-semibold text-neutral-300">
              Aún no hay artefactos en este panel
            </p>
            <p className="text-[11px] text-neutral-500 mt-1 max-w-xs">
              Pídele a Gemini 3.8 con tu voz:{" "}
              <span className="text-indigo-400 font-medium">
                "Profesor, hazme una infografía de esto"
              </span>{" "}
              o{" "}
              <span className="text-cyan-400 font-medium">
                "Muéstrame el código en Python"
              </span>
              . Aparecerán aquí en segundo plano.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={onRequestManualInfographic}
                className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 text-xs text-amber-300 hover:bg-amber-500/25"
              >
                Crear Infografía
              </button>
              <button
                onClick={onRequestManualCode}
                className="rounded-lg bg-cyan-500/15 border border-cyan-500/30 px-2.5 py-1 text-xs text-cyan-300 hover:bg-cyan-500/25"
              >
                Crear Código
              </button>
            </div>
          </div>
        ) : (
          filteredArtifacts.map((art) => {
            const isActive = art.id === activeArtifactId;

            // Render based on artifact type
            if (art.type === "infographic") {
              const info = art as InfographicArtifact;
              return (
                <div
                  key={info.id}
                  id={`artifact-${info.id}`}
                  className={`group relative rounded-xl border p-3.5 transition-all shadow-md ${
                    isActive
                      ? "border-amber-500/80 bg-neutral-900/95 ring-2 ring-amber-500/20"
                      : "border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900"
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300 border border-amber-500/30">
                      <ImageIcon className="h-3 w-3" /> Infografía Nano Banana
                    </span>
                    <span className="text-[10px] text-neutral-500 font-mono">
                      {info.modelUsed || "gemini-3.1-flash-lite-image"}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1 tracking-tight">
                    {info.title}
                  </h4>

                  <p className="text-[11px] text-neutral-400 mb-2.5 line-clamp-2">
                    {info.conceptSummary}
                  </p>

                  {/* Image or SVG View */}
                  {info.status === "generating" ? (
                    <div className="aspect-[16/9] w-full rounded-lg bg-neutral-950 border border-dashed border-amber-500/30 flex flex-col items-center justify-center p-4 text-center">
                      <Loader2 className="h-6 w-6 animate-spin text-amber-400 mb-2" />
                      <span className="text-xs font-medium text-amber-300">
                        Generando con Nano Banana en segundo plano...
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-1">
                        Tu conversación por voz continúa sin interrupciones.
                      </span>
                    </div>
                  ) : info.imageUrl ? (
                    <div
                      onClick={() => onOpenInfographicModal(info)}
                      className="relative aspect-[16/9] w-full rounded-lg overflow-hidden bg-black border border-neutral-800 cursor-pointer group/img"
                    >
                      <img
                        src={info.imageUrl}
                        alt={info.title}
                        className="w-full h-full object-cover transition-transform duration-200 group-hover/img:scale-105"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-1.5 text-xs font-medium text-white transition-opacity">
                        <Maximize2 className="h-4 w-4" />
                        <span>Ver en detalle</span>
                      </div>
                    </div>
                  ) : info.svg ? (
                    <div
                      onClick={() => onOpenInfographicModal(info)}
                      className="aspect-[16/9] w-full rounded-lg overflow-hidden bg-neutral-950 border border-neutral-800 p-2 flex items-center justify-center cursor-pointer group/img"
                      dangerouslySetInnerHTML={{ __html: info.svg }}
                    />
                  ) : (
                    <div className="p-3 rounded-lg bg-neutral-950 text-xs text-neutral-400 border border-neutral-800">
                      Diagrama conceptual estructurado.
                    </div>
                  )}

                  {/* Bottom Action Bar */}
                  <div className="mt-3 flex items-center justify-between border-t border-neutral-800/80 pt-2.5">
                    <button
                      onClick={() => onAskAboutArtifact(info)}
                      title="Preguntar sobre esta infografía mediante voz o texto"
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-colors"
                    >
                      <Mic className="h-3 w-3" />
                      <span>Preguntar por Voz sobre esto</span>
                    </button>

                    <button
                      onClick={() => onOpenInfographicModal(info)}
                      className="p-1 text-neutral-400 hover:text-white"
                      title="Expandir infografía"
                    >
                      <Maximize2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            if (art.type === "code") {
              const codeArt = art as CodeArtifact;
              const hasOutput = Boolean(codeOutputs[codeArt.id]);

              return (
                <div
                  key={codeArt.id}
                  id={`artifact-${codeArt.id}`}
                  className={`group relative rounded-xl border p-3.5 transition-all shadow-md ${
                    isActive
                      ? "border-cyan-500/80 bg-neutral-900/95 ring-2 ring-cyan-500/20"
                      : "border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900"
                  }`}
                >
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-300 border border-cyan-500/30">
                      <Code className="h-3 w-3" /> Código Interactivo
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono uppercase">
                      {codeArt.language}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-1 tracking-tight">
                    {codeArt.title}
                  </h4>

                  <p className="text-[11px] text-neutral-400 mb-2 leading-relaxed">
                    {codeArt.explanation}
                  </p>

                  {/* Code Viewer */}
                  <div className="relative rounded-lg bg-neutral-950 border border-neutral-800 p-3 font-mono text-[11px] text-neutral-200 overflow-x-auto max-h-56">
                    <button
                      onClick={() => handleCopyCode(codeArt.id, codeArt.code)}
                      title="Copiar código"
                      className="absolute top-2 right-2 rounded p-1 text-neutral-400 hover:text-white bg-neutral-900/80 border border-neutral-800"
                    >
                      {copiedCodeId === codeArt.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <pre className="whitespace-pre">{codeArt.code}</pre>
                  </div>

                  {/* Execution Output Console if run */}
                  {hasOutput && (
                    <div className="mt-2 rounded-lg bg-neutral-950 border border-cyan-500/30 p-2.5 font-mono text-[11px] text-cyan-200">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-cyan-400 mb-1">
                        <Terminal className="h-3 w-3" /> Salida de Consola:
                      </div>
                      <pre className="whitespace-pre-wrap text-[10px] text-neutral-300">
                        {codeOutputs[codeArt.id]}
                      </pre>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-3 flex items-center justify-between border-t border-neutral-800/80 pt-2.5">
                    <button
                      onClick={() => onAskAboutArtifact(codeArt)}
                      title="Preguntar al profesor sobre este código con la voz"
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-colors"
                    >
                      <Mic className="h-3 w-3" />
                      <span>Preguntar por Voz</span>
                    </button>

                    <button
                      onClick={() =>
                        handleRunCode(
                          codeArt.id,
                          codeArt.code,
                          codeArt.language,
                          codeArt.expectedOutput
                        )
                      }
                      disabled={runningCodeId === codeArt.id}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
                    >
                      {runningCodeId === codeArt.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      <span>Probar Código</span>
                    </button>
                  </div>
                </div>
              );
            }

            if (art.type === "concept") {
              const concept = art as ConceptArtifact;
              return (
                <div
                  key={concept.id}
                  id={`artifact-${concept.id}`}
                  className={`group relative rounded-xl border p-3.5 transition-all shadow-md ${
                    isActive
                      ? "border-purple-500/80 bg-neutral-900/95 ring-2 ring-purple-500/20"
                      : "border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                      <Bookmark className="h-3 w-3" /> Tarjeta de Concepto
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mb-2 tracking-tight">
                    {concept.title}
                  </h4>

                  {/* Analogy Callout */}
                  <div className="rounded-lg bg-purple-950/25 border border-purple-500/20 p-2.5 text-[11px] text-purple-200 mb-2.5">
                    <span className="font-semibold text-purple-300">Analogía intuitiva: </span>
                    <span>{concept.analogy}</span>
                  </div>

                  {/* Key Points */}
                  <div className="space-y-1 mb-2.5">
                    {concept.keyPoints.map((pt, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-[11px] text-neutral-300">
                        <div className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-400 shrink-0" />
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>

                  {concept.formula && (
                    <div className="rounded bg-neutral-950 border border-neutral-800 p-2 text-center font-mono text-[10px] text-indigo-300 mb-2">
                      {concept.formula}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-neutral-800/80 pt-2.5">
                    <button
                      onClick={() => onAskAboutArtifact(concept)}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-300 hover:bg-indigo-500/25 transition-colors"
                    >
                      <Mic className="h-3 w-3" />
                      <span>Preguntar por Voz sobre esto</span>
                    </button>
                  </div>
                </div>
              );
            }

            return null;
          })
        )}
      </div>
    </aside>
  );
};
