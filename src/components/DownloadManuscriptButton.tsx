"use client";

import { useBook } from "@/context/BookContext";

export function DownloadManuscriptButton() {
  const { state } = useBook();
  const { concept, chapters, config } = state;

  const handleDownload = () => {
    if (!concept || chapters.length === 0) return;

    let md = `# ${concept.title}\n\n*${concept.subtitle}*\n\n---\n\n**For:** ${concept.targetReader}\n\n${concept.promise}\n\n---\n\n## Table of Contents\n\n`;
    concept.chapters.forEach((ch, i) => {
      md += `${i + 1}. ${ch.title}\n`;
    });
    md += `\n---\n\n`;
    concept.chapters.forEach((ch, i) => {
      md += `## Chapter ${i + 1}: ${ch.title}\n\n`;
      const content = chapters[i]?.content;
      md += content ? content + "\n\n" : "*[Not yet drafted]*\n\n";
      md += `---\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
      (concept.title || "manuscript")
        .replace(/[^a-z0-9]+/gi, "_")
        .toLowerCase() + ".md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button className="btn" onClick={handleDownload}>
      Download manuscript
    </button>
  );
}
