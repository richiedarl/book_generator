// Shared TypeScript types for the Psychology Book Builder

export interface Chapter {
  index: number;
  title: string;
  description: string;
  content?: string;
  status: 'pending' | 'writing' | 'done' | 'error';
}

export interface BookConcept {
  title: string;
  subtitle: string;
  targetReader: string;
  promise: string;
  chapters: Chapter[];
}

export interface BookState {
  id: string;
  concept: BookConcept | null;
  createdAt: string;
  updatedAt: string;
  status: 'concept' | 'writing' | 'editing' | 'formatting' | 'ready' | 'error';
  currentChapter: number;
  ebookFormats?: string[];
  downloadUrl?: string;
}

export interface GenerateConceptRequest {
  topic: string;
  audience?: string;
  notes?: string;
}

export interface WriteChapterRequest {
  concept: BookConcept;
  chapterIndex: number;
  priorChapters: string[];
}

export interface BuildBookRequest {
  topic: string;
  audience?: string;
  notes?: string;
  ebookFormats: string[];
}

export interface ExportEbookRequest {
  bookData: {
    title: string;
    subtitle: string;
    targetReader: string;
    promise: string;
    chapters: Chapter[];
  };
  format: string;
}

export interface QualityCheckIssue {
  type: 'invented_study' | 'over_claim' | 'jargon' | 'diagnosis' | 'repetition' | 'other';
  description: string;
  suggestion: string;
  severity: 'low' | 'medium' | 'high';
}
