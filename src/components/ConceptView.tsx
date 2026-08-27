"use client";

import { useState } from "react";
import { BookConcept, BookConfig } from "@/lib/types";
import { useBook } from "@/context/BookContext";

interface ConceptViewProps {
  config: BookConfig;
  concept: BookConcept | null;
  onGenerate: () => void;
}

export function ConceptView({ config, concept, onGenerate }: ConceptViewProps) {
  const { actions } = useBook();
  const [isGenerating, setIsGenerating] = useState(false);

  if (!concept) {
    // Concept hasn't been generated yet — trigger generation
    // This handles the case where config was saved but concept wasn't developed yet
    return (
      <div>
        <div className="eyebrow">Ready to Build</div>
        <div className="ready-box">
          <h2>Your Book Configuration</h2>
          <p className="sub">
            {config.topic || config.subject || "Your book idea"}
          </p>
          {config.bookCategory && (
            <p><b>Category:</b> {config.bookCategory}</p>
          )}
          {config.targetAudience && (
            <p><b>Audience:</b> {config.targetAudience}</p>
          )}
          {config.writingStyle && (
            <p><b>Style:</b> {config.writingStyle}</p>
          )}
          {config.tone && (
            <p><b>Tone:</b> {config.tone}</p>
          )}
          {config.desiredLength && (
            <p><b>Length:</b> {config.desiredLength}</p>
          )}
          {config.additionalInstructions && (
            <p><b>Notes:</b> {config.additionalInstructions}</p>
          )}
        </div>
        <div className="row">
          <button className="btn" onClick={onGenerate}>
            Generate Book
          </button>
          <button className="btn-ghost" onClick={() => actions.startNewBook()}>
            Start Over
          </button>
        </div>

        <style jsx>{styleSheet}</style>
      </div>
    );
  }

  const handleGenerate = () => {
    onGenerate();
  };

  return (
    <div>
      <div className="eyebear">Book Concept</div>
      <div className="concept-box">
        <h2>{concept.title}</h2>
        <p className="sub">{concept.subtitle}</p>
        <p className="promise">{concept.promise}</p>
        <div className="concept-meta">
          <span>
            <b>Reader:</b> {concept.targetReader}
          </span>
          <span>
            <b>Chapters:</b> {concept.chapters.length}
          </span>
        </div>

        <div className="chapter-list">
          <h3>Chapter Outline</h3>
          <ul>
            {concept.chapters.map((ch, i) => (
              <li key={i}>
                <b>Chapter {i + 1}:</b> {ch.title}
                <br />
                <span className="chapter-desc">{ch.description}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="row">
        <button className="btn" onClick={handleGenerate}>Generate Book</button>
        <button className="btn-ghost" onClick={() => actions.startNewBook()}>Start Over</button>
      </div>

      <style jsx>{styleSheet}</style>
    </div>
  );
}

const styleSheet = `
  .eyebear {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--accent-forest);
    margin: 0 0 10px;
  }

  .ready-box {
    background: var(--paper-soft);
    border: 1px solid var(--line);
    padding: 22px 24px;
    margin-top: 8px;
  }

  .ready-box h2 {
    font-family: var(--display);
    font-size: 22px;
    margin: 0 0 4px;
    color: var(--ink);
  }

  .ready-box .sub {
    font-style: italic;
    color: var(--ink-soft);
    margin: 0 0 14px;
  }

  .ready-box p {
    font-size: 14.5px;
    line-height: 1.6;
    color: var(--ink);
    margin: 4px 0;
  }

  .concept-box {
    background: var(--paper-soft);
    border: 1px solid var(--line);
    padding: 22px 24px;
    margin-top: 8px;
  }

  .concept-box h2 {
    font-family: var(--display);
    font-size: 22px;
    margin: 0 0 4px;
    color: var(--ink);
  }

  .concept-box .sub {
    font-style: italic;
    color: var(--ink-soft);
    margin: 0 0 14px;
  }

  .concept-box .promise {
    font-size: 14.5px;
    line-height: 1.65;
    color: var(--ink);
  }

  .concept-meta {
    display: flex;
    gap: 22px;
    margin-top: 16px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--ink-soft);
    flex-wrap: wrap;
  }

  .concept-meta b {
    color: var(--ink);
    font-family: var(--body);
    font-weight: 700;
  }

  .chapter-list {
    margin-top: 20px;
  }

  .chapter-list h3 {
    font-family: var(--mono);
    font-size: 10.5px;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-soft);
    margin: 0 0 12px;
  }

  .chapter-list ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .chapter-list li {
    padding: 8px 0;
    border-bottom: 1px dashed var(--line);
    font-size: 13.5px;
    line-height: 1.5;
  }

  .chapter-list li:last-child {
    border-bottom: none;
  }

  .chapter-desc {
    color: var(--ink-soft);
    font-size: 13px;
  }

  .row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 18px;
  }
`;
