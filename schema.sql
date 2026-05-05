-- Aishwin Design — D1 schema

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

CREATE TABLE IF NOT EXISTS artifacts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  message_id TEXT,
  kind TEXT NOT NULL DEFAULT 'html',
  body TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_artifacts_project ON artifacts(project_id, created_at DESC);

-- Preloaded skills (dropped only if missing; safe to re-run).
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
- No images. Use inline SVG, gradients, and typography only.
- Type scale: 56 / 32 / 20 / 16 / 14. Body 16/1.6.
- Whitespace > decoration. Section padding >= 96px desktop / 64px mobile.
- One accent colour. Everything else is ink + paper + rule.

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
