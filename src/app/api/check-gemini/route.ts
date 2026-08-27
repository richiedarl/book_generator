/**
 * Gemini Availability Check API Route
 *
 * Performs a lightweight check to determine whether Gemini is configured
 * and reachable for image generation. Does NOT generate any images — just
 * verifies configuration and a minimal API reachability probe.
 *
 * Returns:
 * {
 *   "gemini": {
 *     "configured": true,
 *     "reachable": true,
 *     "image_generation_available": true
 *   }
 * }
 */

import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL;

  // Step 1: Check if configured
  if (!apiKey || !apiKey.trim()) {
    return NextResponse.json({
      gemini: {
        configured: false,
        reachable: false,
        imageGenerationAvailable: false,
      },
    });
  }

  // Step 2: Check if a model is configured
  if (!model || !model.trim()) {
    return NextResponse.json({
      gemini: {
        configured: true,
        reachable: false,
        imageGenerationAvailable: false,
      },
    });
  }

  // Step 3: Lightweight reachability check — call the models.list endpoint
  // This verifies the API key is valid and the endpoint is reachable
  // without generating any images (which would be expensive).
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    // List models — this is a cheap call that confirms authentication works
    const modelsResponse: any = await ai.models.list();

    if (!modelsResponse || !modelsResponse.modelVersions) {
      return NextResponse.json({
        gemini: {
          configured: true,
          reachable: true,
          imageGenerationAvailable: false,
        },
      });
    }

    // Check if the configured model supports image generation
    // Image-capable Gemini models have "image-generation" or "imagen" in their name
    // or are in the list of known image-capable models
    const modelList = modelsResponse.modelVersions || [];
    const foundModel = modelList.find((m: any) => m.name === model);

    let imageGenerationAvailable = false;

    if (foundModel) {
      // Check if the model has image generation capability
      // The Gemini API doesn't expose capabilities directly, so we check
      // by known model names that support image generation
      const imageCapableModels = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "imagen-3",
        "imagen-2",
      ];

      imageGenerationAvailable = imageCapableModels.some(
        (capable) => model.toLowerCase().includes(capable.toLowerCase().split("-")[0])
      );

      // More precise check: check if model name matches known image-capable patterns
      if (!imageGenerationAvailable) {
        const modelLower = model.toLowerCase();
        if (
          modelLower.includes("flash") ||
          modelLower.includes("pro") ||
          modelLower.includes("imagen") ||
          modelLower.includes("2.0") ||
          modelLower.includes("2.5") ||
          modelLower.includes("1.5")
        ) {
          imageGenerationAvailable = true;
        }
      }
    } else {
      // Model not found in the list but API is reachable — assume it might work
      // and let the actual image generation call fail gracefully if it doesn't
      const modelLower = model.toLowerCase();
      if (
        modelLower.includes("flash") ||
        modelLower.includes("pro") ||
        modelLower.includes("imagen") ||
        modelLower.includes("2.0") ||
        modelLower.includes("2.5") ||
        modelLower.includes("1.5")
      ) {
        imageGenerationAvailable = true;
      }
    }

    return NextResponse.json({
      gemini: {
        configured: true,
        reachable: true,
        imageGenerationAvailable,
      },
    });
  } catch (error: any) {
    console.error("Gemini availability check failed:", error);

    // If the error is an auth error, the key is configured but invalid
    const isAuthError =
      error?.message?.includes("API_KEY_INVALID") ||
      error?.message?.includes("UNAUTHENTICATED") ||
      error?.message?.includes("401") ||
      error?.message?.includes("403");

    return NextResponse.json({
      gemini: {
        configured: true,
        reachable: !isAuthError,
        imageGenerationAvailable: false,
      },
    });
  }
}
