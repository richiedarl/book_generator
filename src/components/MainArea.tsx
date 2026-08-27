"use client";

import { useBook } from "@/context/BookContext";
import { BookConfigForm } from "./BookConfigForm";
import { ConceptView } from "./ConceptView";
import { ChapterView } from "./ChapterView";
import { GenerationProgressView } from "./GenerationProgressView";
import { BookReadyView } from "./BookReadyView";

export function MainArea() {
  const { state, actions } = useBook();

  const { status, isGenerating, chapters, concept, config, qualityReport } = state;
  const { generationError, jobError } = state;

  // Determine what to render based on state
  let content;

  if (isGenerating) {
    content = <GenerationProgressView />;
  } else if (!config) {
    // Page 1: Book Configuration Form
    content = <BookConfigForm />;
  } else if (status === "error" && (generationError || jobError)) {
    // Error state — show the error and let user retry or start over
    content = (
      <div>
        <div className="eyebrow">Something went wrong</div>
        <div className="error-box">
          <h2>Generation failed</h2>
          <p className="error-message">{generationError || jobError}</p>
        </div>
        <div className="row">
          <button className="btn" onClick={() => actions.generateBook(config, concept)}>
            Try Again
          </button>
          <button className="btn-ghost" onClick={() => actions.startNewBook()}>
            Start Over
          </button>
        </div>

        <style jsx>{`
          .error-box {
            background: #fef0f0;
            border: 1px solid #fcc;
            padding: 24px 28px;
            border-radius: 12px;
            margin-top: 8px;
          }

          .error-box h2 {
            font-family: var(--display);
            font-size: 20px;
            color: var(--accent-rust);
            margin: 0 0 12px;
          }

          .error-message {
            font-size: 14px;
            line-height: 1.6;
            color: var(--ink);
          }

          .row {
            display: flex;
            gap: 12px;
            margin-top: 20px;
          }
        `}</style>
      </div>
    );
  } else if (status === "config" || status === "concept") {
    // Config saved but not yet generating — show concept review / generate button
    content = <ConceptView config={config} concept={concept} onGenerate={() => actions.generateBook(config, concept)} />;
  } else if (status === "generating") {
    content = <GenerationProgressView />;
  } else if (status === "editing" && chapters.length > 0) {
    // Chapters are drafted — show editing/QA view
    content = <ChapterView />;
  } else if (status === "ready") {
    // Book is complete
    content = <BookReadyView />;
  } else {
    // Fallback
    content = <BookConfigForm />;
  }

  return (
    <div className="main">
      {content}

      <style jsx>{`
        .main {
          padding: 44px 56px 80px;
          max-width: 760px;
          flex: 1;
        }

        @media (max-width: 820px) {
          .main {
            padding: 28px 22px 60px;
          }
        }
      `}</style>
    </div>
  );
}
