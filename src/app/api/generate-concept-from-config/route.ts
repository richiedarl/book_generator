/**
 * Concept Generation From Config API Route
 *
 * Generates a BookConcept (title, subtitle, promise, chapter outline)
 * from a BookConfig. This is the first stage of the book-generation pipeline.
 * The chapter count is determined by Claude based on topic, category,
 * audience, desired length, and writing style.
 */

import { NextRequest, NextResponse } from "next/server";
import { anthropicClient } from "@/lib/anthropic/client";
import { BookConfig, BookConcept } from "@/lib/types";
import { MASTER_SYSTEM } from "@/lib/prompts/master-system";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { config }: { config: BookConfig } = body;

    if (!config) {
      return NextResponse.json(
        { error: "Missing required field: config" },
        { status: 400 }
      );
    }

    const prompt = buildConceptPrompt(config);

    const result = await anthropicClient.callClaude(
      MASTER_SYSTEM + "\n\n" + CONCEPT_SYSTEM_PROMPT,
      [{ role: "user", content: prompt }],
      6000
    );

    const cleaned = result.text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    const concept: BookConcept = JSON.parse(cleaned);

    return NextResponse.json({ concept });
  } catch (error: any) {
    console.error("Error generating concept:", error);
    return NextResponse.json(
      { error: error.message ?? "Failed to generate concept" },
      { status: 500 }
    );
  }
}

const CONCEPT_SYSTEM_PROMPT = `You are a nonfiction book development editor. Your job is to take a book configuration and shape it into a compelling book concept with a clear structure. You respond only with valid JSON, nothing else.

You determine the number of chapters based on:
- The topic / subject
- The category / genre
- The target audience
- The desired length (short = fewer chapters, long = more chapters)
- The writing style and tone

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

function buildConceptPrompt(config: BookConfig): string {
  const parts: string[] = [];

  parts.push(`Book Topic / Subject: ${config.topic || config.subject}`);
  parts.push(`Category / Genre: ${config.bookCategory || config.genre}`);
  if (config.title) parts.push(`Working Title: ${config.title}`);
  if (config.subtitle) parts.push(`Working Subtitle: ${config.subtitle}`);
  if (config.author) parts.push(`Author: ${config.author}`);
  if (config.targetAudience) parts.push(`Target Audience: ${config.targetAudience}`);
  if (config.writingStyle) parts.push(`Writing Style: ${config.writingStyle}`);
  if (config.tone) parts.push(`Tone: ${config.tone}`);
  if (config.desiredLength) parts.push(`Desired Length: ${config.desiredLength}`);
  if (config.additionalInstructions) parts.push(`Additional Guidance: ${config.additionalInstructions}`);

  parts.push(`Age Range: ${config.ageRange || "(Claude will determine)"}`);
  parts.push(`Reading Level: ${config.readingLevel || "(Claude will determine)"}`);

  if (config.numberOfChapters && config.numberOfChapters > 0) {
    parts.push(`Number of chapters requested: ${config.numberOfChapters}. Generate EXACTLY ${config.numberOfChapters} chapters.`);
  } else {
    parts.push("Claude should determine an appropriate number of chapters based on the topic, category, audience, and desired length.");
  }

  return parts.join("\n\n");
}
