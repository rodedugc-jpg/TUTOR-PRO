import React from "react";
import { X, Upload, FileText, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { parsePdfFile } from "../utils/pdfLoader";
import { Presentation } from "../types";

interface UploadPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPresentationLoaded: (pres: Presentation) => void;
}

export const UploadPdfModal: React.FC<UploadPdfModalProps> = ({
  isOpen,
  onClose,
  onPresentationLoaded,
}) => {
  const [isDragging, setIsDragging] = React.useState(false);
  const [loadingState, setLoadingState] = React.useState<"idle" | "parsing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".pdf")) {
      setErrorMessage("Por favor selecciona un archivo en formato PDF válido.");
      setLoadingState("error");
      return;
    }

    setLoadingState("parsing");
    setErrorMessage(null);

    try {
      const presentation = await parsePdfFile(file);
      setLoadingState("success");
      setTimeout(() => {
        onPresentationLoaded(presentation);
        onClose();
        setLoadingState("idle");
      }, 700);
    } catch (err: any) {
      console.error("Failed to parse PDF:", err);
      setErrorMessage(err.message || "Error al procesar el archivo PDF.");
      setLoadingState("error");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-950 p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-500/20 p-2 text-emerald-400">
              <Upload className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Subir Presentación en PDF
              </h3>
              <p className="text-xs text-neutral-400">
                DocentAI procesará cada diapositiva para que el profesor la explique con voz
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

        {/* Drag & Drop Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
            isDragging
              ? "border-emerald-500 bg-emerald-500/10"
              : "border-neutral-800 bg-neutral-900/40 hover:border-neutral-700 hover:bg-neutral-900/80"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />

          {loadingState === "parsing" ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-10 w-10 animate-spin text-emerald-400 mb-3" />
              <p className="text-xs font-semibold text-white">
                Renderizando diapositivas del PDF con alta resolución...
              </p>
              <p className="text-[11px] text-neutral-400 mt-1">
                Extrayendo contenido para el tutor Gemini 3.8
              </p>
            </div>
          ) : loadingState === "success" ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-3 animate-bounce" />
              <p className="text-xs font-semibold text-emerald-300">
                ¡Presentación cargada con éxito!
              </p>
            </div>
          ) : (
            <>
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-3">
                <FileText className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium text-white mb-1">
                Arrastra tu PDF aquí o haz clic para explorar
              </p>
              <p className="text-[11px] text-neutral-400 max-w-xs">
                Soporta presentaciones exportadas desde PowerPoint, Keynote o Google Slides en formato .pdf
              </p>
            </>
          )}
        </div>

        {errorMessage && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-[11px] text-neutral-500">
          <span>Procesamiento local seguro y rápido</span>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
