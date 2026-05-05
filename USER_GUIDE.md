# Aishwin Design — User Guide

A short walkthrough of the studio: setup once, then design.

---

## 1. One-time setup (you, ~10 minutes)

These steps you have to run yourself the first time. After this, every push to `main` auto-deploys.

### A. Create the Cloudflare resources

In a terminal, with `wrangler` logged in to the right account:

```bash
# 1. D1 database
wrangler d1 create aish-design
# → copy the printed `database_id` into wrangler.toml

# 2. KV namespace (reserved for cache)
wrangler kv namespace create CACHE
# → copy the printed `id` into wrangler.toml

# 3. R2 bucket (reserved for big artifacts)
wrangler r2 bucket create aish-design-artifacts

# 4. Apply schema + seed the six preloaded skills
wrangler d1 execute aish-design --remote --file=./schema.sql
```

Commit the updated `wrangler.toml` (with real IDs) and push.

### B. Create the Pages project

The fastest way:

1. Cloudflare dashboard → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
2. Select this repo. Project name: `aish-design`. Production branch: `main`.
3. Build settings — leave empty. (We deploy via Action, not CF's auto-builder.)
4. Click **Save and Deploy** (the first build will fail; that's OK, the GitHub Action handles real deploys).

In **Settings → Functions → Bindings**, add:

| Binding name | Type | Value |
|---|---|---|
| `DB` | D1 database | `aish-design` |
| `CACHE` | KV namespace | (the one you created) |
| `ARTIFACTS` | R2 bucket | `aish-design-artifacts` |

In **Settings → Environment variables → Production** (encrypted):

| Variable | Value |
|---|---|
| `APP_PASSWORD` | a password you'll remember |
| `SESSION_SECRET` | any long random string |
| `APP_NAME` | `Aishwin Design` |

### C. Wire up GitHub Actions

You need a Cloudflare API token with Pages deploy + D1 + KV + R2 permissions:

1. https://dash.cloudflare.com/profile/api-tokens → **Create Token** → use the **Edit Cloudflare Workers** template.
2. In the GitHub repo: **Settings → Secrets and variables → Actions**, add:
   - `CLOUDFLARE_API_TOKEN` — the token above
   - `CLOUDFLARE_ACCOUNT_ID` — your account ID (top-right of CF dashboard)

Once the PR is merged to `main`, the action `Deploy to Cloudflare Pages` runs and pushes to https://aish-design.pages.dev.

---

## 2. Daily use

### Sign in

Visit https://aish-design.pages.dev. Enter `APP_PASSWORD`. The session cookie lives 30 days.

### First step: add a key

Go to **Settings**. Add at least one provider key:

- **Moonshot Kimi** is the default (Kimi K2 / K2.6 models).
- **Anthropic** for Claude Sonnet 4.6, Opus 4.7, Haiku 4.5.
- **Gemini** for Gemini 2.5.
- **OpenRouter** if you want one key that fans out to all of them.

Pick a default provider and model. Save.

### Start a project

On the home page, fill in the right-hand panel:

- **Name** — what you'll call this project.
- **Brief** — one or two sentences on what it is and for whom. Tone helps.
- **Skill** — pick the room you're designing in. The skill body is appended to every system prompt for this project.

Click **Create project** → you land on the canvas.

### The canvas

Three columns of behaviour:

- **Top bar** — name, skill, provider, model, memory drawer toggle. All editable inline.
- **Left** — the conversation. Type a message, press `⌘↵` (or click Send). The assistant streams its reply.
- **Right** — the latest HTML artifact, sandboxed in an iframe. Every time the assistant emits a fenced ` ```html ` block, it's saved and shown here.

The agent's discipline:

- Each turn is *either* a focused clarifying question *or* an HTML artifact. Never both.
- After it ships an artifact it gives a one-line note about what changed.

### Iterating

To revise: just say what to change.

> "Tighter hero. Drop the gradient. Headline should be a claim, not a category."

The artifact updates. Older artifacts stay in the conversation — click "Open artifact in new tab" on any past message to revisit.

### Memory

Click **Memory** in the top bar to open the drawer. Memory notes are short, durable preferences:

- "Brand voice: technical but warm"
- "Always use Source Serif for headlines"
- "Never use icons for features — use small numbered headings"

Every message you send appends all memory notes to the system prompt. Use them to make the agent stop forgetting decisions you've already made.

### Skills

Open **Skills** in the header.

- Six are preloaded: `saas-landing`, `dashboard`, `mobile-app`, `deck`, `infographic`, `email`. You can edit but not delete them.
- Click **+ New** to write your own. A skill is plain Markdown — describe required sections, guardrails, type scale, anything you want enforced. The body becomes part of the system prompt for any project assigned to this skill.
- Save. Now it's available in the project skill picker.

A good skill has three sections: **Required (what must exist)**, **Guardrails (how it must look)**, **Self-critique (what to check before emitting)**.

---

## 3. Operating it

- **Logs** — Cloudflare dashboard → Pages → aish-design → **Functions** tab → Real-time logs.
- **Database** — `wrangler d1 execute aish-design --remote --command="SELECT name, updated_at FROM projects ORDER BY updated_at DESC LIMIT 10"`.
- **Adding a provider** — append a new entry to `src/lib/providers/openai-compat.ts` (one config block) and add it to `PROVIDER_ORDER` in `src/lib/providers/index.ts`. Push.
- **Schema changes** — edit `schema.sql`, commit, then trigger the **Migrate D1 schema** workflow from the Actions tab.
- **Resetting the password** — change `APP_PASSWORD` in CF Pages env vars; redeploy isn't required, but old cookies stay valid until they expire (30d). Rotate `SESSION_SECRET` to invalidate everyone immediately.

---

## 4. Troubleshooting

**"No API key set for moonshot"** — Settings → paste the key.

**Stream stops mid-reply** — usually the provider rate-limited. Try again or switch model.

**iframe is blank but the chat shows a long reply** — the agent didn't wrap output in a ` ```html ` fenced block. Send: "Wrap your output in a single \`\`\`html block."

**Login redirects in a loop** — `APP_PASSWORD` env var probably isn't set in the Pages project.

**Action fails on first deploy** — check the GH Actions logs. Most common: `CLOUDFLARE_API_TOKEN` lacks Pages permission, or the project name in `aish-design` doesn't match the project you created in the dashboard.
