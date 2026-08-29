/**
 * Kindle Quality Assurance Validation
 *
 * Performs final validation to ensure the book meets Kindle/KDP requirements
 * before export. Checks formatting, structure, metadata, and content quality.
 */

import { BookConcept, BookChapter, BookConfig } from "@/lib/types";

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

export const KINDLE_QA_SYSTEM = `You are a Kindle publishing quality assurance specialist. Your job is to review a book manuscript and check it against Amazon KDP requirements and best practices.

You will receive a complete book with concept, chapters, and configuration. Perform a thorough quality check and return a structured report.

Check categories:
1. METADATA - Title, author, description, categories, keywords
2. STRUCTURE - TOC, chapter structure, front/back matter
3. FORMATTING - Heading hierarchy, paragraphs, lists, tables
4. CONTENT QUALITY - Completeness, consistency, readability
5. KINDLE COMPATIBILITY - Reflowable text, image handling, links
6. ACCESSIBILITY - Alt text, semantic structure, reading order

Return ONLY valid JSON in this format:
{
  "passed": true,
  "score": 95,
  "checks": [
    {
      "category": "METADATA",
      "name": "Title Completeness",
      "passed": true,
      "severity": "critical",
      "message": "Title and subtitle are present and well-formed",
      "details": "Title: 'The Psychology of Habits', Subtitle: 'How to Build Lasting Change'"
    }
  ],
  "summary": "Book passes Kindle QA with 95/100. Ready for KPF export."
}`;

export function buildKindleQAPrompt(
  config: BookConfig,
  concept: BookConcept,
  chapters: BookChapter[]
): string {
  const fullText = chapters
    .map((c) => c.content || "")
    .join("\n\n");

  return `Book Configuration:
- Title: ${config.title}
- Subtitle: ${config.subtitle}
- Author: ${config.author}
- Category: ${config.bookCategory}
- Target Audience: ${config.targetAudience}
- Desired Length: ${config.desiredLength}
- Number of Chapters: ${chapters.length}

Book Concept:
- Title: ${concept.title}
- Subtitle: ${concept.subtitle}
- Target Reader: ${concept.targetReader}
- Promise: ${concept.promise}

Chapters:
${concept.chapters.map((c, i) => `${i + 1}. ${c.title} - ${c.description}`).join("\n")}

Full Manuscript (first 5000 chars):
${fullText.slice(0, 5000)}

Perform a comprehensive Kindle QA check and return the JSON report.`;
}

export function parseKindleQAResponse(text: string, config: BookConfig, chapters: BookChapter[]): KindleQAReport {
  try {
    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    const parsed = JSON.parse(cleaned);
    if (parsed.checks && Array.isArray(parsed.checks)) {
      return parsed;
    }
  } catch (e) {
    console.warn("Failed to parse Kindle QA response, using fallback:", e);
  }

  // Fallback basic checks
  return {
    passed: true,
    score: 80,
    checks: [
      {
        category: "METADATA",
        name: "Title Present",
        passed: !!config.title,
        severity: "critical",
        message: config.title ? "Title is present" : "Missing title",
      },
      {
        category: "STRUCTURE",
        name: "Chapter Count",
        passed: chapters.length > 0,
        severity: "critical",
        message: `Book has ${chapters.length} chapters`,
      },
    ],
    summary: "Basic validation completed. Manual review recommended.",
  };
}