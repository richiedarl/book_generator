"use client";

import { useBook } from "@/context/BookContext";
import { useEffect } from "react";

export function ChapterView() {
  const { state, actions } = useBook();
  const { concept, chapters, activeChapter } = state;

  // If we have chapters but none are drafted yet, this is the editing view
  // after generation. Show the first chapter's content.

  useEffect(() => {
    if (concept && activeChapter === 0) {
      actions.setActiveChapter(0);
    }
  }, [concept, activeChapter, actions]);

  if (!concept || !concept.chapters[activeChapter]) return null;

  const chapter = concept.chapters[activeChapter];
  const content = chapters[activeChapter]?.content;
  const isDrafted = !!content;

  return (
    <div>
      <div className="page">
        <div className="chapter-num">
          Chapter {activeChapter + 1} of {concept.chapters.length}
        </div>
        <h2>{chapter.title}</h2>
        {content ? (
          <div
            className="body-text"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <div className="placeholder">
            <br />
            <br />
            This chapter hasn't been drafted yet.
          </div>
        )}
      </div>

      <style jsx>{`
        .page {
          background: var(--paper-soft);
          border: 1px solid var(--line);
          padding: 38px 42px;
          margin-top: 10px;
          box-shadow: 2px 3px 0 rgba(34, 48, 43, 0.05);
        }

        .page h2 {
          font-family: var(--display);
          font-size: 26px;
          margin: 0 0 4px;
          color: var(--ink);
        }

        .page .chapter-num {
          font-family: var(--mono);
          font-size: 11px;
          color: var(--accent-forest);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 6px;
        }

        .page .body-text {
          font-size: 15.5px;
          line-height: 1.75;
          color: var(--ink);
          white-space: pre-wrap;
        }

        .page .body-text p {
          margin: 0 0 1em;
        }

        .page .body-text h3 {
          font-family: var(--display);
          font-size: 18px;
          margin: 1.5em 0 0.5em;
          color: var(--ink);
        }

        .placeholder {
          font-family: var(--display);
          font-style: italic;
          color: var(--ink-faint);
          font-size: 15px;
          padding: 40px 0;
          text-align: center;
          border: 1px dashed var(--line);
        }
      `}</style>
    </div>
  );
}
