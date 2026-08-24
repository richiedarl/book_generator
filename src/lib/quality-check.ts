import { QualityReport, QualityIssue, Book } from './types';

/**
 * Quality checks for generated manuscript content
 * Ensures psychological accuracy and structural integrity
 */

// Patterns that suggest invented studies, citations, or diagnoses
const HALLUCINATION_PATTERNS = [
  { pattern: /study (found|showed|revealed|indicated|found that)/gi, category: 'fabricated-study' },
  { pattern: /\b\d+\s*(participants?|subjects?)\b/gi, category: 'fabricated-stats' },
  { pattern: /\b(f\.e\.|et al\.|p\.p\.)/gi, category: 'fake-citation' },
  { pattern: /\b(American Psychological Association|APA)\s+(study|journal)/gi, category: 'fake-citation' },
  { pattern: /\b(diagnos(?:ed|is))\s+(?:him|her|you|people)/gi, category: 'improper-diagnosis' },
  { pattern: /\b(proves?|proven)\s+that\s+a\s+(behavior|action|trait)/gi, category: 'overclaiming' },
  { pattern: /\b(statistically significant|effect size)\b/gi, category: 'fabricated-stats' },
  { pattern: /\b(p<0\.|p\s*=\s*0\.)\d/gi, category: 'fabricated-stats' },
];

// Patterns to check for common filler phrases
const FILLER_PATTERNS = [
  { pattern: /In today's fast-paced world/gi, category: 'filler' },
  { pattern: /It's no secret that/gi, category: 'filler' },
  { pattern: /At the end of the day/gi, category: 'filler' },
  { pattern: /When it comes to/gi, category: 'filler' },
  { pattern: /This raises the question/gi, category: 'filler' },
];

export function runQualityCheck(book: Book): QualityReport {
  const issues: QualityIssue[] = [];
  const fullText = book.chapters.map(c => c.content).join('\n\n');

  // Check for hallucinated studies / citations
  for (const { pattern, category } of HALLUCINATION_PATTERNS) {
    const matches = fullText.match(pattern);
    if (matches && matches.length > 0) {
      issues.push({
        severity: category === 'improper-diagnosis' ? 'high' : 'medium',
        category: `hallucination:${category}`,
        message: `Potentially invented ${category.replace('-', ' ')}: "${matches[0]}"`,
      });
    }
  }

  // Check for filler phrases (warning only)
  for (const { pattern, category } of FILLER_PATTERNS) {
    const matches = fullText.match(pattern);
    if (matches && matches.length > 0) {
      issues.push({
        severity: 'low',
        category: `filler:${category}`,
        message: `Overused filler phrase: "${matches[0]}"`,
      });
    }
  }

  // Check for repetitive phrases within and across chapters
  const repetitionIssues = checkRepetition(book.chapters);
  issues.push(...repetitionIssues);

  // Check for proper structure
  const structureIssues = checkStructure(book);
  issues.push(...structureIssues);

  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  const score = Math.max(0, 100 - (highCount * 20 + mediumCount * 10 + lowCount * 2));

  return {
    passed: highCount === 0,
    issues,
    score,
  };
}

function checkRepetition(chapters: any[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  // Check for same opening phrase repeated across chapters
  const openers = chapters.map(c => c.content.substring(0, 100).toLowerCase().slice(0, 30));
  const uniqueOpeners = new Set(openers);
  if (uniqueOpeners.size < openers.length / 2) {
    issues.push({
      severity: 'low',
      category: 'repetition',
      message: 'Multiple chapters start with very similar phrases',
    });
  }

  // Check for repeated phrases within each chapter
  for (const chapter of chapters) {
    const words = chapter.content.toLowerCase().split(/\s+/);
    const phraseCount: Record<string, number> = {};

    for (let i = 0; i < words.length - 3; i++) {
      const phrase = words.slice(i, i + 4).join(' ');
      phraseCount[phrase] = (phraseCount[phrase] || 0) + 1;
    }

    const repeated = Object.entries(phraseCount).filter(([, count]) => count as number > 2);
    if (repeated.length > 5) {
      issues.push({
        severity: 'medium',
        category: 'repetition',
        message: `Chapter "${chapter.title}" has multiple phrases repeated 3+ times`,
      });
    }
  }

  return issues;
}

function checkStructure(book: Book): QualityIssue[] {
  const issues: QualityIssue[] = [];

  if (!book.concept.title || book.concept.title.trim().length < 10) {
    issues.push({
      severity: 'high',
      category: 'structure:title',
      message: 'Book title is missing or too short',
    });
  }

  if (book.chapters.length < 5) {
    issues.push({
      severity: 'high',
      category: 'structure:chapters',
      message: `Only ${book.chapters.length} chapters — minimum is 5`,
    });
  }

  for (const ch of book.chapters) {
    if (!ch.content || ch.content.trim().length < 200) {
      issues.push({
        severity: 'high',
        category: 'structure:chapter-length',
        message: `Chapter "${ch.title}" has insufficient content (under 200 words)`,
      });
    }
  }

  return issues;
}

export function generateQualityReportSummary(report: QualityReport): string {
  if (report.issues.length === 0) {
    return '✅ All quality checks passed! Great job.';
  }

  const bySeverity = report.issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let summary = `Quality Score: ${report.score}/100\n\n`;
  if (bySeverity.high) summary += `⚠️ ${bySeverity.high} high-priority issues\n`;
  if (bySeverity.medium) summary += `⚡ ${bySeverity.medium} medium-priority issues\n`;
  if (bySeverity.low) summary += `ℹ️ ${bySeverity.low} low-priority issues\n`;

  if (report.passed) {
    summary += '\n✅ No critical issues. Book is ready for export.';
  } else {
    summary += '\n⚠️ Please fix high-priority issues before exporting.';
  }

  return summary;
}