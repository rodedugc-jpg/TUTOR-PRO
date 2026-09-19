import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, Modality, Type, LiveServerMessage } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;
const app = express();
const server = http.createServer(app);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not set");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Health Check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Endpoint to generate an infographic with Nano Banana (gemini-3.1-flash-lite-image)
app.post("/api/generate-infographic", async (req, res) => {
  try {
    const { title, prompt, conceptSummary, style } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing prompt" });
    }

    const ai = getGeminiClient();
    const enrichedPrompt = `Educational infographic, diagram, clean aesthetic vector style: ${prompt}. Topic: ${title || "Concept"}. Context: ${conceptSummary || ""}. Highly clear, legible, clean infographic design.`;

    let imageUrl: string | null = null;
    let fallbackSvg: string | null = null;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [{ text: enrichedPrompt }],
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          break;
        }
      }
    } catch (imgError: any) {
      console.warn("Nano Banana direct image generation notice:", imgError?.message || imgError);
      // Fallback to generating structured SVG diagram using gemini-3.8-flash
      const svgPrompt = `Create a clean, beautiful educational SVG infographic diagram for: "${title}".
Concept to illustrate: ${conceptSummary || prompt}.
Style: Modern tech infographic, clean dark or neutral gradient background, rounded boxes, connectors, icons, distinct legible text labels.
Return ONLY valid raw <svg ...> ... </svg> code, without markdown quotes or wrappers.`;

      const svgRes = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: svgPrompt,
      });

      const rawSvg = svgRes.text?.trim() || "";
      const cleanedSvg = rawSvg.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
      if (cleanedSvg.startsWith("<svg") && cleanedSvg.endsWith("</svg>")) {
        fallbackSvg = cleanedSvg;
      }
    }

    res.json({
      success: true,
      id: "infographic-" + Date.now(),
      title: title || "Infografía conceptual",
      prompt,
      conceptSummary: conceptSummary || "",
      imageUrl,
      svg: fallbackSvg,
      modelUsed: imageUrl ? "gemini-3.1-flash-lite-image (Nano Banana)" : "SVG Diagram Engine (Gemini 3.8 Flash)",
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error generating infographic:", error);
    res.status(500).json({ error: error.message || "Failed to generate infographic" });
  }
});

// Endpoint to generate code snippet artifact
app.post("/api/generate-code", async (req, res) => {
  try {
    const { title, concept, language = "python", slideContext } = req.body;
    const ai = getGeminiClient();

    const systemPrompt = `You are an expert computer science professor creating educational code artifacts.
Generate an illustrative, concise, and well-commented code snippet that directly helps a student understand:
Title: ${title || concept}
Concept details: ${concept}
Slide context: ${slideContext || ""}
Requested Language: ${language}

Return a JSON object with this exact structure:
{
  "title": "Concise title",
  "language": "${language}",
  "code": "The code itself (clean, educational, commented)",
  "explanation": "3-4 sentences explaining step-by-step how it works",
  "runnable": true,
  "expectedOutput": "Expected terminal or console output when executed"
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: systemPrompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json({
      success: true,
      id: "code-" + Date.now(),
      ...parsed,
      createdAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error generating code:", error);
    res.status(500).json({ error: error.message || "Failed to generate code" });
  }
});

// Endpoint for slide explanation and conversational Q&A
app.post("/api/chat", async (req, res) => {
  try {
    const { message, slideNumber, totalSlides, slideText, slideImage, activeArtifact, history = [] } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `Eres DocentAI, un profesor universitario extraordinario y empático.
Estás dando una clase personalizada con una presentación PDF en pantalla.
Información actual:
- Diapositiva actual: ${slideNumber || 1} de ${totalSlides || 1}
- Contenido de la diapositiva actual: ${slideText || "(Visual diapositiva)"}
${activeArtifact ? `- Artefacto activo sobre el que pregunta el alumno: ${JSON.stringify(activeArtifact)}` : ""}

Instrucciones:
1. Explica como un profesor apasionado, claro, riguroso pero accesible.
2. Si el alumno hace una pregunta o pide una explicación, dale una respuesta pedagógica estructurada.
3. Si el concepto se beneficiaría enormemente de una infografía visual o un fragmento de código, sugiere o describe qué artefacto le ayudaría.
4. Mantén un tono motivador y dialogante.`;

    const contents: any[] = [];
    // Include last conversation history turns
    for (const h of history.slice(-6)) {
      contents.push({
        role: h.role === "assistant" ? "model" : "user",
        parts: [{ text: h.content }],
      });
    }

    const currentParts: any[] = [];
    if (slideImage && slideImage.startsWith("data:image/")) {
      const mime = slideImage.substring(5, slideImage.indexOf(";"));
      const base64 = slideImage.substring(slideImage.indexOf(",") + 1);
      currentParts.push({
        inlineData: { mimeType: mime, data: base64 },
      });
    }
    currentParts.push({
      text: message || "Por favor, explícame los puntos clave de esta diapositiva como si fueras mi profesor.",
    });

    contents.push({ role: "user", parts: currentParts });

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction,
      },
    });

    res.json({
      text: response.text || "",
      slideNumber,
    });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Failed to get professor response" });
  }
});

// WebSocket Server for Gemini 3.8 Live real-time bidirectional voice & multitask orchestration
const wss = new WebSocketServer({ server, path: "/live-ws" });

wss.on("connection", async (clientWs: WebSocket) => {
  console.log("[LiveWS] Client connected to DocentAI Live");

  let liveSession: any = null;
  let isSessionActive = false;

  const cleanupSession = () => {
    if (liveSession) {
      try {
        liveSession.close();
      } catch (e) {
        // ignore
      }
      liveSession = null;
      isSessionActive = false;
    }
  };

  try {
    const ai = getGeminiClient();

    // Tools definition for Gemini 3.8 Live
    const createInfographicDeclaration = {
      name: "createInfographic",
      description: "Genera en segundo plano una infografía o esquema visual explicativo con Nano Banana para el panel de artefactos lateral.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Título breve y descriptivo de la infografía" },
          prompt: { type: Type.STRING, description: "Prompt visual detallado para Nano Banana (diagrama conceptual, estética limpia, infografía moderna)" },
          conceptSummary: { type: Type.STRING, description: "Resumen pedagógico del concepto que clarifica" },
          style: { type: Type.STRING, description: "Estilo: 'infographic', 'schematic', 'architecture', 'flowchart'" },
        },
        required: ["title", "prompt", "conceptSummary"],
      },
    };

    const createCodeSnippetDeclaration = {
      name: "createCodeSnippet",
      description: "Crea una pieza de código explicativa interactiva en el panel de artefactos para que el alumno entienda el algoritmo o fórmula.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Título del artefacto de código" },
          language: { type: Type.STRING, description: "Lenguaje (python, javascript, typescript, etc.)" },
          code: { type: Type.STRING, description: "Código educativo, comentado y conciso" },
          explanation: { type: Type.STRING, description: "Explicación paso a paso de su funcionamiento" },
          runnable: { type: Type.BOOLEAN, description: "Si se puede ejecutar directamente en el navegador" },
        },
        required: ["title", "language", "code", "explanation"],
      },
    };

    const changeSlideDeclaration = {
      name: "changeSlide",
      description: "Navega a una diapositiva específica de la presentación del estudiante.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          targetSlideNumber: { type: Type.INTEGER, description: "Número de la diapositiva a mostrar (1-indexed)" },
          reason: { type: Type.STRING, description: "Por qué se cambia a esta diapositiva" },
        },
        required: ["targetSlideNumber"],
      },
    };

    const createConceptCardDeclaration = {
      name: "createConceptCard",
      description: "Crea una tarjeta de repaso en el panel lateral con definiciones, analogías del mundo real y puntos clave.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Nombre del concepto" },
          analogy: { type: Type.STRING, description: "Analogía intuitiva del mundo real" },
          keyPoints: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Puntos clave" },
          formula: { type: Type.STRING, description: "Fórmula o regla mnemotécnica" },
        },
        required: ["title", "analogy", "keyPoints"],
      },
    };

    // Connect to Gemini 3.8 Live
    liveSession = await ai.live.connect({
      model: "gemini-3.8-live",
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Zephyr" },
          },
        },
        systemInstruction: `Eres DocentAI, un profesor y tutor universitario experto en docencia interactiva con Gemini 3.8 Live.
El estudiante está viendo una presentación en PDF diapositiva a diapositiva.
Tus capacidades y misión:
1. Explica cada diapositiva con voz natural, dinamismo pedagógico y claridad, respondiendo a las preguntas de voz del alumno en tiempo real.
2. CAPACIDAD DE SIMULTANEAR TAREAS EN SEGUNDO PLANO:
   - Si el estudiante te pide una infografía, un diagrama o una ilustración visual (o si te das cuenta de que un esquema visual aceleraría su aprendizaje), INVOCA la herramienta 'createInfographic'. Esto la mandará a Nano Banana en segundo plano sin interrumpir tu explicación oral.
   - Si el tema involucra algoritmos, implementación o código, INVOCA 'createCodeSnippet' para proyectar el código en el panel lateral de artefactos.
   - Si el estudiante te dice "siguiente diapositiva", "ve a la diapositiva 3" o quieres guiarlo a otra diapositiva, INVOCA 'changeSlide'.
   - También puedes crear tarjetas resumen con 'createConceptCard'.
3. Los artefactos creados aparecen en un panel lateral. El alumno puede interactuar y hacerte preguntas específicas sobre ellos en cualquier momento.
4. Mantén una actitud empática, didáctica, motivadora y clara en español. Sé conciso al hablar para dar espacio a la interacción continua del alumno.`,
        tools: [
          {
            functionDeclarations: [
              createInfographicDeclaration,
              createCodeSnippetDeclaration,
              changeSlideDeclaration,
              createConceptCardDeclaration,
            ],
          },
        ],
      },
      callbacks: {
        onmessage: async (message: LiveServerMessage) => {
          if (clientWs.readyState !== WebSocket.OPEN) return;

          // 1. Audio stream chunks from Gemini Live
          const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
          if (audio) {
            clientWs.send(JSON.stringify({ type: "audio", data: audio }));
          }

          // 2. Interruption event
          if (message.serverContent?.interrupted) {
            clientWs.send(JSON.stringify({ type: "interrupted" }));
          }

          // 3. Tool Calls (simultaneous multitasking!)
          const functionCalls = (message as any).toolCall?.functionCalls;
          if (functionCalls && functionCalls.length > 0) {
            for (const call of functionCalls) {
              const args = call.args || {};
              console.log("[LiveWS] Gemini invoked tool:", call.name, args);

              if (call.name === "createInfographic") {
                const artifactId = "infographic-" + Date.now();

                // Notify client that Nano Banana is working in the background
                clientWs.send(
                  JSON.stringify({
                    type: "artifact_generating",
                    artifact: {
                      id: artifactId,
                      type: "infographic",
                      title: args.title || "Infografía en curso",
                      prompt: args.prompt,
                      conceptSummary: args.conceptSummary,
                      status: "generating",
                      createdAt: new Date().toISOString(),
                    },
                  })
                );

                // Acknowledge tool to Gemini Live so conversation continues smoothly
                try {
                  await liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          output: {
                            status: "in_progress",
                            message: `La infografía '${args.title}' se está generando con Nano Banana en segundo plano. Puedes continuar explicando al alumno.`,
                          },
                        },
                      },
                    ],
                  });
                } catch (toolErr) {
                  console.warn("sendToolResponse note:", toolErr);
                }

                // Execute image generation asynchronously in background
                (async () => {
                  try {
                    let imageUrl: string | null = null;
                    let svg: string | null = null;

                    try {
                      const imgRes = await ai.models.generateContent({
                        model: "gemini-3.1-flash-lite-image",
                        contents: {
                          parts: [
                            {
                              text: `Clean aesthetic educational infographic diagram: ${args.prompt}. Topic: ${args.title}. Professional color palette, high contrast, clear diagrammatic blocks and connections.`,
                            },
                          ],
                        },
                        config: {
                          imageConfig: { aspectRatio: "16:9" },
                        },
                      });

                      for (const part of imgRes.candidates?.[0]?.content?.parts || []) {
                        if (part.inlineData?.data) {
                          imageUrl = `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
                          break;
                        }
                      }
                    } catch (e: any) {
                      console.warn("Nano Banana fallback to SVG diagram:", e?.message);
                      const svgPrompt = `Create an educational SVG infographic diagram for: "${args.title}".
Concept: ${args.conceptSummary || args.prompt}.
Clean modern SVG diagram with viewBox="0 0 800 450", high contrast, rounded cards, arrows, legible labels.
Return ONLY raw <svg> code.`;

                      const svgRes = await ai.models.generateContent({
                        model: "gemini-3.8-flash",
                        contents: svgPrompt,
                      });
                      const raw = svgRes.text?.trim() || "";
                      const cleaned = raw.replace(/```xml/g, "").replace(/```svg/g, "").replace(/```/g, "").trim();
                      if (cleaned.startsWith("<svg")) {
                        svg = cleaned;
                      }
                    }

                    if (clientWs.readyState === WebSocket.OPEN) {
                      clientWs.send(
                        JSON.stringify({
                          type: "artifact_completed",
                          artifact: {
                            id: artifactId,
                            type: "infographic",
                            title: args.title,
                            prompt: args.prompt,
                            conceptSummary: args.conceptSummary,
                            style: args.style || "infographic",
                            imageUrl,
                            svg,
                            status: "ready",
                            createdAt: new Date().toISOString(),
                          },
                        })
                      );
                    }
                  } catch (bgErr) {
                    console.error("Background infographic error:", bgErr);
                  }
                })();
              } else if (call.name === "createCodeSnippet") {
                const artifactId = "code-" + Date.now();
                const artifact = {
                  id: artifactId,
                  type: "code",
                  title: args.title,
                  language: args.language || "python",
                  code: args.code,
                  explanation: args.explanation,
                  runnable: Boolean(args.runnable),
                  status: "ready",
                  createdAt: new Date().toISOString(),
                };

                clientWs.send(
                  JSON.stringify({
                    type: "artifact_completed",
                    artifact,
                  })
                );

                try {
                  await liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          output: {
                            status: "created",
                            message: `Pieza de código '${args.title}' mostrada con éxito en el panel lateral de artefactos.`,
                          },
                        },
                      },
                    ],
                  });
                } catch (toolErr) {
                  console.warn("sendToolResponse error:", toolErr);
                }
              } else if (call.name === "changeSlide") {
                clientWs.send(
                  JSON.stringify({
                    type: "slide_change",
                    targetSlideNumber: args.targetSlideNumber,
                    reason: args.reason,
                  })
                );

                try {
                  await liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          output: {
                            status: "slide_changed",
                            currentSlide: args.targetSlideNumber,
                          },
                        },
                      },
                    ],
                  });
                } catch (toolErr) {
                  console.warn("sendToolResponse error:", toolErr);
                }
              } else if (call.name === "createConceptCard") {
                const artifactId = "concept-" + Date.now();
                const artifact = {
                  id: artifactId,
                  type: "concept",
                  title: args.title,
                  analogy: args.analogy,
                  keyPoints: args.keyPoints || [],
                  formula: args.formula,
                  status: "ready",
                  createdAt: new Date().toISOString(),
                };

                clientWs.send(
                  JSON.stringify({
                    type: "artifact_completed",
                    artifact,
                  })
                );

                try {
                  await liveSession.sendToolResponse({
                    functionResponses: [
                      {
                        id: call.id,
                        name: call.name,
                        response: {
                          output: {
                            status: "created",
                            message: `Tarjeta de concepto '${args.title}' agregada al panel lateral.`,
                          },
                        },
                      },
                    ],
                  });
                } catch (toolErr) {
                  console.warn("sendToolResponse error:", toolErr);
                }
              }
            }
          }
        },
      },
    });

    isSessionActive = true;
    clientWs.send(
      JSON.stringify({
        type: "session_ready",
        model: "gemini-3.8-live",
        status: "connected",
      })
    );
  } catch (err: any) {
    console.error("[LiveWS] Failed to connect to Gemini 3.8 Live:", err);
    clientWs.send(
      JSON.stringify({
        type: "session_error",
        message: err.message || "Failed to initialize Gemini 3.8 Live session",
      })
    );
  }

  // Handle messages from client
  clientWs.on("message", async (data) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === "audio" && parsed.data && liveSession && isSessionActive) {
        // Stream 16kHz PCM audio to Gemini Live
        liveSession.sendRealtimeInput({
          audio: {
            data: parsed.data,
            mimeType: "audio/pcm;rate=16000",
          },
        });
      } else if (parsed.type === "slide_context" && liveSession && isSessionActive) {
        // Provide slide image / text update to Gemini Live
        if (parsed.image) {
          const mime = parsed.image.substring(5, parsed.image.indexOf(";"));
          const base64 = parsed.image.substring(parsed.image.indexOf(",") + 1);
          liveSession.sendRealtimeInput({
            video: {
              data: base64,
              mimeType: mime || "image/jpeg",
            },
          });
        }
        if (parsed.text) {
          liveSession.sendRealtimeInput({
            text: `[Contexto de Diapositiva ${parsed.slideNumber}]: ${parsed.text}`,
          });
        }
      } else if (parsed.type === "text" && parsed.text && liveSession && isSessionActive) {
        // Text message sent to Live session
        liveSession.sendRealtimeInput({
          text: parsed.text,
        });
      } else if (parsed.type === "artifact_context" && liveSession && isSessionActive) {
        // Student is referencing a specific artifact
        liveSession.sendRealtimeInput({
          text: `[El alumno está consultando sobre el artefacto]: "${parsed.artifactTitle}" (${parsed.artifactType}): ${parsed.summary || ""}`,
        });
      }
    } catch (e) {
      console.error("[LiveWS] Error parsing client message:", e);
    }
  });

  clientWs.on("close", () => {
    console.log("[LiveWS] Client disconnected");
    cleanupSession();
  });

  clientWs.on("error", (err) => {
    console.error("[LiveWS] WebSocket error:", err);
    cleanupSession();
  });
});

// Vite Middleware & Static Serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`DocentAI Live Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
