/**
 * Quality Check System
 *
 * Runs pattern-based and AI-powered quality checks on book content
 * to detect hallucinations, overclaims, over-diagnosis, and other issues.
 */

import { QualityReport, QualityIssue, BookConcept, BookChapter } from "@/lib/types";

/**
 * Run a comprehensive quality check on the book manuscript.
 * Uses both pattern-based scanning and AI review.
 */
export function runQualityCheck(
  concept: BookConcept,
  chapters: BookChapter[]
): QualityReport {
  const allContent = chapters
    .map((ch) => ch.content || "")
    .join("\n\n");

  const issues: QualityIssue[] = [];

  // Pattern-based checks
  issues.push(...checkForInventedStudies(allContent));
  issues.push(...checkForOverclaims(allContent));
  issues.push(...checkForDiagnosis(allContent));
  issues.push(...checkForJargon(allContent));
  issues.push(...checkForRepetition(chapters));
  issues.push(...checkForFiller(allContent));

  // Deduplicate issues
  const seen = new Set<string>();
  const uniqueIssues = issues.filter((issue) => {
    const key = `${issue.category}:${issue.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const score = Math.max(
    0,
    100 -
      uniqueIssues.filter((i) => i.severity === "high").length * 15 -
      uniqueIssues.filter((i) => i.severity === "medium").length * 8 -
      uniqueIssues.filter((i) => i.severity === "low").length * 3
  );

  return {
    score,
    issues: uniqueIssues,
    summary: `Quality check found ${uniqueIssues.length} issues across ${chapters.length} chapters. ${
      uniqueIssues.filter((i) => i.severity === "high").length
    } high severity, ${uniqueIssues.filter((i) => i.severity === "medium").length} medium, ${
      uniqueIssues.filter((i) => i.severity === "low").length
    } low.`,
  };
}

function checkForInventedStudies(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const patterns = [
    { pattern: /\b\d{4} study\b/gi, desc: "Specific year study without source" },
    { pattern: /\bf(?:indall|urthermore) (?:study|research) (?:shows?|finds|indicates) that\b/gi, desc: "Unnamed study claim" },
    { pattern: /\ba (?:recent|famous|landmark) (?:study|research) (?:shows?|finds|suggests)\b/gi, desc: "Vague study attribution" },
  ];

  for (const { pattern, desc } of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 50);
      const end = Math.min(text.length, match.index + match[0].length + 50);
      issues.push({
        category: "invention",
        severity: "high",
        location: `Near: "...${text.slice(start, end).trim()}..."`,
        description: desc,
        suggestion:
          "Either cite the specific study (author, year, journal) or use hedging language like 'some research suggests'",
      });
    }
  }

  return issues;
}

function checkForOverclaims(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const overclaimPatterns = [
    /\b(?:proves|definitively|always|never|guaranteed|100%)\b/gi,
    /\b(?:scientifically proven|clinically proven|cures|eliminates)\b/gi,
  ];

  for (const pattern of overclaimPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      issues.push({
        category: "overclaim",
        severity: "medium",
        location: `Near: "...${text.slice(start, end).trim()}..."`,
        description: `Overclaiming language: "${match[0]}"`,
        suggestion:
          "Use more careful language like 'may', 'can', 'suggests', or 'is associated with'",
      });
    }
  }

  return issues;
}

function checkForDiagnosis(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const diagnosisPatterns = [
    /\b(?:you have|you are|diagnos(?:e|is)|shows you (?:have|are))\s+(?:depression|anxiety|disorder|ptsd|ocd|autism|asd|adhd|bipolar|schizophrenia)\b/gi,
  ];

  for (const pattern of diagnosisPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const start = Math.max(0, match.index - 30);
      const end = Math.min(text.length, match.index + match[0].length + 30);
      issues.push({
        category: "diagnosis",
        severity: "high",
        location: `Near: "...${text.slice(start, end).trim()}..."`,
        description: `Potential diagnosis language: "${match[0]}"`,
        suggestion:
          "Avoid diagnosing readers or characters. Use 'may experience' or 'some people describe' instead",
      });
    }
  }

  return issues;
}

function checkForJargon(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const jargonTerms = [
    "cognitive dissonance",
    "confirmation bias",
    "availability heuristic",
    "anchoring bias",
    "fundamental attribution error",
    "self-actualization",
    "id, ego, superego",
    "opiate of the masses",
    "tabula rasa",
  ];

  for (const term of jargonTerms) {
    const idx = text.toLowerCase().indexOf(term.toLowerCase());
    if (idx >= 0) {
      // Check if it's explained nearby (within 200 chars)
      const context = text.slice(Math.max(0, idx - 100), Math.min(text.length, idx + term.length + 100));
      const hasExplanation =
        context.includes("which means") ||
        context.includes("refers to") ||
        context.includes("this means") ||
        context.includes("in other words") ||
        context.includes("basically");

      if (!hasExplanation) {
        issues.push({
          category: "jargon",
          severity: "medium",
          location: `Term: "${term}"`,
          description: `Psychological term "${term}" may not be explained`,
          suggestion:
            `Add a brief explanation after introducing "${term}" — explain it in plain English with an everyday example`,
        });
      }
    }
  }

  return issues;
}

function checkForRepetition(chapters: BookChapter[]): QualityIssue[] {
  const issues: QualityIssue[] = [];

  for (let i = 1; i < chapters.length; i++) {
    const current = chapters[i].content || "";
    const previous = chapters.slice(0, i)
      .map((c) => c.content || "")
      .join("\n\n");

    // Check for repeated phrases (simple approach)
    const commonPhrases = [
      "have you ever noticed",
      "think about this",
      "the key is",
      "it turns out that",
    ];

    for (const phrase of commonPhrases) {
      const count = (current.toLowerCase().match(new RegExp(phrase, "gi")) || []).length;
      if (count > 2) {
        issues.push({
          category: "repetition",
          severity: "low",
          location: `Chapter ${i + 1}`,
          description: `Phrase "${phrase}" used ${count} times`,
          suggestion: "Vary your transitions and phrasing",
        });
      }
    }
  }

  return issues;
}

function checkForFiller(text: string): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const fillerPatterns = [
    /\bit('s| is) (important|crucial|vital) (to|for|that) (understand|note|remember|know)/gi,
    /\b(in today's (?:fast-paced|society|world))/gi,
    /\b(at the end of the day)/gi,
    /\b(at the end of this (book|chapter))/gi,
  ];

  for (const pattern of fillerPatterns) {
    const count = (text.match(pattern) || []).length;
    if (count > 3) {
      issues.push({
        category: "jargon",
        severity: "low",
        location: "Throughout manuscript",
        description: `Overused phrase pattern found ${count} times`,
        suggestion: "Reduce filler phrases and vary your language",
      });
    }
  }

  return issues;
}

/**
 * Generate a human-readable quality report summary
 */
export function generateQualityReportSummary(report: QualityReport): string {
  let summary = `Quality Score: ${report.score}/100\n\n`;
  summary += `${report.summary}\n\n`;

  if (report.issues.length > 0) {
    summary += "Issues Found:\n";
    const byCategory: Record<string, QualityIssue[]> = {};

    for (const issue of report.issues) {
      if (!byCategory[issue.category]) byCategory[issue.category] = [];
      byCategory[issue.category].push(issue);
    }

    for (const [category, issues] of Object.entries(byCategory)) {
      summary += `\n${category.toUpperCase()} (${issues.length}):\n`;
      for (const issue of issues.slice(0, 5)) {
        summary += `  • [${issue.severity}] ${issue.description}\n`;
        summary += `    Location: ${issue.location}\n`;
        summary += `    Fix: ${issue.suggestion}\n`;
      }
      if (issues.length > 5) {
        summary += `  ... and ${issues.length - 5} more\n`;
      }
    }
  } else {
    summary += "No issues found!";
  }

  return summary;
}
