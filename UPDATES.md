# Design & Token System Updates

## Date: 2026-09-02

### 1. Design System Alignment (DESIGN_SPECS.md)
- **globals.css** — Replaced entire color palette with DESIGN_SPECS values:
  - Background: `#F0E9DA` (warm cream/parchment)
  - Primary text: `#2B2B26` (near-black, warm)
  - Accent: `#5C6B4F` (muted olive-sage green) — was `#0066cc` (blue)
  - Input fill: `#FBF8F0` (lighter cream)
  - Border: `#D8CFB8` (soft tan)
  - Placeholder: `#9C9484` (muted taupe-gray)
- **Typography** — Updated to use `Source Serif 4` (serif display), `IBM Plex Mono` (monospace), and `Inter` (body sans) per design specs
- **Buttons** — Updated to flat, rectangular style: primary is dark near-black fill with cream text; secondary is ghost style with tan border
- **Form fields** — Light cream fill, 1px soft tan borders, 8px radius, minimal shadows
- **Progress bar** — Thin 2px bar in olive accent color, no bold colorful dots
- **Labels/eyebrow** — Uppercase monospace, letter-spaced, olive-green

### 2. BookConfigForm.tsx Redesign
- Restructured into 5 steps matching the reference HTML layout
- Uses serif heading (`hero-heading`), monospace eyebrow, muted subtext
- Tone selection now uses choice cards (matching reference HTML)
- Step header shows "STEP X/5" with thin progress track
- Removed inline `<style jsx>` block — all styles now in globals.css
- Eyebrow labels changed from "Create Your Book" to match spec ("Book Creation & Kindle Publishing Studio" for step 1, "Audience", "Direction", "Structure", "Review")

### 3. Auth Flow Changes
- **Removed "Get Started" (signup) link** from public-facing header in `page.tsx`
- Users can still only log in via existing accounts; registration is admin-only for now
- Admin panel (`admin/page.tsx`) retains full user management including creating new users

### 4. Access Token System
- **Database** (`src/lib/db.ts`):
  - Added `access_tokens` table: tracks `token`, `type` (purchase/email), `user_id`, `email`, `max_uses`, `used_count`, `expires_at`, `used`
  - Added `createAccessToken(type, email, userId, maxUses, expiryDays)`
  - Added `validateAccessToken(token)` — checks validity, single-use for email tokens, max uses, expiry
  - Added `recordTokenUsage(token)` — increments use count
  - Added `checkEmailUsed(email)` — one email per email-token
  - Added `getAllAccessTokens()` for admin review
  - Added `deleteAccessToken(id)` for admin management

- **Auth layer** (`src/lib/auth.ts`):
  - Added `validateUsageToken(token)` — validates against new token table
  - Added `recordTokenUsage(token)` — records usage on generation
  - Added `isEmailUsedForToken(email)` — email uniqueness check
  - Added `createEmailToken(email)` — creates single-use email tokens (1 use, no expiry)

- **API routes**:
  - `POST /api/tokens/purchase` — creates purchase token (20 uses, 30-day expiry, admin only)
  - `GET /api/tokens/purchase` — admin lists all tokens
  - `POST /api/tokens/email` — creates email token (single-use, 1 use)
  - `POST /api/tokens/validate` — validates a token and returns remaining uses
  - Updated `POST /api/validate-token` — now also checks the new usage-based token table
  - Updated `POST /api/generate-book` — validates usage tokens and increments uses on each generation

- **BookConfigForm.tsx**:
  - Fetches `/api/auth/me` on mount to detect admin status
  - Admins bypass token requirement (their token used automatically)
  - Non-admins without a token see a "Get Access Token" button
  - Token modal with two options:
    1. **Purchase** — $49, 20 uses, 30-day expiry (simulated payment via `window.confirm`)
    2. **Email** — enter email, receive single-use token (no payment)
  - Email tokens: each email can only be used once to request a token; each token is single-use
  - Purchased tokens: 20 uses before expiry, 30-day expiry

### 5. User-Facing Text Changes
- Removed "Claude" references from all user-facing strings
- Chat sidebar renamed from "Claude Assistant" to "Your Writing Assistant"
- Welcome message changed to "Hi! I'm your writing assistant."
- Chat input placeholder changed from "Ask Claude anything..." to "Ask anything..."
- ConceptView error messages updated to "The writing service is not configured"

### 6. Pages Updated
- `globals.css` — Complete palette and typography overhaul
- `page.tsx` — Updated CSS variables, removed signup link, removed Claude references
- `login/page.tsx` — Updated to design spec aesthetic (cream bg, olive accents, serif headings)
- `register/page.tsx` — Same aesthetic update
- `src/components/BookConfigForm.tsx` — Full redesign
- `src/components/ConceptView.tsx` — Removed Claude references from UI text
- `src/components/GenerationProgressView.tsx` — Removed Claude from status text
- `src/app/api/generate-book/route.ts` — Updated token validation flow
- `src/app/api/validate-token/route.ts` — Updated to check usage-based tokens

### 7. Files Created
- `src/app/api/tokens/purchase/route.ts`
- `src/app/api/tokens/email/route.ts`
- `src/app/api/tokens/validate/route.ts`

### 8. Backend Notes
- Backend code (API routes, lib files) retains "Claude" references since users don't see these
- `anthropicClient.callClude()` remains unchanged — this is the internal function name for API calls
- Admin token management (in admin panel) remains functional — admins can still create/manage user access tokens

### 9. CSS Variable Consolidation
- Moved all design spec alias variables (`--ink`, `--paper`, `--accent-forest`, `--display`, `--mono`, `--body`, etc.) to `globals.css` `:root`
- `page.tsx` `getStyles()` now only defines `--display`, `--body`, `--mono` aliases (referencing the font variables from globals.css)
- All components (Shelf, ConceptView, ChapterView, admin page) use `var(--font-display)`, `var(--font-mono)`, `var(--font-body)` consistently
- Chat sidebar updated to use dark theme variables from globals.css (`--dark-bg`, `--dark-border`, `--dark-text`, `--dark-muted`, `--accent-blue`)

### 10. Files Created (Token System)
- `src/app/api/tokens/purchase/route.ts` — Admin-only token creation (20 uses, 30-day expiry). GET lists all tokens, POST creates, DELETE removes.
- `src/app/api/tokens/email/route.ts` — Email-based single-use tokens. Checks email uniqueness, creates 1-use tokens.
- `src/app/api/tokens/validate/route.ts` — Validates any token and returns remaining uses.

### 11. Files Modified
- `src/lib/db.ts` — Added `access_tokens` table, `AccessToken` interface, `createAccessToken()`, `getAccessToken()`, `validateAccessToken()`, `incrementTokenUsage()`, `checkEmailUsed()`, `getAllAccessTokens()`, `deleteAccessToken()`
- `src/lib/auth.ts` — Added `TokenValidationResult` interface, `validateUsageToken()`, `recordTokenUsage()`, `isEmailUsedForToken()`, `createEmailToken()`
- `src/app/api/generate-book/route.ts` — Updated token check to validate usage-based tokens after checking admin tokens; increments usage on each generation
- `src/app/api/validate-token/route.ts` — Updated to also check the new usage-based token table
- `src/components/BookConfigForm.tsx` — Added admin detection (fetches `/api/auth/me`), token modal with purchase/email options, token validation, step 5 token status display, step 5 validation for token requirement, step validation for token at step 5
- `src/app/admin/page.tsx` — Added Access Token Management section with token creation modal, token list table, delete functionality, alias font variables
- `src/components/Shelf.tsx` — Updated font-family variables and background colors to design spec values
- `src/app/page.tsx` — Consolidated CSS variables, updated chat sidebar to use dark theme variables (removed blue accents, using dark-bg/dark-text/dark-muted palette), removed signup link, removed Claude references from user-facing text
- `src/app/globals.css` — Added alias variables (`--ink`, `--ink-soft`, `--paper`, `--display`, `--mono`, etc.) for component compatibility, added token modal CSS, form field base styles, button styles, progress bar styles
