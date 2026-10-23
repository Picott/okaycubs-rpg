import { createHash, createHmac, createPublicKey, randomBytes, timingSafeEqual, verify as cryptoVerify } from 'crypto';
import { PublicKey } from '@solana/web3.js';
import type { NextRequest } from 'next/server';

export const SESSION_COOKIE = 'okaycubs_session';
const SESSION_DAYS = 7;

const SECRET = process.env.GAME_SESSION_SECRET
  || createHash('sha256').update(process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || 'okaycubs-dev').digest('hex');

export function newNonce() { return randomBytes(16).toString('hex'); }

export function signInMessage(nonce: string, domain: string) {
  return [
    'OkayCubs: The Honey Chronicles',
    '',
    'Sign in to sync your hunt across devices.',
    'This request will not trigger a blockchain transaction or cost any gas.',
    '',
    `Domain: ${domain}`,
    `Nonce: ${nonce}`,
  ].join('\n');
}

// Ed25519 verification with Node's crypto — Solana public keys are raw 32-byte Ed25519 keys
export function verifyWalletSignature(wallet: string, message: string, signatureB64: string): boolean {
  try {
    const raw = new PublicKey(wallet).toBytes();
    const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(raw)]);
    const key = createPublicKey({ key: der, format: 'der', type: 'spki' });
    return cryptoVerify(null, Buffer.from(message, 'utf8'), key, Buffer.from(signatureB64, 'base64'));
  } catch {
    return false;
  }
}

export function issueToken(wallet: string) {
  const payload = Buffer.from(JSON.stringify({ w: wallet, exp: Date.now() + SESSION_DAYS * 86400_000 })).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}

export function readToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(payload).digest('base64url');
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { w: string; exp: number };
    return data.exp > Date.now() ? data.w : null;
  } catch {
    return null;
  }
}

export function walletFromRequest(req: NextRequest): string | null {
  return readToken(req.cookies.get(SESSION_COOKIE)?.value);
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE, value: token, httpOnly: true, sameSite: 'lax' as const, path: '/',
    secure: process.env.NODE_ENV === 'production', maxAge: SESSION_DAYS * 86400,
  };
}
