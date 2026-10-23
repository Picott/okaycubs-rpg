import { NextRequest, NextResponse } from 'next/server';
import { Engine, jsonError, requireSession, resolveOwnedCub, withProfile, type CubInfo } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';
const ACTIONS = new Set(['atk', 'def', 'spc', 'drink', 'switch']);

export async function POST(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const { action, switchTo } = await req.json().catch(() => ({}));
  if (!ACTIONS.has(action)) return jsonError(400, 'bad_request');
  if (action === 'switch' && typeof switchTo !== 'string') return jsonError(400, 'bad_request');

  return withProfile(s.wallet, async p => {
    if (!p.battle) return jsonError(400, 'no_battle');
    const cubs: Record<string, CubInfo> = {};
    const active = await resolveOwnedCub(p.battle.cubId, s.wallet);
    if (!active) { p.battle = null; return jsonError(403, 'not_owner'); }
    cubs[active.id] = active;
    if (action === 'switch') {
      const target = await resolveOwnedCub(switchTo, s.wallet);
      if (!target) return jsonError(403, 'not_owner_target');
      cubs[target.id] = target;
    }
    const r = Engine.resolveAction(p, cubs, action, { now: Date.now(), switchTo });
    if (!r.ok) return jsonError(400, r.error);
    return { events: r.events, cubs };
  });
}
