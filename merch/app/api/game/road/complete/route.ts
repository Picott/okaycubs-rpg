import { NextRequest, NextResponse } from 'next/server';
import { Engine, jsonError, requireSession, withProfile } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

// Records a finished Honey Road run. The run itself happens in the browser, so the server only
// enforces the rules it can: the road must be unlocked, the honey is capped and the time plausible.
export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const { era, timeMs, honey } = await req.json().catch(() => ({}));
  if (typeof era !== 'string' || !Number.isFinite(timeMs) || !Number.isFinite(honey)) return jsonError(400, 'bad_request');

  return withProfile(s.wallet, async p => {
    const r = Engine.completeRoad(p, era, Math.round(timeMs), Math.round(honey), Date.now());
    if (!r.ok) return jsonError(400, r.error);
    return { unlocked: r.unlocked };
  });
}
