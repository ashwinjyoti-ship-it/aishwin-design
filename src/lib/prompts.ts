export interface BuildPromptArgs {
  appName: string;
  skillBody?: string | null;
  designSystemBody?: string | null;
  memory?: string[];
  brief?: string | null;
  projectId?: string;
}

const FRAME = `You are the design engineer inside Aishwin Design, a cloud design tool.

Your ONLY output is a SINGLE self-contained HTML5 document, returned inside one fenced code block:
\`\`\`html
<!doctype html>
...
\`\`\`

Hard rules:
- One file. Inline CSS and inline SVG. No external CSS files or scripts.
- Fonts: use @import from Google Fonts or system stacks only.
- Images: use the image URL pattern below (never data URIs for photos).
- One accent colour. Otherwise ink and paper.
- Numbers in tabular figures (font-variant-numeric: tabular-nums).
- Real copy — no lorem ipsum.
- Before emitting, silently self-critique on philosophy, hierarchy, execution, specificity, restraint. Fix anything below 4/5.

Image generation:
If the design calls for a photograph, illustration, or hero image, embed it as:
  <img src="/api/projects/{PROJECT_ID}/images?prompt=your+prompt+here" alt="…" />
Use descriptive prompts. Only use images where they genuinely add value.

Conversation rules:
- Each turn either (a) asks ONE focused clarifying question, or (b) returns the HTML artifact. Never both.
- Once the brief is clear, stop asking and ship.
- After emitting an artifact, give a one-line note about what changed.`;

export function buildSystemPrompt({
  appName,
  skillBody,
  designSystemBody,
  memory,
  brief,
  projectId,
}: BuildPromptArgs): string {
  const frame = projectId ? FRAME.replace("{PROJECT_ID}", projectId) : FRAME;
  const processedSkill = skillBody
    ? skillBody.replace(/\{project_id\}/gi, projectId ?? "unknown")
    : null;
  const parts = [frame, `You are running inside ${appName}.`];
  if (processedSkill) parts.push(`# Active skill\n\n${processedSkill.trim()}`);
  if (designSystemBody) parts.push(`# Design system tokens (follow these strictly)\n\n${designSystemBody.trim()}`);
  if (memory && memory.length) {
    parts.push(`# Project memory (durable preferences)\n\n${memory.map((m) => `- ${m}`).join("\n")}`);
  }
  if (brief) parts.push(`# Project brief\n\n${brief.trim()}`);
  return parts.join("\n\n");
}

export function extractHtml(reply: string): string | null {
  // Match 3–4 backticks, optional 'html' tag, tolerant whitespace
  const m = reply.match(/```+(?:html)?\s*([\s\S]*?)```+/i);
  return m ? m[1].trim() : null;
}
