/**
 * src/app/api/ai/analyze-report/route.ts
 * POST — triage a raw user encounter log into a structured report via Gemini.
 * Gated on GEMINI_API_KEY (503 if absent). The key is server-only.
 */

import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MODEL = process.env.GEMINI_MODEL ?? 'gemini-2.0-flash';

interface AnalyzeRequest {
  rawUserText?: unknown;
  locationInput?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 503 });
  }

  let body: AnalyzeRequest;
  try {
    body = (await req.json()) as AnalyzeRequest;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const rawUserText = typeof body.rawUserText === 'string' ? body.rawUserText.trim() : '';
  const locationInput = typeof body.locationInput === 'string' ? body.locationInput.trim() : '';
  if (!rawUserText) {
    return NextResponse.json({ error: '"rawUserText" is required.' }, { status: 400 });
  }

  const prompt =
    `You are an elite military aerospace anomaly triage system. Analyze this raw ` +
    `encounter log: "${rawUserText}" at location "${locationInput}". Respond strictly ` +
    `in JSON matching this schema: { "structuredTitle": string, "refinedSummary": string, ` +
    `"estimatedCredibilityIndex": number, "suggestedTags": string[], ` +
    `"potentialConventionalExplanation": string }`;

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
    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ error: 'Model returned non-JSON.' }, { status: 502 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'AI request failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
