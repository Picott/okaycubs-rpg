import { NextRequest, NextResponse } from 'next/server';
import { kv, kvConfigured } from '@/lib/kv';
import { issueToken, sessionCookie, signInMessage, verifyWalletSignature } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!kvConfigured) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });
  const { wallet, nonce, signature } = await req.json().catch(() => ({}));
  if (typeof wallet !== 'string' || typeof nonce !== 'string' || typeof signature !== 'string' || !/^[0-9a-f]{32}$/.test(nonce)) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  const stored = await kv.get(`nonce:${nonce}`);
  if (!stored) return NextResponse.json({ ok: false, error: 'nonce_expired' }, { status: 400 });
  await kv.del(`nonce:${nonce}`);

  const domain = req.headers.get('host') || 'okaycubs';
  if (!verifyWalletSignature(wallet, signInMessage(nonce, domain), signature)) {
    return NextResponse.json({ ok: false, error: 'bad_signature' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, wallet });
  res.cookies.set(sessionCookie(issueToken(wallet)));
  return res;
}
