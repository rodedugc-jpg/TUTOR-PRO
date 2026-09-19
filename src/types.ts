export interface Slide {
  id: string;
  pageNumber: number;
  title: string;
  subtitle?: string;
  bulletPoints: string[];
  diagramSvg?: string;
  imageUrl?: string;
  codeSnippet?: {
    language: string;
    code: string;
  };
  notes?: string;
  formula?: string;
}

export interface Presentation {
  id: string;
  title: string;
  description: string;
  author: string;
  totalSlides: number;
  isCustomPdf?: boolean;
  slides: Slide[];
}

export type ArtifactType = "infographic" | "code" | "concept";

export interface BaseArtifact {
  id: string;
  type: ArtifactType;
  title: string;
  status: "generating" | "ready" | "error";
  createdAt: string;
  relatedSlideNumber?: number;
}

export interface InfographicArtifact extends BaseArtifact {
  type: "infographic";
  prompt: string;
  conceptSummary: string;
  imageUrl?: string | null;
  svg?: string | null;
  style?: string;
  modelUsed?: string;
}

export interface CodeArtifact extends BaseArtifact {
  type: "code";
  language: string;
  code: string;
  explanation: string;
  runnable: boolean;
  expectedOutput?: string;
  userExecutionOutput?: string;
}

export interface ConceptArtifact extends BaseArtifact {
  type: "concept";
  analogy: string;
  keyPoints: string[];
  formula?: string;
}

export type Artifact = InfographicArtifact | CodeArtifact | ConceptArtifact;

export type LiveConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "listening"
  | "speaking"
  | "thinking"
  | "error";

export interface ConversationTurn {
  id: string;
  sender: "user" | "teacher" | "system";
  text: string;
  timestamp: string;
  relatedSlide?: number;
  artifactRefId?: string;
}
