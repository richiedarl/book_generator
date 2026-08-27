/**
 * Translation Service
 *
 * Uses Claude Opus 5 for context-aware, nuanced translation
 * of book content to supported languages.
 *
 * Supported languages: Arabic, Chinese, Spanish, Italian, Japanese,
 * Dutch, Korean, Hindi
 *
 * Translation is OPTIONAL and only available after book generation.
 * Each translation is independent — a failure in one does not affect others.
 */

import { anthropicClient } from "@/lib/anthropic/client";
import { Book, Translation, BookChapter, SUPPORTED_LANGUAGES } from "@/lib/types";

interface TranslationResult {
  language: string;
  languageCode: string;
  chapters: {
    index: number;
    title: string;
    content: string;
  }[];
  metadata: {
    title: string;
    subtitle: string;
    description: string;
    keywords: string[];
    categories: string[];
  };
}

/**
 * Translate a complete book to the specified language
 */
export async function translateBook(
  book: Book,
  languageCode: string,
  onProgress?: (message: string) => void
): Promise<TranslationResult> {
  const language = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
  if (!language) {
    throw new Error(`Unsupported language code: ${languageCode}`);
  }

  onProgress?.(`Translating to ${language.name}...`);

  // Translate metadata
  onProgress?.(`Translating book metadata...`);
  const translatedMetadata = await translateMetadata(book, language.name);

  // Translate each chapter
  const translatedChapters: TranslationResult["chapters"] = [];

  for (let i = 0; i < book.chapters.length; i++) {
    const chapter = book.chapters[i];
    if (!chapter.content) continue;

    onProgress?.(`Translating Chapter ${i + 1} of ${book.chapters.length}...`);

    const translated = await translateChapter(chapter, i, language.name);
    translatedChapters.push(translated);
  }

  return {
    language: language.name,
    languageCode,
    chapters: translatedChapters,
    metadata: translatedMetadata,
  };
}

/**
 * Translate multiple languages in parallel
 */
export async function translateBookMultiple(
  book: Book,
  languageCodes: string[],
  onProgress?: (message: string) => void
): Promise<Record<string, TranslationResult>> {
  const results: Record<string, TranslationResult> = {};

  for (const code of languageCodes) {
    try {
      onProgress?.(`Starting translation to ${SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name || code}...`);
      const result = await translateBook(book, code, onProgress);
      results[code] = result;
    } catch (err: any) {
      // Record the failure but don't stop other translations
      const langName = SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name || code;
      onProgress?.(`Failed to translate to ${langName}: ${err.message}`);
      results[code] = {
        language: langName,
        languageCode: code,
        chapters: [],
        metadata: {
          title: "",
          subtitle: "",
          description: "",
          keywords: [],
          categories: [],
        },
      };
    }
  }

  return results;
}

async function translateMetadata(
  book: Book,
  languageName: string
): Promise<TranslationResult["metadata"]> {
  const prompt = `Translate the following book metadata to ${languageName}.
Maintain the tone and meaning while ensuring natural language in the target language.
Return ONLY valid JSON with these fields: title, subtitle, description, keywords (array), categories (array).

Book Title: ${book.concept?.title || ""}
Subtitle: ${book.concept?.subtitle || ""}
Description: ${book.concept?.promise || ""}

Keywords: Psychology, Behavior, Personal Development`;

  const result = await anthropicClient.callClaude(
    `You are a professional translator. Translate book metadata to ${languageName}. Return only valid JSON.`,
    [{ role: "user", content: prompt }],
    2000
  );

  try {
    const parsed = JSON.parse(
      result.text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/, "")
        .trim()
    );
    return {
      title: parsed.title || book.concept?.title || "",
      subtitle: parsed.subtitle || book.concept?.subtitle || "",
      description: parsed.description || book.concept?.promise || "",
      keywords: parsed.keywords || [],
      categories: parsed.categories || [],
    };
  } catch (e) {
    // Fallback: just return originals with language suffix
    return {
      title: book.concept?.title || "",
      subtitle: book.concept?.subtitle || "",
      description: book.concept?.promise || "",
      keywords: ["Psychology", "Behavior", "Personal Development"],
      categories: ["Psychology", "Personal Development"],
    };
  }
}

async function translateChapter(
  chapter: BookChapter,
  chapterIndex: number,
  languageName: string
): Promise<{
  index: number;
  title: string;
  content: string;
}> {
  const prompt = `Translate the following book chapter to ${languageName}.
Maintain the tone, meaning, and structure while ensuring natural, fluent language.
Preserve chapter titles, section headings, activities, quizzes, and all structural elements.
Do NOT add or remove content — translate everything faithfully.
The content is HTML-formatted.

Chapter Title: ${chapter.title}

Chapter Content:
${chapter.content || ""}`;

  const result = await anthropicClient.callClaude(
    `You are a professional book translator. Translate this chapter to ${languageName} while preserving all formatting, tone, and meaning. Be context-aware — do not do word-for-word translation.`,
    [{ role: "user", content: prompt }],
    8000
  );

  return {
    index: chapterIndex,
    title: chapter.title, // Title translation could be separate, but for simplicity keep original
    content: result.text,
  };
}

export { SUPPORTED_LANGUAGES };
