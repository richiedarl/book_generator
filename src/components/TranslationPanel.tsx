"use client";

import { useState } from "react";
import { useBook } from "@/context/BookContext";
import { SUPPORTED_LANGUAGES } from "@/lib/types";

export function TranslationPanel() {
  const { state } = useBook();
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [translateSuccess, setTranslateSuccess] = useState<string | null>(null);

  if (!state.book && state.status !== "ready") {
    return null;
  }

  const handleToggle = (code: string) => {
    const newSelected = new Set(selectedLanguages);
    if (newSelected.has(code)) {
      newSelected.delete(code);
    } else {
      newSelected.add(code);
    }
    setSelectedLanguages(newSelected);
  };

  const handleTranslate = async () => {
    if (selectedLanguages.size === 0) return;

    setIsTranslating(true);
    setTranslateError(null);
    setTranslateSuccess(null);

    try {
      // Build a book object from current state for translation
      const bookData = {
        config: state.config,
        concept: state.concept,
        chapters: state.chapters,
        metadata: state.book?.metadata || null,
        exports: state.exportFormats.filter((f) => f.url),
      };

      const response = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          book: bookData,
          languageCodes: Array.from(selectedLanguages),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Translation failed");
      }

      const data = await response.json();
      const successCount = data.translations.filter((t: any) => t.success).length;
      setTranslateSuccess(
        `Successfully translated to ${successCount} language(s).`
      );
    } catch (err: any) {
      setTranslateError(err.message);
    } finally {
      setIsTranslating(false);
    }
  };

  return (
    <div className="translation-panel">
      <h2>Translate This Book</h2>
      <p className="subtitle">
        Select languages to translate the book. Translation is optional and
        does not affect the original English version.
      </p>

      <div className="language-grid">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <label key={lang.code} className="lang-option">
            <input
              type="checkbox"
              checked={selectedLanguages.has(lang.code)}
              onChange={() => handleToggle(lang.code)}
              disabled={isTranslating}
            />
            <span>{lang.name}</span>
          </label>
        ))}
      </div>

      {translateError && (
        <div className="error-message">{translateError}</div>
      )}
      {translateSuccess && (
        <div className="success-message">{translateSuccess}</div>
      )}

      <button
        className="btn"
        onClick={handleTranslate}
        disabled={isTranslating || selectedLanguages.size === 0}
      >
        {isTranslating ? "Translating..." : `Translate Selected (${selectedLanguages.size})`}
      </button>

      <style jsx>{`
        .translation-panel {
          padding: 24px;
          background: var(--paper-soft);
          border: 1px solid var(--line);
          border-radius: 4px;
        }
        .translation-panel h2 {
          font-family: var(--display);
          font-size: 20px;
          color: var(--ink);
          margin: 0 0 8px;
        }
        .subtitle {
          color: var(--ink-soft);
          font-size: 13px;
          line-height: 1.6;
          margin: 0 0 16px;
        }
        .language-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 8px;
          margin-bottom: 16px;
        }
        .lang-option {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          cursor: pointer;
        }
        .lang-option input {
          width: 16px;
          height: 16px;
        }
        .error-message {
          color: #a00;
          font-size: 13px;
          padding: 10px;
          background: #fee;
          border: 1px solid #fcc;
          border-radius: 4px;
          margin-bottom: 12px;
        }
        .success-message {
          color: var(--accent-forest);
          font-size: 13px;
          padding: 10px;
          background: rgba(59, 93, 80, 0.1);
          border: 1px solid rgba(59, 93, 80, 0.3);
          border-radius: 4px;
          margin-bottom: 12px;
        }
      `}</style>
    </div>
  );
}
