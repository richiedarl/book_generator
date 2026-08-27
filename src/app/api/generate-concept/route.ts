import { NextRequest, NextResponse } from "next/server";
import { anthropicClient } from "@/lib/anthropic/client";
import { getConceptPrompt, CONCEPT_SYSTEM_PROMPT } from "@/lib/prompts/concept-prompt";
import { BookConcept } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, audience, notes, chapterCount } = body;

    if (!topic) {
      return NextResponse.json(
        { error: "Missing required field: topic" },
        { status: 400 }
      );
    }

    const prompt = getConceptPrompt(topic, audience, notes, chapterCount);

    const result = await anthropicClient.callClaude(
      CONCEPT_SYSTEM_PROMPT,
      [{ role: "user", content: prompt }],
      4000 // Increased limit for concept + outline
    );

    // Strip any markdown fences
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
