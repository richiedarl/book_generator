/**
 * Book Generation API Route
 *
 * This endpoint runs the full book generation pipeline as a single job.
 * It streams progress events back to the client using Server-Sent Events (SSE).
 *
 * Pipeline stages:
 * 1. Content Planning (concept development from config)
 * 2. Manuscript Generation (all chapters in sequence)
 * 3. Optional Image Generation (Gemini)
 * 4. Editing / QA
 * 5. Formatting
 * 6. Export (EPUB, DOCX, PDF)
 */

import { NextRequest, NextResponse } from "next/server";
import { generateBook, ProgressCallback } from "@/lib/book-orchestrator";
import { BookConfig, BookConcept } from "@/lib/types";
import { anthropicClient } from "@/lib/anthropic/client";
import { MASTER_SYSTEM } from "@/lib/prompts/master-system";

const CONCEPT_PROMPT_SUFFIX = `You are a nonfiction book development editor. Your job is to take a book configuration and shape it into a compelling book concept with a clear structure. You respond only with valid JSON, nothing else.

You determine the number of chapters based on the topic, category/genre, target audience, desired length, writing style, and tone.

Chapter count guidance:
- Short books: 6-8 chapters
- Medium books: 9-12 chapters
- Long books: 12-16 chapters

Each chapter must contribute something distinct — no overlapping lessons.

If the title is empty, generate a compelling plain-language title.
If the subtitle is empty, generate a clarifying subtitle.
If the author is empty, use "Anonymous".

Respond ONLY with a raw JSON object, no markdown fences, no preamble, in exactly this shape:
{
  "title": "a compelling, plain-language book title",
  "subtitle": "a clarifying subtitle that communicates reader benefit",
  "targetReader": "one sentence describing who this book is for",
  "promise": "2-3 sentences describing what the reader will understand and be able to do by the end",
  "chapters": [
    {"title": "plain, curiosity-driven chapter title", "description": "one sentence on what this chapter covers and why it matters"}
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config, concept }: { config: BookConfig; concept?: BookConcept } = body;

    if (!config) {
      return NextResponse.json(
        { error: "Missing required field: config" },
        { status: 400 }
      );
    }

    // Check that Anthropic API key is configured before starting the pipeline
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const apiKeys = process.env.ANTHROPIC_API_KEYS;
    const authToken = process.env.ANTHROPIC_AUTH_TOKEN;
    const baseUrl = process.env.ANTHROPIC_BASE_URL;

    const hasKey =
      (apiKey && apiKey.trim().length > 0) ||
      (apiKeys && apiKeys.split(",").filter((k: string) => k.trim()).length > 0) ||
      (authToken && authToken.trim().length > 0 && baseUrl && baseUrl.trim().length > 0);

    if (!hasKey) {
      return NextResponse.json(
        {
          error:
            "Claude API key is not configured. Add ANTHROPIC_API_KEY (or ANTHROPIC_API_KEYS) to your environment variables. See .env.example for details.",
        },
        { status: 503 }
      );
    }

    // Set up SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    // Helper to send SSE events
    const emit = (event: any) => {
      const data = JSON.stringify(event);
      writer.write(encoder.encode(`data: ${data}\n\n`));
    };

    // Start the full pipeline in the background
    const pipeline = runFullPipeline(config, concept ?? null, emit);

    pipeline.then(() => {
      writer.close();
    }).catch((err: any) => {
      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({ type: "error", error: err.message })}\n\n`
        )
      );
      writer.close();
    });

    return new NextResponse(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Error starting book generation:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to start book generation" },
      { status: 500 }
    );
  }
}

async function runFullPipeline(
  config: BookConfig,
  initialConcept: BookConcept | null,
  onProgress: (event: any) => void
): Promise<void> {
  // Stage 1: Concept Generation (if not provided)
  let concept: BookConcept = initialConcept!;

  if (!initialConcept) {
    onProgress({ type: "stage", stage: "Content Planning", status: "running", message: "Planning your book..." });

    const prompt = buildConceptPrompt(config);

    const result = await anthropicClient.callClaude(
      MASTER_SYSTEM + "\n\n" + CONCEPT_PROMPT_SUFFIX,
      [{ role: "user", content: prompt }],
      6000
    );

    const cleaned = result.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    concept = JSON.parse(cleaned) as BookConcept;

    onProgress({ type: "stage_complete", stage: "Content Planning" });
    onProgress({
      type: "concept",
      concept,
      message: `Your book has been structured into ${concept.chapters.length} chapters.`,
    });
  }

  // Stages 2-6: Manuscript → Images → QA → Formatting → Export (via orchestrator)
  await generateBook(config, concept, onProgress);
}

function buildConceptPrompt(config: BookConfig): string {
  const parts: string[] = [];

  parts.push(`Book Topic / Subject: ${config.topic || config.subject}`);
  parts.push(`Category / Genre: ${config.bookCategory || config.genre}`);
  if (config.title) parts.push(`Working Title: ${config.title}`);
  if (config.subtitle) parts.push(`Working Subtitle: ${config.subtitle}`);
  if (config.author) parts.push(`Author: ${config.author}`);
  if (config.targetAudience) parts.push(`Target Audience: ${config.targetAudience}`);
  if (config.ageRange) parts.push(`Age Range: ${config.ageRange}`);
  if (config.readingLevel) parts.push(`Reading Level: ${config.readingLevel}`);
  if (config.writingStyle) parts.push(`Writing Style: ${config.writingStyle}`);
  if (config.tone) parts.push(`Tone: ${config.tone}`);
  if (config.desiredLength) parts.push(`Desired Length: ${config.desiredLength}`);
  if (config.additionalInstructions) parts.push(`Additional Guidance: ${config.additionalInstructions}`);

  if (config.numberOfChapters && config.numberOfChapters > 0) {
    parts.push(`Number of chapters requested: ${config.numberOfChapters}. Generate EXACTLY ${config.numberOfChapters} chapters.`);
  } else {
    parts.push("Claude should determine an appropriate number of chapters based on the topic, category, audience, and desired length.");
  }

  return parts.join("\n\n");
}
