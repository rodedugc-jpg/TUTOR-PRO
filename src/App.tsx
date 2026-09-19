import React, { useEffect, useRef, useState } from "react";
import { Header } from "./components/Header";
import { PresentationViewer } from "./components/PresentationViewer";
import { ArtifactsPanel } from "./components/ArtifactsPanel";
import { VoiceInteractionBar } from "./components/VoiceInteractionBar";
import { InfographicModal } from "./components/InfographicModal";
import { ManualArtifactModal } from "./components/ManualArtifactModal";
import { UploadPdfModal } from "./components/UploadPdfModal";
import { SAMPLE_PRESENTATIONS } from "./data/samplePresentations";
import { LiveAudioService } from "./services/liveAudioService";
import {
  Presentation,
  Slide,
  Artifact,
  InfographicArtifact,
  CodeArtifact,
  ConceptArtifact,
  LiveConnectionState,
  ConversationTurn,
} from "./types";

export default function App() {
  // Presentation State
  const [presentations, setPresentations] = useState<Presentation[]>(SAMPLE_PRESENTATIONS);
  const [currentPresentation, setCurrentPresentation] = useState<Presentation>(SAMPLE_PRESENTATIONS[0]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  // Artifacts State (Initialize with rich interactive artifacts for the current presentation)
  const [artifacts, setArtifacts] = useState<Artifact[]>([
    {
      id: "art-initial-1",
      type: "code",
      title: "Cálculo de Scaled Dot-Product Attention",
      language: "python",
      code: `import numpy as np

def scaled_dot_product_attention(Q, K, V):
    """
    Q, K, V: matrices de tamaño (seq_len, d_k)
    """
    d_k = Q.shape[-1]
    # 1. Producto escalar Q x K^T
    scores = np.matmul(Q, K.T) / np.sqrt(d_k)
    
    # 2. Softmax a lo largo del último eje
    weights = np.exp(scores) / np.sum(np.exp(scores), axis=-1, keepdims=True)
    
    # 3. Suma ponderada de Values (V)
    output = np.matmul(weights, V)
    return output, weights

# Demo con vectores aleatorios
Q = np.random.randn(4, 64)
K = np.random.randn(4, 64)
V = np.random.randn(4, 64)
out, attn_weights = scaled_dot_product_attention(Q, K, V)
print("Forma de salida:", out.shape)
print("Matriz de pesos de atención (4x4):\\n", np.round(attn_weights, 3))`,
      explanation:
        "Implementación matemática exacta del mecanismo de atención de Vaswani et al. Divide los scores entre la raíz de d_k para estabilizar gradientes antes de softmax.",
      runnable: true,
      expectedOutput:
        "Forma de salida: (4, 64)\nMatriz de pesos de atención (4x4):\n[[0.28 0.22 0.31 0.19]\n [0.15 0.45 0.25 0.15]\n [0.30 0.10 0.40 0.20]\n [0.25 0.25 0.25 0.25]]",
      status: "ready",
      createdAt: new Date().toISOString(),
      relatedSlideNumber: 2,
    },
    {
      id: "art-initial-2",
      type: "concept",
      title: "Analogía Intuitiva: Motor de Búsqueda (Q, K, V)",
      analogy:
        "Imagina que buscas un video en YouTube. Tu 'Query' es la frase que escribes en la barra de búsqueda. Las 'Keys' son los títulos y etiquetas de todos los videos de la plataforma. Los 'Values' son el contenido real del video que terminas reproduciendo.",
      keyPoints: [
        "Query (Q): El interrogante del token actual.",
        "Key (K): La etiqueta que identifica qué información tiene cada token.",
        "Value (V): La información semántica transmitida cuando la Query y la Key coinciden.",
      ],
      formula: "Attention(Q,K,V) = softmax(QK^T / √d_k) V",
      status: "ready",
      createdAt: new Date().toISOString(),
      relatedSlideNumber: 2,
    },
  ]);

  const [activeArtifactId, setActiveArtifactId] = useState<string | null>(null);

  // Live Session & Audio State
  const [liveState, setLiveState] = useState<LiveConnectionState>("disconnected");
  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [selectedVoice, setSelectedVoice] = useState<string>("Zephyr");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [speakerLevel, setSpeakerLevel] = useState<number>(0);
  const [lastTranscript, setLastTranscript] = useState<string>("");
  const [isSending, setIsSending] = useState<boolean>(false);

  // Conversation history for context tracking
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);

  // Modals
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [manualArtifactType, setManualArtifactType] = useState<"infographic" | "code" | null>(null);
  const [activeInfographicModal, setActiveInfographicModal] = useState<InfographicArtifact | null>(null);

  // Refs for persistent services
  const audioServiceRef = useRef<LiveAudioService | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const currentSlide = currentPresentation.slides[currentSlideIndex] || currentPresentation.slides[0];
  const activeArtifact = artifacts.find((a) => a.id === activeArtifactId) || null;

  // Initialize Audio Service
  useEffect(() => {
    const audioService = new LiveAudioService((base64Pcm) => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !isMicMuted) {
        wsRef.current.send(
          JSON.stringify({
            type: "audio",
            data: base64Pcm,
          })
        );
      }
    });

    audioServiceRef.current = audioService;

    // Animation frame for visualizer audio levels
    const updateAudioLevels = () => {
      if (audioServiceRef.current) {
        setAudioLevel(audioServiceRef.current.getMicLevel());
        setSpeakerLevel(audioServiceRef.current.getSpeakerLevel());
      }
      animFrameRef.current = requestAnimationFrame(updateAudioLevels);
    };
    animFrameRef.current = requestAnimationFrame(updateAudioLevels);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      audioService.dispose();
      if (wsRef.current) wsRef.current.close();
    };
  }, [isMicMuted]);

  // Connect to Gemini 3.8 Live over WebSocket
  const startLiveSession = async () => {
    setLiveState("connecting");

    try {
      // Start microphone
      const micStarted = await audioServiceRef.current?.startMicrophone();
      if (!micStarted) {
        console.warn("Microphone access could not be established immediately, proceeding in fallback mode");
      }

      // Establish WebSocket connection to backend
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/live-ws`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[ClientWS] Connected to DocentAI Live backend");
        setLiveState("connected");

        // Send initial slide context to Gemini Live
        ws.send(
          JSON.stringify({
            type: "slide_context",
            slideNumber: currentSlideIndex + 1,
            text: `${currentSlide.title}. ${currentSlide.subtitle || ""}. ${currentSlide.bulletPoints.join(" ")}`,
            image: currentSlide.imageUrl || null,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === "audio" && msg.data) {
            setLiveState("speaking");
            audioServiceRef.current?.playAudioChunk(msg.data);
            setTimeout(() => {
              if (liveState === "speaking") setLiveState("listening");
            }, 1200);
          } else if (msg.type === "interrupted") {
            audioServiceRef.current?.stopPlayback();
            setLiveState("listening");
          } else if (msg.type === "artifact_generating") {
            // Nano Banana started working in the background!
            const newArt: InfographicArtifact = {
              id: msg.artifact.id,
              type: "infographic",
              title: msg.artifact.title,
              prompt: msg.artifact.prompt,
              conceptSummary: msg.artifact.conceptSummary,
              status: "generating",
              createdAt: new Date().toISOString(),
              relatedSlideNumber: currentSlideIndex + 1,
            };
            setArtifacts((prev) => [newArt, ...prev]);
            setLastTranscript(`⚡ Nano Banana generando infografía: ${newArt.title}`);
          } else if (msg.type === "artifact_completed") {
            // Artifact completed in background (either infographic or code)
            const completed = msg.artifact;
            setArtifacts((prev) => {
              const filtered = prev.filter((a) => a.id !== completed.id);
              return [completed, ...filtered];
            });
            setActiveArtifactId(completed.id);
            setLastTranscript(`✨ Nuevo artefacto listo: ${completed.title}`);
          } else if (msg.type === "slide_change") {
            // Professor navigated to another slide
            const target = msg.targetSlideNumber - 1;
            if (target >= 0 && target < currentPresentation.slides.length) {
              setCurrentSlideIndex(target);
              setLastTranscript(`Profesor cambió a la diapositiva ${msg.targetSlideNumber}`);
            }
          } else if (msg.type === "session_ready") {
            setLiveState("listening");
          }
        } catch (e) {
          console.error("Error handling ws message:", e);
        }
      };

      ws.onclose = () => {
        setLiveState("disconnected");
        audioServiceRef.current?.stopMicrophone();
      };

      ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        setLiveState("disconnected");
      };
    } catch (e: any) {
      console.error("Failed to start Live session:", e);
      setLiveState("disconnected");
    }
  };

  const stopLiveSession = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    audioServiceRef.current?.stopMicrophone();
    audioServiceRef.current?.stopPlayback();
    setLiveState("disconnected");
  };

  const handleToggleLive = () => {
    if (liveState === "disconnected") {
      startLiveSession();
    } else {
      stopLiveSession();
    }
  };

  const handleToggleMute = () => {
    setIsMicMuted((prev) => !prev);
  };

  // Sync slide change with Gemini Live if connected
  const handleSlideChange = (index: number) => {
    setCurrentSlideIndex(index);
    const newSlide = currentPresentation.slides[index];
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "slide_context",
          slideNumber: index + 1,
          text: `${newSlide.title}. ${newSlide.subtitle || ""}. ${newSlide.bulletPoints.join(" ")}`,
          image: newSlide.imageUrl || null,
        })
      );
    }
  };

  // Student selects an artifact to ask about
  const handleSelectArtifact = (art: Artifact) => {
    setActiveArtifactId(art.id);
  };

  // Student asks about an artifact by voice / text
  const handleAskAboutArtifact = (art: Artifact) => {
    setActiveArtifactId(art.id);

    const prompt = `Profesor, profundicemos sobre este artefacto: "${art.title}" (${
      art.type === "infographic"
        ? "infografía de Nano Banana"
        : art.type === "code"
        ? "código explicativo"
        : "tarjeta de concepto"
    }). ¿Podrías explicarme sus implicaciones con respecto a la diapositiva actual?`;

    handleSendMessage(prompt);
  };

  // Send message (via voice channel if connected, or REST API fallback)
  const handleSendMessage = async (text: string) => {
    setIsSending(true);
    setLastTranscript(text);

    // If WebSocket is active, send through Gemini Live
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "text",
          text,
        })
      );
      setLiveState("thinking");
    }

    // Also record conversation turn
    const userTurn: ConversationTurn = {
      id: "turn-" + Date.now(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString(),
      relatedSlide: currentSlideIndex + 1,
      artifactRefId: activeArtifactId || undefined,
    };
    setConversationHistory((prev) => [...prev, userTurn]);

    // Check if user requested an infographic or code via text
    const lower = text.toLowerCase();
    const isInfographicRequest =
      lower.includes("infografía") || lower.includes("infografia") || lower.includes("esquema visual");
    const isCodeRequest =
      lower.includes("código") || lower.includes("codigo") || lower.includes("python") || lower.includes("implementa");

    if (isInfographicRequest) {
      // Trigger Nano Banana in background
      handleManualInfographic({
        title: `Infografía: ${currentSlide.title}`,
        prompt: `Educational infographic diagram for ${currentSlide.title}: ${text}. Clear pedagogical labels.`,
        conceptSummary: `Generada a partir de tu consulta: "${text}"`,
      });
    } else if (isCodeRequest) {
      // Trigger code generation
      handleManualCode({
        title: `Código: ${currentSlide.title}`,
        concept: text,
        language: lower.includes("javascript") ? "javascript" : "python",
      });
    }

    // Call /api/chat for structured teacher response
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          slideNumber: currentSlideIndex + 1,
          totalSlides: currentPresentation.totalSlides,
          slideText: `${currentSlide.title}: ${currentSlide.bulletPoints.join(". ")}`,
          slideImage: currentSlide.imageUrl || null,
          activeArtifact,
          history: conversationHistory.slice(-4).map((c) => ({
            role: c.sender === "user" ? "user" : "assistant",
            content: c.text,
          })),
        }),
      });

      const data = await res.json();
      if (data.text) {
        const teacherTurn: ConversationTurn = {
          id: "turn-" + Date.now() + 1,
          sender: "teacher",
          text: data.text,
          timestamp: new Date().toLocaleTimeString(),
          relatedSlide: currentSlideIndex + 1,
        };
        setConversationHistory((prev) => [...prev, teacherTurn]);
        setLastTranscript(data.text.substring(0, 140) + "...");
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsSending(false);
    }
  };

  // Request slide explanation
  const handleExplainSlide = (slide: Slide) => {
    handleSendMessage(
      `Profesor, por favor explícame detalladamente la diapositiva "${slide.title}" con analogías claras y los puntos más importantes.`
    );
  };

  // Request Infographic from Nano Banana
  const handleManualInfographic = async (data: { title: string; prompt: string; conceptSummary: string }) => {
    const tempId = "info-" + Date.now();
    const tempArtifact: InfographicArtifact = {
      id: tempId,
      type: "infographic",
      title: data.title,
      prompt: data.prompt,
      conceptSummary: data.conceptSummary,
      status: "generating",
      createdAt: new Date().toISOString(),
      relatedSlideNumber: currentSlideIndex + 1,
    };

    setArtifacts((prev) => [tempArtifact, ...prev]);

    try {
      const res = await fetch("/api/generate-infographic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          prompt: data.prompt,
          conceptSummary: data.conceptSummary,
        }),
      });

      const result = await res.json();
      if (result.success) {
        const readyArt: InfographicArtifact = {
          id: result.id,
          type: "infographic",
          title: result.title,
          prompt: result.prompt,
          conceptSummary: result.conceptSummary,
          imageUrl: result.imageUrl,
          svg: result.svg,
          modelUsed: result.modelUsed,
          status: "ready",
          createdAt: result.createdAt,
          relatedSlideNumber: currentSlideIndex + 1,
        };

        setArtifacts((prev) => [readyArt, ...prev.filter((a) => a.id !== tempId)]);
        setActiveArtifactId(readyArt.id);
      }
    } catch (err) {
      console.error("Failed to generate infographic:", err);
      setArtifacts((prev) => prev.filter((a) => a.id !== tempId));
    }
  };

  // Request Code artifact
  const handleManualCode = async (data: { title: string; concept: string; language: string }) => {
    try {
      const res = await fetch("/api/generate-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: data.title,
          concept: data.concept,
          language: data.language,
          slideContext: `${currentSlide.title}: ${currentSlide.bulletPoints.join(" ")}`,
        }),
      });

      const result = await res.json();
      if (result.success) {
        const codeArt: CodeArtifact = {
          id: result.id,
          type: "code",
          title: result.title,
          language: result.language,
          code: result.code,
          explanation: result.explanation,
          runnable: result.runnable,
          expectedOutput: result.expectedOutput,
          status: "ready",
          createdAt: result.createdAt,
          relatedSlideNumber: currentSlideIndex + 1,
        };

        setArtifacts((prev) => [codeArt, ...prev]);
        setActiveArtifactId(codeArt.id);
      }
    } catch (err) {
      console.error("Failed to generate code:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Application Header */}
      <Header
        presentations={presentations}
        currentPresentation={currentPresentation}
        onSelectPresentation={(p) => {
          setCurrentPresentation(p);
          setCurrentSlideIndex(0);
        }}
        onUploadClick={() => setShowUploadModal(true)}
        liveState={liveState}
        onToggleLive={handleToggleLive}
        isMicMuted={isMicMuted}
        onToggleMute={handleToggleMute}
        selectedVoice={selectedVoice}
        onChangeVoice={(v) => setSelectedVoice(v)}
        activeArtifactCount={artifacts.length}
      />

      {/* Main Dual-Screen Grid Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 pb-28">
        {/* Left / Center: Slide Presentation Viewer (7 cols on lg) */}
        <section className="lg:col-span-7 xl:col-span-8 flex flex-col h-[650px] lg:h-[calc(100vh-160px)]">
          <PresentationViewer
            presentation={currentPresentation}
            currentSlideIndex={currentSlideIndex}
            onSlideChange={handleSlideChange}
            onExplainSlide={handleExplainSlide}
            onRequestInfographic={(slide) =>
              handleManualInfographic({
                title: `Infografía: ${slide.title}`,
                prompt: `Educational infographic diagram for ${slide.title}: ${slide.bulletPoints.slice(0, 3).join("; ")}`,
                conceptSummary: `Diagrama explicativo ilustrando ${slide.title}.`,
              })
            }
            onRequestCode={(slide) =>
              handleManualCode({
                title: `Implementación: ${slide.title}`,
                concept: `Algoritmo o código educativo para ${slide.title}`,
                language: "python",
              })
            }
            isLiveActive={liveState !== "disconnected"}
          />
        </section>

        {/* Right Side: Multi-Task Artifacts Panel (5 cols on lg) */}
        <section className="lg:col-span-5 xl:col-span-4 flex flex-col h-[600px] lg:h-[calc(100vh-160px)]">
          <ArtifactsPanel
            artifacts={artifacts}
            activeArtifactId={activeArtifactId}
            onSelectArtifact={handleSelectArtifact}
            onAskAboutArtifact={handleAskAboutArtifact}
            onOpenInfographicModal={(art) => setActiveInfographicModal(art)}
            onRequestManualInfographic={() => setManualArtifactType("infographic")}
            onRequestManualCode={() => setManualArtifactType("code")}
            isLiveActive={liveState !== "disconnected"}
          />
        </section>
      </main>

      {/* Bottom Floating Interaction Bar (Unified Voice & Text Navigation) */}
      <VoiceInteractionBar
        liveState={liveState}
        isMicMuted={isMicMuted}
        onToggleMic={handleToggleMute}
        onStartLive={startLiveSession}
        audioLevel={audioLevel}
        speakerLevel={speakerLevel}
        activeArtifact={activeArtifact}
        onClearActiveArtifact={() => setActiveArtifactId(null)}
        onSendMessage={handleSendMessage}
        lastTranscript={lastTranscript}
        isSending={isSending}
      />

      {/* Modals */}
      <InfographicModal
        artifact={activeInfographicModal}
        onClose={() => setActiveInfographicModal(null)}
        onAskAboutArtifact={handleAskAboutArtifact}
      />

      <ManualArtifactModal
        isOpen={Boolean(manualArtifactType)}
        type={manualArtifactType || "infographic"}
        currentSlide={currentSlide}
        onClose={() => setManualArtifactType(null)}
        onSubmitInfographic={handleManualInfographic}
        onSubmitCode={handleManualCode}
      />

      <UploadPdfModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onPresentationLoaded={(newPres) => {
          setPresentations((prev) => [newPres, ...prev]);
          setCurrentPresentation(newPres);
          setCurrentSlideIndex(0);
        }}
      />
    </div>
  );
}
