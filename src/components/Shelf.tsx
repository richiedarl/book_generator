"use client";

import { useBook } from "@/context/BookContext";
import { DownloadManuscriptButton } from "./DownloadManuscriptButton";

export function Shelf() {
  const { state, actions } = useBook();
  const { concept, chapters, activeChapter, status, config, isGenerating } = state;

  const displayChapters = concept?.chapters || [];

  return (
    <div className="shelf">
      <div className="shelf-title">The Shelf</div>

      <div id="shelfBookInfo">
        {concept ? (
          <>
            <div className="shelf-book-title">{concept.title}</div>
            <div className="shelf-book-sub">{concept.subtitle}</div>
          </>
        ) : config && !isGenerating ? (
          <>
            <div className="shelf-book-title">{config.title || "Untitled Book"}</div>
            {config.subtitle && (
              <div className="shelf-book-sub">{config.subtitle}</div>
            )}
          </>
        ) : (
          <p className="shelf-empty">
            Your book outline will appear here once the book is developed.
          </p>
        )}
      </div>

      {displayChapters.length > 0 && (
        <div className="cards">
          {displayChapters.map((chapter, index) => {
            const chapterContent = chapters[index]?.content;
            const isDone = !!chapterContent;
            const isActive = index === activeChapter && status === "editing";
            return (
              <div
                key={index}
                className={`card ${isDone ? "done" : ""} ${
                  isActive ? "active" : ""
                }`}
                onClick={() => {
                  if (status === "editing" || status === "ready") {
                    actions.setActiveChapter(index);
                    if (status !== "editing") actions.setStatus("editing");
                  }
                }}
              >
                <div className="num">Ch. {index + 1}</div>
                <div className="title">{chapter.title}</div>
                <div className="status">
                  {isDone ? "Drafted" : isGenerating ? "Generating..." : "Not started"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="shelf-actions"
        style={{ display: concept || chapters.length > 0 ? "flex" : "none" }}
      >
        {chapters.length > 0 && (
          <DownloadManuscriptButton />
        )}
        <button
          className="btn-ghost"
          onClick={actions.startNewBook}
          disabled={isGenerating}
        >
          Start a new book
        </button>
      </div>

      <style jsx>{`
        .shelf {
          background: var(--paper-deep);
          border-right: 1px solid var(--line);
          padding: 28px 18px 40px;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .shelf::before {
          content: "";
          position: absolute;
          top: 0;
          right: -1px;
          bottom: 0;
          width: 1px;
          background: repeating-linear-gradient(
            to bottom,
            var(--line) 0 6px,
            transparent 6px 12px
          );
        }

        .shelf-title {
          font-family: var(--font-mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin: 0 0 4px;
        }

        .shelf-book-title {
          font-family: var(--font-display);
          font-size: 20px;
          line-height: 1.25;
          margin: 0 0 2px;
          color: var(--ink);
        }

        .shelf-book-sub {
          font-family: var(--font-body);
          font-style: italic;
          font-size: 13px;
          color: var(--ink-soft);
          margin: 0 0 22px;
        }

        .shelf-empty {
          font-size: 13px;
          color: var(--ink-faint);
          line-height: 1.6;
          margin-top: 8px;
        }

        .cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 6px;
        }

        .card {
          background: var(--paper-soft);
          border: 1px solid var(--line);
          border-left: 3px solid var(--ink-faint);
          padding: 11px 12px 12px;
          cursor: pointer;
          position: relative;
          box-shadow: 1px 2px 0 rgba(43, 43, 38, 0.04);
          transition: transform 0.12s ease, border-color 0.12s ease;
        }

        .card:nth-child(odd) {
          transform: rotate(-0.4deg);
        }
        .card:nth-child(even) {
          transform: rotate(0.5deg);
        }

        .card:hover {
          transform: rotate(0deg) translateY(-1px);
        }

        .card.active {
          border-left-color: var(--accent-forest);
          background: var(--input-fill);
        }

        .card.done {
          border-left-color: var(--accent-gold);
        }

        .card .num {
          font-family: var(--font-mono);
          font-size: 10px;
          color: var(--ink-faint);
          letter-spacing: 0.08em;
        }

        .card .title {
          font-family: var(--font-display);
          font-size: 14px;
          line-height: 1.3;
          margin-top: 3px;
          color: var(--ink);
        }

        .card .status {
          font-family: var(--font-mono);
          font-size: 9.5px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          margin-top: 6px;
          color: var(--ink-faint);
        }

        .card.done .status {
          color: var(--accent-forest);
        }

        .card.active .status {
          color: var(--accent-rust);
        }

        .shelf-actions {
          margin-top: 22px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        @media (max-width: 820px) {
          .shelf {
            border-right: none;
            border-bottom: 1px solid var(--line);
            padding: 20px 18px 24px;
          }
        }
      `}</style>
    </div>
  );
}
