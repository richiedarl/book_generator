"use client";

import { useState } from "react";
import { useBook } from "@/context/BookContext";
import { BookConfig } from "@/lib/types";

const CATEGORIES = [
  "Psychology",
  "Technology",
  "Business",
  "Finance",
  "History",
  "Science",
  "Education",
  "Farming",
  "Nature",
  "Personal Development",
  "Children's Education",
  "Biography",
  "Health",
  "Fiction",
  "Other",
] as const;

const WRITING_STYLES = [
  "Conversational",
  "Narrative",
  "Academic",
  "Journalistic",
  "Storytelling",
  "Workbook",
] as const;

const TONES = [
  "Friendly & Informative",
  "Authoritative",
  "Warm & Supportive",
  "Conversational",
  "Neutral / Balanced",
  "Inspiring",
  "Humorous",
] as const;

const DESIRED_LENGTHS = [
  "Short (5,000–15,000 words)",
  "Medium (15,000–40,000 words)",
  "Long (40,000–80,000 words)",
] as const;

export function BookConfigForm() {
  const { actions } = useBook();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const [writingStyle, setWritingStyle] = useState("");
  const [tone, setTone] = useState("");
  const [desiredLength, setDesiredLength] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  const resolvedCategory = category === "Other" ? customCategory.trim() : category;

  const handleGenerate = () => {
    if (!topic.trim()) {
      setError("Please tell me what your book is about.");
      return;
    }
    if (!resolvedCategory) {
      setError("Please select or enter a category / genre.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const config: BookConfig = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      author: author.trim() || "Anonymous",
      topic: topic.trim(),
      subject: topic.trim(),
      genre: resolvedCategory,
      bookCategory: resolvedCategory,
      targetAudience: targetAudience.trim(),
      ageRange: "",
      readingLevel: "",
      buyerType: "",
      tone,
      writingStyle,
      desiredLength,
      numberOfChapters: 0, // 0 means Claude determines
      chapterTitles: undefined,
      educationalGoals: "",
      emotionalGoals: "",
      visualStyle: "",
      fontPreference: "",
      pageSize: "",
      additionalInstructions: additionalInstructions.trim(),
      referenceMaterial: undefined,
      specializedCategory: "",
      imageGeneration: { enabled: false, provider: "none" },
      translateTo: undefined,
    };

    actions.setConfig(config);
    actions.setStatus("concept");
  };

  const canGenerate = resolvedCategory && topic.trim();

  return (
    <div id="bookConfigForm">
      <div className="eyebrow">Create Your Book</div>
      <h1 className="hero">What story lives in your mind?</h1>
      <p className="hero-sub">
        Tell me the core idea. I'll shape it into a complete, polished book —
        with an engaging outline, fully written chapters, quality edits, and
        professional exports (EPUB, DOCX, PDF).
      </p>
      <p className="hero-note">
        Most fields are optional. Just give me a topic and pick a category.
      </p>

      <div className="form-section">
        <h3 className="section-title">Core Idea</h3>

        <label htmlFor="bookTopic">Topic / Book Idea</label>
        <textarea
          id="bookTopic"
          placeholder="e.g. Why do we push away the people we love? Or: How to break free from self-sabotage in relationships."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="hint">Required — this is the seed Claude will grow into your book.</p>

        <label htmlFor="bookCategory">Category / Genre</label>
        <select
          id="bookCategory"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            if (e.target.value !== "Other") setCustomCategory("");
          }}
          disabled={isSubmitting}
        >
          <option value="">Select a category</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        {category === "Other" && (
          <input
            type="text"
            id="customCategory"
            placeholder="Enter your custom category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            disabled={isSubmitting}
          />
        )}
      </div>

      <div className="form-section">
        <h3 className="section-title">Book Details</h3>

        <div className="grid-2">
          <div>
            <label htmlFor="bookTitle">Book Title</label>
            <input
              type="text"
              id="bookTitle"
              placeholder="Leave blank and I'll suggest a compelling title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="bookAuthor">Author</label>
            <input
              type="text"
              id="bookAuthor"
              placeholder="Your name or 'Anonymous'"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
        </div>

        <label htmlFor="bookSubtitle">Subtitle</label>
        <input
          type="text"
          id="bookSubtitle"
          placeholder="A short tagline that clarifies your book's promise"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          disabled={isSubmitting}
        />

        <label htmlFor="bookAudience">Target Audience</label>
        <input
          type="text"
          id="bookAudience"
          placeholder="e.g. Adults navigating relationship anxiety"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="hint">Who should read this? Optional — I can infer from the topic.</p>
      </div>

      <div className="form-section">
        <h3 className="section-title">Style &amp; Tone</h3>

        <div className="grid-2">
          <div>
            <label htmlFor="writingStyle">Writing Style</label>
            <select
              id="writingStyle"
              value={writingStyle}
              onChange={(e) => setWritingStyle(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Conversational (default)</option>
              {WRITING_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="tone">Tone</label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Friendly &amp; Informative (default)</option>
              {TONES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label htmlFor="desiredLength">Desired Length</label>
        <select
          id="desiredLength"
          value={desiredLength}
          onChange={(e) => setDesiredLength(e.target.value)}
          disabled={isSubmitting}
        >
          <option value="">Medium (default)</option>
          {DESIRED_LENGTHS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>

      <div className="form-section">
        <h3 className="section-title">Guiding Notes</h3>
        <label htmlFor="additionalInstructions">Additional Instructions</label>
        <textarea
          id="additionalInstructions"
          placeholder="Specific angles, themes, examples, or anything else you want Claude to know. (Optional)"
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="row">
        <button className="btn" onClick={handleGenerate} disabled={isSubmitting || !canGenerate}>
          {isSubmitting ? "Generating..." : "Generate Book"}
        </button>
      </div>

      <style jsx>{`
        .form-section {
          margin-bottom: 28px;
          padding: 24px 28px;
          background: var(--paper-soft);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(34, 48, 43, 0.03);
        }

        .form-section h3.section-title {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 20px;
        }

        .hero {
          font-family: var(--display);
          font-size: 32px;
          line-height: 1.2;
          margin: 0 0 8px;
          color: var(--ink);
        }

        .hero-sub {
          font-size: 15px;
          line-height: 1.6;
          color: var(--ink-soft);
          margin: 0 0 8px;
          max-width: 52ch;
        }

        .hero-note {
          font-size: 13px;
          color: var(--ink-faint);
          margin: 0 0 28px;
          font-style: italic;
        }

        /* Form field labels */
        .form-section label {
          display: block;
          font-family: var(--mono);
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }

        /* Input styling */
        .form-section input[type="text"],
        .form-section textarea {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--line);
          border-radius: 8px;
          background: var(--paper);
          font-family: var(--body);
          font-size: 14px;
          color: var(--ink);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }

        .form-section input[type="text"]:focus,
        .form-section textarea:focus {
          outline: none;
          border-color: var(--accent-forest);
          box-shadow: 0 0 0 2px rgba(59, 93, 80, 0.1);
          background: #fdfaf5;
        }

        .form-section input[type="text"]:disabled,
        .form-section textarea:disabled {
          background: var(--ink-faint);
          cursor: not-allowed;
          opacity: 0.6;
        }

        /* Select styling */
        .form-section select {
          width: 100%;
          padding: 10px 14px;
          border: 1.5px solid var(--line);
          border-radius: 8px;
          background: var(--paper);
          font-family: var(--body);
          font-size: 14px;
          color: var(--ink);
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' fill='%2357655D' viewBox='0 0 24 24'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 14px center;
          background-size: 14px;
        }

        .form-section select:focus {
          outline: none;
          border-color: var(--accent-forest);
          box-shadow: 0 0 0 2px rgba(59, 93, 80, 0.1);
        }

        .form-section select:disabled {
          background: var(--paper-soft);
          cursor: not-allowed;
          opacity: 0.7;
        }

        /* Textarea styling */
        .form-section textarea {
          min-height: 90px;
          resize: vertical;
          line-height: 1.6;
        }

        /* Grid layout for paired fields */
        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
        }

        @media (max-width: 640px) {
          .grid-2 {
            grid-template-columns: 1fr;
          }
        }

        /* Hint text */
        .hint {
          font-size: 12px;
          color: var(--ink-faint);
          line-height: 1.5;
          margin: 4px 0 14px;
        }

        /* Error message */
        .error {
          background: #fef0f0;
          border: 1px solid #fcc;
          color: var(--accent-rust);
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 13px;
          line-height: 1.5;
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
        }

        .error::before {
          content: "⚠";
          font-size: 14px;
        }

        /* Submit row */
        .row {
          display: flex;
          gap: 12px;
          align-items: center;
          flex-wrap: wrap;
          margin-top: 24px;
        }

        .btn {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 48, 43, 0.1);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
