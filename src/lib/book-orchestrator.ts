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
import { buildKindleQAPrompt, parseKindleQAResponse, KindleQAReport, KINDLE_QA_SYSTEM } from "@/lib/prompts/kindle-qa";
import { BookConfig, BookConcept, BookChapter, QualityReport, BookImage, ImageInstruction } from "@/lib/types";
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

    // Stage 3: Generate Image Instructions (Claude creates prompts for all images)
    onProgress({ type: "stage", stage: "Image Planning", status: "running" });
    const imageInstructions = await generateImageInstructions(config, concept, chapters, config.numberOfImages || 0, onProgress);
    onProgress({ type: "stage_complete", stage: "Image Planning" });

    // Stage 4: Image Generation (optional - controlled by config.imageGeneration)
    let images: BookImage[] = [];
    if (config.imageGeneration?.enabled && (config.imageGeneration?.provider === "gemini" || config.imageGeneration?.provider === "nano-banana")) {
      onProgress({ type: "stage", stage: "Image Generation", status: "running" });
      try {
        const { generateBookImages } = await import("@/lib/image-generation");
        images = await generateBookImages(concept, chapters, config.visualStyle, imageInstructions, onProgress as any);
        onProgress({ type: "stage_complete", stage: "Image Generation" });
      } catch (imgErr: any) {
        // Don't fail the whole job — images are optional
        onProgress({ type: "stage", stage: "Image Generation", status: "failed" });
        onProgress({ type: "stage_complete", stage: "Image Generation" });
      }
    }

    // Stage 5: Editing / QA
    onProgress({ type: "stage", stage: "Editing / QA", status: "running" });
    const qualityReport = await runQualityCheck(concept, chapters);
    onProgress({ type: "quality", qualityReport });
    onProgress({ type: "stage_complete", stage: "Editing / QA" });

    // Stage 6: Formatting
    onProgress({ type: "stage", stage: "Formatting", status: "running" });
    const formattedChapters = await formatChapters(concept, chapters, images);
    onProgress({ type: "stage_complete", stage: "Formatting" });

    // Stage 7: Kindle QA Validation
    onProgress({ type: "stage", stage: "Kindle QA", status: "running" });
    const kindleQAReport = await runKindleQA(config, concept, formattedChapters);
    onProgress({ type: "stage_complete", stage: "Kindle QA" });

    // Stage 8: Export
    onProgress({ type: "stage", stage: "Export", status: "running" });
    const exports = await generateExports(concept, formattedChapters, config, onProgress);
    onProgress({ type: "stage_complete", stage: "Export" });

    // Complete
    const book = {
      config,
      concept,
      chapters: formattedChapters,
      images,
      imageInstructions,
      qualityReport,
      kindleQAReport,
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

async function generateImageInstructions(
  config: BookConfig,
  concept: BookConcept,
  chapters: BookChapter[],
  numImages: number,
  onProgress: ProgressCallback
): Promise<ImageInstruction[]> {
  // If no images requested, return empty array
  if (numImages <= 0) {
    return [];
  }

  const prompt = buildImageInstructionsPrompt(config, concept, chapters, numImages);

  const result = await anthropicClient.callClaude(
    MASTER_SYSTEM + "\n\n" + IMAGE_INSTRUCTIONS_SYSTEM,
    [{ role: "user", content: prompt }],
    6000
  );

  try {
    const cleaned = result.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (parsed.imageInstructions && Array.isArray(parsed.imageInstructions)) {
      return parsed.imageInstructions.map((inst: any, idx: number) => ({
        ...inst,
        id: inst.id || `img_${idx + 1}`,
        state: "planned" as const,
        retryCount: 0,
      }));
    }
  } catch (e) {
    console.warn("Failed to parse image instructions, using fallback:", e);
  }

  // Fallback: generate basic instructions
  return generateFallbackImageInstructions(config, concept, chapters, numImages);
}

const IMAGE_INSTRUCTIONS_SYSTEM = `You are a book art director and visual strategist. Your job is to create detailed image generation instructions for a book's illustrations.

You will receive the book concept, chapter content, and the number of images needed. You must create a JSON array of image instructions that will be sent to an image generation model (Gemini).

Each image instruction must include:
- id: unique identifier (e.g., "cover", "ch1_1", "ch2_1")
- placement: "cover" | "chapter-start" | "inline"
- chapterIndex: number (0-based chapter index, null for cover)
- purpose: what this image should communicate or achieve
- description: detailed visual description of the scene
- visualStyle: the artistic style (e.g., "educational diagram", "warm watercolor", "clean minimal line art")
- aspectRatio: "1:1" | "3:4" | "4:3" | "16:9"
- prompt: the complete prompt to send to the image generation model

For cover images: Create a compelling cover concept that represents the book's theme.
For chapter-start images: Create an illustration that introduces or represents the chapter's main concept.
For inline images: Create educational diagrams, charts, or scenes that clarify specific concepts.

The prompts should be detailed, specific, and optimized for AI image generation.
Respond ONLY with valid JSON in this format:
{
  "imageInstructions": [
    {
      "id": "cover",
      "placement": "cover",
      "chapterIndex": null,
      "purpose": "Main book cover artwork",
      "description": "Detailed visual description...",
      "visualStyle": "professional book cover style",
      "aspectRatio": "3:4",
      "prompt": "Complete prompt for image generation..."
    }
  ]
}`;

function buildImageInstructionsPrompt(
  config: BookConfig,
  concept: BookConcept,
  chapters: BookChapter[],
  numImages: number
): string {
  const chapterSummaries = chapters.map((ch, i) =>
    `Chapter ${i + 1}: "${ch.title}"\nSummary: ${ch.description}\nContent preview: ${(ch.content || "").slice(0, 500)}...`
  ).join("\n\n");

  const imagesPerChapter = Math.max(1, Math.floor(numImages / chapters.length));
  const coverImage = 1; // Always reserve 1 for cover
  const remainingImages = numImages - coverImage;

  return `Book: "${concept.title}" — ${concept.subtitle}
Author: ${config.author}
Target Audience: ${concept.targetReader}
Category: ${config.bookCategory}
Visual Style Preference: ${config.visualStyle || "warm, inviting, semi-realistic illustration style"}
Total Images Needed: ${numImages} (1 cover + ${remainingImages} chapter illustrations)

Chapter Details:
${chapterSummaries}

Create ${numImages} image instructions:
1. 1 cover image
2. ${remainingImages} chapter illustrations (approximately ${imagesPerChapter} per chapter)

Respond with valid JSON only.`;
}

function generateFallbackImageInstructions(
  config: BookConfig,
  concept: BookConcept,
  chapters: BookChapter[],
  numImages: number
): ImageInstruction[] {
  const instructions: ImageInstruction[] = [];

  // Cover image
  instructions.push({
    id: "cover",
    placement: "cover",
    chapterIndex: undefined,
    purpose: "Main book cover artwork representing the book's theme",
    description: `Professional book cover for "${concept.title}". ${concept.subtitle}. Symbolic imagery related to the book's subject.`,
    visualStyle: "professional book cover, clean composition, space for title overlay",
    aspectRatio: "3:4",
    prompt: `Book cover illustration for "${concept.title}". Subtitle: "${concept.subtitle}". Target audience: ${concept.targetReader}. Visual style: professional book cover, clean composition with space for text overlay. No text in image.`,
    state: "planned",
    retryCount: 0,
  });

  // Chapter images
  const remainingImages = numImages - 1;
  let imgIndex = 1;

  for (let i = 0; i < chapters.length && imgIndex <= remainingImages; i++) {
    const ch = chapters[i];
    const content = ch.content || "";

    // Generate 1-2 images per chapter
    const count = Math.min(2, remainingImages - imgIndex + 1);

    for (let j = 0; j < count && imgIndex <= remainingImages; j++) {
      instructions.push({
        id: `ch${i + 1}_${j + 1}`,
        placement: j === 0 ? "chapter-start" : "inline",
        chapterIndex: i,
        purpose: j === 0 ? `Chapter ${i + 1} opening illustration` : `Inline illustration for Chapter ${i + 1}`,
        description: `Illustration for "${ch.title}". Key concept: ${ch.description}`,
        visualStyle: config.visualStyle || "warm, inviting, semi-realistic illustration style",
        aspectRatio: "4:3",
        prompt: `An illustrative scene for Chapter ${i + 1}: "${ch.title}" in the book "${concept.title}". Key concepts: ${ch.description}. Visual style: ${config.visualStyle || "warm, inviting, semi-realistic illustration style"}. Do not include any text.`,
        state: "planned",
        retryCount: 0,
      });
      imgIndex++;
    }
  }

  return instructions;
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

async function runKindleQA(
  config: BookConfig,
  concept: BookConcept,
  chapters: BookChapter[]
): Promise<KindleQAReport> {
  const prompt = buildKindleQAPrompt(config, concept, chapters);

  const result = await anthropicClient.callClaude(
    MASTER_SYSTEM + "\n\n" + KINDLE_QA_SYSTEM,
    [{ role: "user", content: prompt }],
    4000
  );

  return parseKindleQAResponse(result.text, config, chapters);
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
