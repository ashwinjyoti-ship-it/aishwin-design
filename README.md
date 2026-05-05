# Aishwin Design

A small cloud studio for designing with agents. Inspired by [`nexu-io/open-design`](https://github.com/nexu-io/open-design) — but rebuilt for the cloud, not local-first. Single-tenant by design: one shared password, your own keys, your own projects.

The agent only ever returns a single self-contained HTML document. The right pane is that document, sandboxed.

**Live URL:** https://aish-design.pages.dev (after first deploy)

## Stack

- **Next.js 15** (App Router) on **Cloudflare Pages** via [`@cloudflare/next-on-pages`](https://github.com/cloudflare/next-on-pages)
- **D1** for projects, messages, memory, skills, and saved artifacts
- **R2** bucket binding reserved for larger artifact bodies (not used yet)
- **KV** binding reserved for response cache (not used yet)
- Streaming chat over server-sent events from edge route handlers

## What ships

- **Projects** — name, brief, skill, provider, model. Each has its own conversation and memory.
- **Skills** — six preloaded (`saas-landing`, `dashboard`, `mobile-app`, `deck`, `infographic`, `email`). Add your own as Markdown.
- **Memory** — per-project notes that get appended to every system prompt.
- **BYOK settings** — Moonshot Kimi (default), Anthropic, Google Gemini, OpenRouter. Keys live in D1, never leave the edge.
- **Artifact viewer** — every assistant turn that emits a fenced ` ```html ` block is saved and rendered in a sandboxed iframe.
- **Single shared password** — `APP_PASSWORD` gates everything; one signed cookie, 30-day life.

## Deploy

You'll need a Cloudflare account, `wrangler` logged in, and `pnpm`.

```bash
pnpm install

# 1. Create D1 + KV
wrangler d1 create aishwin-design
wrangler kv namespace create CACHE
wrangler r2 bucket create aishwin-design-artifacts

# Paste the printed IDs into wrangler.toml.

# 2. Apply schema (seeds the six preloaded skills).
pnpm db:remote      # remote D1
pnpm db:local       # local D1 for `pnpm dev`

# 3. Set secrets
wrangler secret put APP_PASSWORD
wrangler secret put SESSION_SECRET   # any long random string

# 4. Build & deploy
pnpm deploy
```

For local development:

```bash
cp .dev.vars.example .dev.vars   # then edit
pnpm dev
```

`.dev.vars` should contain at minimum:

```
APP_PASSWORD=letmein
SESSION_SECRET=dev-secret
```

## Project layout

```
schema.sql                       D1 schema + seeded skills
wrangler.toml                    bindings + compat date
middleware.ts                    cookie presence check (HMAC verified server-side)
src/
  lib/
    auth.ts                      HMAC-signed session cookie
    env.ts                       getCloudflareContext bindings
    settings.ts                  BYOK settings (D1 'app' row)
    prompts.ts                   system-prompt composer
    providers/
      anthropic.ts               native Messages API streaming
      gemini.ts                  generativelanguage streamGenerateContent
      openai-compat.ts           Moonshot + OpenRouter
      sse.ts                     line splitter
  app/
    layout.tsx, globals.css      paper/ink palette, Inter + Source Serif
    page.tsx                     project list + new
    skills/page.tsx              list / edit / add skills
    settings/page.tsx            BYOK keys + defaults
    projects/[id]/page.tsx       chat + iframe + memory drawer
    api/
      auth/{login,logout}/       password → cookie
      projects/                  CRUD
      projects/[id]/messages/    SSE chat
      projects/[id]/memory/      add/delete memory rows
      skills/                    CRUD
      settings/                  read/patch BYOK
      artifacts/[id]/            sandboxed HTML serving
  components/
    Chrome.tsx                   header + footer
    NewProject.tsx
    SkillsManager.tsx
    SettingsForm.tsx
    ProjectCanvas.tsx            chat + iframe + memory
```

## Adapting to other providers

`src/lib/providers/openai-compat.ts` is a one-liner per provider — anything that speaks OpenAI's `chat/completions` works. Add a new entry, then add it to `PROVIDER_ORDER` in `src/lib/providers/index.ts`.

## What's intentionally missing

This is an MVP, not the whole open-design surface area:

- No image/video media generation. The agent emits only HTML.
- No design-system schema (yet). Skills carry the visual point of view directly.
- No multi-user accounts. One password.
- No R2/KV reads yet — both are wired as bindings so they can be used later.

## Lineage

This repo borrows the soul of `nexu-io/open-design`: the question-form discipline, restraint over decoration, and skills as plain-text rooms. It does not borrow code.
