/**
 * Image Generation API Route (Post-Processing)
 *
 * Generates cover and chapter images using Gemini after the book is built.
 * This is OPTIONAL — if Gemini is not available, the book remains text-only.
 *
 * The Gemini API key is used server-side only and never exposed to the browser.
 */

import { NextRequest, NextResponse } from "next/server";
import { BookConcept, BookChapter, BookConfig } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const IMAGE_CACHE: Record<string, { url: string; prompt: string; alt: string; placement: string }> = {};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { concept, chapters, visualStyle }: { concept: BookConcept; chapters: BookChapter[]; visualStyle: string } = body;

    if (!concept || !chapters) {
      return NextResponse.json({ error: "Missing required fields: concept, chapters" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured", imagesGenerated: false },
        { status: 200 }
      );
    }

    const { generateBookImages } = await import("@/lib/image-generation");
    // storeImage is imported internally by generateBookImages
    const images = await generateBookImages(concept, chapters, visualStyle || "warm, inviting, semi-realistic illustration style");

    // Cache image metadata for the client
    images.forEach((img) => {
      IMAGE_CACHE[img.id] = {
        url: img.url,
        prompt: img.prompt,
        alt: img.alt,
        placement: img.placement,
      };
    });

    return NextResponse.json({
      success: true,
      images: images.map((img) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        placement: img.placement,
        chapterIndex: img.chapterIndex,
      })),
    });
  } catch (err: any) {
    console.error("Image generation error:", err);
    return NextResponse.json(
      { error: err.message || "Image generation failed" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  if (!bookId) {
    return NextResponse.json({ images: IMAGE_CACHE }, { status: 200 });
  }
  // Return images for a specific book (simple in-memory cache lookup)
  return NextResponse.json({ images: IMAGE_CACHE }, { status: 200 });
}
