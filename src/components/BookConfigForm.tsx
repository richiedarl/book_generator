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
  "Health",
  "Personal Development",
  "Nature",
  "Children's Education",
  "Biography",
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
    if (!resolvedCategory) {
      setError("Please select or enter a category / genre.");
      return;
    }
    if (!topic.trim()) {
      setError("Please give me a topic or book idea to start from.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    const config: BookConfig = {
      title: title.trim(),
      subtitle: subtitle.trim(),
      author: author.trim(),
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

  const isComplete = () => !resolvedCategory || !topic.trim();

  return (
    <div id="bookConfigForm">
      <div className="eyebrow">Create Your Book</div>
      <h1 className="hero">Tell me about your book.</h1>
      <p className="hero-sub">
        Give me the core idea and I'll take care of the rest — outline, chapters, editing, formatting, and export.
      </p>

      <div className="form-section">
        <h3 className="section-title">Book Basics</h3>

        <label htmlFor="bookTitle">Book Title</label>
        <input
          type="text"
          id="bookTitle"
          placeholder="e.g. Why We Push Away the People We Love"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="hint">Optional — I can suggest a title if you leave this blank.</p>

        <label htmlFor="bookSubtitle">Subtitle</label>
        <input
          type="text"
          id="bookSubtitle"
          placeholder="e.g. A psychologist's guide to recognizing and softening your self-sabotage"
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="hint">Optional — helps clarify the book's purpose.</p>

        <label htmlFor="bookAuthor">Author</label>
        <input
          type="text"
          id="bookAuthor"
          placeholder="Your name"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="hint">Optional — defaults to "Anonymous" if not provided.</p>

        <label htmlFor="bookTopic">Topic / Book Idea</label>
        <textarea
          id="bookTopic"
          placeholder="What is this book about? Describe the central idea in a sentence or two."
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="hint">Required — this is the core idea Claude will develop.</p>

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
            style={{ marginTop: "8px" }}
          />
        )}

        <label htmlFor="bookAudience">Target Audience</label>
        <input
          type="text"
          id="bookAudience"
          placeholder="e.g. Adults who struggle with trust after being hurt"
          value={targetAudience}
          onChange={(e) => setTargetAudience(e.target.value)}
          disabled={isSubmitting}
        />
        <p className="hint">Who is this book for? Optional — I can infer this from the topic.</p>
      </div>

      <div className="form-section">
        <h3 className="section-title">Additional Information</h3>

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

        <label htmlFor="additionalInstructions">Additional Instructions</label>
        <textarea
          id="additionalInstructions"
          placeholder="Themes to include, personal angle, specific examples, or anything else you want Claude to know."
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {error && <div className="error">{error}</div>}

      <div className="row">
        <button className="btn" onClick={handleGenerate} disabled={isSubmitting}>
          {isSubmitting ? "Generating..." : "Generate Book"}
        </button>
      </div>

      <style jsx>{`
        .form-section {
          margin-bottom: 36px;
        }

        .section-title {
          font-family: var(--mono);
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 18px;
        }

        .hint {
          font-size: 12px;
          color: var(--ink-faint);
          line-height: 1.5;
          margin: 4px 0 0;
        }
      `}</style>
    </div>
  );
}
