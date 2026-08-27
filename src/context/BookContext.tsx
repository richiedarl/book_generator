"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  BookConfig,
  BookConcept,
  BookStatus,
  BookChapter,
  Book as BookType,
  QualityReport,
  ExportFormat,
  JobStatus,
  JobStage,
} from "@/lib/types";

export interface BookContextState {
  // Book data
  book: BookType | null;
  config: BookConfig | null;
  concept: BookConcept | null;
  chapters: BookChapter[];
  activeChapter: number;
  status: BookStatus;

  // Job tracking
  jobStatus: JobStatus;
  jobStages: JobStage[];
  jobError: string | null;

  // Generation
  isGenerating: boolean;
  generationStage: string;
  generationError: string | null;

  // Gemini availability
  gemini: { configured: boolean; reachable: boolean; imageGenerationAvailable: boolean };

  // Export
  exportFormats: ExportFormat[];
  downloadUrls: Record<string, string>;

  // Quality
  qualityReport: QualityReport | null;

  // Google Drive
  driveStatus: { authorized: boolean; folderId?: string; folderUrl?: string; accessToken?: string; refreshToken?: string; expiresAt?: number } | null;

  // UI
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;
}

export interface BookContextActions {
  setConfig: (config: BookConfig) => void;
  setConcept: (concept: BookConcept) => void;
  setChapters: (chapters: BookChapter[]) => void;
  setActiveChapter: (index: number) => void;
  setStatus: (status: BookStatus) => void;
  setJobStatus: (status: JobStatus) => void;
  setJobStages: (stages: JobStage[]) => void;
  setJobError: (error: string | null) => void;
  setGenerating: (generating: boolean, stage?: string) => void;
  setGenerationError: (error: string | null) => void;
  setGeminiStatus: (status: { configured: boolean; reachable: boolean; imageGenerationAvailable: boolean }) => void;
  setExportFormats: (formats: ExportFormat[]) => void;
  setDownloadUrl: (format: string, url: string) => void;
  setQualityReport: (report: QualityReport | null) => void;
  setDriveStatus: (status: { authorized: boolean; folderId?: string; folderUrl?: string; accessToken?: string; refreshToken?: string; expiresAt?: number } | null) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  updateChapterContent: (index: number, content: string) => void;
  generateBook: (config: BookConfig, concept?: BookConcept | null) => Promise<void>;
  checkGeminiAvailability: () => Promise<void>;
  startNewBook: () => void;
}

const initialState: BookContextState = {
  book: null,
  config: null,
  concept: null,
  chapters: [],
  activeChapter: 0,
  status: "config",
  jobStatus: "pending",
  jobStages: [],
  jobError: null,
  isGenerating: false,
  generationStage: "",
  generationError: null,
  gemini: { configured: false, reachable: false, imageGenerationAvailable: false },
  exportFormats: [
    { format: "epub", status: "available" },
    { format: "pdf", status: "available" },
    { format: "docx", status: "available" },
  ],
  downloadUrls: {},
  qualityReport: null,
  driveStatus: null,
  isLoading: false,
  loadingMessage: "",
  error: null,
};

export const BookContext = createContext<{
  state: BookContextState;
  actions: BookContextActions;
}>({
  state: initialState,
  actions: {} as BookContextActions,
});

export function BookProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BookContextState>(initialState);

  const setConfig = useCallback((config: BookConfig) => {
    setState((s) => ({ ...s, config, status: "config" }));
  }, []);

  const setConcept = useCallback((concept: BookConcept) => {
    setState((s) => ({ ...s, concept, status: "concept" }));
  }, []);

  const setChapters = useCallback((chapters: BookChapter[]) => {
    setState((s) => ({ ...s, chapters }));
  }, []);

  const setActiveChapter = useCallback((index: number) => {
    setState((s) => ({ ...s, activeChapter: index }));
  }, []);

  const setStatus = useCallback((status: BookStatus) => {
    setState((s) => ({ ...s, status }));
  }, []);

  const setJobStatus = useCallback((jobStatus: JobStatus) => {
    setState((s) => ({ ...s, jobStatus }));
  }, []);

  const setJobStages = useCallback((jobStages: JobStage[]) => {
    setState((s) => ({ ...s, jobStages }));
  }, []);

  const setJobError = useCallback((jobError: string | null) => {
    setState((s) => ({ ...s, jobError }));
  }, []);

  const setGenerating = useCallback((isGenerating: boolean, stage = "") => {
    setState((s) => ({ ...s, isGenerating, generationStage: stage }));
  }, []);

  const setGenerationError = useCallback((generationError: string | null) => {
    setState((s) => ({ ...s, generationError }));
  }, []);

  const setGeminiStatus = useCallback((gemini: { configured: boolean; reachable: boolean; imageGenerationAvailable: boolean }) => {
    setState((s) => ({ ...s, gemini }));
  }, []);

  const setExportFormats = useCallback((exportFormats: ExportFormat[]) => {
    setState((s) => ({ ...s, exportFormats }));
  }, []);

  const setDownloadUrl = useCallback((format: string, url: string) => {
    setState((s) => ({
      ...s,
      downloadUrls: { ...s.downloadUrls, [format]: url },
    }));
  }, []);

  const setQualityReport = useCallback((qualityReport: QualityReport | null) => {
    setState((s) => ({ ...s, qualityReport }));
  }, []);

  const setDriveStatus = useCallback((driveStatus: { authorized: boolean; folderId?: string; folderUrl?: string; accessToken?: string; refreshToken?: string; expiresAt?: number } | null) => {
    setState((s) => ({ ...s, driveStatus }));
  }, []);

  const setLoading = useCallback((isLoading: boolean, loadingMessage = "") => {
    setState((s) => ({ ...s, isLoading, loadingMessage }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((s) => ({ ...s, error }));
  }, []);

  const updateChapterContent = useCallback((index: number, content: string) => {
    setState((s) => ({
      ...s,
      chapters: s.chapters.map((ch, i) =>
        i === index ? { ...ch, content, status: "drafted" } : ch
      ),
    }));
  }, []);

  const startNewBook = useCallback(() => {
    setState(initialState);
  }, []);

  const generateBook = useCallback(
    async (config: BookConfig, concept?: BookConcept | null) => {
      setState((s) => ({
        ...s,
        isGenerating: true,
        generationStage: "Preparing your book...",
        generationError: null,
        jobStatus: "processing",
        jobError: null,
        config,
        concept: concept ?? null,
        status: "generating",
      }));

      const stages: JobStage[] = [
        { name: "Content Planning", status: "pending" },
        { name: "Manuscript Generation", status: "pending" },
        { name: "Editing / QA", status: "pending" },
        { name: "Formatting", status: "pending" },
        { name: "Export", status: "pending" },
      ];

      setState((s) => ({ ...s, jobStages: stages }));

      try {
        const response = await fetch("/api/generate-book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config, concept }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${response.status})`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder("utf-8");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n\n");

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;

            const jsonStr = trimmed.slice(6).trim();
            if (!jsonStr) continue;

            let event: any;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            switch (event.type) {
              case "stage":
                setState((s) => ({ ...s, generationStage: event.stage || event.message || "" }));
                if (event.stage) {
                  setState((s) => ({
                    ...s,
                    jobStages: s.jobStages.map((st) =>
                      st.name === event.stage ? { ...st, status: event.status || "running" } : st
                    ),
                  }));
                }
                break;

              case "stage_complete":
                setState((s) => ({
                  ...s,
                  jobStages: s.jobStages.map((st) =>
                    st.name === event.stage ? { ...st, status: "completed" } : st
                  ),
                }));
                break;

              case "concept":
                setState((s) => ({
                  ...s,
                  concept: event.concept,
                  status: "concept",
                  generationStage: event.message || "Concept ready",
                }));
                break;

              case "chapters":
                setState((s) => ({
                  ...s,
                  chapters: event.chapters,
                  status: "editing",
                }));
                break;

              case "chapter_progress":
                setState((s) => ({
                  ...s,
                  generationStage: `Writing Chapter ${event.chapterIndex + 1} of ${event.totalChapters}`,
                }));
                break;

              case "quality":
                setState((s) => ({ ...s, qualityReport: event.qualityReport }));
                break;

              case "export":
                setState((s) => ({
                  ...s,
                  downloadUrls: { ...s.downloadUrls, [event.format]: event.url },
                  exportFormats: s.exportFormats.map((f) =>
                    f.format === event.format ? { ...f, status: "ready", url: event.url } : f
                  ),
                }));
                break;

              case "complete":
                setState((s) => ({
                  ...s,
                  isGenerating: false,
                  jobStatus: "completed",
                  jobError: null,
                  book: event.book || null,
                  concept: event.book?.concept || s.concept,
                  status: "ready",
                  generationStage: "",
                  chapters: (event.book?.chapters || s.chapters) as BookChapter[],
                  qualityReport: event.book?.qualityReport || s.qualityReport,
                  exportFormats: (event.book?.exports || s.exportFormats).map((e: any) => ({
                    format: e.format,
                    status: e.status === "ready" ? "ready" : "failed",
                    url: e.url,
                    error: e.error,
                  })),
                  downloadUrls: event.book?.exports?.reduce(
                    (acc: Record<string, string>, e: any) => {
                      if (e.url) acc[e.format] = e.url;
                      return acc;
                    },
                    { ...s.downloadUrls }
                  ) || s.downloadUrls,
                }));
                break;

              case "error":
                setState((s) => ({
                  ...s,
                  isGenerating: false,
                  jobStatus: "failed",
                  jobError: event.error || "An unknown error occurred",
                  generationError: event.error || null,
                  status: "error",
                }));
                throw new Error(event.error || "Generation failed");
                break;
            }
          }
        }
      } catch (err: any) {
        setState((s) => ({
          ...s,
          isGenerating: false,
          jobStatus: "failed",
          jobError: err.message || "An unexpected error occurred",
          generationError: err.message || null,
          status: "error",
        }));
      }
    },
    []
  );

  const checkGeminiAvailability = useCallback(async () => {
    try {
      const response = await fetch("/api/check-gemini");
      if (!response.ok) {
        setState((s) => ({ ...s, gemini: { configured: false, reachable: false, imageGenerationAvailable: false } }));
        return;
      }
      const data = await response.json();
      setState((s) => ({ ...s, gemini: data.gemini }));
    } catch {
      setState((s) => ({ ...s, gemini: { configured: false, reachable: false, imageGenerationAvailable: false } }));
    }
  }, []);

  const actions = {
    setConfig,
    setConcept,
    setChapters,
    setActiveChapter,
    setStatus,
    setJobStatus,
    setJobStages,
    setJobError,
    setGenerating,
    setGenerationError,
    setGeminiStatus,
    setExportFormats,
    setDownloadUrl,
    setQualityReport,
    setDriveStatus,
    setLoading,
    setError,
    updateChapterContent,
    generateBook,
    checkGeminiAvailability,
    startNewBook,
  };

  return (
    <BookContext.Provider value={{ state, actions }}>
      {children}
    </BookContext.Provider>
  );
}

export function useBook() {
  const context = useContext(BookContext);
  if (!context) {
    throw new Error("useBook must be used within a BookProvider");
  }
  return context;
}
