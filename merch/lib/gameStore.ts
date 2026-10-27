import { NextResponse, type NextRequest } from 'next/server';
import EngineJs from '@/public/engine.js';
import { kv, kvConfigured, withLock } from './kv';
import { walletFromRequest } from './session';

export interface EngineResult {
  ok: boolean; error?: string; events?: unknown[]; p?: Profile; cost?: number; lvl?: number; unlocked?: string[];
}
interface EngineApi {
  newProfile(): Profile;
  rarityForNumber(num: number | null): string;
  deriveClass(traits: Record<string, string>, seed: string): string;
  startBattle(p: Profile, cub: CubInfo, opts: { now?: number }): EngineResult;
  startBoss(p: Profile, cub: CubInfo, opts: { now?: number }): EngineResult;
  bossAvailable(p: Profile, era: string): boolean;
  bossDone(p: Profile, era: string): boolean;
  resolveHunt(p: Profile, cub: CubInfo, report: { outcome: string; timeMs: number; pHP?: number; eHP?: number }, opts: { now?: number }): EngineResult & Record<string, unknown>;
  infuse(p: Profile, cub: CubInfo): EngineResult;
  reviveWithHoney(p: Profile, cubId: string, now: number): EngineResult;
  clearCooldown(p: Profile, cubId: string): EngineResult;
  selectEra(p: Profile, era: string, cub: CubInfo | null, opts: object): EngineResult;
  completeRoad(p: Profile, era: string, timeMs: number, honey: number, now: number, cubId?: string): EngineResult;
  isScout(id: string): boolean;
  scoutCub(id: string): CubInfo | null;
}
// The engine is plain JS shared with the browser; give the server a typed view of it
export const Engine = EngineJs as unknown as EngineApi;

export interface CubProg { xp: number; lvl: number }
export interface Battle {
  cubId: string; pHP: number; pMaxHP: number;
  enemy: { name: string; emoji: string; cls: string; hp: number; atk: number; def: number; xp: number; lvl: number; boss?: boolean; phases?: { family: string; move: string }[] } | null;
  eHP: number; eMaxHP: number; defending: boolean; boss?: boolean; era?: string;
}
export interface Profile {
  honey: number; honeyByEra: Record<string, number>; wins: number; era: string;
  cubProg: Record<string, CubProg>; cooldowns: Record<string, number>; hpPool: Record<string, number>;
  battle: Battle | null; roads?: Record<string, { runs: number; best: number | null; honey: number; lastAt: number }>;
  bosses?: Record<string, { runs: number; best: number | null; lastAt: number; hpLeft?: number; attempts?: number }>; updatedAt?: number;
}
export interface CubInfo {
  id: string; name: string; number: number | null; rarity: string; class: string;
  traits: Record<string, string>; jsonUri: string | null; image: string | null;
}

const HELIUS_KEY = process.env.HELIUS_KEY || 'b5292800-573a-40c5-9104-fa505b84baa9';
const HELIUS_RPC = process.env.HELIUS_RPC_URL || `https://mainnet.helius-rpc.com/?api-key=${HELIUS_KEY}`;
const OWNER_TTL  = 10 * 60;        // seconds an ownership check stays trusted
const META_TTL   = 24 * 3600;      // seconds cub metadata stays cached

export async function loadProfile(wallet: string): Promise<Profile> {
  return (await kv.get<Profile>(`profile:${wallet}`)) || Engine.newProfile();
}
export async function saveProfile(wallet: string, p: Profile) {
  p.updatedAt = Date.now();
  await kv.set(`profile:${wallet}`, p);
}

async function heliusGetAsset(mint: string): Promise<Record<string, any> | null> {
  try {
    const res = await fetch(HELIUS_RPC, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 'asset', method: 'getAsset', params: { id: mint } }),
      signal: AbortSignal.timeout(8000),
    });
    const json = await res.json();
    return json?.result || null;
  } catch { return null; }
}

function looksLikeOkayCub(asset: Record<string, any>): boolean {
  const name = String(asset.content?.metadata?.name || '').toLowerCase();
  const uri  = String(asset.content?.json_uri || '').toLowerCase();
  const coll = (asset.grouping || []).map((g: any) => `${g.collection_metadata?.name || ''} ${g.collection_metadata?.symbol || ''}`).join(' ').toLowerCase();
  return /cub|okay/.test(name) || /cub|okay|testlaunchmynft/.test(uri) || /cub|okay/.test(coll);
}

interface CachedCub { info: CubInfo; owner: string; ownerAt: number }

// Returns the cub only if `wallet` owns it (checked on-chain, cached briefly) and it is an OkayCub
export async function resolveOwnedCub(mint: string, wallet: string): Promise<CubInfo | null> {
  // Scout Cubs are loaned to everyone — no ownership to check
  if (Engine.isScout(mint)) return Engine.scoutCub(mint);
  const key = `cub:${mint}`;
  const cached = await kv.get<CachedCub>(key);
  if (cached && cached.owner === wallet && Date.now() - cached.ownerAt < OWNER_TTL * 1000) return cached.info;

  const asset = await heliusGetAsset(mint);
  if (!asset || !looksLikeOkayCub(asset)) return null;
  const owner: string = asset.ownership?.owner || '';
  if (owner !== wallet) return null;

  let info = cached?.info;
  if (!info) {
    const jsonUri: string | null = asset.content?.json_uri || null;
    const metaName: string = asset.content?.metadata?.name || '';
    const number = parseInt(metaName.replace(/\D/g, '')) || parseInt(jsonUri?.match(/\/(\d+)\.json(?:[?#]|$)/i)?.[1] ?? '') || null;
    const name = metaName || (number ? `OkayCub #${number}` : `OkayCub ${mint.slice(0, 4)}`);
    const traits: Record<string, string> = {};
    (asset.content?.metadata?.attributes || []).forEach((a: any) => { if (a?.trait_type) traits[a.trait_type] = String(a.value); });
    if (!Object.keys(traits).length && jsonUri) {
      try {
        const res = await fetch(jsonUri, { signal: AbortSignal.timeout(8000) });
        const json = await res.json();
        (json?.attributes || []).forEach((a: any) => { const k = a?.trait_type || a?.traitType; if (k) traits[k] = String(a.value); });
      } catch { /* class falls back to a per-cub seed */ }
    }
    info = {
      id: mint, name, number,
      rarity: Engine.rarityForNumber(number),
      class: Engine.deriveClass(traits, name),
      traits, jsonUri,
      image: asset.content?.links?.image || null,
    };
  }
  await kv.set(key, { info, owner, ownerAt: Date.now() } as CachedCub, META_TTL);
  return info;
}

// ---- route helpers ----
export function jsonError(status: number, error: string | undefined, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: error || 'error', ...extra }, { status });
}

export function requireSession(req: NextRequest): { wallet: string } | NextResponse {
  if (!kvConfigured) return jsonError(503, 'not_configured');
  const wallet = walletFromRequest(req);
  if (!wallet) return jsonError(401, 'unauthorized');
  return { wallet };
}

// Load → mutate → save under a per-wallet lock; `fn` returns the response body
export async function withProfile(wallet: string, fn: (p: Profile) => Promise<Record<string, unknown> | NextResponse>) {
  try {
    return await withLock(wallet, async () => {
      const p = await loadProfile(wallet);
      const out = await fn(p);
      if (out instanceof NextResponse) return out;
      await saveProfile(wallet, p);
      return NextResponse.json({ ok: true, state: p, now: Date.now(), ...out });
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonError(msg === 'busy' ? 409 : 500, msg === 'busy' ? 'busy' : 'server_error');
  }
}
