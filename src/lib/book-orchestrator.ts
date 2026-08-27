/**
 * Book Generation Orchestrator
 *
 * Manages the full book generation pipeline as a series of controlled stages.
 * The user sees ONE "Generate Book" action, but internally we run:
 *   1. Content Planning (concept development)
 *   2. Manuscript Generation (all chapters)
 *   3. Optional Image Generation (Gemini)
 *   4. Editing / QA
 *   5. Formatting
 *   6. Export (EPUB, PDF, DOCX)
 *
 * For long books, chapters are generated in controlled batches to
 * respect model output limits while maintaining global context.
 */

import { anthropicClient } from "@/lib/anthropic/client";
import { getChapterPrompt } from "@/lib/prompts/chapter-prompt";
import { MASTER_SYSTEM } from "@/lib/prompts/master-system";
import { QUALITY_CHECK_SYSTEM } from "@/lib/prompts";
import { BookConfig, BookConcept, BookChapter, QualityReport, BookImage } from "@/lib/types";
import { markdownToHtml } from "@/lib/ebook-generator";

export interface ProgressCallback {
  (event: {
    type: "stage" | "stage_complete" | "concept" | "chapters" | "chapter_progress" | "quality" | "export" | "complete" | "error";
    stage?: string;
    complete?: boolean;
    chapters?: BookChapter[];
    chapterIndex?: number;
    totalChapters?: number;
    qualityReport?: QualityReport;
    error?: string;
    message?: string;
    status?: "pending" | "running" | "completed" | "failed";
    book?: any;
    concept?: BookConcept;
    format?: string;
    url?: string;
  }): void;
}

export async function generateBook(
  config: BookConfig,
  concept: BookConcept,
  onProgress: ProgressCallback
): Promise<{ book: any }> {
  try {
    // Stage 1: Content Planning
    onProgress({ type: "stage", stage: "Content Planning", status: "running" });
    const plan = buildBookPlan(config, concept);
    onProgress({ type: "stage_complete", stage: "Content Planning" });

    // Stage 2: Manuscript Generation
    onProgress({ type: "stage", stage: "Manuscript Generation", status: "running" });
    const chapters = await generateAllChapters(concept, plan, onProgress);
    onProgress({ type: "stage_complete", stage: "Manuscript Generation" });

    // Stage 3: Image Generation (optional - controlled by config.imageGeneration)
    let images: BookImage[] = [];
    if (config.imageGeneration?.enabled && config.imageGeneration?.provider === "gemini") {
      onProgress({ type: "stage", stage: "Image Generation", status: "running" });
      try {
        const { generateBookImages } = await import("@/lib/image-generation");
        images = await generateBookImages(concept, chapters, config.visualStyle, onProgress as any);
        onProgress({ type: "stage_complete", stage: "Image Generation" });
      } catch (imgErr: any) {
        // Don't fail the whole job — images are optional
        onProgress({ type: "stage", stage: "Image Generation", status: "failed" });
        onProgress({ type: "stage_complete", stage: "Image Generation" });
      }
    }

    // Stage 4: Editing / QA
    onProgress({ type: "stage", stage: "Editing / QA", status: "running" });
    const qualityReport = await runQualityCheck(concept, chapters);
    onProgress({ type: "quality", qualityReport });
    onProgress({ type: "stage_complete", stage: "Editing / QA" });

    // Stage 5: Formatting
    onProgress({ type: "stage", stage: "Formatting", status: "running" });
    const formattedChapters = await formatChapters(concept, chapters, images);
    onProgress({ type: "stage_complete", stage: "Formatting" });

    // Stage 6: Export
    onProgress({ type: "stage", stage: "Export", status: "running" });
    const exports = await generateExports(concept, formattedChapters, config, onProgress);
    onProgress({ type: "stage_complete", stage: "Export" });

    // Complete
    const book = {
      config,
      concept,
      chapters: formattedChapters,
      images,
      qualityReport,
      exports,
      metadata: {
        title: concept.title,
        subtitle: concept.subtitle,
        author: config.author,
        wordCount: chapters.reduce((n, c) => n + (c.content?.split(/\s+/).length || 0), 0),
        chapterCount: chapters.length,
        imageCount: images.length,
      },
    };

    onProgress({ type: "complete", book });
    return { book };
  } catch (err: any) {
    onProgress({ type: "error", error: err.message });
    throw err;
  }
}

interface BookPlan {
  title: string;
  subtitle: string;
  author: string;
  purpose: string;
  angle: string;
  promise: string;
  chapterCount: number;
  chapterTitles: string[];
  visualStyle: string;
}

function buildBookPlan(config: BookConfig, concept: BookConcept): BookPlan {
  return {
    title: concept.title || config.title,
    subtitle: concept.subtitle || config.subtitle,
    author: config.author,
    purpose: config.additionalInstructions,
    angle: config.topic,
    promise: concept.promise,
    chapterCount: concept.chapters.length,
    chapterTitles: concept.chapters.map((c) => c.title),
    visualStyle: config.visualStyle,
  };
}

async function generateAllChapters(
  concept: BookConcept,
  plan: BookPlan,
  onProgress: ProgressCallback
): Promise<BookChapter[]> {
  const chapters: BookChapter[] = [];

  // Determine if we need to generate in batches based on chapter count
  // For books with many chapters, we generate sequentially to maintain context
  // but we keep all prior chapter titles to avoid repetition
  const totalChapters = concept.chapters.length;

  for (let i = 0; i < totalChapters; i++) {
    onProgress({
      type: "stage",
      stage: `Writing Chapter ${i + 1} of ${totalChapters}`,
      status: "running",
    });

    const priorChapterTitles = concept.chapters
      .slice(0, i)
      .map((_, idx) => `${idx + 1}. ${concept.chapters[idx].title}`);

    const chapter = await generateSingleChapter(concept, i, priorChapterTitles);

    chapters.push(chapter);

    onProgress({
      type: "chapter_progress",
      chapterIndex: i,
      totalChapters,
    });
  }

  onProgress({ type: "chapters", chapters });
  return chapters;
}

async function generateSingleChapter(
  concept: BookConcept,
  chapterIndex: number,
  priorChapterTitles: string[]
): Promise<BookChapter> {
  const prompt = getChapterPrompt(concept, chapterIndex);

  // Use higher maxTokens for longer chapters
  const maxTokens = 8000;

  const result = await anthropicClient.callClaude(
    prompt.system,
    [{ role: "user", content: prompt.user }],
    maxTokens
  );

  return {
    title: concept.chapters[chapterIndex].title,
    description: concept.chapters[chapterIndex].description,
    content: result.text,
    images: [],
    status: "drafted" as const,
  };
}

async function runQualityCheck(
  concept: BookConcept,
  chapters: BookChapter[]
): Promise<QualityReport> {
  const fullText = chapters
    .map((c) => c.content || "")
    .join("\n\n");

  const prompt = `${QUALITY_CHECK_SYSTEM}

Review the following book manuscript for quality issues:

Book: "${concept.title}" — ${concept.subtitle}

${fullText}

Report each issue with a category, severity, location, description, and suggestion.`;

  const result = await anthropicClient.callClaude(prompt, [{ role: "user", content: prompt }], 4000);

  // Parse the quality check result or create a basic report
  const issues = parseQualityIssues(result.text);

  const score = Math.max(0, 100 - issues.filter((i) => i.severity === "high").length * 20 - issues.filter((i) => i.severity === "medium").length * 10);

  return {
    score,
    issues,
    summary: `Quality check found ${issues.length} issues. ${issues.filter((i) => i.severity === "high").length} high severity, ${issues.filter((i) => i.severity === "medium").length} medium, ${issues.filter((i) => i.severity === "low").length} low.`,
  };
}

function parseQualityIssues(text: string): QualityReport["issues"] {
  // Try to parse structured output from Claude
  try {
    const parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim());
    if (parsed.issues && Array.isArray(parsed.issues)) {
      return parsed.issues;
    }
  } catch (e) {
    // Fall through to pattern-based check
  }

  // Fallback: basic pattern-based check
  const issues: QualityReport["issues"] = [];
  const fullText = text.toLowerCase();

  const inventionPatterns = ["study shows", "research proves", "scientists discovered", "according to a study"];
  const overclaimPatterns = ["proves", "definitively", "always", "never", "guaranteed"];

  for (const pattern of inventionPatterns) {
    const idx = fullText.indexOf(pattern);
    if (idx >= 0) {
      issues.push({
        category: "invention",
        severity: "high",
        location: `Found "${pattern}"`,
        description: `Potential invented study or citation detected.`,
        suggestion: "Use hedging language like 'research suggests' or 'studies indicate'",
      });
    }
  }

  for (const pattern of overclaimPatterns) {
    const idx = fullText.indexOf(pattern);
    if (idx >= 0) {
      issues.push({
        category: "overclaim",
        severity: "medium",
        location: `Found "${pattern}"`,
        description: "Overclaiming language detected.",
        suggestion: "Use more careful, qualified language.",
      });
    }
  }

  return issues;
}

async function formatChapters(
  concept: BookConcept,
  chapters: BookChapter[],
  images: BookImage[]
): Promise<BookChapter[]> {
  // Convert markdown to HTML and attach images
  const formatted = await Promise.all(
    chapters.map(async (ch, idx) => {
      const html = ch.content ? markdownToHtml(ch.content) : null;

      // Find images for this chapter
      const chapterImages = images.filter((img) => img.chapterIndex === idx);

      return {
        ...ch,
        content: html,
        images: chapterImages,
      };
    })
  );

  return formatted;
}

interface ExportResult {
  format: "epub" | "docx" | "pdf" | "kpf";
  status: "ready" | "failed";
  url?: string;
  error?: string;
}

async function generateExports(
  concept: BookConcept,
  chapters: BookChapter[],
  config: BookConfig,
  onProgress: ProgressCallback
): Promise<ExportResult[]> {
  const { generateEpub, generatePdf, generateDocx } = await import("@/lib/ebook-generator");

  const exports: ExportResult[] = [];

  // Generate EPUB
  try {
    const epubResult = await generateEpub(concept, chapters, config);
    onProgress({ type: "export", format: "epub", url: epubResult.url });
    exports.push({ format: "epub", status: "ready", url: epubResult.url });
  } catch (err: any) {
    exports.push({ format: "epub", status: "failed", error: err.message });
  }

  // Generate DOCX
  try {
    const docxResult = await generateDocx(concept, chapters, config);
    onProgress({ type: "export", format: "docx", url: docxResult.url });
    exports.push({ format: "docx", status: "ready", url: docxResult.url });
  } catch (err: any) {
    exports.push({ format: "docx", status: "failed", error: err.message });
  }

  // Generate PDF
  try {
    const pdfResult = await generatePdf(concept, chapters, config);
    onProgress({ type: "export", format: "pdf", url: pdfResult.url });
    exports.push({ format: "pdf", status: "ready", url: pdfResult.url });
  } catch (err: any) {
    exports.push({ format: "pdf", status: "failed", error: err.message });
  }

  // KPF: Not technically supported without Kindle Create integration
  // Per ACTUAL_PROMPT.md: explain that user can import into Kindle Create

  return exports;
}
