-- Aishwin Design — D1 schema (idempotent, safe to re-run)

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  brief TEXT,
  skill_id TEXT,
  design_system_id TEXT,
  provider TEXT,
  model TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  artifact_key TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id, created_at);

CREATE TABLE IF NOT EXISTS memory (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  body TEXT NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_memory_project ON memory(project_id, pinned DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  preloaded INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_skills_preloaded ON skills(preloaded DESC, name);

CREATE TABLE IF NOT EXISTS design_systems (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  body TEXT NOT NULL,
  preloaded INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_design_systems_preloaded ON design_systems(preloaded DESC, name);

-- Artifacts: body stored in R2; r2_key points to R2 object.
-- body_inline retained for backward compat / very small artifacts.
CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  message_id TEXT,
  kind TEXT NOT NULL DEFAULT 'html',
  r2_key TEXT,
  body_inline TEXT,
  size_bytes INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id, created_at DESC);

-- Generated images (keyed by prompt hash, served from R2)
CREATE TABLE IF NOT EXISTS generated_images (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  prompt TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_images_hash ON generated_images(prompt_hash);
CREATE INDEX IF NOT EXISTS idx_images_project ON generated_images(project_id, created_at DESC);

-- ──────────────────────────────────────────────────────────
-- Seed: preloaded skills
-- ──────────────────────────────────────────────────────────
INSERT OR IGNORE INTO skills (id, name, summary, body, preloaded) VALUES
('saas-landing','SaaS landing page','One-screen marketing page: hero, value props, social proof, CTA.',
'# SaaS landing page

Build a single-file responsive HTML landing page.

## Required sections (in order)
1. Sticky nav with brand mark and a single primary CTA.
2. Hero: tight headline (<= 9 words), subhead (<= 22 words), one CTA, one tertiary link.
3. Three value props with line icons (inline SVG, 1.5px stroke).
4. One social proof band: 4–6 logo wordmarks set in a muted row.
5. Feature deep-dive with a labelled mock interface to the right.
6. Pricing: two tiers, one recommended.
7. Footer: brand, three nav columns, legal line.

## Guardrails
- No external images unless via /api/projects/{project_id}/images?prompt= URLs.
- Type scale: 56 / 32 / 20 / 16 / 14. Body 16/1.6.
- Whitespace > decoration. Section padding >= 96px desktop / 64px mobile.
- One accent colour. Everything else is ink + paper + rule.

## Images
If the brief needs a hero image or illustration, use:
<img src="/api/projects/{project_id}/images?prompt=your+description" alt="…" />
Replace {project_id} with the actual project ID given in context.

## Self-critique before emitting
- Hierarchy: can a reader scan headlines and know the product in 8 seconds?
- Restraint: are there <= 3 weights and <= 2 colours plus neutrals?
- Specificity: is the headline a claim, not a category?',1),
('dashboard','Product dashboard','Data-dense internal app screen with sidebar nav and KPI cards.',
'# Product dashboard

## Required regions
- Left rail: brand, 5 nav items with line icons, account chip at bottom.
- Top bar: breadcrumb, search, notifications, avatar.
- Page header: title + filter chips + primary action.
- KPI row: 4 cards with delta arrows.
- Main chart card with legend and 7d/30d/90d toggle (use SVG path).
- Activity table with status pills and pagination.

## Guardrails
- Greyscale UI plus one accent. No drop shadows on cards — use 1px rules.
- Numbers in tabular figures. Use `font-variant-numeric: tabular-nums`.
- Empty states for every region.',1),
('mobile-app','Mobile app screen','iOS-style portrait app screen rendered inside a phone frame.',
'# Mobile app screen

Render a 390x844 viewport inside an SVG iPhone frame on a centered canvas.

## Required
- Status bar (time, signal, battery) using SVG.
- Native-style nav with large title.
- Content list/grid relevant to the brief.
- Bottom tab bar with 4–5 tabs and SF-symbols-like icons.

## Guardrails
- 8pt grid. Touch targets >= 44pt.
- One accent colour, otherwise ink/paper.
- Type: SF-like sans, 17pt body, 34pt large title.',1),
('deck','Pitch deck','Multi-slide deck rendered as stacked 16:9 frames in one HTML page.',
'# Pitch deck

Output 8 slides as stacked 16:9 sections (aspect-ratio 16/9, max-width 1280).

## Slides
1. Title — wordmark + one-line positioning.
2. The problem (one stat, one quote).
3. The shift (why now).
4. Our wedge.
5. Product — labelled annotated mock.
6. Traction — three numbers with deltas.
7. Team — names, one-line credentials.
8. Ask — number, use-of-funds bullets, contact.

## Guardrails
- One typeface family (display + text weights only).
- Rules over fills. Numbers oversized.
- Each slide must have a slide number bottom-right.',1),
('infographic','Editorial infographic','Single-page editorial poster with typographic data visualisations.',
'# Editorial infographic

Build one tall HTML page, max-width 960, that reads like a New York Times graphic.

## Required
- Lockup: kicker, big headline, deck.
- Three data sections, each with: section number, title, 60–100 word lede, custom inline SVG chart.
- Pull quote spanning full width.
- Source line at bottom in small caps.

## Guardrails
- Serif headlines, sans body. Numbers tabular.
- Charts must label axes, units, and the reader''s takeaway.
- No clip art. SVG only.',1),
('email','Transactional email','Single responsive email template with inline styles.',
'# Transactional email

Generate a single-table 600px-wide email with inline CSS only (no <style> blocks).

## Sections
- Pre-header text (hidden span).
- Logo wordmark (text, not image).
- Headline + 2 short paragraphs.
- One pill button (table-based, bulletproof).
- Helper line + footer with unsubscribe stub.

## Guardrails
- Inline CSS, table layout, web-safe fonts, no flexbox.
- Light + dark mode (`@media (prefers-color-scheme: dark)` in a single embedded style at top is permitted).',1);

-- ──────────────────────────────────────────────────────────
-- Seed: preloaded design systems
-- ──────────────────────────────────────────────────────────
INSERT OR IGNORE INTO design_systems (id, name, summary, body, preloaded) VALUES
('linear','Linear','Monochrome precision. Sharp edges, tight spacing, zero ornamentation.',
'# Linear design system

## Colour
- Background: #FFFFFF (light) / #0F0F10 (dark)
- Surface: #F5F5F5 / #1A1A1B
- Border: #E5E5E5 / #2D2D2E
- Text primary: #0F0F10 / #EDEDED
- Text muted: #6B6B6B / #808080
- Accent: #5B6AD8

## Typography
- Font: Inter (variable)
- Display: 32px / -0.02em / weight 600
- Heading: 20px / -0.015em / weight 600
- Body: 15px / 1.5 / weight 400
- Caption: 12px / 1.4 / weight 400
- Mono: "JetBrains Mono" 13px

## Spacing
- Base unit: 4px
- Component padding: 8px / 12px / 16px
- Section gap: 40px / 64px / 96px

## Radii
- Control: 6px
- Card: 8px
- Full: 9999px

## Shadows
None. Use borders only.

## Components
- Buttons: 6px radius, 32px height, no icons unless essential
- Inputs: 1px border, 6px radius, 32px height
- Pills/badges: 9999px radius, 18px height, bg surface-2
- Tables: no outer border, row dividers only

## Motion
Easing: cubic-bezier(0.16,1,0.3,1) — fast in, slow out. Duration <= 200ms.

## Voice
Terse. Present tense. No filler. "Create issue" not "Click to create a new issue".

## Brand anti-patterns
- No gradients on interactive elements
- No drop shadows
- No more than 2 font weights per view
- No decorative dividers',1),

('vercel','Vercel','Clean white canvas with surgical black. Performance-first aesthetic.',
'# Vercel design system

## Colour
- Background: #FFFFFF
- Surface: #FAFAFA
- Border: #EAEAEA
- Text primary: #000000
- Text muted: #666666
- Accent: #0070F3
- Success: #0070F3
- Error: #EE0000

## Typography
- Font: Inter
- Hero: 64px / -0.04em / weight 700
- Heading: 24px / -0.02em / weight 600
- Body: 16px / 1.65 / weight 400
- Small: 14px / 1.5 / weight 400

## Spacing
- Grid: 8px
- Card padding: 24px
- Section: 80px top/bottom

## Radii
- Control: 5px
- Card: 8px

## Shadows
- Subtle: 0 2px 4px rgba(0,0,0,0.04)
- Card: 0 4px 24px rgba(0,0,0,0.08)

## Components
- Buttons: filled (black bg, white text) or outlined. Height 40px.
- Code blocks: monospace, bg #000, white text, 8px radius
- Stat cards: large number + small label below, no border, shadow

## Motion
200ms ease-out on hover. No bounce. No spin.

## Brand anti-patterns
- No rounded corners above 8px
- No colourful illustrations
- No dense layouts — air is the product',1),

('stripe','Stripe','Professional, blue-led, trust-first. Dense yet never cluttered.',
'# Stripe design system

## Colour
- Background: #FFFFFF
- Surface: #F6F9FC
- Border: #E3E8EE
- Text primary: #0A2540
- Text secondary: #425466
- Text muted: #8792A2
- Accent (blurple): #635BFF
- Blue: #0570DE
- Success: #09825D
- Error: #DF1B41

## Typography
- Font: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
- Heading: 28px / -0.01em / weight 700
- Subheading: 18px / weight 600
- Body: 16px / 1.6 / weight 400
- Label: 13px / uppercase / letter-spacing 0.08em / weight 600

## Spacing
- 4px grid
- Table row: 52px
- Card padding: 20px / 24px

## Radii
- Control: 4px
- Card: 8px
- Badge: 4px

## Shadows
- Input focus: 0 0 0 3px rgba(99,91,255,0.35)
- Card: 0 2px 5px rgba(10,37,64,0.1)

## Components
- Status badges: small pill, subtle bg tint, text colour matches semantic
- Data tables: sticky header, left-aligned text, right-aligned numbers
- Form sections: grouped by fieldset, label above field

## Brand anti-patterns
- No harsh pure-black text — use #0A2540
- No single-column centred layout for data-heavy screens
- No gradients on buttons',1),

('anthropic','Anthropic / Claude','Warm, considered, unhurried. Cream and amber with generous whitespace.',
'# Anthropic / Claude design system

## Colour
- Background: #FAF9F5
- Surface: #F2EFE6
- Border: #DDD9CC
- Text primary: #1A1814
- Text muted: #7A7568
- Accent amber: #D4780E
- Accent warm: #C96A1E

## Typography
- Font: "Source Serif 4" for display, Inter for UI
- Display: 48px / -0.015em / weight 400 (serif)
- Heading: 24px / -0.01em / weight 500 (serif)
- Body: 16px / 1.7 / weight 400 (sans)
- Caption: 13px / 1.5 / weight 400 (sans)

## Spacing
- Section: 96px / 64px
- Card padding: 32px
- Body max-width: 720px (single-column reading)

## Radii
- Control: 6px
- Card: 12px

## Shadows
Avoid. Use border + surface layering instead.

## Components
- Cards: warm off-white surface, 1px DDD9CC border, generous padding
- Buttons: amber accent fill or ghost with border
- Code: monospace on surface bg, no harsh black-on-white

## Motion
Slow and intentional. 300ms ease-in-out. No micro-animations unless purposeful.

## Voice
Thoughtful, direct, honest. No urgency. Long-form is acceptable.

## Brand anti-patterns
- No pure white background
- No blue links
- No technical jargon in UI copy
- No crowded layouts',1),

('notion','Notion','Editorial, flexible, document-first. Everything as blocks.',
'# Notion design system

## Colour
- Background: #FFFFFF
- Surface: #F7F7F5
- Border: #E9E9E7
- Text primary: #37352F
- Text muted: #9B9A97
- Accent: #2EAADC
- Highlight yellow: #FDECC8
- Highlight grey: #F1F1EF

## Typography
- Font: ui-sans-serif, "Segoe UI", sans-serif
- Title: 40px / weight 700
- H1: 30px / weight 700
- H2: 24px / weight 600
- H3: 20px / weight 600
- Body: 16px / 1.6 / weight 400
- Caption: 14px / weight 400

## Spacing
- Page padding: 96px left/right (desktop)
- Block gap: 2px (tight — document rhythm)
- Section divider: 24px

## Radii
- Control: 3px
- Block hover bg: 3px
- Badge: 3px

## Shadows
- Floating menu: 0 4px 12px rgba(0,0,0,0.12)
- None for document content

## Components
- Callout blocks: coloured icon + grey surface bg
- Toggle: indent + arrow icon, no bullet
- Table: no outer border, alternating bg subtle

## Motion
Minimal. Sidebar collapse 150ms ease. Hover bg instant.

## Voice
Neutral, enabling. No opinion. "Untitled" as default.

## Brand anti-patterns
- No heavy borders
- No saturated colours in the document canvas
- No centred body text (always left-aligned)',1);
