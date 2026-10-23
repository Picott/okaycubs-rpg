import { NextRequest, NextResponse } from 'next/server';
import { kv, kvConfigured } from '@/lib/kv';
import { newNonce, signInMessage } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!kvConfigured) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  const nonce = newNonce();
  await kv.set(`nonce:${nonce}`, { t: Date.now() }, 300);
  const domain = req.headers.get('host') || 'okaycubs';
  return NextResponse.json({ ok: true, nonce, message: signInMessage(nonce, domain) });
}
