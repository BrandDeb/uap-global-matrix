/**
 * POST /api/ai/ask — "Ask the Archivist".
 * ---------------------------------------------------------------------------
 * A grounded Q&A agent over the curated archive, on Gemini's free tier
 * (GEMINI_API_KEY; model via GEMINI_MODEL). The whole archive (59 compact
 * case lines) is the context, and the system prompt forbids inventing cases —
 * answers must cite archive titles + years, and say so when the archive is
 * silent. Light per-IP rate limit (in-memory, per server instance) keeps usage
 * inside the free quota.
 *
 * Body: { messages: { role: 'user' | 'model', text: string }[] }
 * → { answer: string } | { error }
 * ---------------------------------------------------------------------------
 */
import { GoogleGenAI } from '@google/genai';
import { ARCHIVE, ERAS } from '@/lib/archive';
import { jsonError, readJson } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

const CONTEXT = ARCHIVE.map(
  (c) =>
    `- ${c.year} | ${c.title} | ${c.locationName} | shape: ${c.morphology.toLowerCase()} | evidence: ${
      c.evidenceTypes.join(', ').toLowerCase() || 'eyewitness'
    } | source: ${c.archiveSource} (${c.documentId}) | credibility ${Math.round(c.credibilityScore)}% | ${c.description}`,
).join('\n');

const SYSTEM = `You are "The Archivist", the resident guide of UAP/MATRIX — a site about well-documented UFO/UAP sightings.
Voice: warm, curious, a little playful (the site is fun), but rigorous. Short paragraphs, under 180 words unless asked for more.
Rules:
1. Answer ONLY from the ARCHIVE below plus widely known, uncontroversial historical context. Never invent cases, documents, quotes or numbers.
2. When you mention a case, use its exact title and year, e.g. "Rendlesham Forest RAF Woodbridge Multi-Night Incident (1980)".
3. If the archive doesn't cover something, say so plainly and suggest the closest case it does have.
4. Distinguish evidence from interpretation: "unidentified" does not mean "alien". Mention prosaic explanations where they are well established.
5. Entries from 2026 ("PURSUE" releases) are as listed in the archive and not independently verified — say so if asked about them.
Eras: ${ERAS.map((e) => `${e.name} (${e.span})`).join('; ')}.
ARCHIVE:
${CONTEXT}`;

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return jsonError(503, 'The Archivist is offline on this deployment (no GEMINI_API_KEY configured).');
  }

  const ip = (req.headers.get('x-forwarded-for') ?? 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    return jsonError(429, 'The Archivist needs a breather — try again in a minute.');
  }
  hits.set(ip, [...recent, now]);

  const body = await readJson(req);
  const raw = Array.isArray(body?.messages) ? (body.messages as unknown[]) : [];
  const messages = raw
    .map((m) => m as { role?: unknown; text?: unknown })
    .filter((m) => (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
    .slice(-10)
    .map((m) => ({ role: m.role as 'user' | 'model', parts: [{ text: String(m.text).slice(0, 1200) }] }));
  if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
    return jsonError(400, 'Ask a question first.');
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: messages,
      config: { systemInstruction: SYSTEM, temperature: 0.6, maxOutputTokens: 600 },
    });
    const answer = res.text?.trim();
    if (!answer) return jsonError(502, 'The Archivist went quiet. Try rephrasing?');
    return Response.json({ answer });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI request failed.';
    const quota = /quota|429|rate/i.test(msg);
    return jsonError(quota ? 429 : 502, quota ? 'Free-tier quota reached for now — try again later.' : msg);
  }
}
