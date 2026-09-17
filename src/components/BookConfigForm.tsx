"use client";

import { useCallback, useEffect, useState } from "react";
import { useBook } from "@/context/BookContext";
import { BookConfig, Attachment } from "@/lib/types";
import { CategorySelect } from "./book-form/CategorySelect";
import { AttachmentField } from "./book-form/AttachmentField";
import { ManualPaymentPanel } from "./book-form/ManualPaymentPanel";
import {
  AGE_RANGES,
  BUYER_TYPES,
  CHAPTER_SUBTITLE_OPTIONS,
  DESIRED_LENGTHS,
  FONT_SIZES,
  FONT_TYPES,
  READING_LEVELS,
  TONES,
  WRITING_STYLES,
} from "./book-form/options";

const TOTAL_STEPS = 5;

const STEP_EYEBROWS = [
  "Book Creation & Kindle Publishing Studio",
  "Audience",
  "Direction",
  "Structure",
  "Review",
];

const STEP_HEADINGS = [
  "What story lives in your mind?",
  "Add content details.",
  "Set the tone and angle.",
  "Shape the manuscript.",
  "Ready to start writing.",
];

const STEP_SUBS = [
  "Pick a category and talk a little about what you want to write.",
  "Add a title, age range, reading level, and buying audience for the book.",
  "Pick the voice that fits the subject best.",
  "Shape the manuscript.",
  "Confirm the details below, then I'll begin drafting your manuscript.",
];

export function BookConfigForm() {
  const { actions } = useBook();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Core idea
  const [categoryId, setCategoryId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [topic, setTopic] = useState("");

  // Book details
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [readingLevel, setReadingLevel] = useState("");
  const [buyerType, setBuyerType] = useState("");
  const [educationalGoals, setEducationalGoals] = useState("");
  const [emotionalGoals, setEmotionalGoals] = useState("");

  // Style & tone
  const [tone, setTone] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [fontType, setFontType] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [visualStyle, setVisualStyle] = useState("");

  // Structure
  const [themes, setThemes] = useState("");
  const [numberOfChapters, setNumberOfChapters] = useState("");
  const [desiredLength, setDesiredLength] = useState("");
  const [chapterSubtitles, setChapterSubtitles] = useState("");
  const [imagesPerChapter, setImagesPerChapter] = useState("");

  // Access
  const [accessToken, setAccessToken] = useState("");
  const [tokenRequired, setTokenRequired] = useState(false);

  const resolvedCategory = categoryId === "other" ? customCategory.trim() : categoryId;

  useEffect(() => {
    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data) => {
        if (data.user) {
          setIsAdmin(data.user.isAdmin);
          setUserEmail(data.user.email ?? null);
          setUserName(data.user.name ?? null);
          if (data.user.accessToken) setAccessToken(data.user.accessToken);
        }
      })
      .catch(() => {});

    fetch("/api/config")
      .then((response) => response.json())
      .then((data) => {
        if (data.config) setTokenRequired(data.config.tokenRequired);
      })
      .catch(() => {});
  }, []);

  const validateStep = useCallback(
    (step: number): boolean => {
      if (step === 1) {
        if (!resolvedCategory) {
          setError("Please select or enter a category / genre.");
          return false;
        }
        if (!topic.trim()) {
          setError("Please tell me what your book is about.");
          return false;
        }
      }

      if (step === TOTAL_STEPS && tokenRequired && !isAdmin && !accessToken.trim()) {
        setError("An access token is required to generate books.");
        return false;
      }

      setError("");
      return true;
    },
    [resolvedCategory, topic, tokenRequired, isAdmin, accessToken]
  );

  const goToNextStep = () => {
    if (validateStep(currentStep) && currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const buildConfig = (): BookConfig => {
    const perChapter = imagesPerChapter ? Number.parseInt(imagesPerChapter, 10) : 0;

    return {
      title: title.trim(),
      subtitle: "",
      author: author.trim() || "Anonymous",
      topic: topic.trim(),
      subject: topic.trim(),
      genre: resolvedCategory,
      bookCategory: resolvedCategory,
      targetAudience: "",
      ageRange: ageRange.trim(),
      readingLevel: readingLevel.trim(),
      buyerType: buyerType.trim(),
      tone,
      writingStyle,
      desiredLength,
      numberOfChapters: numberOfChapters ? Number.parseInt(numberOfChapters, 10) : 0,
      themes: themes.trim() || undefined,
      chapterSubtitles: chapterSubtitles === "yes",
      educationalGoals: educationalGoals.trim(),
      emotionalGoals: emotionalGoals.trim(),
      visualStyle: visualStyle.trim(),
      fontPreference: fontType.trim(),
      fontSize: fontSize.trim(),
      pageSize: "",
      // No general-purpose instructions field: structure is captured precisely.
      additionalInstructions: "",
      specializedCategory: "",
      imageGeneration: { enabled: false, provider: "none" },
      numberOfImages: 0,
      imagesPerChapter: perChapter,
      translateTo: undefined,
      attachments,
      accessToken: tokenRequired ? accessToken.trim() : undefined,
    };
  };

  const handleGenerate = async () => {
    if (!validateStep(currentStep)) return;

    setError("");
    setIsSubmitting(true);

    try {
      actions.setConfig(buildConfig());
      actions.setStatus("concept");
    } catch (err: any) {
      setError(err.message || "Failed to generate book");
      setIsSubmitting(false);
    }
  };

  const canGenerate =
    Boolean(resolvedCategory && topic.trim()) && (!tokenRequired || isAdmin || Boolean(accessToken.trim()));

  const progressPercent = (currentStep / TOTAL_STEPS) * 100;

  return (
    <div className="form-container">
      <div className="progress-row">
        <span className="progress-label">
          STEP {currentStep} / {TOTAL_STEPS}
        </span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="eyebrow">{STEP_EYEBROWS[currentStep - 1]}</div>
      <h1 className="hero-heading">{STEP_HEADINGS[currentStep - 1]}</h1>
      {currentStep !== 4 && <p className="step-sub">{STEP_SUBS[currentStep - 1]}</p>}

      {error && <div className="error">{error}</div>}
      {notice && <div className="error">{notice}</div>}

      {currentStep === 1 && (
        <section className="step active">
          <div className="field">
            <label htmlFor="bookCategory">Category / genre</label>
            <CategorySelect
              categoryId={categoryId}
              customCategory={customCategory}
              onChange={(nextCategory, nextCustomCategory) => {
                setCategoryId(nextCategory);
                setCustomCategory(nextCustomCategory);
              }}
              disabled={isSubmitting}
            />
          </div>
          <div className="field">
            <label htmlFor="topic">What do you want to write?</label>
            <textarea
              id="topic"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Describe the book you have in mind..."
              disabled={isSubmitting}
            />
          </div>
        </section>
      )}

      {currentStep === 2 && (
        <section className="step active">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="title">Working title <span className="hint">optional</span></label>
              <input id="title" value={title} onChange={(event) => setTitle(event.target.value)} disabled={isSubmitting} />
            </div>
            <div className="field">
              <label htmlFor="author">Author <span className="hint">optional</span></label>
              <input id="author" value={author} onChange={(event) => setAuthor(event.target.value)} disabled={isSubmitting} />
            </div>
            <div className="field">
              <label htmlFor="ageRange">Age range</label>
              <select id="ageRange" value={ageRange} onChange={(event) => setAgeRange(event.target.value)} disabled={isSubmitting}>
                <option value="">Select an age range</option>
                {AGE_RANGES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="readingLevel">Reading level</label>
              <select id="readingLevel" value={readingLevel} onChange={(event) => setReadingLevel(event.target.value)} disabled={isSubmitting}>
                <option value="">Select a reading level</option>
                {READING_LEVELS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="buyerType">Buying audience</label>
              <select id="buyerType" value={buyerType} onChange={(event) => setBuyerType(event.target.value)} disabled={isSubmitting}>
                <option value="">Select an audience</option>
                {BUYER_TYPES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
          </div>
        </section>
      )}

      {currentStep === 3 && (
        <section className="step active">
          <div className="form-grid">
            <div className="field">
              <label htmlFor="writingStyle">Writing style</label>
              <select id="writingStyle" value={writingStyle} onChange={(event) => setWritingStyle(event.target.value)} disabled={isSubmitting}>
                <option value="">Select a style</option>
                {WRITING_STYLES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="tone">Tone</label>
              <select id="tone" value={tone} onChange={(event) => setTone(event.target.value)} disabled={isSubmitting}>
                <option value="">Select a tone</option>
                {TONES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fontType">Font</label>
              <select id="fontType" value={fontType} onChange={(event) => setFontType(event.target.value)} disabled={isSubmitting}>
                <option value="">Select a font</option>
                {FONT_TYPES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="fontSize">Font size</label>
              <select id="fontSize" value={fontSize} onChange={(event) => setFontSize(event.target.value)} disabled={isSubmitting}>
                <option value="">Select a size</option>
                {FONT_SIZES.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="field form-group-wide">
              <label htmlFor="visualStyle">Visual style <span className="hint">optional</span></label>
              <input id="visualStyle" value={visualStyle} onChange={(event) => setVisualStyle(event.target.value)} disabled={isSubmitting} />
            </div>
          </div>
        </section>
      )}

      {currentStep === 4 && (
        <section className="step active">
          <div className="form-grid">
            <div className="field form-group-wide">
              <label htmlFor="themes">Themes <span className="hint">optional</span></label>
              <input id="themes" value={themes} onChange={(event) => setThemes(event.target.value)} placeholder="Ideas, questions, or themes to explore" disabled={isSubmitting} />
            </div>
            <div className="field">
              <label htmlFor="numberOfChapters">Number of chapters <span className="hint">optional</span></label>
              <input id="numberOfChapters" type="number" min="1" max="50" value={numberOfChapters} onChange={(event) => setNumberOfChapters(event.target.value)} disabled={isSubmitting} />
            </div>
            <div className="field">
              <label htmlFor="desiredLength">Book length <span className="hint">optional</span></label>
              <select id="desiredLength" value={desiredLength} onChange={(event) => setDesiredLength(event.target.value)} disabled={isSubmitting}>
                <option value="">Select a length</option>
                {DESIRED_LENGTHS.map((option) => <option key={option}>{option}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="chapterSubtitles">Chapter subtitles <span className="hint">optional</span></label>
              <select id="chapterSubtitles" value={chapterSubtitles} onChange={(event) => setChapterSubtitles(event.target.value)} disabled={isSubmitting}>
                <option value="">Choose an option</option>
                {CHAPTER_SUBTITLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="imagesPerChapter">Number of images per chapter <span className="hint">optional</span></label>
              <input id="imagesPerChapter" type="number" min="0" max="20" value={imagesPerChapter} onChange={(event) => setImagesPerChapter(event.target.value)} disabled={isSubmitting} />
            </div>
          </div>
          <div className="field">
            <label>Attachments <span className="hint">optional</span></label>
            <AttachmentField attachments={attachments} onChange={setAttachments} disabled={isSubmitting} />
          </div>
        </section>
      )}

      {currentStep === 5 && (
        <section className="step active">
          {!isAdmin && (
            <ManualPaymentPanel
              accessToken={accessToken}
              onAccessTokenChange={setAccessToken}
              signedInEmail={userEmail}
              signedInName={userName}
              tokenRequired={tokenRequired}
              disabled={isSubmitting}
            />
          )}
          {tokenRequired && isAdmin && <p className="hint">Your administrator access token will be used automatically.</p>}
          <div className="review-grid">
            <div><strong>Category:</strong> {resolvedCategory || "Not set"}</div>
            <div><strong>Topic:</strong> {topic || "Not set"}</div>
            <div><strong>Style:</strong> {writingStyle || "Not set"}</div>
            <div><strong>Tone:</strong> {tone || "Not set"}</div>
            <div><strong>Book length:</strong> {desiredLength || "Not set"}</div>
            <div><strong>Chapters:</strong> {numberOfChapters || "Automatic"}</div>
            <div><strong>Chapter subtitles:</strong> {chapterSubtitles === "yes" ? "Yes" : chapterSubtitles === "no" ? "No" : "Not set"}</div>
            <div><strong>Images per chapter:</strong> {imagesPerChapter || "0"}</div>
            <div><strong>Attachments:</strong> {attachments.length}</div>
          </div>
        </section>
      )}

      <div className="nav-row">
        {currentStep > 1 && <button type="button" className="btn btn-secondary" onClick={goToPrevStep} disabled={isSubmitting}>Back</button>}
        {currentStep < TOTAL_STEPS ? (
          <button type="button" className="btn btn-primary ml-auto" onClick={goToNextStep} disabled={isSubmitting}>Continue</button>
        ) : (
          <button type="button" className="btn btn-primary ml-auto" onClick={handleGenerate} disabled={isSubmitting || !canGenerate}>
            {isSubmitting ? "Starting..." : "Generate Book"}
          </button>
        )}
      </div>
    </div>
  );
}
