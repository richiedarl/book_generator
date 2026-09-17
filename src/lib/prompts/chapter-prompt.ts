import { BookConcept, BookConfig } from '../types';
import { MASTER_SYSTEM } from './master-system';

export function getChapterPrompt(
  concept: BookConcept,
  chapterIndex: number,
  config?: BookConfig
): { system: string; user: string } {
  const chapter = concept.chapters[chapterIndex];

  const priorTitles = concept.chapters
    .slice(0, chapterIndex)
    .map((x, idx) => `${idx + 1}. ${x.title}`)
    .join('\n');

  const userPrompt = `Book: "${concept.title}" — ${concept.subtitle}
Reader: ${concept.targetReader}
Book's promise: ${concept.promise}
Desired length: ${config?.desiredLength || 'Use a substantial, appropriately paced chapter.'}
Themes to carry through the manuscript: ${config?.themes || 'Choose themes that fit the book promise.'}
Chapter subtitles: ${config?.chapterSubtitles ? 'Include a concise subtitle for this chapter.' : 'Do not add a chapter subtitle.'}

${priorTitles
    ? 'Chapters already covered earlier in the book (avoid repeating their lessons or examples):\n' + priorTitles
    : 'This is the first chapter of the book.'
  }

Now write this chapter in full:
Chapter ${chapterIndex + 1}: "${chapter.title}"
What it should cover: ${chapter.description}

Write the complete chapter text (roughly 900-1400 words), ready for the manuscript. Do not include the chapter title as a heading — start directly with the prose. Do not add meta-commentary about the writing itself.`;

  return {
    system: MASTER_SYSTEM,
    user: userPrompt,
  };
}
