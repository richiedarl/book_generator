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
  "Warm & conversational",
  "Clinical & precise",
  "Narrative-led",
  "Direct & practical",
  "Authoritative",
  "Warm & Supportive",
  "Friendly & Informative",
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

const AGE_RANGES = [
  "3–5",
  "6–8",
  "9–12",
  "13–18",
  "18–25",
  "25–35",
  "35–50",
  "50+",
  "All Ages",
] as const;

const READING_LEVELS = [
  "Early Reader (Grades K–2)",
  "Developing Reader (Grades 3–5)",
  "Fluent Reader (Grades 6–8)",
  "Advanced (Grades 9–12)",
  "College / Adult",
  "General Audience",
] as const;

const BUYER_TYPES = [
  "Parents / Guardians",
  "Teachers / Educators",
  "Students",
  "Professionals",
  "Self-Help / Personal Growth",
  "Hobbyists / Enthusiasts",
  "Academics / Researchers",
  "General Readers",
  "Gift Buyers",
] as const;

interface PricingConfig {
  purchaseTokenPriceCents: number;
  purchaseTokenUses: number;
  purchaseTokenExpiryDays: number;
}

export function BookConfigForm() {
  const { actions } = useBook();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

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
  const [structureNotes, setStructureNotes] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [finalNotes, setFinalNotes] = useState("");

  // Access token state
  const [accessToken, setAccessToken] = useState("");
  const [tokenRequired, setTokenRequired] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [tokenModalMode, setTokenModalMode] = useState<"purchase" | "email">("purchase");
  const [emailForToken, setEmailForToken] = useState("");
  const [tokenStep, setTokenStep] = useState<"options" | "purchased" | "emailed">("options");
  const [tokenGenerating, setTokenGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState("");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig>({
    purchaseTokenPriceCents: 4900,
    purchaseTokenUses: 20,
    purchaseTokenExpiryDays: 30,
  });

  const resolvedCategory = category === "other" ? customCategory.trim() : category;

  // Category search state
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch token requirement config and user session on mount
  useEffect(() => {
    // Check if user is admin
    fetch("/api/auth/me")
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setIsAdmin(data.user.isAdmin);
          // If admin has an access token, use it automatically
          if (data.user.accessToken) {
            setAccessToken(data.user.accessToken);
          }
        }
      })
      .catch(() => {});

    fetch("/api/config")
      .then(res => res.json())
      .then(data => {
        if (data.config) {
          setTokenRequired(data.config.tokenRequired);
        }
        setIsCheckingAuth(false);
      })
      .catch(() => {
        setIsCheckingAuth(false);
      });

    fetch("/api/pricing")
      .then(res => res.json())
      .then(data => {
        if (data.pricing) setPricing(data.pricing);
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
      case 5:
        if (tokenRequired && !isAdmin && !accessToken) {
          setError("Please provide an access token or get one using the button below.");
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
        additionalInstructions: [structureNotes, additionalInstructions, finalNotes]
          .filter(Boolean)
          .join("\n\n"),
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

  const canGenerate = resolvedCategory && topic.trim() && (!tokenRequired || isAdmin || accessToken);

  const stepTitles = [
    "Book Details",
    "Audience & Content",
    "Style & Tone",
    "Supporting Materials",
    "Review & Generate",
  ];

  // Progress percentage
  const progressPercent = (currentStep / totalSteps) * 100;

  // Step content for the main heading / subheading
  const stepEyebrow = [
    "Book Creation & Kindle Publishing Studio",
    "Audience",
    "Direction",
    "Structure",
    "Review",
  ];

  const stepHeadings = [
    "What story lives in your mind?",
    "Who is this book for?",
    "Set the tone and angle.",
    "Shape the manuscript.",
    "Ready to start writing.",
  ];

  const stepSubs = [
    "Pick a category, give me a working title or topic, who it's for, and anything else you want covered.",
    "Describe the reader you're writing to — their situation, struggles, or stage of life.",
    "Pick the voice that fits the subject best.",
    "Give me any structural preferences — chapter count, themes to include, length.",
    "Confirm the details below, then I'll begin drafting your manuscript.",
  ];

  return (
    <div className="form-container">
      {/* Progress Indicator */}
      <div className="progress-row">
        <span className="progress-label">STEP {currentStep} / {totalSteps}</span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Step Header */}
      <div className="eyebrow">{stepEyebrow[currentStep - 1]}</div>
      <h1 className="hero-heading">{stepHeadings[currentStep - 1]}</h1>
      <p className="step-sub">{stepSubs[currentStep - 1]}</p>

      {error && <div className="error">{error}</div>}

      {/* Step 1: Book Details */}
      <div className={`step ${currentStep === 1 ? "active" : ""}`} data-step="1">
        <div className="field">
          <label htmlFor="bookCategory">Category / Genre</label>
          <div className="category-selector relative" ref={categoryDropdownRef}>
            <div className="category-input-wrapper">
              <input
                type="text"
                id="bookCategory"
                placeholder="Search or select a category..."
                value={category ? CATEGORIES.find(c => c.id === category)?.name || (category === "other" ? customCategory : "") : categorySearch}
                onClick={() => setShowCategoryDropdown(true)}
                onChange={(e) => {
                  setCategory("");
                  setCustomCategory("");
                  setCategorySearch(e.target.value);
                  setShowCategoryDropdown(true);
                }}
                onFocus={() => {
                  if (category) {
                    setCategory("");
                    setCustomCategory("");
                    setCategorySearch("");
                  }
                  setShowCategoryDropdown(true);
                }}
                disabled={isSubmitting}
                className="flex-1 cursor-pointer"
              />
              <span
                onClick={(e) => { e.stopPropagation(); setShowCategoryDropdown(!showCategoryDropdown); }}
                className="shrink-0 cursor-pointer select-none px-3 font-mono text-xs text-[var(--text-muted)]"
              >
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
                className="custom-category-input mt-2.5"
              />
            )}

            {showCategoryDropdown && (
              <div className="category-dropdown">
                <div className="category-list">
                  {filteredCategories.length > 0 ? filteredCategories.map((cat) => (
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
                  )) : (
                    <div className="category-empty">No categories found</div>
                  )}
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
          <p className="hint">Required — this is the seed the system will grow into your book.</p>
        </div>

        <div className="field">
          <label htmlFor="bookTopic">Working Title or Topic</label>
          <textarea
            id="bookTopic"
            placeholder="e.g. Why do we push away the people we love? Or: How to break free from self-sabotage in relationships."
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            disabled={isSubmitting}
            className="min-h-24"
          />
        </div>
      </div>

      {/* Step 2: Audience & Content */}
      <div className={`step ${currentStep === 2 ? "active" : ""}`} data-step="2">
        <div className="field">
          <label htmlFor="targetAudience">Who is this book for?</label>
          <textarea
            id="targetAudience"
            placeholder="e.g. adults who struggle to trust people after being hurt"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            disabled={isSubmitting}
            className="min-h-24"
          />
          <p className="hint">Required — who should read this?</p>
        </div>

        <div className="field">
          <label htmlFor="bookTitle">Book Title</label>
          <input
            type="text"
            id="bookTitle"
            placeholder="Leave blank and a title will be suggested"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="ageRange">Age Range</label>
            <select
              id="ageRange"
              value={ageRange}
              onChange={(e) => setAgeRange(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select age range</option>
              {AGE_RANGES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="readingLevel">Reading Level</label>
            <select
              id="readingLevel"
              value={readingLevel}
              onChange={(e) => setReadingLevel(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Select reading level</option>
              {READING_LEVELS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="buyerType">Who Buys This Book?</label>
          <select
            id="buyerType"
            value={buyerType}
            onChange={(e) => setBuyerType(e.target.value)}
            disabled={isSubmitting}
          >
            <option value="">Select buyer type</option>
            {BUYER_TYPES.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="grid-2">
          <div className="field">
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
          <div className="field">
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

      {/* Step 3: Style & Tone */}
      <div className={`step ${currentStep === 3 ? "active" : ""}`} data-step="3">
        <div className="field">
          <label>Tone</label>
          <div className="choice-grid">
            {TONES.map((t) => (
              <div
                key={t}
                className={`choice-card ${tone === t ? "selected" : ""}`}
                onClick={() => setTone(t)}
              >
                <div className="name">{t}</div>
                <div className="desc">Selected style</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid-2">
          <div className="field">
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
          <div className="field">
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
        </div>

        <div className="grid-2">
          <div className="field">
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
          <div className="field">
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

        <div className="field">
          <label htmlFor="numberOfChapters">Number of Chapters</label>
          <input
            type="number"
            id="numberOfChapters"
            min="1"
            max="50"
            placeholder="Leave blank for auto"
            value={numberOfChapters}
            onChange={(e) => setNumberOfChapters(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="hint">Optional — the system will determine the optimal chapter count based on your desired length.</p>
        </div>

        <div className="field">
          <label htmlFor="visualStyle">Visual Style (for illustrations)</label>
          <input
            type="text"
            id="visualStyle"
            placeholder="e.g. Clean minimal, Watercolor, Educational diagram, Illustration style"
            value={visualStyle}
            onChange={(e) => setVisualStyle(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="hint">Used for illustration prompts when image generation is enabled.</p>
        </div>
      </div>

      {/* Step 4: Supporting Materials */}
      <div className={`step ${currentStep === 4 ? "active" : ""}`} data-step="4">
        <div className="field">
          <label htmlFor="structureNotes">Themes, Chapters, Length <span className="hint">optional</span></label>
          <textarea
            id="structureNotes"
            placeholder="e.g. 12 chapters, include a chapter on attachment styles, aim for 40,000 words"
            value={structureNotes}
            onChange={(e) => setStructureNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        {/* Access Token Field - Only show for non-admins when token is required */}
        {tokenRequired && !isAdmin && !accessToken && (
          <div className="token-required-section">
            <div className="token-prompt">
              <div className="token-prompt-text">
                <span>💡</span>
                <p>A valid access token is required to generate books.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setTokenModalMode("purchase");
                  setShowTokenModal(true);
                  setTokenStep("options");
                }}
                disabled={isSubmitting}
              >
                Get Access Token
              </button>
            </div>
          </div>
        )}

        {tokenRequired && !isAdmin && accessToken && (
          <div className="token-field">
            <label htmlFor="accessToken">
              Access Token
            </label>
            <input
              type="password"
              id="accessToken"
              placeholder="Enter your access token (sk-...)"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="button"
              className="btn-remove"
              onClick={async () => {
                // Check remaining uses before clearing
                const res = await fetch("/api/tokens/validate", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token: accessToken }),
                });
                const data = await res.json();
                if (data.valid) {
                  setGeneratedToken("");
                  setTokenStep("options");
                }
                setAccessToken("");
              }}
              disabled={isSubmitting}
            >
              ✕
            </button>
            {generatedToken && (
              <p className="hint">Token valid — uses remaining: {tokenStep === "purchased" ? "20" : "1"}</p>
            )}
          </div>
        )}

        {/* Token Modal */}
        {showTokenModal && (
          <div className="modal-overlay" onClick={() => !tokenGenerating && setShowTokenModal(false)}>
            <div className="token-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Get an Access Token</h3>
                <button
                  className="modal-close"
                  onClick={() => !tokenGenerating && setShowTokenModal(false)}
                  disabled={tokenGenerating}
                >
                  ✕
                </button>
              </div>

              {tokenStep === "options" && (
                <>
                  <div className="token-option">
                    <div className="token-option-content">
                      <div className="token-option-title">Purchase a Token</div>
                      <div className="token-option-desc">{pricing.purchaseTokenUses} book generations • {pricing.purchaseTokenExpiryDays}-day expiry</div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setTokenStep("purchased")}
                      disabled={tokenGenerating}
                    >
                      Purchase
                    </button>
                  </div>

                  <div className="token-divider">
                    <span>or</span>
                  </div>

                  <div className="token-option">
                    <div className="token-option-content">
                      <div className="token-option-title">Request via Email</div>
                      <div className="token-option-desc">Enter your email — we'll send you a single-use token</div>
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => setTokenStep("emailed")}
                      disabled={tokenGenerating}
                    >
                      Use Email
                    </button>
                  </div>
                </>
              )}

              {tokenStep === "purchased" && (
                <div className="token-purchase-form">
                  <div className="token-info">
                    <p><strong>Cost:</strong> ${(pricing.purchaseTokenPriceCents / 100).toFixed(2)}</p>
                    <p><strong>Uses:</strong> {pricing.purchaseTokenUses} book generations</p>
                    <p><strong>Expiry:</strong> {pricing.purchaseTokenExpiryDays} days</p>
                  </div>
                  {paymentConfirmed ? (
                    <div className="token-result">
                      <div className="token-display">
                        <code>{generatedToken}</code>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedToken);
                            setAccessToken(generatedToken);
                            setShowTokenModal(false);
                            setTokenStep("options");
                          }}
                        >
                          Copy & Use
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          // Simulate payment confirmation step
                          const price = `$${(pricing.purchaseTokenPriceCents / 100).toFixed(2)}`;
                          const confirmed = window.confirm(`This will process a ${price} payment for a token with ${pricing.purchaseTokenUses} uses and ${pricing.purchaseTokenExpiryDays}-day expiry. Proceed?`);
                          if (!confirmed) return;

                          setTokenGenerating(true);
                          try {
                            const res = await fetch("/api/tokens/purchase", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({}),
                            });
                            const data = await res.json();
                            if (data.token) {
                              setGeneratedToken(data.token);
                              setPaymentConfirmed(true);
                              // Auto-apply the token
                              setAccessToken(data.token);
                            } else {
                              setError(data.error || "Failed to generate token");
                            }
                          } catch (err: any) {
                            setError(err.message || "Failed to generate token");
                          } finally {
                            setTokenGenerating(false);
                          }
                        }}
                        disabled={tokenGenerating}
                      >
                        {tokenGenerating ? "Processing…" : `$${(pricing.purchaseTokenPriceCents / 100).toFixed(2)} — Get Token`}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setTokenStep("options")}
                        disabled={tokenGenerating}
                      >
                        Back
                      </button>
                    </>
                  )}
                </div>
              )}

              {tokenStep === "emailed" && (
                <div className="token-email-form">
                  {generatedToken ? (
                    <div className="token-result">
                      <div className="token-display">
                        <code>{generatedToken}</code>
                        <button
                          className="btn btn-secondary"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedToken);
                            setAccessToken(generatedToken);
                            setShowTokenModal(false);
                            setTokenStep("options");
                          }}
                        >
                          Copy & Use
                        </button>
                      </div>
                      <p className="hint">This token is single-use. It will be consumed when you generate a book.</p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="email"
                        className="email-input"
                        placeholder="you@example.com"
                        value={emailForToken}
                        onChange={(e) => setEmailForToken(e.target.value)}
                        disabled={tokenGenerating}
                      />
                      <button
                        className="btn btn-primary"
                        onClick={async () => {
                          setTokenGenerating(true);
                          try {
                            const res = await fetch("/api/tokens/email", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ email: emailForToken }),
                            });
                            const data = await res.json();
                            if (data.token) {
                              setGeneratedToken(data.token);
                              setAccessToken(data.token);
                            } else {
                              setError(data.error || "Failed to generate token");
                            }
                          } catch (err: any) {
                            setError(err.message || "Failed to generate token");
                          } finally {
                            setTokenGenerating(false);
                          }
                        }}
                        disabled={tokenGenerating || !emailForToken.trim()}
                      >
                        {tokenGenerating ? "Sending…" : "Get Token via Email"}
                      </button>
                      <button
                        className="btn btn-secondary"
                        onClick={() => setTokenStep("options")}
                        disabled={tokenGenerating}
                      >
                        Back
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {tokenRequired && isAdmin && (
          <p className="hint">As an admin, your access token is automatically used for book generation.</p>
        )}

        <div className="field">
          <label htmlFor="numberOfImages">Number of Images</label>
          <input
            type="number"
            id="numberOfImages"
            min="0"
            max="50"
            placeholder="0 (default — no images)"
            value={numberOfImages}
            onChange={(e) => setNumberOfImages(e.target.value)}
            disabled={isSubmitting}
          />
          <p className="hint">Image instructions will be created for this many images. Actual generation happens after the book is complete (optional).</p>
        </div>

        <div className="field">
          <label htmlFor="attachments">Supporting Attachments</label>
          <div className="attachments-area">
            <input
              type="file"
              id="attachments"
              multiple
              accept=".txt,.md,.pdf,.doc,.docx,.json,.png,.jpg,.jpeg,.webp"
              onChange={handleFileUpload}
              disabled={isSubmitting}
              className="hidden"
              ref={(el) => {
                // Store a reference but don't auto-click
                if (el) (el as any)._fileInput = true;
              }}
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => document.getElementById("attachments")?.click()}
              disabled={isSubmitting}
            >
              📎 Add Files
            </button>
            <p className="hint">Upload research notes, outlines, reference materials, or images (max 10MB each). Text files will be read and provided to the system.</p>

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
        </div>

        <div className="field">
          <label htmlFor="additionalInstructions">Additional Instructions</label>
          <textarea
            id="additionalInstructions"
            placeholder="Specific angles, themes, examples, or anything else the system should know. (Optional)"
            value={additionalInstructions}
            onChange={(e) => setAdditionalInstructions(e.target.value)}
            disabled={isSubmitting}
          />
        </div>
      </div>

      {/* Step 5: Review & Generate */}
      <div className={`step ${currentStep === 5 ? "active" : ""}`} data-step="5">
        <p className="hint">Review your configuration below, then click Generate Book to begin.</p>

        <div className="field final-notes-field">
          <label htmlFor="finalNotes">Final Notes <span className="hint">optional</span></label>
          <textarea
            id="finalNotes"
            placeholder="Anything else I should know before we begin?"
            value={finalNotes}
            onChange={(e) => setFinalNotes(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

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
            <p><strong>Tone:</strong> {tone || "—"}</p>
            <p><strong>Writing Style:</strong> {writingStyle || "Conversational"}</p>
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
            {tokenRequired && (
              <p><strong>Token Status:</strong> {accessToken ? (isAdmin ? "Admin (auto)" : "✓ Token provided") : "⚠ No token — get one below"}</p>
            )}
          </div>
        </div>

        {additionalInstructions && (
          <div className="review-notes">
            <h4>Additional Instructions</h4>
            <p>{additionalInstructions}</p>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="nav-row">
        {currentStep > 1 && (
          <button
            className="btn btn-secondary"
            onClick={goToPrevStep}
            disabled={isSubmitting}
          >
            ← Back
          </button>
        )}

        {currentStep < totalSteps ? (
          <button
            onClick={goToNextStep}
            disabled={isSubmitting}
            className={`btn btn-primary ${currentStep === 1 ? "ml-auto" : ""}`}
          >
            Continue
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={isSubmitting || !canGenerate}
          >
            {isSubmitting ? "Generating…" : "Generate Book"}
          </button>
        )}
      </div>
    </div>
  );
}
