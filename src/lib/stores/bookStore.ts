import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BookConcept, Chapter } from '../types';

export interface BookStoreState {
  // Book data
  id: string | null;
  concept: BookConcept | null;
  currentChapter: number;
  status: 'concept' | 'writing' | 'editing' | 'formatting' | 'ready' | 'error';

  // Chapter content (index → text)
  chapterContent: Record<number, string>;

  // UI state
  isLoading: boolean;
  loadingMessage: string;
  error: string | null;

  // Ebook
  ebookFormats: string[];
  downloadUrls: Record<string, string>;

  // Actions
  setId: (id: string) => void;
  setConcept: (concept: BookConcept) => void;
  setCurrentChapter: (index: number) => void;
  setStatus: (status: BookStoreState['status']) => void;
  setChapterContent: (index: number, content: string) => void;
  setChapterContentInline: (index: number, content: string) => void;
  setChapterStatus: (index: number, status: Chapter['status']) => void;
  setLoading: (loading: boolean, message?: string) => void;
  setError: (error: string | null) => void;
  setEbookFormats: (formats: string[]) => void;
  setDownloadUrl: (format: string, url: string) => void;
  reset: () => void;
}

export const useBookStore = create<BookStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      id: null,
      concept: null,
      currentChapter: 0,
      status: 'concept',
      chapterContent: {},
      isLoading: false,
      loadingMessage: '',
      error: null,
      ebookFormats: ['epub', 'pdf'],
      downloadUrls: {},

      // Actions
      setId: (id) => set({ id }),
      setConcept: (concept) => set({ concept, status: 'concept' }),
      setCurrentChapter: (index) => set({ currentChapter: index }),
      setStatus: (status) => set({ status }),

      setChapterContent: (index, content) => {
        const concept = get().concept;
        if (!concept) return;
        // Store chapter content in chapterContent map (BookStoreState pattern)
        get().setChapterContentInline(index, content);
      },

      setChapterContentInline: (index, content) => {
        set((state) => ({
          chapterContent: { ...state.chapterContent, [index]: content },
        }));
      },

      setChapterStatus: (index, status) => {
        // Track chapter status via chapterContent presence
        const hasContent = !!get().chapterContent[index];
        if (hasContent && status === "not-started") {
          const newContent = { ...get().chapterContent };
          delete newContent[index];
          set({ chapterContent: newContent });
        }
      },

      setLoading: (isLoading, message = '') => set({ isLoading, loadingMessage: message }),
      setError: (error) => set({ error }),
      setEbookFormats: (formats) => set({ ebookFormats: formats }),
      setDownloadUrl: (format, url) =>
        set((state) => ({
          downloadUrls: { ...state.downloadUrls, [format]: url }
        })),
      reset: () =>
        set({
          id: null,
          concept: null,
          currentChapter: 0,
          status: 'concept',
          chapterContent: {},
          isLoading: false,
          loadingMessage: '',
          error: null,
          ebookFormats: ['epub', 'pdf'],
          downloadUrls: {},
        }),
    }),
    {
      name: 'psychology-book-storage',
    }
  )
);
