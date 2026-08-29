/**
 * TypeScript types for the Psychology Book Builder application.
 */

export interface BookConcept {
  title: string;
  subtitle: string;
  targetReader: string;
  promise: string;
  chapters: BookChapterMeta[];
}

export interface BookChapterMeta {
  title: string;
  description: string;
}

export interface Chapter {
  id: number;
  title: string;
  description: string;
  content: string | null;
  status: "drafted" | "not-started";
}

export type ChapterStatus = "drafted" | "not-started";

export interface BookState {
  // Input fields
  topic: string;
  audience: string;
  notes: string;

  // Concept / outline
  concept: BookConcept | null;

  // Chapter content keyed by chapter index
  chapterContent: Record<number, string>;

  // The currently active chapter (index)
  activeChapter: number;

  // UI state
  isDeveloping: boolean;
  developError: string | null;

  // The id used in dynamic route /book/[id]
  bookId: string | null;
}

// === Extended types for The Shelf ===

export interface BookConfig {
  title: string;
  subtitle: string;
  author: string;
  topic: string;
  subject: string;
  genre: string;
  bookCategory: string;
  targetAudience: string;
  ageRange: string;
  readingLevel: string;
  buyerType: string;
  tone: string;
  writingStyle: string;
  desiredLength: string;
  numberOfChapters: number;
  chapterTitles?: string[];
  educationalGoals: string;
  emotionalGoals: string;
  visualStyle: string;
  fontPreference: string;
  fontSize: string;
  pageSize: string;
  additionalInstructions: string;
  referenceMaterial?: string;
  specializedCategory: string;
  // Features
  imageGeneration: {
    enabled: boolean;
    provider: "none" | "gemini" | "nano-banana";
  };
  numberOfImages: number;
  translateTo?: string[];
  // Attachments
  attachments?: Attachment[];
  // Access token for authenticated book generation
  accessToken?: string;
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content?: string; // For text-based files
  base64?: string; // For images
}

export interface ImageInstruction {
  id: string;
  placement: 'cover' | 'chapter-start' | 'inline';
  chapterIndex?: number;
  purpose: string;
  description: string;
  visualStyle: string;
  aspectRatio: string;
  prompt: string;
  state: 'planned' | 'ready' | 'generating' | 'generated' | 'failed';
  imageUrl?: string;
  error?: string;
  retryCount: number;
}

export interface BookChapter extends BookChapterMeta {
  content: string | null;
  images: BookImage[];
  status: 'not-started' | 'generating' | 'drafted' | 'edited';
  imageInstructions?: ImageInstruction[];
}

export type BookStatus = 'config' | 'concept' | 'writing' | 'generating' | 'editing' | 'formatting' | 'export' | 'ready' | 'error';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobStage {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  message?: string;
}

export interface BookJob {
  id: string;
  status: JobStatus;
  stages: JobStage[];
  bookId: string;
  startedAt: number;
  completedAt?: number;
  error?: string;
}

export interface BookChapter extends BookChapterMeta {
  content: string | null;
  images: BookImage[];
  status: 'not-started' | 'generating' | 'drafted' | 'edited';
}

export interface BookImage {
  id: string;
  url: string; // /api/images/[id] or blob URL
  prompt: string;
  alt: string;
  placement: 'cover' | 'chapter-start' | 'inline';
  chapterIndex?: number;
}

export interface BookMetadata {
  title: string;
  subtitle: string;
  author: string;
  description: string;
  keywords: string[];
  categories: string[];
  language: string;
  wordCount: number;
  chapterCount: number;
  imageCount: number;
}

export interface QualityIssue {
  category: 'invention' | 'overclaim' | 'diagnosis' | 'jargon' | 'repetition' | 'structure' | 'age-appropriateness' | 'other';
  severity: 'low' | 'medium' | 'high';
  location: string;
  description: string;
  suggestion: string;
}

export interface QualityReport {
  score: number;
  issues: QualityIssue[];
  summary: string;
}

export interface ExportFormat {
  format: 'epub' | 'docx' | 'pdf' | 'kpf';
  status: 'available' | 'generating' | 'ready' | 'failed';
  url?: string;
  error?: string;
}

export interface Translation {
  language: string;
  languageCode: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  content: string | null;
  error?: string;
}

export interface Book {
  id: string;
  config: BookConfig;
  concept: BookConcept | null;
  chapters: BookChapter[];
  metadata: BookMetadata | null;
  qualityReport: QualityReport | null;
  kindleQAReport?: KindleQAReport;
  exports: ExportFormat[];
  translations: Record<string, Translation>;
  imageInstructions?: ImageInstruction[];
  createdAt: number;
  updatedAt: number;
}

export interface KindleQAReport {
  passed: boolean;
  score: number;
  checks: KindleQACheck[];
  summary: string;
}

export interface KindleQACheck {
  category: string;
  name: string;
  passed: boolean;
  severity: "critical" | "warning" | "info";
  message: string;
  details?: string;
}

export const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'Arabic' },
  { code: 'zh', name: 'Chinese (Simplified)' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ko', name: 'Korean' },
  { code: 'hi', name: 'Hindi' },
] as const;
