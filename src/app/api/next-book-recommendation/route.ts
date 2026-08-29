/**
 * Next Book Recommendation API Route
 *
 * Generates recommendations for the user's next book based on their
 * just-completed book, using the same topics, audience, and style.
 */

import { NextRequest, NextResponse } from "next/server";
import { anthropicClient } from "@/lib/anthropic/client";
import { MASTER_SYSTEM } from "@/lib/prompts/master-system";
import { BookConcept, BookConfig } from "@/lib/types";

const NEXT_BOOK_SYSTEM = `You are a book strategist and publishing consultant. Based on a completed book, you suggest compelling follow-up book ideas that build on the author's expertise, audience, and success.

Generate 3-5 distinct book ideas that would be natural next steps for this author. Each should:
1. Leverage the same audience and authority
2. Explore a related but distinct angle
3. Have clear market potential
4. Be specific and actionable

Return ONLY valid JSON in this format:
{
  "recommendations": [
    {
      "title": "Compelling book title",
      "subtitle": "Clear subtitle explaining the promise",
      "rationale": "Why this is a great follow-up to their previous book",
      "targetAudience": "Specific audience description",
      "keyTopics": ["topic1", "topic2", "topic3"],
      "estimatedLength": "Short/Medium/Long",
      "category": "Category name"
    }
  ]
}`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { concept, config, chapterTitles }: { concept: BookConcept; config: BookConfig; chapterTitles: string[] } = body;

    if (!concept || !config) {
      return NextResponse.json({ error: "Missing required fields: concept, config" }, { status: 400 });
    }

    // Check that Anthropic API key is configured
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
        { error: "Claude API key not configured" },
        { status: 503 }
      );
    }

    const prompt = buildRecommendationPrompt(concept, config, chapterTitles);

    const result = await anthropicClient.callClaude(
      MASTER_SYSTEM + "\n\n" + NEXT_BOOK_SYSTEM,
      [{ role: "user", content: prompt }],
      4000
    );

    try {
      const cleaned = result.text
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/```\s*$/, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      if (parsed.recommendations && Array.isArray(parsed.recommendations)) {
        return NextResponse.json({ success: true, recommendations: parsed.recommendations });
      }
    } catch (e) {
      console.warn("Failed to parse recommendations:", e);
    }

    // Fallback: basic recommendations
    return NextResponse.json({
      success: true,
      recommendations: generateFallbackRecommendations(concept, config),
    });
  } catch (err: any) {
    console.error("Next book recommendation error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate recommendations" },
      { status: 500 }
    );
  }
}

function buildRecommendationPrompt(concept: BookConcept, config: BookConfig, chapterTitles: string[]): string {
  return `Previous Book:
- Title: "${concept.title}"
- Subtitle: "${concept.subtitle}"
- Category: ${config.bookCategory}
- Target Reader: ${concept.targetReader}
- Promise: ${concept.promise}
- Chapters: ${chapterTitles.join(", ")}
- Author: ${config.author}
- Tone: ${config.tone}
- Writing Style: ${config.writingStyle}

Based on this completed book, suggest 3-5 compelling follow-up book ideas that would naturally build on this author's expertise and audience. Each should be a distinct, marketable concept.

Return valid JSON only.`;
}

function generateFallbackRecommendations(concept: BookConcept, config: BookConfig) {
  const baseTopics = concept.title.toLowerCase();
  return [
    {
      title: `Advanced ${concept.title}`,
      subtitle: `Deep-dive strategies for readers who mastered the fundamentals`,
      rationale: `Readers who completed "${concept.title}" will want to go deeper. This advanced guide builds directly on the foundation you've established.`,
      targetAudience: `${concept.targetReader} ready for advanced implementation`,
      keyTopics: ["Advanced techniques", "Real-world case studies", "Troubleshooting common challenges"],
      estimatedLength: config.desiredLength || "Medium",
      category: config.bookCategory,
    },
    {
      title: `${concept.title}: The Workbook`,
      subtitle: `Practical exercises and templates to apply every concept`,
      rationale: `A companion workbook transforms your book from passive reading to active transformation — highly requested by readers.`,
      targetAudience: `${concept.targetReader} who want hands-on practice`,
      keyTopics: ["Step-by-step exercises", "Reflection prompts", "Progress tracking tools"],
      estimatedLength: "Short",
      category: config.bookCategory,
    },
    {
      title: `${concept.title} for ${config.targetAudience?.split(" ")[0] || "Beginners"}`,
      subtitle: `A tailored adaptation for a specific audience segment`,
      rationale: `Your core concepts can be adapted for a specific niche within your audience, opening a new market segment.`,
      targetAudience: `Specific subset of ${concept.targetReader}`,
      keyTopics: ["Tailored examples", "Segment-specific challenges", "Customized action plans"],
      estimatedLength: "Short",
      category: config.bookCategory,
    },
  ];
}