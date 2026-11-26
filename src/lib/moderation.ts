/**
 * src/lib/moderation.ts
 * ---------------------------------------------------------------------------
 * Strict, AI-first moderation for user text (Comms). Two layers:
 *   1. Instant local filter (profanity, sexual terms, links, spam patterns).
 *   2. Gemini classification of every message before it is shown.
 * Verdicts map to actions: sexual / hate / threat → instant ban;
 * profanity / spam / trolling → strike (3 strikes = ban); ok → posted.
 * If the AI is unavailable, only messages passing the local filter are posted.
 * ---------------------------------------------------------------------------
 */
import { GoogleGenAI } from '@google/genai';

export type Verdict = 'ok' | 'profanity' | 'sexual' | 'hate' | 'threat' | 'spam' | 'trolling';

// Word stems, matched on letter-normalised text (handles l33t and spacing tricks).
const PROFANITY = ['fuck', 'shit', 'bitch', 'cunt', 'dick', 'bastard', 'wank', 'twat', 'bollock', 'prick', 'asshole', 'arsehole', 'motherf', 'slut', 'whore'];
const SEXUAL = ['porn', 'nude', 'nudes', 'naked', 'sex', 'horny', 'onlyfans', 'boob', 'tits', 'penis', 'vagina', 'pussy', 'cock', 'blowjob', 'orgasm', 'nsfw', 'xxx', 'hentai', 'erotic'];

function normalise(s: string): string {
  return s
    .toLowerCase()
    .replace(/[@4]/g, 'a')
    .replace(/[3]/g, 'e')
    .replace(/[1!|]/g, 'i')
    .replace(/[0]/g, 'o')
    .replace(/[$5]/g, 's')
    .replace(/[7]/g, 't')
    .replace(/[^a-z]/g, '');
}

export function localCheck(text: string): Verdict {
  const flat = normalise(text).replace(/(.)\1+/g, '$1'); // fuuuck → fuck
  const words = text.toLowerCase().split(/[^a-z0-9]+/);
  if (SEXUAL.some((w) => words.some((x) => x.startsWith(w) && !['sextant', 'sexton', 'cocktail', 'cockpit', 'cockerel', 'cockroach', 'cockney'].includes(x) && !x.startsWith('sext') && !x.startsWith('sexa')) || (w.length > 5 && flat.includes(w)))) return 'sexual';
  // Distinctive stems can match inside squashed text; short ones only as word starts (avoids Scunthorpe, Dickens…).
  if (['fuck', 'motherf'].some((w) => flat.includes(w))) return 'profanity';
  if (PROFANITY.some((w) => words.some((x) => x.startsWith(w) && !['dickens', 'dickson', 'shitake', 'prickly', 'cocktail', 'cockpit', 'cockerel'].includes(x)))) return 'profanity';
  // Masked swears: f*ck, sh!t, b!tch, c*nt…
  if (/\bf[\W_]*[u*@#]?[\W_]*c[\W_]*k|\bs[\W_]*h[\W_]*[i*!1][\W_]*t\b|\bc[\W_]*[u*][\W_]*n[\W_]*t\b|\bb[\W_]*[i*!1][\W_]*t[\W_]*c[\W_]*h/i.test(text)) return 'profanity';
  if (/https?:\/\/|www\.|\.com\b|t\.me\/|discord\.gg/i.test(text)) return 'spam';
  if (/(.)\1{7,}/.test(text) || (text.length > 12 && text === text.toUpperCase() && /[A-Z]{12,}/.test(text))) return 'spam';
  return 'ok';
}

const PROMPT = `You moderate a chat on a serious-but-friendly UFO and space website. Classify the USER MESSAGE with exactly one label:
ok — on-topic or friendly conversation (sightings, space, science, the site's games), mild humour is fine
profanity — swearing or insults
sexual — any sexual, suggestive or indecent content, including innuendo
hate — slurs, racism, sexism, homophobia, or attacks on groups
threat — violence, self-harm encouragement, doxxing, harassment
spam — ads, links, crypto shilling, repeated or meaningless text
trolling — deliberately non-serious, provocative, edgy shock content or bait
Reply with only the label.`;

const MODELS = [process.env.GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'].filter(Boolean) as string[];

export async function moderate(text: string): Promise<{ verdict: Verdict; ai: boolean }> {
  const local = localCheck(text);
  if (local !== 'ok') return { verdict: local, ai: false };
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { verdict: 'ok', ai: false };
  const ai = new GoogleGenAI({ apiKey });
  for (const model of MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ text: `USER MESSAGE:\n"""${text.slice(0, 600)}"""` }] }],
        config: { systemInstruction: PROMPT, temperature: 0, maxOutputTokens: 5 },
      });
      const label = (res.text ?? '').trim().toLowerCase().replace(/[^a-z]/g, '') as Verdict;
      if (['ok', 'profanity', 'sexual', 'hate', 'threat', 'spam', 'trolling'].includes(label)) return { verdict: label, ai: true };
      return { verdict: 'ok', ai: true };
    } catch (e) {
      if (!/not found|404|not supported|unavailable|deprecated/i.test(e instanceof Error ? e.message : '')) break;
    }
  }
  return { verdict: 'ok', ai: false };
}

/** Severe verdicts ban immediately. */
export const BAN_NOW: Verdict[] = ['sexual', 'hate', 'threat'];

const IMAGE_PROMPT = `You screen images uploaded to a family-friendly website's crop-circle drawing gallery. Expected content: abstract glowing line drawings on a textured field (wheat, snow, sand, moon dust).
Reply with exactly one label:
ok — an abstract drawing, pattern, doodle, or harmless picture
sexual — any nudity, sexual or suggestive content, including drawn
violent — gore, weapons aimed at people, self-harm
hate — hate symbols or slurs
text — readable words, links, phone numbers or QR codes (spam / phishing risk)
photo — a real photograph of a person or private document
Reply with only the label.`;

/**
 * AI screening for uploaded images. Fails CLOSED: if the AI is unavailable
 * the upload is refused, so nothing unchecked is ever published.
 */
export async function moderateImage(bytes: Buffer, mime: string): Promise<{ ok: boolean; label: string }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, label: 'unavailable' };
  const ai = new GoogleGenAI({ apiKey });
  for (const model of MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [{ role: 'user', parts: [{ inlineData: { mimeType: mime, data: bytes.toString('base64') } }, { text: 'Label this image.' }] }],
        config: { systemInstruction: IMAGE_PROMPT, temperature: 0, maxOutputTokens: 5 },
      });
      const label = (res.text ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
      return { ok: label === 'ok', label: label || 'unknown' };
    } catch (e) {
      if (!/not found|404|not supported|unavailable|deprecated/i.test(e instanceof Error ? e.message : '')) break;
    }
  }
  return { ok: false, label: 'unavailable' };
}
