"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useBook } from "@/context/BookContext";
import { BookConfig, Attachment } from "@/lib/types";

const CATEGORIES = [
  { id: "human-psychology", name: "Human Psychology & Behavior", description: "Behavioral science, cognitive psychology, mental health" },
  { id: "food-culture", name: "Food, Fruits, Culture & Culinary", description: "Cuisine, food history, cultural food traditions" },
  { id: "childrens-learning", name: "Children's Creative Learning & Stories (ages 3–12)", description: "Educational stories, picture books, early learning" },
  { id: "animals-nature", name: "Animals, Wildlife, Nature & Earth", description: "Wildlife, ecology, natural science, earth science" },
  { id: "travel", name: "Travel, Tour, Vacation & Destination", description: "Travel guides, destination guides, adventure travel" },
  { id: "sports-fitness", name: "Sports, Games, Fitness & Athletic Activities", description: "Sports training, fitness, games, athletic performance" },
  { id: "technology", name: "Technology", description: "Software, AI, digital innovation, tech trends" },
  { id: "fashion", name: "Fashion", description: "Style, design, fashion history, industry insights" },
  { id: "manufacturing", name: "Resources, Manufacturing & Production", description: "Industrial processes, production, supply chain" },
  { id: "farming", name: "Farming, Agriculture & Food Production", description: "Agriculture, farming techniques, food systems" },
  { id: "history", name: "History", description: "Historical events, biographies, cultural history" },
  { id: "social-cultures", name: "Social Cultures, Traditions & Everyday Life", description: "Sociology, anthropology, cultural traditions" },
  { id: "business-economics", name: "Business, Economics, Money & Investment", description: "Entrepreneurship, finance, investing, economics" },
  { id: "vocation-career", name: "Vocation, Career, Industry & Skills", description: "Career development, vocational skills, professional growth" },
] as const;

const OTHER_CATEGORY = { id: "other", name: "Others", description: "Custom category not listed above" } as const;

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

const FONT_TYPES = [
  "Georgia (Serif)",
  "Garamond (Serif)",
  "Baskerville (Serif)",
  "Times New Roman (Serif)",
  "Arial (Sans-serif)",
  "Helvetica (Sans-serif)",
  "Calibri (Sans-serif)",
] as const;

const FONT_SIZES = [
  "Small (10pt)",
  "Medium (11pt)",
  "Large (12pt)",
  "Extra Large (14pt)",
] as const;

export function BookConfigForm() {
  const { actions } = useBook();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  // Form state
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [author, setAuthor] = useState("");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [ageRange, setAgeRange] = useState("");
  const [readingLevel, setReadingLevel] = useState("");
  const [buyerType, setBuyerType] = useState("");
  const [educationalGoals, setEducationalGoals] = useState("");
  const [emotionalGoals, setEmotionalGoals] = useState("");
  const [writingStyle, setWritingStyle] = useState("");
  const [tone, setTone] = useState("");
  const [desiredLength, setDesiredLength] = useState("");
  const [numberOfChapters, setNumberOfChapters] = useState("");
  const [visualStyle, setVisualStyle] = useState("");
  const [fontType, setFontType] = useState("");
  const [fontSize, setFontSize] = useState("");
  const [numberOfImages, setNumberOfImages] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");

  // Access token state
  const [accessToken, setAccessToken] = useState("");
  const [tokenRequired, setTokenRequired] = useState(false);

  const resolvedCategory = category === "other" ? customCategory.trim() : category;

  // Category search state
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch token requirement config on mount
  useEffect(() => {
    fetch("/api/admin/config")
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setTokenRequired(data.config.tokenRequired);
        }
      })
      .catch(() => {});
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCategoryDropdown]);

  const filteredCategories = CATEGORIES.filter((cat) =>
    cat.name.toLowerCase().includes(categorySearch.toLowerCase()) ||
    cat.description.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const handleCategorySelect = (catId: string) => {
    if (catId === "other") {
      setCategory("other");
      setShowCategoryDropdown(false);
    } else {
      setCategory(catId);
      setCustomCategory("");
      setShowCategoryDropdown(false);
      setCategorySearch("");
    }
  };

  const totalSteps = 5;

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        if (!topic.trim()) {
          setError("Please tell me what your book is about.");
          return false;
        }
        if (!resolvedCategory) {
          setError("Please select or enter a category / genre.");
          return false;
        }
        break;
      case 2:
        if (!targetAudience.trim()) {
          setError("Please specify your target audience.");
          return false;
        }
        break;
    }
    setError("");
    return true;
  }, [topic, resolvedCategory, targetAudience]);

  const goToNextStep = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const handleGenerate = async () => {
    if (!validateStep(currentStep)) return;

    setError("");
    setIsSubmitting(true);

    try {
      const config: BookConfig = {
        title: title.trim(),
        subtitle: subtitle.trim(),
        author: author.trim() || "Anonymous",
        topic: topic.trim(),
        subject: topic.trim(),
        genre: resolvedCategory,
        bookCategory: resolvedCategory,
        targetAudience: targetAudience.trim(),
        ageRange: ageRange.trim(),
        readingLevel: readingLevel.trim(),
        buyerType: buyerType.trim(),
        tone,
        writingStyle,
        desiredLength,
        numberOfChapters: numberOfChapters ? parseInt(numberOfChapters, 10) : 0,
        chapterTitles: undefined,
        educationalGoals: educationalGoals.trim(),
        emotionalGoals: emotionalGoals.trim(),
        visualStyle: visualStyle.trim(),
        fontPreference: fontType.trim(),
        fontSize: fontSize.trim(),
        pageSize: "",
        additionalInstructions: additionalInstructions.trim(),
        referenceMaterial: undefined,
        specializedCategory: "",
        imageGeneration: { enabled: false, provider: "none" },
        numberOfImages: numberOfImages ? parseInt(numberOfImages, 10) : 0,
        translateTo: undefined,
        attachments,
      };

      // Include access token in config if required
      if (tokenRequired) {
        (config as any).accessToken = accessToken;
      }

      actions.setConfig(config);
      actions.setStatus("concept");
    } catch (err: any) {
      setError(err.message || "Failed to generate book");
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(async (file) => {
      const attachment: Attachment = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
      };

      // Read file content for text files
      if (file.type.startsWith("text/") || file.type === "application/json" || file.name.endsWith(".md")) {
        const text = await file.text();
        attachment.content = text;
      }
      // Read file as base64 for images
      else if (file.type.startsWith("image/")) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
        attachment.base64 = base64;
      }

      setAttachments((prev) => [...prev, attachment]);
    });

    // Clear the input so same file can be selected again
    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canGenerate = resolvedCategory && topic.trim();

  const stepTitles = [
    "Book Details",
    "Audience & Content",
    "Style & Tone",
    "Supporting Materials",
    "Review & Generate",
  ];

  return (
    <div id="bookConfigForm">
      {/* Progress Indicator */}
      <div className="progress-bar">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <div
            key={step}
            className={`progress-step ${step < currentStep ? "completed" : step === currentStep ? "active" : ""}`}
          >
            <span className="step-number">{step}</span>
            <span className="step-label">{stepTitles[step - 1]}</span>
            {step < totalSteps && <span className="step-connector" />}
          </div>
        ))}
      </div>

      <div className="form-header">
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
      </div>

      {/* Step 1: Book Details */}
      {currentStep === 1 && (
        <div className="form-section" data-step="1">
          <h3 className="section-title">Step 1: Book Details</h3>

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
          <div className="category-selector">
            <div className="category-input-wrapper">
              <input
                type="text"
                id="bookCategory"
                placeholder={category ? "" : "Search or select a category..."}
                value={category ? CATEGORIES.find(c => c.id === category)?.name || (category === "other" ? customCategory : "") : ""}
                onClick={() => setShowCategoryDropdown(true)}
                onChange={(e) => setCategorySearch(e.target.value)}
                onFocus={() => setShowCategoryDropdown(true)}
                readOnly={!category}
                disabled={isSubmitting}
              />
              <span className="category-dropdown-icon" onClick={(e) => { e.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown); }}>
                {showCategoryDropdown ? "▲" : "▼"}
              </span>
            </div>

            {category === "other" && (
              <input
                type="text"
                id="customCategory"
                placeholder="Enter your custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                disabled={isSubmitting}
                className="custom-category-input"
              />
            )}

            {showCategoryDropdown && (
              <div className="category-dropdown" ref={categoryDropdownRef}>
                <input
                  type="text"
                  placeholder="Search categories..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  className="category-search-input"
                  autoFocus
                />
                <div className="category-list">
                  {filteredCategories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      className={`category-option ${category === cat.id ? "selected" : ""}`}
                      onClick={() => handleCategorySelect(cat.id)}
                      disabled={isSubmitting}
                    >
                      <span className="category-option-name">{cat.name}</span>
                      <span className="category-option-description">{cat.description}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`category-option other-option ${category === "other" ? "selected" : ""}`}
                    onClick={() => handleCategorySelect("other")}
                    disabled={isSubmitting}
                  >
                    <span className="category-option-name">{OTHER_CATEGORY.name}</span>
                    <span className="category-option-description">{OTHER_CATEGORY.description}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2: Audience & Content */}
      {currentStep === 2 && (
        <div className="form-section" data-step="2">
          <h3 className="section-title">Step 2: Audience & Content</h3>

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
          <p className="hint">Who should read this? Required for this step.</p>

          <div className="grid-2">
            <div>
              <label htmlFor="ageRange">Age Range</label>
              <input
                type="text"
                id="ageRange"
                placeholder="e.g. 18-35, 8-12, Adult"
                value={ageRange}
                onChange={(e) => setAgeRange(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label htmlFor="readingLevel">Reading Level</label>
              <input
                type="text"
                id="readingLevel"
                placeholder="e.g. General, Academic, Young Adult"
                value={readingLevel}
                onChange={(e) => setReadingLevel(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <label htmlFor="buyerType">Primary Buyer Type</label>
          <input
            type="text"
            id="buyerType"
            placeholder="e.g. Self-help readers, Parents, Students"
            value={buyerType}
            onChange={(e) => setBuyerType(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="hint">Who typically purchases this type of book?</p>

          <div className="grid-2">
            <div>
              <label htmlFor="educationalGoals">Educational Goals</label>
              <textarea
                id="educationalGoals"
                placeholder="What should readers learn or understand?"
                value={educationalGoals}
                onChange={(e) => setEducationalGoals(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="emotionalGoals">Emotional Goals</label>
              <textarea
                id="emotionalGoals"
                placeholder="How should readers feel? What transformation?"
                value={emotionalGoals}
                onChange={(e) => setEmotionalGoals(e.target.value)}
                disabled={isSubmitting}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Style & Tone */}
      {currentStep === 3 && (
        <div className="form-section" data-step="3">
          <h3 className="section-title">Step 3: Style & Tone</h3>

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
                <option value="">Friendly & Informative (default)</option>
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

          <label htmlFor="numberOfChapters">Number of Chapters</label>
          <input
            type="number"
            id="numberOfChapters"
            min="1"
            max="50"
            placeholder="Leave blank for auto (Claude decides based on length)"
            value={numberOfChapters}
            onChange={(e) => setNumberOfChapters(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="hint">Optional — I'll determine the optimal chapter count based on your desired length.</p>

          <div className="grid-2">
            <div>
              <label htmlFor="fontType">Font Type</label>
              <select
                id="fontType"
                value={fontType}
                onChange={(e) => setFontType(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Georgia (Serif) — Default</option>
                {FONT_TYPES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fontSize">Font Size</label>
              <select
                id="fontSize"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value)}
                disabled={isSubmitting}
              >
                <option value="">Medium (11pt) — Default</option>
                {FONT_SIZES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label htmlFor="visualStyle">Visual Style (for illustrations)</label>
          <input
            type="text"
            id="visualStyle"
            placeholder="e.g. Clean minimal, Watercolor, Educational diagram, Comic style"
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="hint">Used for illustration prompts when image generation is enabled.</p>
        </div>
      )}

      {/* Step 4: Supporting Materials */}
      {currentStep === 4 && (
        <div className="form-section" data-step="4">
          <h3 className="section-title">Step 4: Supporting Materials</h3>

          {/* Access Token Field - Only show for non-admins when token is required */}
          {tokenRequired && (
            <div className="token-field">
              <label htmlFor="accessToken">Access Token <span className="required">*</span></label>
              <input
                type="password"
                id="accessToken"
                placeholder="Enter your access token (sk-...)"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="hint">Access token is required to generate books. Get your token from an admin or the Admin Panel.</p>
            </div>
          )}

          <label htmlFor="numberOfImages">Number of Images</label>
          <input
            type="number"
            id="numberOfImages"
            min="0"
            max="50"
            placeholder="0 (default — no images) or enter desired count"
            value={numberOfImages}
            onChange={(e) => setNumberOfImages(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="hint">Claude will create image instructions for this many images. Actual generation happens after the book is complete (optional, requires Gemini).</p>

          <label htmlFor="attachments">Supporting Attachments</label>
          <div className="attachments-area">
            <input
              type="file"
              id="attachments"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx,.json,.png,.jpg,.jpeg,.webp"
              onChange={handleFileUpload}
              disabled={isSubmitting}
              style={{ display: "none" }}
              ref={(el) => el?.click()}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => document.getElementById("attachments")?.click()}
              disabled={isSubmitting}
            >
              📎 Add Files
            </button>
            <p className="hint">Upload research notes, outlines, reference materials, or images (max 10MB each). Text files will be read and provided to Claude.</p>

            {attachments.length > 0 && (
              <div className="attachments-list">
                {attachments.map((att) => (
                  <div key={att.id} className="attachment-item">
                    <span className="attachment-info">
                      <span className="attachment-icon">
                        {att.type.startsWith("image/") ? "🖼️" : att.type.startsWith("text/") ? "📄" : "📎"}
                      </span>
                      <span>{att.name}</span>
                      <span className="attachment-size">({(att.size / 1024).toFixed(1)} KB)</span>
                    </span>
                    <button
                      type="button"
                      className="btn-remove"
                      onClick={() => removeAttachment(att.id)}
                      disabled={isSubmitting}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label htmlFor="additionalInstructions">Additional Instructions</label>
          <textarea
            id="additionalInstructions"
            placeholder="Specific angles, themes, examples, or anything else you want Claude to know. (Optional)"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      )}

      {/* Step 5: Review & Generate */}
      {currentStep === 5 && (
        <div className="form-section" data-step="5">
          <h3 className="section-title">Step 5: Review & Generate</h3>
          <p className="hint">Review your configuration below, then click Generate Book to begin.</p>

          <div className="review-grid">
            <div className="review-section">
              <h4>Core Idea</h4>
              <p><strong>Topic:</strong> {topic || "—"}</p>
              <p><strong>Category:</strong> {resolvedCategory || "—"}</p>
            </div>
            <div className="review-section">
              <h4>Book Details</h4>
              <p><strong>Title:</strong> {title || "(auto-generate)"}</p>
              <p><strong>Author:</strong> {author || "Anonymous"}</p>
              <p><strong>Audience:</strong> {targetAudience || "—"}</p>
              <p><strong>Age Range:</strong> {ageRange || "—"}</p>
              <p><strong>Reading Level:</strong> {readingLevel || "—"}</p>
              <p><strong>Buyer Type:</strong> {buyerType || "—"}</p>
            </div>
            <div className="review-section">
              <h4>Style & Tone</h4>
              <p><strong>Writing Style:</strong> {writingStyle || "Conversational"}</p>
              <p><strong>Tone:</strong> {tone || "Friendly & Informative"}</p>
              <p><strong>Length:</strong> {desiredLength || "Medium"}</p>
              <p><strong>Chapters:</strong> {numberOfChapters || "Auto"}</p>
              <p><strong>Font:</strong> {fontType || "Georgia (Serif)"}</p>
              <p><strong>Font Size:</strong> {fontSize || "Medium (11pt)"}</p>
              <p><strong>Visual Style:</strong> {visualStyle || "—"}</p>
            </div>
            <div className="review-section">
              <h4>Supporting Materials</h4>
              <p><strong>Images Requested:</strong> {numberOfImages || "0"}</p>
              <p><strong>Attachments:</strong> {attachments.length} file(s)</p>
            </div>
          </div>

          {additionalInstructions && (
            <div className="review-notes">
              <h4>Additional Instructions</h4>
              <p>{additionalInstructions}</p>
            </div>
          )}
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {/* Navigation Buttons */}
      <div className="form-navigation">
        {currentStep > 1 && (
          <button
            className="btn-secondary"
            onClick={goToPrevStep}
            disabled={isSubmitting}
          >
            ← Back
          </button>
        )}

        {currentStep < totalSteps ? (
          <button
            className="btn-primary"
            onClick={goToNextStep}
            disabled={isSubmitting}
          >
            Continue →
          </button>
        ) : (
          <button
            className="btn-primary btn-generate"
            onClick={handleGenerate}
            disabled={isSubmitting || !canGenerate}
          >
            {isSubmitting ? "Generating..." : "Generate Book"}
          </button>
        )}
      </div>

      <style jsx>{`
        #bookConfigForm {
          max-width: 720px;
          margin: 0 auto;
        }

        /* Progress Bar */
        .progress-bar {
          display: flex;
          gap: 0;
          margin-bottom: 32px;
          overflow-x: auto;
          padding-bottom: 8px;
        }

        .progress-step {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex: 1;
          min-width: 100px;
          position: relative;
          padding: 0 8px;
        }

        .progress-step:not(:last-child)::after {
          content: "";
          position: absolute;
          top: 12px;
          left: 50%;
          right: -50%;
          height: 2px;
          background: var(--line);
          z-index: 0;
        }

        .progress-step.completed:not(:last-child)::after {
          background: var(--accent-forest);
        }

        .step-number {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: var(--paper);
          border: 2px solid var(--line);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-faint);
          z-index: 1;
          transition: all 0.2s ease;
        }

        .progress-step.active .step-number {
          background: var(--accent-forest);
          border-color: var(--accent-forest);
          color: white;
          box-shadow: 0 0 0 3px rgba(59, 93, 80, 0.15);
        }

        .progress-step.completed .step-number {
          background: var(--accent-forest);
          border-color: var(--accent-forest);
          color: white;
        }

        .progress-step.completed .step-number::after {
          content: "✓";
        }

        .step-label {
          font-family: var(--mono);
          font-size: 8.5px;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: var(--ink-faint);
          margin-top: 6px;
          text-align: center;
          line-height: 1.2;
          white-space: normal;
          max-width: 100%;
        }

        .progress-step.active .step-label {
          color: var(--accent-forest);
          font-weight: 600;
        }

        /* Form Header */
        .form-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .eyebrow {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 8px;
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
          margin-left: auto;
          margin-right: auto;
        }

        .hero-note {
          font-size: 13px;
          color: var(--ink-faint);
          margin: 0 0 28px;
          font-style: italic;
        }

        /* Form Sections */
        .form-section {
          margin-bottom: 28px;
          padding: 24px 28px;
          background: var(--paper-soft);
          border: 1px solid var(--line);
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(34, 48, 43, 0.03);
          animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .form-section h3.section-title {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 20px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .form-section h3.section-title::before {
          content: attr(data-step);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--accent-forest);
          color: white;
          font-family: var(--mono);
          font-size: 10px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
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
          margin-top: 18px;
        }

        .form-section label:first-of-type {
          margin-top: 0;
        }

        /* Input styling */
        .form-section input[type="text"],
        .form-section input[type="number"],
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
          box-sizing: border-box;
        }

        .form-section input[type="text"]:focus,
        .form-section input[type="number"]:focus,
        .form-section textarea:focus {
          outline: none;
          border-color: var(--accent-forest);
          box-shadow: 0 0 0 2px rgba(59, 93, 80, 0.1);
          background: #fdfaf5;
        }

        .form-section input[type="text"]:disabled,
        .form-section input[type="number"]:disabled,
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

        /* Category wrapper for custom input */
        .category-wrapper {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        /* Attachments */
        .attachments-area {
          margin-bottom: 18px;
        }

        .attachments-list {
          margin-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .attachment-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 8px;
          gap: 12px;
        }

        .attachment-info {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 0;
        }

        .attachment-icon {
          font-size: 16px;
        }

        .attachment-info span {
          font-size: 13px;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .attachment-size {
          font-size: 11px;
          color: var(--ink-faint);
          font-family: var(--mono);
        }

        .btn-remove {
          background: none;
          border: none;
          color: var(--ink-faint);
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .btn-remove:hover:not(:disabled) {
          background: #fef0f0;
          color: var(--accent-rust);
        }

        .btn-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Review Step */
        .review-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        @media (max-width: 640px) {
          .review-grid {
            grid-template-columns: 1fr;
          }
        }

        .review-section {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 16px;
        }

        .review-section h4 {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 12px;
          padding-bottom: 8px;
          border-bottom: 1px solid var(--line);
        }

        .review-section p {
          margin: 6px 0;
          font-size: 13px;
          color: var(--ink);
          line-height: 1.5;
        }

        .review-section strong {
          color: var(--ink-soft);
          font-weight: 500;
        }

        .review-notes {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: 8px;
          padding: 16px;
        }

        .review-notes h4 {
          font-family: var(--mono);
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent-forest);
          margin: 0 0 8px;
        }

        .review-notes p {
          font-size: 13px;
          color: var(--ink);
          line-height: 1.6;
          white-space: pre-wrap;
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

        /* Navigation Buttons */
        .form-navigation {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid var(--line);
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

        .btn-primary {
          background: var(--accent-forest);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(34, 48, 43, 0.2);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-generate {
          padding: 14px 28px;
          font-size: 12px;
        }

        .btn-secondary {
          background: var(--paper);
          color: var(--ink);
          border: 1.5px solid var(--line);
        }

        .btn-secondary:hover:not(:disabled) {
          background: var(--paper-soft);
          border-color: var(--accent-forest);
          color: var(--accent-forest);
        }

        .btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Category Selector Styles */
        .category-selector {
          position: relative;
        }

        .category-input-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .category-input-wrapper input {
          flex: 1;
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--line);
          border-radius: 8px;
          background: var(--paper);
          font-family: var(--body);
          font-size: 14px;
          color: var(--ink);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
          cursor: pointer;
        }

        .category-input-wrapper input:focus {
          outline: none;
          border-color: var(--accent-forest);
          box-shadow: 0 0 0 2px rgba(59, 93, 80, 0.1);
          background: #fdfaf5;
        }

        .category-input-wrapper input:disabled {
          background: var(--ink-faint);
          cursor: not-allowed;
          opacity: 0.6;
        }

        .category-dropdown-icon {
          font-family: var(--mono);
          font-size: 10px;
          color: var(--ink-soft);
          padding: 0 12px;
          cursor: pointer;
          flex-shrink: 0;
          user-select: none;
        }

        .custom-category-input {
          margin-top: 10px;
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--line);
          border-radius: 8px;
          background: var(--paper);
          font-family: var(--body);
          font-size: 14px;
          color: var(--ink);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .custom-category-input:focus {
          outline: none;
          border-color: var(--accent-forest);
          box-shadow: 0 0 0 2px rgba(59, 93, 80, 0.1);
        }

        .category-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          margin-top: 6px;
          background: var(--paper);
          border: 1.5px solid var(--line);
          border-radius: 8px;
          box-shadow: 0 4px 16px rgba(34, 48, 43, 0.1);
          z-index: 100;
          overflow: hidden;
        }

        .category-search-input {
          width: 100%;
          padding: 10px 14px;
          border: none;
          border-bottom: 1px solid var(--line);
          background: var(--paper-soft);
          font-family: var(--body);
          font-size: 13px;
          color: var(--ink);
        }

        .category-search-input:focus {
          outline: none;
        }

        .category-list {
          max-height: 280px;
          overflow-y: auto;
        }

        .category-option {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          padding: 12px 14px;
          border: none;
          background: transparent;
          text-align: left;
          cursor: pointer;
          transition: background 0.15s ease;
          border-bottom: 1px solid var(--line);
        }

        .category-option:last-child {
          border-bottom: none;
        }

        .category-option:hover:not(:disabled) {
          background: var(--paper-soft);
        }

        .category-option.selected {
          background: rgba(59, 93, 80, 0.08);
        }

        .category-option.other-option {
          border-top: 1px solid var(--line);
          margin-top: 4px;
        }

        .category-option-name {
          font-family: var(--body);
          font-size: 13.5px;
          font-weight: 500;
          color: var(--ink);
          margin-bottom: 2px;
        }

        .category-option-description {
          font-family: var(--body);
          font-size: 11px;
          color: var(--ink-faint);
        }

        .category-option.selected .category-option-name {
          color: var(--accent-forest);
        }

        /* Token field styles */
        .token-field {
          margin-bottom: 18px;
          padding: 16px;
          background: #fef9f0;
          border: 1px solid #f5d6a0;
          border-radius: 8px;
        }

        .token-field label {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--mono);
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
        }

        .token-field .required {
          color: var(--accent-rust);
        }

        .token-field input {
          width: 100%;
          padding: 12px 14px;
          border: 1.5px solid var(--line);
          border-radius: 8px;
          background: var(--paper);
          font-family: var(--mono);
          font-size: 13px;
          color: var(--ink);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }

        .token-field input:focus {
          outline: none;
          border-color: var(--accent-forest);
          box-shadow: 0 0 0 2px rgba(59, 93, 80, 0.1);
        }

        .token-field .hint {
          font-size: 11px;
          color: var(--ink-faint);
          margin-top: 8px;
        }
      `}</style>
    </div>
  );
}