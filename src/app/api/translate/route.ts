/**
 * Translation API Route
 *
 * Handles translation of completed books to supported languages.
 * Translation is OPTIONAL and only available after book generation.
 *
 * Supported languages: Arabic, Chinese, Spanish, Italian, Japanese,
 * Dutch, Korean, Hindi
 */

import { NextRequest, NextResponse } from "next/server";
import { translateBook, translateBookMultiple, SUPPORTED_LANGUAGES } from "@/lib/translation";
import { Book } from "@/lib/types";

export async function GET(request: NextRequest) {
  // Return supported languages
  return NextResponse.json({ languages: SUPPORTED_LANGUAGES });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { book, languageCodes } = body;

    if (!book) {
      return NextResponse.json(
        { error: "Missing required field: book" },
        { status: 400 }
      );
    }

    if (!languageCodes || !Array.isArray(languageCodes) || languageCodes.length === 0) {
      return NextResponse.json(
        { error: "Missing or invalid field: languageCodes (must be a non-empty array)" },
        { status: 400 }
      );
    }

    // Validate language codes
    const validCodes = languageCodes.filter((code: string) =>
      SUPPORTED_LANGUAGES.some((l) => l.code === code)
    );

    if (validCodes.length === 0) {
      return NextResponse.json(
        { error: "None of the provided language codes are supported" },
        { status: 400 }
      );
    }

    // Translate to all requested languages
    const results = await translateBookMultiple(
      book as Book,
      validCodes,
      (message) => {
        console.log(`[Translation] ${message}`);
      }
    );

    const translations = Object.entries(results).map(([code, result]) => ({
      languageCode: code,
      languageName: SUPPORTED_LANGUAGES.find((l) => l.code === code)?.name || code,
      chapters: result.chapters,
      metadata: result.metadata,
      success: result.chapters.length > 0,
    }));

    return NextResponse.json({ translations });
  } catch (error: any) {
    console.error("Translation error:", error);
    return NextResponse.json(
      { error: error.message || "Translation failed" },
      { status: 500 }
    );
  }
}
