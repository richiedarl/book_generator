# THE SHELF — MASTER DEVELOPMENT INSTRUCTION

## AI BOOK GENERATION, ORCHESTRATION, STORAGE, OPTIONAL VISUALS, TRANSLATION & PUBLISHING

---

# 0. PROJECT IDENTITY

The application is called:

**THE SHELF**

The Shelf is an existing Next.js application for AI-assisted book creation and publishing.

This is an existing project that has already been partially developed.

**DO NOT rebuild the application from scratch.**

**DO NOT discard existing work.**

**DO NOT migrate the project to another framework.**

**DO NOT unnecessarily rewrite working functionality.**

Your first responsibility is to inspect the existing codebase and understand what has already been implemented.

Then continue development from the existing implementation.

---

# 1. PRIMARY PRODUCT CONCEPT

The Shelf is not simply a chat interface.

It is an AI-assisted book creation and publishing system.

The primary responsibility of The Shelf is to allow a user to configure and generate a complete book.

The core architecture is:

```text
THE SHELF
    │
    ├── Claude Opus 5
    │      └── Primary book intelligence, planning, writing,
    │          editing and QA
    │
    ├── Optional Gemini
    │      └── Cover and book image generation
    │
    ├── Translation Service
    │      └── Optional post-generation translation
    │
    ├── Book Assembly
    │      └── Structure, formatting and document preparation
    │
    ├── QA
    │      └── Content and publishing checks
    │
    ├── Export
    │      ├── EPUB
    │      ├── DOCX
    │      ├── PDF
    │      └── KPF / Kindle-ready output where technically supported
    │
    └── Google Drive
           └── Storage of finished books and generated assets
```

### Critical architectural principle

**Claude is required for book generation.**

**Gemini is optional.**

The absence or failure of Gemini must never prevent a user from generating a complete book.

The user must be able to generate a complete, high-quality text-based book even when:

* Gemini is not configured.
* Gemini is unavailable.
* Gemini is unreachable.
* Gemini has insufficient quota.
* Gemini image generation fails.
* The user chooses not to generate images.

---

# 2. FIRST ACTION — INSPECT THE EXISTING PROJECT

Before modifying anything, inspect the existing Next.js codebase.

Determine:

1. Next.js version.
2. React version.
3. TypeScript configuration.
4. App Router or Pages Router.
5. Existing project structure.
6. Existing components.
7. Existing book-generation workflow.
8. Existing AI provider implementation.
9. Existing API routes/server actions.
10. Existing prompts.
11. Existing book state/data models.
12. Existing database/storage.
13. Existing image-generation implementation.
14. Existing translation implementation.
15. Existing export functionality.
16. Existing EPUB generation.
17. Existing DOCX generation.
18. Existing PDF generation.
19. Existing KPF/Kindle handling.
20. Existing Google Drive integration.
21. Existing authentication.
22. Existing environment variables.
23. Existing loading/progress states.
24. Existing error handling.
25. Existing tests.
26. Existing incomplete functionality.

Do not assume functionality is missing simply because it is not obvious from the UI.

Inspect the relevant source files first.

Do not create duplicate implementations of functionality that already exists.

---

# 3. IMPORTANT DEVELOPMENT RULE

Preserve working functionality.

When adding the AI layer:

DO NOT:

* Rewrite the entire application.
* Replace the existing UI unnecessarily.
* Replace the existing styling system unnecessarily.
* Replace working export logic without reason.
* Replace existing storage unnecessarily.
* Create duplicate API routes.
* Create duplicate book-generation systems.
* Create duplicate state-management systems.

Instead:

1. Understand what exists.
2. Identify gaps.
3. Add the missing functionality.
4. Connect the new functionality to the existing system.

---

# 4. APPLICATION ARCHITECTURE

The application should use Next.js as both:

* The frontend application.
* The lightweight server-side orchestration layer.

Do **not** create a separate Laravel, NestJS, Express, or other backend unless the existing project genuinely requires it.

Conceptually:

```text
Browser
   │
   ▼
Next.js Frontend
   │
   ▼
Next.js Server / Route Handlers
   │
   ├── Anthropic SDK
   │       └── Claude Opus 5
   │
   ├── Gemini API
   │       └── Optional image generation
   │
   ├── Translation Provider
   │
   └── Google Drive API
```

All third-party API integrations must be handled server-side.

The browser must never directly receive private API credentials.

---

# 5. INITIAL BOOK CREATION EXPERIENCE

The book-generation experience must **start with the book configuration form**.

The user should not be dropped into a chatbot.

The primary entry point should be something similar to:

```text
CREATE A NEW BOOK

Book Title
[____________________________]

Subtitle
[____________________________]

Author
[____________________________]

Topic / Subject
[____________________________]

Category / Genre
[____________________________]

Target Audience
[____________________________]

Age Range
[____________________________]

Reading Level
[____________________________]

Tone
[____________________________]

Writing Style
[____________________________]

Desired Length
[____________________________]

Number of Chapters
[____________________________]

Book Goals
[____________________________]

Additional Instructions
[____________________________]

[ GENERATE BOOK ]
```

### Category / Genre

**Category / Genre is a required and important field.**

It should allow the user to describe or select the broad type of book they are creating.

Examples:

* Psychology
* Technology
* Business
* Finance
* History
* Science
* Education
* Farming
* Nature
* Children's Education
* Self-Development
* Biography
* Health
* Environment
* Conservation
* Religion
* Fiction
* Other

The implementation may use a dropdown, searchable select, or combined category/genre input depending on the existing UI architecture.

Do not remove the ability for users to provide a custom category.

---

# 6. BOOK CONFIGURATION

The configuration passed to the generation engine may include:

```json
{
  "book_config": {
    "title": "",
    "subtitle": "",
    "author": "",
    "topic": "",
    "subject": "",
    "category": "",
    "genre": "",
    "target_audience": "",
    "age_range": "",
    "reading_level": "",
    "tone": "",
    "writing_style": "",
    "desired_length": "",
    "number_of_chapters": 0,
    "book_goals": "",
    "educational_goals": "",
    "emotional_goals": "",
    "visual_style": "",
    "font_preference": "",
    "page_size": "",
    "additional_instructions": ""
  }
}
```

The user does **not** need to configure image generation before generating the book.

The user does **not** need to configure translation before generating the book.

The primary configuration form should focus on creating the book itself.

---

# 7. AI PROVIDER ARCHITECTURE

The Shelf should use separate providers for different capabilities.

## PRIMARY BOOK ENGINE

**Anthropic Claude Opus 5**

Responsible for:

* Book strategy
* Planning
* Research reasoning
* Outline
* Manuscript
* Editing
* QA
* Publishing metadata

## OPTIONAL IMAGE ENGINE

**Google Gemini**

Responsible only for:

* Book cover artwork
* Chapter illustrations
* Educational illustrations
* Other optional visual assets

## TRANSLATION ENGINE

A dedicated translation-capable AI service/provider.

Conceptually:

```text
AIProvider
└── AnthropicProvider

ImageProvider
└── GeminiImageProvider

TranslationProvider
└── TranslationProviderImplementation
```

Do not scatter API calls throughout React components.

All provider integrations must be server-side.

---

# 8. CLAUDE OPUS 5 — PRIMARY BOOK ENGINE

Claude Opus 5 is the primary intelligence and writing engine.

It should handle:

* Book idea interpretation
* Topic interpretation
* Category/genre interpretation
* Audience identification
* Age determination
* Reading level
* Buyer type
* Primary audience
* Secondary audience
* Title generation
* Subtitle generation
* Title strategy
* Subtitle strategy
* Book positioning
* Main promise
* Book angle
* Unique perspective
* Educational goal
* Emotional goal
* Tone
* Writing style
* Research planning
* Research synthesis
* Scientific information
* Historical information
* Cultural information
* Environmental information
* Conservation information
* Statistics where appropriate
* Outline generation
* Chapter structure
* Section structure
* Subsection structure
* Stories
* Facts
* Activities
* Quizzes
* Glossary
* Introduction
* Conclusion
* Manuscript generation
* Developmental editing
* Line editing
* Grammar editing
* Fact review
* Age-level editing
* Repetition removal
* Clarity editing
* Cultural sensitivity review
* Safety review
* Book description
* Keywords
* Categories
* Publishing metadata

Claude may also create an **optional visual plan** after the manuscript has been generated.

However, visual planning must never prevent manuscript generation.

---

# 9. ANTHROPIC API

Use the official Anthropic SDK.

Create a dedicated server-side Anthropic integration.

The API key must NEVER be exposed to the browser.

Use:

```text
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=
```

The model identifier must be configurable.

Do not guess the model identifier.

Verify the currently supported Claude Opus 5 API model identifier using Anthropic's current official documentation.

Do not hard-code the model name throughout the codebase.

The application should be able to change the model through configuration.

---

# 10. PRIMARY BOOK GENERATION WORKFLOW

The most important user journey is:

```text
OPEN THE SHELF
       ↓
CREATE NEW BOOK
       ↓
BOOK CONFIGURATION FORM
       ↓
CATEGORY / GENRE
       ↓
NUMBER OF CHAPTERS
       ↓
GENERATE BOOK
       ↓
CLAUDE OPUS 5
       ↓
COMPLETE BOOK CONTENT
       ↓
EDITING / QA
       ↓
BOOK READY
```

**This is the primary workflow.**

Image generation is NOT part of the required generation pipeline.

Translation is NOT part of the required generation pipeline.

The book must be considered successfully generated when the complete manuscript has been generated, edited, validated, and assembled.

---

# 11. IMAGE GENERATION IS OPTIONAL

This is a critical product requirement.

**Image and cover generation are optional enhancements.**

They are NOT required for book generation.

The Shelf must never make Gemini a prerequisite for creating a book.

The user should be able to generate:

```text
TEXT-ONLY BOOK
```

without Gemini.

After the book has successfully been generated, The Shelf may offer:

```text
YOUR BOOK IS READY

[View Book]

[Edit Book]

[Export]

[Save to Google Drive]

[Generate Cover & Images]
```

The image-generation action should only be available if Gemini is configured and reachable.

---

# 12. GEMINI AVAILABILITY CHECK

After the book has successfully generated, the application should determine whether Gemini image generation is available.

The application should verify:

1. A Gemini API key is configured.
2. A Gemini model is configured.
3. The configured model supports image generation.
4. The Gemini API can be reached.
5. Authentication succeeds.
6. The service is not returning a blocking configuration error.

Do not perform expensive image generation merely to test availability.

Use an appropriate lightweight capability/availability check where supported.

The result should be represented internally as something similar to:

```json
{
  "gemini": {
    "configured": true,
    "reachable": true,
    "image_generation_available": true
  }
}
```

or:

```json
{
  "gemini": {
    "configured": false,
    "reachable": false,
    "image_generation_available": false
  }
}
```

The exact implementation should follow the current Gemini API capabilities.

---

# 13. GEMINI UNAVAILABLE BEHAVIOR

If Gemini is unavailable, do NOT fail book generation.

Do NOT show:

```text
Book generation failed because Gemini is unavailable.
```

Instead, the book should be completed normally.

The user may see:

```text
Your book is ready.

Visual generation is currently unavailable.

You can continue with your text-only book and generate visuals later when Gemini is available.
```

The user must still be able to:

* View the book.
* Edit the book.
* Export the book.
* Save the book.
* Translate the book.

---

# 14. POST-GENERATION IMAGE EXPERIENCE

If Gemini is available after the book has been generated, offer the user an optional visual-generation action.

For example:

```text
YOUR BOOK IS READY

Would you like to create visual assets?

Gemini is available.

[Generate Cover]
[Generate Chapter Images]
[Generate Cover + Images]
[Skip for Now]
```

The user must be able to skip this step.

Do not automatically generate expensive images without user consent.

---

# 15. COVER GENERATION

Cover generation is optional.

If the user chooses to generate a cover and Gemini is available:

1. Claude may provide creative direction.
2. The application creates the Gemini image prompt.
3. Gemini generates the artwork.
4. The application composes the final cover.
5. The application adds title, subtitle and author text where appropriate.

Do not depend on Gemini to render complex book typography accurately.

Where practical:

```text
Gemini
   ↓
Artwork
   ↓
The Shelf composition system
   ↓
Title + Subtitle + Author
   ↓
Final Cover
```

If cover generation fails, the book itself remains successful.

---

# 16. CHAPTER IMAGE GENERATION

Chapter images are also optional.

If the user chooses to generate chapter images:

Claude may identify useful visual opportunities.

The application may create an image plan such as:

```json
{
  "images": [
    {
      "id": "image_001",
      "chapter": 1,
      "section": "Introduction",
      "purpose": "Illustrate the central concept",
      "description": "..."
    }
  ]
}
```

The application then sends appropriate prompts to Gemini.

Do not generate images merely to satisfy a quota.

Images should only be generated when they add genuine value.

---

# 17. IMAGE QUANTITY

There is no mandatory image count.

The previous guideline of approximately 1–3 images per chapter may be used as a recommendation for highly visual books, but it is **not a requirement**.

The system should determine image needs based on:

1. Book category.
2. Audience.
3. Content.
4. Educational value.
5. Visual style.
6. User preference.
7. Cost.
8. Gemini availability.

Some books may need:

```text
0 images
```

Others may benefit from:

```text
1 cover + several chapter images
```

Do not force images into a book that does not need them.

---

# 18. IMAGE GENERATION MUST BE DECOUPLED

The image pipeline must be independent from the manuscript pipeline.

Correct:

```text
Generate Book
      ↓
Book Complete
      ↓
User chooses whether to generate visuals
      ↓
Gemini
```

Incorrect:

```text
Generate Book
      ↓
Gemini
      ↓
If Gemini fails
      ↓
Book fails
```

Gemini must never become a single point of failure for book generation.

---

# 19. ONE BOOK GENERATION JOB

The user's experience should remain:

**ONE BOOK GENERATION**

The user should NOT have to manually initiate:

```text
Generate Chapter 1
Generate Chapter 2
Generate Chapter 3
```

The user clicks:

**GENERATE BOOK**

and The Shelf handles the complete book-generation process.

A single book-generation job may internally contain controlled stages.

For example:

```text
BOOK JOB
│
├── Content Planning
├── Manuscript Generation
├── Editing
├── QA
├── Assembly
└── Complete
```

Visual generation is a **separate optional post-generation job**:

```text
OPTIONAL VISUAL JOB
│
├── Visual Planning
├── Cover Generation
├── Chapter Image Generation
└── Visual Assembly
```

Translation is also a separate optional post-generation job.

---

# 20. LONG BOOKS / OUTPUT LIMITS

Do not assume every book can fit into a single model response.

If the complete requested manuscript can safely be generated within the model's available output capacity, it may be generated as one complete manuscript response.

If it cannot, The Shelf may internally manage generation as one book job.

For example:

1. Generate global book structure.
2. Preserve complete outline.
3. Generate manuscript in controlled internal stages.
4. Maintain global book context.
5. Preserve chapter continuity.
6. Assemble manuscript.
7. Edit and QA the assembled manuscript.
8. Complete the book job.

The user must never be forced to manually generate individual chapters.

Never silently truncate a manuscript.

Never claim a book is complete when it is incomplete.

---

# 21. BOOK PROMPT ARCHITECTURE

Do not create one uncontrolled prompt containing every possible instruction.

Separate the Claude request logically.

## SYSTEM INSTRUCTIONS

Claude should act as a professional:

* Book author
* Editor
* Educational writer where applicable
* Research-oriented assistant
* Publishing assistant

It must prioritize:

* Coherence
* Accuracy
* Structure
* Consistency
* Natural prose
* Appropriate tone
* Audience suitability
* Meaningful chapter progression
* Avoiding repetition
* Avoiding filler
* Following requested chapter count
* Following requested category/genre
* Following requested audience
* Following requested writing style

## BOOK CONTEXT

Pass relevant configuration:

* Title
* Author
* Topic
* Subject
* Category
* Genre
* Audience
* Age
* Reading level
* Tone
* Style
* Chapter count
* Desired length
* Book goals
* Visual identity where relevant
* User instructions
* Reference information

## GENERATION TASK

Explicitly state what Claude is being asked to do.

For manuscript generation:

**Generate the actual manuscript.**

Do not ask Claude merely to provide an outline when the task is manuscript generation.

Do not ask Claude to explain how it would write the book.

The output should be actual book content.

---

# 22. BOOK DEVELOPMENT WORKFLOW

The Shelf should support the following general workflow.

## STEP 1 — BOOK CONFIGURATION

The user provides:

* Title
* Subtitle
* Author
* Topic
* Subject
* Category
* Genre
* Target audience
* Age
* Reading level
* Tone
* Writing style
* Desired length
* Number of chapters
* Educational goals
* Emotional goals
* Additional instructions

## STEP 2 — BOOK GENERATION

Claude generates the complete requested book.

## STEP 3 — EDITING / QA

The book is reviewed and corrected.

## STEP 4 — BOOK READY

The user receives the completed book.

## STEP 5 — OPTIONAL VISUALS

If Gemini is configured and reachable, offer:

* Generate cover
* Generate chapter images
* Generate cover + chapter images
* Skip visuals

## STEP 6 — FORMATTING

Apply:

* Selected font
* Heading hierarchy
* Paragraph formatting
* Images if available
* Captions
* Chapter breaks
* Table of Contents
* Metadata

## STEP 7 — EXPORT

Generate:

* EPUB
* DOCX
* PDF
* KPF / Kindle-ready output where technically supported

## STEP 8 — STORAGE

Save finished products to Google Drive.

## STEP 9 — OPTIONAL TRANSLATION

Allow translation after the original book exists.

---

# 23. VISUAL IDENTITY

The user may optionally specify a visual style.

Examples:

* Children's Illustrated Storybook
* Educational Cartoon
* Field Guide
* Realistic Natural History
* Scientific / Educational Diagram
* Artistic Nature Illustration
* Editorial Illustration
* Minimalist Educational

If no visual generation is requested, the visual style can still influence the book's formatting and design.

If Gemini is later activated, the selected visual style should be passed to the image-generation workflow.

---

# 24. TRANSLATION — OPTIONAL POST-GENERATION FEATURE

Translation is optional.

Translation must NOT be part of the mandatory initial book-generation workflow.

The user should first generate the original book.

Normal workflow:

```text
Generate Book
      ↓
Complete Original Book
      ↓
Optional Visuals
      ↓
Export / Save
      ↓
OPTIONAL: Translate Book
```

Translation controls should not be mandatory on the initial book configuration form.

After the original book has been successfully generated, provide an optional:

**TRANSLATE BOOK**

action.

---

# 25. SUPPORTED TRANSLATION LANGUAGES

Supported languages:

1. Arabic
2. Chinese — Mandarin / Simplified Chinese
3. Spanish
4. Italian
5. Japanese
6. Dutch
7. Korean
8. Hindi

The user can select one or multiple languages.

Do not automatically generate all languages.

---

# 26. TRANSLATION BEHAVIOR

Only selected languages should be generated.

The original English book must remain untouched.

Each translation should be a separate language version.

Conceptually:

```text
Book
├── Original / English
├── Arabic
├── Chinese
├── Spanish
├── Italian
├── Japanese
├── Dutch
├── Korean
└── Hindi
```

Translation must preserve:

* Meaning
* Tone
* Chapter order
* Chapter titles
* Section hierarchy
* Subsections
* Activities
* Quizzes
* Captions
* Glossary
* Appropriate metadata
* Book structure

Do not perform simplistic word-for-word replacement.

Translation must be context-aware.

A failed translation must not affect:

* Original book
* Other completed translations

Each translation should be independently retryable.

---

# 27. GOOGLE DRIVE STORAGE

Google Drive is the external storage destination for finished books and generated assets.

After successful book generation and assembly, the application should be able to upload:

* EPUB
* DOCX
* PDF
* KPF where supported
* Cover artwork
* Chapter images
* Translations
* Other final assets

Conceptually:

```text
Google Drive
└── The Shelf
    └── Books
        └── [Book Name]
            ├── Original
            ├── Images
            ├── Translations
            └── Final
```

Adapt the exact structure to the existing implementation.

Google Drive is primarily for storing generated files and assets.

Do not treat Google Drive as a relational database.

---

# 28. GOOGLE DRIVE SECURITY

Use appropriate Google OAuth / Google Drive API authentication.

Do not hard-code Google credentials.

Do not expose private Google credentials to the browser.

Use secure server-side handling.

Protect access tokens appropriately.

Never store raw credentials in source code.

---

# 29. BOOK GENERATION JOB MODEL

Treat book creation as a job/pipeline.

Possible statuses:

```text
pending
processing
completed
failed
```

Possible primary stages:

```text
CONTENT
EDITING
QA
ASSEMBLY
EXPORT
STORAGE
```

Visual generation is separate:

```text
VISUAL_PLANNING
COVER
ILLUSTRATIONS
VISUAL_ASSEMBLY
```

Translation is separate:

```text
TRANSLATION
FORMATTING
QA
EXPORT
STORAGE
```

The original book must never depend on either visuals or translation.

---

# 30. FAILURE ISOLATION

A failure in one service must not destroy successful work.

Examples:

### Gemini fails

The manuscript remains available.

### Gemini is unavailable

The user can continue with a text-only book.

### Cover generation fails

The chapter images and book remain available.

### One chapter image fails

Other successfully generated images remain available.

### Translation fails

The English book remains available.

### PDF generation fails

EPUB/DOCX remain available if already generated.

### Google Drive upload fails

The generated files remain available and upload can be retried.

Never discard successful stages because a later stage failed.

---

# 31. RETRY SUPPORT

Where practical, allow individual stages to be retried.

Examples:

* Retry cover generation.
* Retry one failed chapter image.
* Retry translation.
* Retry Google Drive upload.
* Retry PDF export.

Do not regenerate the entire book unnecessarily when only a downstream stage failed.

---

# 32. ERROR HANDLING

Handle:

* Missing API keys
* Invalid API keys
* Authentication errors
* Rate limits
* Network errors
* Timeouts
* API errors
* Empty responses
* Invalid responses
* Output truncation
* Image generation failure
* Translation failure
* Export failure
* Google Drive failure

The UI should communicate:

* What failed.
* What succeeded.
* What can be retried.

Never silently fail.

Never show fake success.

Never say:

**"Book generated successfully"**

if the manuscript is incomplete.

---

# 33. GEMINI CONFIGURATION

Prepare:

```text
GEMINI_API_KEY=
GEMINI_MODEL=
```

Do not assume every Gemini model supports image generation.

Verify the configured model's current image-generation capability.

The Gemini integration must be capable of determining whether image generation is actually supported.

Gemini should be treated as an **optional provider**.

If no Gemini credentials exist, the application must continue functioning normally.

---

# 34. AI USAGE TRACKING

Where available, record:

* Provider
* Model
* Input tokens
* Output tokens
* Request status
* Generation duration

For image generation, record appropriate metadata where available.

This is primarily for monitoring and debugging.

Do not implement a complex billing system unless the existing application requires it.

---

# 35. CONTEXT MANAGEMENT

Do not blindly send the entire application state to every AI request.

Use relevant context.

## BOOK CONTEXT

May include:

* Title
* Author
* Topic
* Subject
* Category
* Genre
* Audience
* Age
* Tone
* Style
* Purpose
* Outline

## CHAPTER CONTEXT

May include:

* Chapter title
* Chapter purpose
* Outline
* Relevant previous information

## IMAGE CONTEXT

Only when visual generation has been requested:

* Book
* Chapter
* Section
* Visual identity
* Image purpose
* Scene description

## TRANSLATION CONTEXT

May include:

* Original content
* Target language
* Book metadata
* Structure

---

# 36. STRUCTURED OUTPUT

Use structured output where useful.

For planning and metadata, structured JSON may be appropriate.

Example:

```json
{
  "title": "...",
  "subtitle": "...",
  "category": "...",
  "genre": "...",
  "chapters": [
    {
      "number": 1,
      "title": "...",
      "purpose": "...",
      "summary": "...",
      "sections": []
    }
  ]
}
```

Do not unnecessarily force long-form manuscript prose into JSON.

Actual book prose should remain natural text or an appropriate document representation.

---

# 37. COST CONTROL

AI API usage can become expensive.

Avoid unnecessary requests.

Do not:

* Regenerate successful content unnecessarily.
* Generate images automatically without user consent.
* Regenerate every image when one image fails.
* Translate languages that were not selected.
* Send irrelevant context.
* Duplicate book-generation requests.
* Automatically rerun expensive failed jobs.

Preserve completed stages so that downstream stages can be retried independently.

---

# 38. BOOK DESIGN

Maintain a professional visual hierarchy.

Supported elements may include:

* Book Title
* Chapter Title
* Section Heading
* Subsection Heading
* Fact Box
* Fun Fact
* Nature Note
* Activity
* Quiz
* Caption
* Glossary

Avoid:

* Excessive decoration
* Excessive capitalization
* Excessive bolding
* Excessive emojis
* Clutter
* Inconsistent heading styles

---

# 39. FONT SELECTION

Support appropriate font selection.

Recommended serif fonts:

* Georgia
* Garamond
* Baskerville
* Times New Roman

Recommended sans-serif fonts:

* Arial
* Helvetica
* Calibri

Default:

**Georgia**

For children's books prioritize:

* Legibility
* Large readable text
* Clear spacing
* Age appropriateness

For Kindle/reflowable books, do not assume the selected font will override reader settings.

---

# 40. KINDLE FORMATTING

For digital books prioritize:

* Reflowable text
* Proper heading hierarchy
* Clean paragraphs
* Logical chapter breaks
* Clickable Table of Contents
* Responsive images
* Consistent typography
* Clean metadata
* No broken links
* No accidental blank pages
* No unnecessary fixed positioning

For highly visual children's picture books, evaluate whether fixed layout is more appropriate.

Do not force every book into the same layout.

---

# 41. EXPORT FORMATS

Where technically supported, generate:

## EPUB

Primary digital/reflowable book format.

## DOCX

Editable manuscript.

## PDF

Fixed-layout proof and print-ready working format where appropriate.

## KPF

Only if a technically supported KPF-generation workflow exists.

Never falsely claim KPF was generated.

If KPF generation is unavailable:

* Generate Kindle-ready EPUB/DOCX.
* Explain that the user can import the output into Kindle Create where appropriate.

---

# 42. TABLE OF CONTENTS

Generate a professional Table of Contents.

The TOC must reflect the final actual structure of the book.

For digital formats, provide clickable navigation where supported.

---

# 43. CHILD SAFETY / AGE APPROPRIATENESS

For children's books, avoid unnecessary:

* Graphic injury
* Gore
* Frightening imagery
* Dangerous instructions
* Dangerous wildlife interaction
* Unsafe experiments
* Instructions for handling venomous animals

When discussing:

* Predators
* Hunting
* Reproduction
* Death
* Disease
* Survival

present accurate information in an age-appropriate way.

Do not make scientific information inaccurate simply to make it more comfortable.

---

# 44. BUTTON FUNCTIONALITY

Every button must actually work.

Do not create decorative controls that do nothing.

Buttons should:

* Trigger intended functionality.
* Show progress.
* Provide feedback.
* Display errors.
* Prevent duplicate submissions where appropriate.

Important actions include:

```text
Generate Book
View Book
Edit Book
Export
Save to Google Drive
Generate Cover
Generate Images
Translate Book
Retry
```

If Gemini is unavailable, do not show an active image-generation button that will simply fail.

Instead, clearly communicate that visual generation is currently unavailable.

---

# 45. USER EXPERIENCE

The user should NOT need to understand:

* Anthropic
* Claude
* Gemini
* APIs
* Tokens
* Prompts
* API keys
* OAuth
* Internal processing stages

The Shelf should hide this complexity.

The user should experience a professional book-generation application.

The application internally orchestrates:

```text
Claude
   ↓
Book

Optional Gemini
   ↓
Visuals

Translation
   ↓
Optional translations

Formatting
   ↓
Publishing files

Google Drive
   ↓
Storage
```

---

# 46. SECURITY

API credentials must NEVER be exposed to the browser.

Never:

* Put API keys in client components.
* Put API keys in `NEXT_PUBLIC_*` variables.
* Store API keys in localStorage.
* Return API keys in API responses.
* Hard-code credentials.
* Commit credentials to Git.

Use server-side environment variables.

Ensure `.gitignore` protects environment files.

---

# 47. ENVIRONMENT VARIABLES

Prepare/update:

`.env.example`

with placeholders such as:

```text
ANTHROPIC_API_KEY=
ANTHROPIC_MODEL=

GEMINI_API_KEY=
GEMINI_MODEL=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
```

Add other variables only if genuinely required.

Never put real credentials in `.env.example`.

---

# 48. GOOGLE DRIVE AUTHENTICATION

Use an appropriate Google OAuth flow.

The exact implementation should match the application's existing authentication architecture.

If the user needs to authorize Google Drive:

* Clearly communicate the authorization step.
* Request only necessary permissions.
* Store tokens securely.
* Refresh tokens when necessary.
* Do not expose private tokens to client-side code.

The application should be capable of uploading generated book files to the authorized Google Drive account.

---

# 49. GENERATION PROGRESS

The primary book-generation progress should focus on the book itself.

For example:

```text
Preparing your book...

Planning the book...

Creating the outline...

Writing the manuscript...

Editing the manuscript...

Running quality checks...

Preparing your book...

Your book is ready.
```

Do NOT automatically display:

```text
Generating images...
```

during primary book generation unless the user explicitly chose visual generation as part of a later workflow.

If the user later requests visuals:

```text
Checking Gemini...

Gemini is available.

Preparing visual concepts...

Generating cover...

Generating chapter images...

Assembling visuals...

Visuals are ready.
```

Never falsely claim a stage is complete before it actually is.

---

# 50. IMAGE GENERATION USER FLOW

The intended image workflow is:

```text
USER CONFIGURES BOOK
        ↓
GENERATE BOOK
        ↓
BOOK COMPLETED
        ↓
CHECK GEMINI AVAILABILITY
        ↓
┌─────────────────────────────┐
│ Gemini available?           │
└──────────────┬──────────────┘
               │
        YES ───┴─── NO
         │           │
         ▼           ▼
Offer visuals    Continue normally
         │
         ▼
User chooses
         │
   ┌─────┼──────────────┐
   ▼     ▼              ▼
 Cover  Images      Cover + Images
   │     │              │
   └─────┼──────────────┘
         ▼
      Gemini
         ↓
 Visual assets
```

The user may also select:

**Skip for Now**

If skipped, no Gemini request should be made.

---

# 51. VISUAL GENERATION SHOULD BE LAZY

Do not generate visual assets before they are needed.

The preferred behavior is:

```text
Book first.
Visuals later.
```

This reduces:

* Cost
* Generation time
* Failure points
* Unnecessary API calls

It also gives the user control over whether visual assets are actually required.

---

# 52. TRANSLATION UI BEHAVIOR

The initial book creation form must NOT require translation languages.

After generation:

```text
BOOK READY

[View Book]

[Edit Book]

[Export]

[Save to Google Drive]

[Generate Visuals]

[Translate Book]
```

Translation is an independent optional operation.

---

# 53. GOOGLE DRIVE UI BEHAVIOR

Where appropriate, after generation provide:

**Save to Google Drive**

After successful upload, show:

* Saved successfully.
* Google Drive folder/file reference.
* Open in Google Drive where appropriate.

Do not expose access tokens.

---

# 54. TESTING

After implementation, actually test the system.

Do not consider the integration complete merely because packages have been installed.

Verify:

### Core book generation

1. Book configuration form.
2. Category/Genre field.
3. Number-of-chapters field.
4. Claude authentication.
5. Claude request.
6. Configuration transfer.
7. Chapter-count transfer.
8. Full-book generation.
9. Response handling.
10. Long-book handling.
11. Editing/QA.
12. Book completion state.

### Gemini

13. Gemini configuration detection.
14. Gemini reachability.
15. Gemini image-generation capability.
16. Cover generation.
17. Chapter-image generation.
18. User can skip images.
19. Gemini failure does not break the book.
20. Individual image retry works.

### Translation

21. Translation appears only after book generation.
22. Language selection.
23. Translation generation.
24. Translation failure isolation.
25. Translation retry.

### Publishing

26. EPUB.
27. DOCX.
28. PDF.
29. KPF handling.
30. Google Drive authentication.
31. Google Drive upload.
32. Retry behavior.

### Security

33. Anthropic key remains server-side.
34. Gemini key remains server-side.
35. Google credentials remain protected.
36. No private credentials appear in client bundles or API responses.

---

# 55. DO NOT OVER-ENGINEER

Do not introduce unnecessary:

* Microservices
* Kubernetes
* Distributed infrastructure
* Multiple databases
* Vector databases
* RAG infrastructure
* Custom AI models
* Enterprise infrastructure

unless the existing project genuinely requires them.

The immediate objective is:

**A reliable Next.js application with a clean server-side AI orchestration layer.**

---

# 56. IMPLEMENTATION PRIORITY

Implement in this order:

## PRIORITY 1

Inspect existing Next.js project.

## PRIORITY 2

Understand existing book-generation workflow.

## PRIORITY 3

Build/complete the book configuration form.

The form must include:

* Title
* Subtitle
* Author
* Topic/Subject
* **Category/Genre**
* Target audience
* Age range
* Reading level
* Tone
* Writing style
* Desired length
* Number of chapters
* Book goals
* Additional instructions

## PRIORITY 4

Integrate Anthropic Claude Opus 5.

## PRIORITY 5

Make reliable full-book generation work.

## PRIORITY 6

Implement book-generation progress, state and error handling.

## PRIORITY 7

Implement editing and QA.

## PRIORITY 8

Implement optional Gemini availability detection.

## PRIORITY 9

Implement optional cover/image generation.

## PRIORITY 10

Integrate Google Drive storage.

## PRIORITY 11

Implement post-generation optional translation.

## PRIORITY 12

Connect formatting/export.

Do not block basic book generation on Gemini, translation, Google Drive, or advanced publishing features.

---

# 57. FINAL ARCHITECTURE

The final conceptual architecture should be:

```text
                         THE SHELF
                             │
                             ▼
                  BOOK CONFIGURATION FORM
                             │
                 ┌───────────┴───────────┐
                 │                       │
              Category                Chapters
               /Genre                   │
                 │                       │
                 └───────────┬───────────┘
                             ▼
                     GENERATE BOOK
                             │
                             ▼
                       CLAUDE OPUS 5
                             │
                             ▼
                    COMPLETE MANUSCRIPT
                             │
                             ▼
                        EDITING / QA
                             │
                             ▼
                        BOOK READY
                             │
               ┌─────────────┼──────────────┐
               │             │              │
               ▼             ▼              ▼
           View/Edit      Export       Save to Drive
                             │
                             ▼
                     OPTIONAL VISUALS
                             │
                     Check Gemini
                             │
                ┌────────────┴────────────┐
                │                         │
           Available                 Unavailable
                │                         │
                ▼                         ▼
         Offer user visuals         Continue normally
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
      Cover   Images   Both
        │       │        │
        └───────┼────────┘
                ▼
              GEMINI
                │
                ▼
          Visual Assets
                │
                ▼
        Optional Assembly
                │
                ▼
        OPTIONAL TRANSLATION
                │
                ▼
        EXPORT / GOOGLE DRIVE
```

---

# 58. CRITICAL PRODUCT RULES

The following rules are non-negotiable:

### Rule 1

**The Shelf must start book creation with a proper book-generation form.**

### Rule 2

**Category / Genre must be included in the initial book-generation form.**

### Rule 3

**Claude Opus 5 is the primary book-generation engine.**

### Rule 4

**The book must be able to generate completely without Gemini.**

### Rule 5

**Gemini image generation is optional.**

### Rule 6

**The user should only be offered visual generation after the book has been successfully generated.**

### Rule 7

**The application must check whether Gemini is configured, reachable, and capable of image generation before offering image-generation actions.**

### Rule 8

**The user must be able to skip image generation.**

### Rule 9

**No image should be generated without user intent/selection.**

### Rule 10

**A Gemini failure must never invalidate an otherwise successful book.**

### Rule 11

**Cover generation and chapter-image generation are separate optional capabilities.**

### Rule 12

**Translation is an optional post-generation capability.**

### Rule 13

**The original book must remain available regardless of translation or image-generation failures.**

### Rule 14

**API keys must remain server-side.**

### Rule 15

**Next.js provides both the frontend and lightweight server-side orchestration layer.**

### Rule 16

**Do not introduce a separate backend framework unless the existing project genuinely requires one.**

---

# 59. FINAL PRINCIPLE

The Shelf is an existing **Next.js application**.

Next.js is the application and server-side orchestration layer.

**CLAUDE OPUS 5**

Primary intelligence and book-generation engine.

**GEMINI**

Optional image-generation engine for covers and book visuals.

Gemini is an enhancement, **not a dependency for book generation**.

**TRANSLATION**

Optional post-generation capability supporting:

* Arabic
* Chinese (Mandarin / Simplified Chinese)
* Spanish
* Italian
* Japanese
* Dutch
* Korean
* Hindi

**GOOGLE DRIVE**

External storage destination for finished books and generated assets.

The primary workflow is:

```text
CREATE BOOK
        ↓
CONFIGURE BOOK
        ↓
SELECT CATEGORY / GENRE
        ↓
SELECT NUMBER OF CHAPTERS
        ↓
GENERATE COMPLETE BOOK
        ↓
EDIT / QA
        ↓
BOOK READY
        ↓
OPTIONALLY GENERATE VISUALS
        ↓
FORMAT
        ↓
EXPORT
        ↓
SAVE TO GOOGLE DRIVE
        ↓
OPTIONALLY TRANSLATE
```

The most important principle is:

> **Generate the book first. Everything else is optional enhancement or post-processing.**

The user should never be blocked from creating a complete book because Gemini, translation, image generation, or Google Drive is unavailable.

The Shelf should hide the underlying technical complexity and make the entire process feel like one coherent professional publishing application.

Preserve the existing Next.js application and build these capabilities into it rather than rebuilding the project.

---

# 63. IMPLEMENTATION STATUS (Updated: 2026-08-27)

## COMPLETED & TESTED (no API keys needed)

| # | Feature | Status | Tests |
|---|---------|--------|-------|
| 1 | Book Configuration Form | ✅ Done | Page loads, all fields present, validation works |
| 2 | Category/Genre dropdown | ✅ Done | 15 categories + custom "Other" option |
| 3 | Anthropic Claude client | ✅ Done | Server-side with key rotation, configurable model |
| 4 | Book generation pipeline | ✅ Code complete | TypeScript compiles, SSE streaming wired |
| 5 | EPUB generation | ✅ Fixed & tested | `npx tsx` test produces valid 6.5KB EPUB |
| 6 | DOCX generation | ✅ Tested | `npx tsx` test produces valid 9.4KB DOCX |
| 7 | PDF generation | ✅ Tested | `npx tsx` test produces valid 5.4KB PDF |
| 8 | KPF | ✅ Correctly unsupported | Returns message to use Kindle Create |
| 9 | Conclusion generation | ✅ Fixed & tested | Replaced hardcoded text with dynamic `generateConclusion()` |
| 10 | Temp file retention | ✅ Fixed | Files kept for `/api/exports/[filename]` serving |
| 11 | Gemini availability check | ✅ Done & tested | Returns correct JSON when no key configured |
| 12 | Quality check (pattern-based) | ✅ Done | Invention/overclaim/diagnosis/jargon/repetition/filler checks |
| 13 | Google Drive OAuth flow | ✅ Fixed | Corrected: fetch auth URL → open popup → exchange code → postMessage |
| 14 | Drive upload endpoint | ✅ Code complete | Reads from `tmp/` directory, uploads to Drive folder |
| 15 | Image generation backend | ✅ Code complete | Calls Gemini API, stores images in memory cache |
| 16 | Translation backend | ✅ Code complete | 8 languages supported, Claude-powered |
| 17 | TypeScript compilation | ✅ Clean | `npx tsc --noEmit` passes with 0 errors |
| 18 | Dev server | ✅ Running | `npm run dev` starts successfully on port 3000/3001 |
| 19 | `.env.example` | ✅ Updated | Correct model defaults, all env vars documented |

## FIXED ISSUES (since last session)

| Issue | Fix |
|-------|-----|
| Hardcoded conclusion text | Replaced with `generateConclusion()` that derives from concept promise + chapter themes |
| EPUB generation broken | Fixed `.promise()` → `Promise.resolve(instance.promise)` (epub-gen uses Q promises as property) |
| Temp files deleted immediately | Removed `fs.unlinkSync()` calls so exports route can serve files |
| Duplicate BookContext | Removed `src/app/context/BookContext.tsx` (old version) |
| Legacy anthropic-client.ts | Removed (unused, replaced by `src/lib/anthropic/client.ts`) |
| Legacy /api/claude route | Removed (unused, replaced by proper orchestrator) |
| Empty API directories | Cleaned up: build-book, config, export-ebook, format-ebook, keys, quality-check, status, write-chapter |
| Drive OAuth popup flow | Fixed: now fetches auth URL first, then opens Google URL in popup (was opening API endpoint directly) |
| `setDriveStatus` type mismatch | Added `accessToken`, `refreshToken`, `expiresAt` to the callback parameter type |
| `.env.example` wrong model name | Updated from `claude-opus-4-20250923` to `claude-opus-5` |

## PENDING — REQUIRES API KEYS

| # | Feature | What's Needed | Verification Steps |
|---|---------|---------------|-------------------|
| 1 | Full book generation | `ANTHROPIC_API_KEY` env var | Fill form → Generate → Verify chapters → Check exports → Download files |
| 2 | Image generation | `GEMINI_API_KEY` env var | Generate book → Click "Generate Cover & Images" → Verify images appear |
| 3 | Google Drive upload | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | Generate book → Connect Google Drive → Authorize → Save → Verify in Drive UI |
| 4 | Translation | `ANTHROPIC_API_KEY` (already needed for #1) | Generate book → Open TranslationPanel → Select languages → Translate → Verify translated content |
| 5 | Long book handling (>16 ch) | `ANTHROPIC_API_KEY` | Generate book with many chapters → Verify all generated |
| 6 | Editing/QA stage | `ANTHROPIC_API_KEY` | Verify quality report shows in BookReadyView |
| 7 | Image embedding in exports | `GEMINI_API_KEY` + book with images | Generate book → Generate images → Re-export → Verify images embedded |

## TESTING INSTRUCTIONS

### Quick check (no API keys):
```bash
npx tsc --noEmit              # Type check — should pass with 0 errors
npm run dev                    # Start dev server
curl -s http://localhost:3000  # Should show "Create Your Book" form
curl -s http://localhost:3000/api/check-gemini  # Should return {"gemini":{"configured":false,...}}
```

### With API keys (after setting .env.local):
```bash
# 1. Copy .env.example and add your keys
cp .env.example .env.local

# 2. Start the server
npm run dev

# 3. Open http://localhost:3000 in browser
# 4. Fill the form, generate a book, verify the full pipeline
```
