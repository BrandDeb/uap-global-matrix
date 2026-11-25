/**
 * /api/daily, Daily Challenge.
 *   GET  → today's case (without the answer), guess split and top streaks
 *   POST { guess, handle, streak } → records today's guess, returns the answer
 */
import { verifiedHandle } from '@/auth';
import { dailyStats, saveDailyGuess } from '@/lib/db/queries';
import { cleanHandle, jsonError, readJson } from '@/lib/apiHelpers';
import { ANSWERS, caseForDay, dayNumber } from '@/lib/daily';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  const day = dayNumber();
  const c = caseForDay(day);
  try {
    const stats = await dailyStats(day);
    return Response.json({ day, case: { title: c.title, year: c.year, place: c.place, clue: c.clue }, ...stats });
  } catch {
    return Response.json({ day, case: { title: c.title, year: c.year, place: c.place, clue: c.clue }, split: {}, total: 0, streaks: [] });
  }
}

export async function POST(req: Request): Promise<Response> {
  const body = await readJson(req);
  const guess = typeof body?.guess === 'string' ? body.guess : '';
  if (!ANSWERS.some((a) => a.id === guess)) return jsonError(400, 'Unknown answer.');
  const day = dayNumber();
  const c = caseForDay(day);
  const correct = guess === c.answer;
  const streak = correct && typeof body?.streak === 'number' ? Math.max(1, Math.min(10_000, Math.floor(body.streak))) : 0;
  const handle = (await verifiedHandle()) ?? cleanHandle(body?.handle);
  if (handle) {
    try {
      await saveDailyGuess({ day, handle, guess, correct, streak });
    } catch {
      /* stats are best effort */
    }
  }
  return Response.json({ correct, answer: c.answer, reveal: c.reveal });
}
