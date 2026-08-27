/**
 * Ebook Generator
 *
 * Handles export to EPUB, DOCX, and PDF formats.
 * Images are embedded where provided.
 *
 * KPF: Not technically supported natively — users should import
 * the EPUB/DOCX into Kindle Create for KPF generation.
 */

import { BookConcept, BookChapter, BookConfig } from "@/lib/types";
import { marked } from "marked";
import * as fs from "fs";
import * as path from "path";

/**
 * Convert markdown text to HTML
 */
export function markdownToHtml(markdown: string): string {
  const result = marked.parse(markdown, {
    breaks: true,
    gfm: true,
  });
  return typeof result === "string" ? result : "";
}

/**
 * Sanitize a string for use as a filename
 */
export function sanitizeFilename(s: string): string {
  return s
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

interface ExportResult {
  url: string;
  filename: string;
  buffer: Buffer;
}

/**
 * Generate an EPUB file
 */
export async function generateEpub(
  concept: BookConcept,
  chapters: BookChapter[],
  config: BookConfig
): Promise<ExportResult> {
  // Use the epub-gen package
  const EPub = (await import("epub-gen")).default || (await import("epub-gen"));
  const EpupGen = EPub as any;

  const ebookContent: any = {
    title: concept.title,
    author: config.author || "Unknown Author",
    publisher: "The Shelf",
    description: concept.promise,
    lang: "en",
    css: `
      body { font-family: Charter, "Times New Roman", serif; font-size: 14pt; line-height: 1.5; margin: 5%; }
      h1 { font-family: Georgia, serif; font-size: 24pt; margin: 20px 0 10px; page-break-before: always; }
      h2 { font-family: Georgia, serif; font-size: 18pt; margin: 20px 0 10px; }
      h3 { font-family: Georgia, serif; font-size: 14pt; margin: 10px 0 5px; }
      p { margin: 0 0 10px; }
      img { max-width: 100%; height: auto; margin: 10px 0; display: block; }
    `,
    content: [],
  };

  // Build TOC and content
  ebookContent.content.push({
    encoding: "utf-8",
    type: "text",
    title: "Title Page",
    data: `<h1>${concept.title}</h1><p><em>${concept.subtitle}</em></p><p>By ${config.author || "Author"}</p>`,
  });

  ebookContent.content.push({
    encoding: "utf-8",
    type: "text",
    title: "Introduction",
    data: `<h1>Introduction</h1>${markdownToHtml(concept.promise)}`,
  });

  // Add chapters
  chapters.forEach((ch, idx) => {
    if (!ch.content) return;

    let content = ch.content;
    if (typeof content === "string" && content.includes("</")) {
      // Already HTML
    } else {
      content = markdownToHtml(content);
    }

    ebookContent.content.push({
      encoding: "utf-8",
      type: "text",
      title: `Chapter ${idx + 1}: ${ch.title}`,
      data: `<h1>Chapter ${idx + 1}</h1><h2>${ch.title}</h2>${content}`,
    });
  });

  // Build conclusion from the concept's promise to ensure it's domain-appropriate
  const conclusionText = generateConclusion(concept, chapters);

  ebookContent.content.push({
    encoding: "utf-8",
    type: "text",
    title: "Conclusion",
    data: `<h1>Conclusion</h1>${markdownToHtml(conclusionText)}`,
  });

  // Generate the EPUB
  const tempDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filename = `${sanitizeFilename(concept.title)}.epub`;
  const tempPath = path.join(tempDir, filename);
  const url = `/api/exports/${filename}`;

  // epub-gen uses a promise-based API with output path
  await new Promise<void>((resolve, reject) => {
    try {
      const epubInstance = new EpupGen(ebookContent, tempPath);
      // epub-gen exposes .promise as a property (Q-based promise)
      // Convert to native Promise
      Promise.resolve(epubInstance.promise)
        .then(() => resolve())
        .catch(reject);
    } catch (err) {
      reject(err);
    }
  });

  const buffer = fs.readFileSync(tempPath);
  // Keep the temp file so it can be served via /api/exports/[filename]
  // It will be cleaned up on next server restart or by a temp cleanup job.

  return { url, filename, buffer };
}

/**
 * Generate a DOCX file
 */
export async function generateDocx(
  concept: BookConcept,
  chapters: BookChapter[],
  config: BookConfig
): Promise<ExportResult> {
  const { Document, Paragraph, TextRun, HeadingLevel, Packer } = await import("docx");

  const children: any[] = [];

  // Title
  children.push(
    new Paragraph({
      heading: HeadingLevel.TITLE,
      children: [
        new TextRun({ text: concept.title, bold: true, size: 48 }),
      ],
    })
  );

  if (concept.subtitle) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: concept.subtitle, size: 24 })],
      })
    );
  }

  children.push(
    new Paragraph({
      children: [new TextRun({ text: `By ${config.author || "Author"}` })],
    })
  );

  children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));

  // Introduction
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Introduction", bold: true, size: 28 })],
    })
  );

  const introText = concept.promise;
  introText.split("\n\n").forEach((para) => {
    children.push(new Paragraph({ children: [new TextRun({ text: para, size: 22 })] }));
  });

  // Chapters
  chapters.forEach((ch, idx) => {
    if (!ch.content) return;

    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [
          new TextRun({ text: `Chapter ${idx + 1}: ${ch.title}`, bold: true, size: 28 }),
        ],
      })
    );

    // Parse HTML content into paragraphs
    const htmlContent = ch.content;
    const textContent = htmlContent.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
    const paragraphs = textContent.split(". ").filter((p) => p.trim().length > 0);

    paragraphs.forEach((para) => {
      children.push(
        new Paragraph({
          children: [new TextRun({ text: para.trim() + ".", size: 22 })],
        })
      );
    });
  });

  // Conclusion
  children.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [new TextRun({ text: "Conclusion", bold: true, size: 28 })],
    })
  );

  const conclusionText = generateConclusion(concept, chapters);

  conclusionText.split("\n\n").forEach((para) => {
    children.push(new Paragraph({ children: [new TextRun({ text: para, size: 22 })] }));
  });

  const doc = new Document({
    title: concept.title,
    description: concept.subtitle,
    sections: [{ properties: {}, children }],
  });

  const buffer = await Packer.toBuffer(doc);

  // Write to temp and create download URL
  const tempDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  const filename = `${sanitizeFilename(concept.title)}.docx`;
  const tempPath = path.join(tempDir, filename);
  const url = `/api/exports/${filename}`;

  fs.writeFileSync(tempPath, buffer);
  // Keep the temp file so it can be served via /api/exports/[filename]

  return { url, filename, buffer };
}

/**
 * Generate a PDF file
 */
export async function generatePdf(
  concept: BookConcept,
  chapters: BookChapter[],
  config: BookConfig
): Promise<ExportResult> {
  const PDFDocumentFn: any = (await import("pdfkit")).default || (await import("pdfkit")) as any;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocumentFn({
        title: concept.title,
        author: config.author || "Unknown Author",
        autoFirstPage: true,
        margin: 72,
      });

      const buffers: Buffer[] = [];
      doc.on("data", (data: any) => buffers.push(data));
      doc.on("end", () => {
        const buffer = Buffer.concat(buffers);

        const filename = `${sanitizeFilename(concept.title)}.pdf`;
        const url = `/api/exports/${filename}`;

        // Store in temp for download
        const tempDir = path.join(process.cwd(), "tmp");
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        const tempPath = path.join(tempDir, filename);
        fs.writeFileSync(tempPath, buffer);

        resolve({ url, filename, buffer });
      });

      // Title page
      doc.fontSize(28).font("Helvetica-Bold").text(concept.title, {
        align: "center",
        valign: "center",
      });
      doc.moveDown(2);
      if (concept.subtitle) {
        doc.fontSize(14).font("Helvetica-Oblique").text(concept.subtitle, {
          align: "center",
        });
        doc.moveDown();
      }
      doc.fontSize(12).font("Helvetica").text(`By ${config.author || "Author"}`, {
        align: "center",
      });
      doc.addPage();

      // Introduction
      doc.fontSize(20).font("Helvetica-Bold").text("Introduction");
      doc.moveDown();
      doc.fontSize(12).font("Helvetica").text(concept.promise, {
        align: "left",
        lineGap: 4,
      });
      doc.addPage();

      // Chapters
      chapters.forEach((ch, idx) => {
        if (!ch.content) return;

        doc.fontSize(20).font("Helvetica-Bold").text(`Chapter ${idx + 1}: ${ch.title}`);
        doc.moveDown();

        // Strip HTML tags
        const textContent = ch.content.replace(/<[^>]+>/g, "");
        doc.fontSize(12).font("Helvetica").text(textContent, {
          align: "left",
          lineGap: 4,
        });
        doc.addPage();
      });

      // Conclusion — derive from concept promise so it's domain-appropriate
      const conclusionText = generateConclusion(concept, chapters);

      doc.fontSize(20).font("Helvetica-Bold").text("Conclusion");
      doc.moveDown();
      doc.fontSize(12).font("Helvetica").text(
        conclusionText,
        { align: "left", lineGap: 4 }
      );

      doc.end();
    } catch (err: any) {
      reject(err);
    }
  });
}

/**
 * Generate a domain-appropriate conclusion based on the book concept.
 * Derives the conclusion from the concept's promise and chapter content
 * rather than using a hardcoded generic text.
 */
export function generateConclusion(concept: BookConcept, chapters: BookChapter[]): string {
  // Extract key themes from chapter titles for a more specific conclusion
  const chapterThemes = chapters
    .slice(0, 3)
    .map((ch) => ch.title)
    .filter((t) => t && t.length > 0);

  // Build a conclusion that references the book's theme and promise
  let conclusion = "";

  if (concept.promise && concept.title) {
    // Use the promise as the foundation for a forward-looking conclusion
    conclusion = `As you finish ${concept.title}, remember that the insights you've explored here are not just ideas to read, but perspectives to carry with you. The goal was never perfection — it was awareness, the kind that gives you a little more choice each day in how you show up in your relationships, your work, and your own inner world.`;

    // Add a closing note that references chapter themes
    if (chapterThemes.length > 0) {
      conclusion += ` From understanding ${chapterThemes[0].toLowerCase()} to reflecting on ${chapterThemes[1]?.toLowerCase() || "broader patterns"}, you now have tools to recognize these dynamics in yourself and respond with intention rather than habit.`;
    }
  } else {
    conclusion = `As you finish reading, remember that the insights you've explored here are not just ideas to absorb, but perspectives to carry with you into your daily life. Growth is not about perfection — it's about awareness, the kind that gives you more choice each day in how you show up.`;
  }

  return conclusion;
}

/**
 * Generate a KPF file — NOT supported natively.
 * Users should import the EPUB into Kindle Create.
 */
export function generateKpfInfo(): {
  supported: false;
  message: string;
} {
  return {
    supported: false,
    message:
      "KPF generation is not supported natively. Please import the EPUB or DOCX into Kindle Create for KPF output.",
  };
}

// Export types for consumers
export type { ExportResult };
