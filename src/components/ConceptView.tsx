"use client";

import { useState, useEffect } from "react";
import { BookConcept, BookConfig } from "@/lib/types";
import { useBook } from "@/context/BookContext";

interface ConceptViewProps {
  config: BookConfig;
  concept: BookConcept | null;
  onGenerate: () => void;
}

export function ConceptView({ config, concept, onGenerate }: ConceptViewProps) {
  const { actions } = useBook();
  const [claudeAvailable, setClaudeAvailable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  // Check Claude availability when the component mounts
  useEffect(() => {
    checkClaude();
  }, []);

  async function checkClaude() {
    setChecking(true);
    try {
      const response = await fetch("/api/check-claude");
      if (!response.ok) {
        setClaudeAvailable(false);
        return;
      }
      const data = await response.json();
      setClaudeAvailable(data.claude?.configured ?? false);
    } catch {
      setClaudeAvailable(false);
    } finally {
      setChecking(false);
    }
  }

  if (!concept) {
    // Concept hasn't been generated yet — show the config summary and generate button
    const isReady = !!canGenerate();

    return (
      <div>
        <div className="eyebrow">Ready to Build</div>
        <div className="ready-box">
          <h2>Your Book Configuration</h2>
          <p className="sub">
            {config.topic || config.subject || "Your book idea"}
          </p>

          <div className="meta-grid">
            {config.bookCategory && (
              <div><b>Category:</b> {config.bookCategory}</div>
            )}
            {config.targetAudience && (
              <div><b>Audience:</b> {config.targetAudience}</div>
            )}
            {config.writingStyle && (
              <div><b>Style:</b> {config.writingStyle}</div>
            )}
            {config.tone && (
              <div><b>Tone:</b> {config.tone}</div>
            )}
            {config.desiredLength && (
              <div><b>Length:</b> {config.desiredLength}</div>
            )}
            {config.additionalInstructions && (
              <div><b>Notes:</b> {config.additionalInstructions}</div>
            )}
          </div>

          {!isReady && (
            <div className="error-box">
              <p>I still need two things to generate your book:</p>
              <p>1. A Topic or Book Idea</p>
              <p>2. A Category / Genre</p>
              <p style={{ marginTop: "10px", fontSize: "12px" }}>
                Fill those in and click "Start Over" to return to the form.
              </p>
            </div>
          )}

          {claudeAvailable === false && !checking && (
            <div className="error-box">
              ⚠️ <b>Claude is not configured.</b> Add an <code>ANTHROPIC_API_KEY</code>
              to your environment to generate books. See <code>.env.example</code> for details.
            </div>
          )}

          {claudeAvailable === null && checking && (
            <p style={{ fontSize: "13px", color: "var(--ink-soft)" }}>Checking Claude availability…</p>
          )}
        </div>

        <div className="row">
          <button
            className="btn"
            onClick={onGenerate}
            disabled={!isReady || !claudeAvailable || checking}
            title={
              !isReady
                ? "Fill in topic and category first"
                : claudeAvailable === false
                ? "Claude API key not configured"
                : undefined
            }
          >
            {checking ? "Checking…" : claudeAvailable === false ? "Claude Not Configured" : "Generate Book"}
          </button>
          <button className="btn-ghost" onClick={() => actions.startNewBook()}>
            Start Over
          </button>
        </div>

        <style jsx>{styleSheet}</style>
      </div>
    );
  }

  function canGenerate(): boolean {
    return !!(config.topic || config.subject) && !!config.bookCategory;
  }

  const handleGenerate = () => {
    onGenerate();
  };

  return (
    <div>
      <div className="eyebrow">Book Concept</div>
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
        <button className="btn" onClick={handleGenerate} disabled={checking}>
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

const styleSheet = `
  .eyebear, .eyebrow {
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

  .meta-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 14px;
    font-size: 14px;
    line-height: 1.6;
  }

  .meta-grid div b {
    color: var(--ink-soft);
  }

  @media (max-width: 640px) {
    .meta-grid {
      grid-template-columns: 1fr;
    }
  }

  .error-box {
    background: #fef0f0;
    border: 1px solid #fcc;
    color: var(--accent-rust);
    padding: 14px 16px;
    border-radius: 6px;
    margin-top: 16px;
    font-size: 13.5px;
    line-height: 1.6;
  }

  .error-box code {
    background: var(--paper-deep);
    padding: 1px 5px;
    border-radius: 3px;
    font-family: var(--mono);
    font-size: 12px;
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
