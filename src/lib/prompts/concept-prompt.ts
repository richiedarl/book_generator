export function getConceptPrompt(
  topic: string,
  audience?: string,
  notes?: string,
  chapterCount?: number
): string {
  const targetChapters = chapterCount || 9;
  return `Working title or topic: ${topic}
${audience ? "Intended reader: " + audience : ""}
${notes ? "Additional guidance: " + notes : ""}
${chapterCount ? `Number of chapters requested: ${chapterCount}. Generate EXACTLY ${chapterCount} chapters.` : ""}

Develop this into a book concept for a nonfiction Kindle book, then create a chapter outline of ${chapterCount ? chapterCount : "9 to 12"} chapters that together fulfill the book's promise, each contributing something distinct (no overlapping lessons).

The number of chapters MUST exactly match the requested count of ${chapterCount || targetChapters}. Do not add or remove chapters.

Respond ONLY with a raw JSON object, no markdown fences, no preamble, in exactly this shape:
{
  "title": "a compelling, plain-language book title",
  "subtitle": "a clarifying subtitle",
  "targetReader": "one sentence describing who this book is for",
  "promise": "2-3 sentences describing what the reader will understand and be able to do by the end",
  "chapters": [
    {"title": "plain, curiosity-driven chapter title", "description": "one sentence on what this chapter covers and why it matters"}
  ]
}`;
}

export const CONCEPT_SYSTEM_PROMPT = `You are a nonfiction book development editor. You respond only with valid JSON, nothing else.`;
