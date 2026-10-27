import { NextRequest, NextResponse } from 'next/server';
import { Engine, jsonError, requireSession, resolveOwnedCub, withProfile } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

// Opens the era boss fight: the kill threshold must be reached (the boss "awakens") and the cub
// must be able to fight in the current era. The fight itself is reported through /hunt/report.
export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const { cubId } = await req.json().catch(() => ({}));
  if (typeof cubId !== 'string') return jsonError(400, 'bad_request');

  const cub = await resolveOwnedCub(cubId, s.wallet);
  if (!cub) return jsonError(403, 'not_owner');

  return withProfile(s.wallet, async p => {
    const r = Engine.startBoss(p, cub, { now: Date.now() });
    if (!r.ok) return jsonError(400, r.error);
    return { events: r.events, cub };
  });
}
