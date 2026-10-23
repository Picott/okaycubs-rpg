import { NextRequest, NextResponse } from 'next/server';
import { Engine, jsonError, requireSession, resolveOwnedCub, withProfile } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const { cubId } = await req.json().catch(() => ({}));
  if (typeof cubId !== 'string') return jsonError(400, 'bad_request');

  const cub = await resolveOwnedCub(cubId, s.wallet);
  if (!cub) return jsonError(403, 'not_owner');

  return withProfile(s.wallet, async p => {
    const r = Engine.startBattle(p, cub, { now: Date.now() });
    if (!r.ok) return jsonError(400, r.error);
    return { events: r.events, cub };
  });
}
