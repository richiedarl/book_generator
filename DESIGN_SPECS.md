Design Breakdown: "The Shelf" Studio Aesthetic

Here's the design system deconstructed into reusable specs — colors, type, spacing, components — that you can hand directly to a developer or AI agent.

Color Palette
Role	Value (approx)	Usage
Background	
#F0E9DA (warm cream/parchment)	Page/panel background
Primary text	
#2B2B26 (near-black, warm)	Headings, body copy
Accent/label text	
#6B7A5E or 
#5C6B4F (muted olive-sage green)	Eyebrow labels, kicker text
Input background	
#FBF8F0 (lighter cream, near-white)	Form field fills
Input border	
#D8CFB8 (soft tan)	1px hairline borders
Placeholder text	
#9C9484 (muted taupe-gray)	Input placeholder copy
Dark chrome (opposite panel)	
#1A1A1A / #111	Contrast panel (chat sidebar in screenshot)
Typography
Eyebrow/kicker label (e.g. "BOOK CREATION & KINDLE PUBLISHING STUDIO"): monospace font (e.g. IBM Plex Mono, JetBrains Mono, or system mono), uppercase, letter-spacing ~0.1em, small size (~12–13px), olive-green color.
Main heading ("Let's develop your book."): serif font (e.g. Georgia, Tiempos, Source Serif Pro), bold, large (~36–42px), tight line-height, near-black.
Subheading/intro paragraph: sans or serif at ~16–17px, regular weight, muted dark gray, comfortable line-height (~1.6), max-width constrained (~65–75ch) for readability.
Field labels (e.g. "CATEGORY", "WORKING TITLE OR TOPIC"): monospace, uppercase, small (~11–12px), letter-spacing ~0.08em, olive-green or dark muted color — matches the eyebrow style.
Input text/placeholder: monospace or sans, ~14–15px, regular.
Layout Structure
Two-panel split (in this case chat + generated artifact), but for your form you'd use a single centered column, max-width ~700–800px, generous padding (~40–48px).
Vertical rhythm: eyebrow → heading → subtext → form fields, each with ~24–32px spacing between blocks.
Form fields stack vertically, full-width within the container, ~20px gap between fields.
Component Styling

Text inputs / textareas:

Background: light cream fill, distinct from page background
Border: 1px solid soft tan, small radius (~4–6px) — kept minimal/sharp, not heavily rounded
Padding: ~14px vertical, ~16px horizontal
Placeholder in muted taupe, regular weight
No heavy shadows — flat, paper-like feel

Dropdown/select:

Same fill/border treatment as text inputs
Chevron icon right-aligned, thin stroke
Monospace value text

Overall aesthetic keywords: editorial, literary, "paper and typewriter," muted/warm neutral palette, monospace-meets-serif pairing, minimal shadows, flat design, generous whitespace, small-caps/letter-spaced labels acting as section dividers.

Applying This to a 4–5 Step Form
Keep the same cream background and container padding throughout every step.
Reuse the eyebrow + serif heading pattern per step (eyebrow = step category like "STEP 2 OF 5", heading = step's main question).
Add a minimal step indicator: either small monospace text ("STEP 2/5") or a thin progress bar in the olive accent color — avoid bold/colorful progress dots, keep it understated.
Keep field labels in the same uppercase monospace style for consistency.
Nav buttons (Back/Next): flat, rectangular, dark near-black fill with cream text for primary action; ghost/outline style with tan border for secondary/back action.
Transitions between steps: simple fade or slide, nothing bouncy — matches the restrained, editorial tone.
While creativity is peemitted and anticipated. These specs must alwys be maintained

Dont mention Claude anywhere in the form or in the chat area as you work.

The reproduction of the design specs exists in the html file book-studio-form-html for reference