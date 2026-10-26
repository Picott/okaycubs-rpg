import { NextRequest, NextResponse } from 'next/server';
import { Engine, jsonError, requireSession, resolveOwnedCub, withProfile } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';
const OUTCOMES = new Set(['win', 'lose', 'flee']);

// The hunt is fought in the browser; the server grants the outcome against the open battle after
// plausibility checks (minimum time for a win given the cub's stats) and applies the rewards.
export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const { outcome, timeMs, pHP } = await req.json().catch(() => ({}));
  if (!OUTCOMES.has(outcome) || !Number.isFinite(timeMs)) return jsonError(400, 'bad_request');

  return withProfile(s.wallet, async p => {
    if (!p.battle) return jsonError(400, 'no_battle');
    const cub = await resolveOwnedCub(p.battle.cubId, s.wallet);
    if (!cub) { p.battle = null; return jsonError(403, 'not_owner'); }
    const r = Engine.resolveHunt(p, cub, { outcome, timeMs, pHP: Number.isFinite(pHP) ? pHP : undefined }, { now: Date.now() });
    if (!r.ok) return jsonError(400, r.error);
    const { ok, p: _p, ...result } = r as Record<string, unknown>;
    return result;
  });
}
