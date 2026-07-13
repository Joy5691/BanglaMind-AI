export enum AssistantMode {
  GENERAL = "GENERAL",
  STUDENT = "STUDENT",
  PROGRAMMING = "PROGRAMMING",
  RESEARCH = "RESEARCH",
  AGRICULTURE = "AGRICULTURE",
  GOVERNMENT = "GOVERNMENT",
  HEALTH = "HEALTH",
  BUSINESS = "BUSINESS"
}

export enum KnowledgeCategory {
  GOVERNMENT = "GOVERNMENT",
  EDUCATION = "EDUCATION",
  AGRICULTURE = "AGRICULTURE",
  HEALTHCARE = "HEALTHCARE",
  LAWS = "LAWS",
  TECHNOLOGY = "TECHNOLOGY",
  LOCAL = "LOCAL"
}

export interface Document {
  id: string;
  title: string;
  size: string;
  type: string;
  isPreseeded: boolean;
  uploadTime: string;
  wordCount: number;
}

export interface RAGChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarity?: number;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
  citations?: string[];
  confidence?: number; // score from 0 to 100
  retrievedChunks?: RAGChunk[];
  detectedLang?: string; // "Bangla" | "English" | "Banglish" | "Unknown"
  latencyMs?: number;
  tokensUsed?: number;
  rating?: "up" | "down";
}

export interface PerformanceStats {
  avgLatency: number;
  totalTokens: number;
  accuracyScore: number;
  retrievalPrecision: number;
  embeddingQuality: number;
  hallucinationRate: number;
  totalQuestions: number;
  documentCount: number;
  history?: Array<{
    query: string;
    avgLatency: number;
    tokens: number;
    precision: number;
    similarity: number;
    accuracyScore: number;
  }>;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}
