import { NextRequest, NextResponse } from 'next/server';
import { loadProfile, requireSession } from '@/lib/gameStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const s = requireSession(req);
  if (s instanceof NextResponse) return s;
  const p = await loadProfile(s.wallet);
  // Expired cooldowns are dropped lazily on read
  const now = Date.now();
  for (const id of Object.keys(p.cooldowns)) if (p.cooldowns[id] <= now) delete p.cooldowns[id];
  return NextResponse.json({ ok: true, wallet: s.wallet, state: p, now });
}
