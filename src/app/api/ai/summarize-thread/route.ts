/**
 * src/app/api/ai/summarize-thread/route.ts
 * POST, summarize a case's operator thread into a tactical brief via Gemini,
 * and cache it in `uap_ai_briefs`. Briefs are only ever written server-side
 * here, so clients cannot forge "official" briefs. Gated on the key.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { upsertBrief } from '@/lib/db/queries';
import { isUuid } from '@/lib/apiHelpers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

interface ThreadComment {
  operator_handle?: unknown;
  intel_text?: unknown;
}

interface SummarizeRequest {
  sightingId?: unknown;
  caseTitle?: unknown;
  comments?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 503 });
  }

  let body: SummarizeRequest;
  try {
    body = (await req.json()) as SummarizeRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const sightingId = typeof body.sightingId === 'string' ? body.sightingId : '';
  const caseTitle = typeof body.caseTitle === 'string' ? body.caseTitle : 'Unknown target';
  const comments = Array.isArray(body.comments) ? (body.comments as ThreadComment[]) : [];
  if (!isUuid(sightingId)) {
    return NextResponse.json({ error: 'A valid "sightingId" is required.' }, { status: 400 });
  }
  if (comments.length === 0) {
    return NextResponse.json({ error: 'No comments to summarize.' }, { status: 400 });
  }

  const formatted = comments
    .map((c) => `@${String(c.operator_handle ?? 'ANON')}: ${String(c.intel_text ?? '')}`)
    .join('\n');

  const prompt =
    `Analyze these real-time operator intelligence updates regarding target ` +
    `"${caseTitle}":\n${formatted}\n\nGenerate an authoritative tactical intelligence ` +
    `brief summarizing the collective findings and a risk assessment. Respond strictly ` +
    `in JSON matching: { "summary": string, "threatAssessment": "LOW" | "ELEVATED" | "CRITICAL_UNKNOWN" }`;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });
    const text = response.text;
    if (!text) {
      return NextResponse.json({ error: 'Empty model response.' }, { status: 502 });
    }

    let parsed: { summary?: unknown; threatAssessment?: unknown };
    try {
      parsed = JSON.parse(text) as { summary?: unknown; threatAssessment?: unknown };
    } catch {
      return NextResponse.json({ error: 'Model returned non-JSON.' }, { status: 502 });
    }

    const summary = typeof parsed.summary === 'string' ? parsed.summary : '';
    const threatAssessment =
      typeof parsed.threatAssessment === 'string' ? parsed.threatAssessment : 'LOW';

    try {
      await upsertBrief(sightingId, summary, threatAssessment);
    } catch (cacheErr: unknown) {
      const msg = cacheErr instanceof Error ? cacheErr.message : 'unknown error';
      return NextResponse.json(
        { summary, threatAssessment, warning: `Brief generated but not cached: ${msg}` },
        { status: 207 },
      );
    }

    return NextResponse.json({ summary, threatAssessment });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI request failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
