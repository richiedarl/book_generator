/**
 * Gemini Image Generation
 *
 * Uses Google Gemini for book cover and chapter image generation.
 * The API key is loaded from server-side environment variables only.
 */

import { BookConcept, BookChapter, BookImage, ImageInstruction } from "@/lib/types";
import { storeImage } from "@/app/api/images/[id]/route";
import { v4 as uuidv4 } from "uuid";

interface GeminiImageResult {
  url: string; // Download endpoint path
  base64: string;
  mimeType: string;
}

/**
 * Generate all book images (cover + chapter illustrations) using Claude's image instructions
 */
export async function generateBookImages(
  concept: BookConcept,
  chapters: BookChapter[],
  visualStyle: string,
  imageInstructions: ImageInstruction[],
  onProgress?: (event: { type: string; stage?: string; message?: string; instructionId?: string; state?: string }) => void
): Promise<BookImage[]> {
  const images: BookImage[] = [];

  if (!imageInstructions || imageInstructions.length === 0) {
    return images;
  }

  // Process each image instruction
  for (const instruction of imageInstructions) {
    try {
      onProgress?.({
        type: "stage",
        stage: `Image: ${instruction.id}`,
        message: `Generating ${instruction.placement} image...`,
        instructionId: instruction.id,
        state: "generating",
      });

      let image: BookImage;

      if (instruction.placement === "cover") {
        image = await generateImageFromInstruction(instruction, concept, visualStyle);
      } else {
        const chapterIndex = instruction.chapterIndex ?? 0;
        image = await generateImageFromInstruction(instruction, concept, visualStyle, chapters[chapterIndex]);
      }

      images.push(image);

      onProgress?.({
        type: "stage",
        stage: `Image: ${instruction.id}`,
        message: `Generated ${instruction.placement} image successfully`,
        instructionId: instruction.id,
        state: "generated",
      });
    } catch (err: any) {
      console.error(`Failed to generate image ${instruction.id}:`, err);
      onProgress?.({
        type: "stage",
        stage: `Image: ${instruction.id}`,
        message: `Failed to generate image: ${err.message}`,
        instructionId: instruction.id,
        state: "failed",
      });
      // Continue with other images
    }
  }

  return images;
}

/**
 * Generate an image from a specific instruction
 */
async function generateImageFromInstruction(
  instruction: ImageInstruction,
  concept: BookConcept,
  visualStyle: string,
  chapter?: BookChapter
): Promise<BookImage> {
  const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Use the prompt from the instruction (created by Claude)
  const prompt = instruction.prompt;

  const image = await callGeminiImageGeneration(prompt, modelName);
  const id = instruction.id || uuidv4();

  // Store the image for serving
  storeImage(id, image.base64, image.mimeType);

  return {
    id,
    url: `/api/images/${id}`,
    prompt,
    alt: instruction.description,
    placement: instruction.placement,
    chapterIndex: instruction.chapterIndex,
  };
}

function buildCoverPrompt(concept: BookConcept, visualStyle: string): string {
  const style = visualStyle || "warm, inviting, semi-realistic illustration style";
  return `Book cover illustration for a book titled "${concept.title}".
Subtitle: "${concept.subtitle}".
Target audience: ${concept.targetReader}.

Visual style: ${style}.
The cover should be professional and inviting, with space for text overlay.
Do not include any text in the image — just the artwork.
Composition: Centered focal area with warm, muted colors.
Include symbolic elements related to the book's subject matter.
-- No text, no words, no letters, no numbers.`;
}

function buildChapterImagePrompt(
  concept: BookConcept,
  chapter: BookChapter,
  chapterIndex: number,
  imageIndex: number,
  visualStyle: string
): string {
  // Extract key visual concepts from chapter content
  const content = chapter.content || "";
  const keyConcepts = extractKeyConcepts(content);
  const style = visualStyle || "warm, inviting, semi-realistic illustration style";

  const prompt = `An illustrative scene for a chapter in a book.
Book: "${concept.title}".
Chapter ${chapterIndex + 1}: "${chapter.title}"
Key concepts to illustrate: ${keyConcepts.join(", ")}.
Visual style: ${style}.
The scene should be relatable and help the reader understand the concept.
Do not include any text, titles, or labels in the image.`;

  return prompt;
}

function extractKeyConcepts(content: string): string[] {
  // Simple extraction of potential visual concepts
  const sentences = content.split(/[.!?]+/).filter((s) => s.length > 20);
  const visualKeywords = ["see", "imagine", "picture", "like", "example", "scene", "moment"];
  const concepts: string[] = [];

  for (const sentence of sentences.slice(0, 10)) {
    for (const kw of visualKeywords) {
      const idx = sentence.toLowerCase().indexOf(kw);
      if (idx >= 0) {
        const snippet = sentence.slice(idx, idx + 100).trim();
        if (snippet.length > 10 && !concepts.includes(snippet)) {
          concepts.push(snippet);
        }
      }
    }
  }

  return concepts.slice(0, 3);
}

function determineImageCount(chapter: BookChapter): number {
  const content = chapter.content || "";
  const length = content.length;

  // 1 image for short chapters, 2 for longer chapters
  if (length > 3000) return 2;
  return 1;
}

/**
 * Call Gemini API for image generation (text-to-image)
 */
async function callGeminiImageGeneration(
  prompt: string,
  modelName: string
): Promise<{ base64: string; mimeType: string }> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  // Use the official Google GenAI SDK
  const { GoogleGenAI } = await import("@google/genai");
  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  const response = await ai.models.generateImages({
    model: modelName,
    prompt: prompt,
    config: {
      numberOfImages: 1,
    },
  });

  if (!response || !response.generatedImages || response.generatedImages.length === 0) {
    throw new Error("No image generated by Gemini");
  }

  const generatedImage = response.generatedImages[0];
  if (!generatedImage.image || !generatedImage.image.imageBytes) {
    throw new Error("Gemini response does not contain image bytes");
  }

  return {
    base64: generatedImage.image.imageBytes,
    mimeType: generatedImage.image.mimeType || "image/png",
  };
}

export type { GeminiImageResult };
