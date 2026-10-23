import { NextRequest, NextResponse } from 'next/server';
import { Engine, jsonError, requireSession, resolveOwnedCub, withProfile } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const { era } = await req.json().catch(() => ({}));
  if (typeof era !== 'string') return jsonError(400, 'bad_request');

  return withProfile(s.wallet, async p => {
    const cub = p.battle ? await resolveOwnedCub(p.battle.cubId, s.wallet) : null;
    if (p.battle && !cub) p.battle = null;
    const r = Engine.selectEra(p, era, cub, {});
    if (!r.ok) return jsonError(400, r.error);
    return { events: r.events };
  });
}
