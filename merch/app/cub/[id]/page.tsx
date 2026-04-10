'use client';

/**
 * Moltbook — Digital Passport for each OkayCub
 * Only visible to verified holders (wallet check on client)
 */

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { generatePersonality, CubPersonality } from '@/lib/personality';

interface Cub {
  id: string;
  name: string;
  image: string;
  number: number;
  rarity?: string;
  traits?: Record<string, string>;
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="font-cinzel text-[9px] tracking-[2px] text-silver opacity-50 uppercase">{label}</span>
        <span className="font-cinzel text-[9px] tracking-[1px] text-gold opacity-70">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
        />
      </div>
    </div>
  );
}

function MoltbookInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const cubId = decodeURIComponent(params.id as string);

  const [wallet, setWallet] = useState<string | null>(null);
  const [cub, setCub] = useState<Cub | null>(null);
  const [personality, setPersonality] = useState<CubPersonality | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connecting, setConnecting] = useState(false);

  // Restore wallet
  useEffect(() => {
    const walletParam = searchParams.get('wallet');
    const saved = walletParam || (typeof window !== 'undefined' ? localStorage.getItem('okaycubs_wallet') : null);
    if (saved) setWallet(saved);
  }, []);

  // Load cub when wallet is ready
  useEffect(() => {
    if (!wallet) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    fetch(`/api/cubs?wallet=${encodeURIComponent(wallet)}`)
      .then(r => r.json())
      .then((cubs: Cub[]) => {
        const found = cubs.find(c => c.id === cubId || c.name === cubId || String(c.number) === cubId);
        if (!found) {
          setError('This Cub is not in your wallet. Only holders can view Moltbooks.');
          return;
        }
        setCub(found);
        const p = generatePersonality(found.name, found.number, found.traits || {});
        setPersonality(p);
      })
      .catch(() => setError('Could not verify ownership. Please try again.'))
      .finally(() => setLoading(false));
  }, [wallet, cubId]);

  async function connectWallet() {
    const sol = (window as Window & { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana;
    if (!sol?.isPhantom) {
      setError('Phantom wallet not detected. Install it at phantom.app');
      return;
    }
    setConnecting(true);
    try {
      const resp = await sol.connect();
      const addr = resp.publicKey.toString();
      localStorage.setItem('okaycubs_wallet', addr);
      setWallet(addr);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Wallet connection failed');
    } finally {
      setConnecting(false);
    }
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!wallet) {
    return (
      <div className="text-center py-20 space-y-6 animate-fade-up">
        <div className="text-5xl">📜</div>
        <h2 className="font-cinzel-deco text-gold text-2xl">Moltbook</h2>
        <div className="rule" />
        <p className="font-crimson text-silver/50 italic text-base">
          The Moltbook is a holder-exclusive digital passport.<br />
          Connect your Phantom wallet to reveal your Cub's identity.
        </p>
        <button
          onClick={connectWallet}
          disabled={connecting}
          className="btn-gold inline-block"
        >
          {connecting ? 'Connecting…' : '⬡ Connect Phantom Wallet'}
        </button>
        {error && (
          <p className="font-cinzel text-[10px] tracking-[2px] text-red-400 opacity-70">{error}</p>
        )}
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
        <p className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-40 uppercase">
          Verifying ownership…
        </p>
      </div>
    );
  }

  // ── Error / not holder ─────────────────────────────────────────────────────
  if (error || !cub || !personality) {
    return (
      <div className="text-center py-20 space-y-4 animate-fade-up">
        <div className="text-4xl">🔒</div>
        <p className="font-cinzel text-[11px] tracking-[3px] text-gold opacity-60 uppercase">
          {error || 'Cub not found'}
        </p>
        <a href="/" className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase underline">
          ← Back to store
        </a>
      </div>
    );
  }

  const rarityColor = {
    legendary: '#f5e06e',
    epic:      '#9b59b6',
    rare:      '#3498db',
    common:    '#b8bcc8',
  }[cub.rarity || 'common'] || '#b8bcc8';

  // ── Moltbook passport ──────────────────────────────────────────────────────
  return (
    <div className="animate-fade-up space-y-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="text-center">
        <div className="font-cinzel text-[10px] tracking-[6px] text-gold opacity-50 uppercase mb-2">
          ✦ Moltbook · Digital Passport ✦
        </div>
        <div className="rule" />
      </div>

      {/* Passport card */}
      <div
        className="card-border p-6 space-y-6"
        style={{ boxShadow: `0 0 40px ${personality.elementColor}22, inset 0 0 40px ${personality.elementColor}08` }}
      >
        {/* Top: image + identity */}
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">

          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-32 h-32 rounded-full overflow-hidden border-2"
              style={{ borderColor: personality.elementColor, boxShadow: `0 0 24px ${personality.elementColor}55` }}
            >
              {cub.image ? (
                <Image src={cub.image} alt={cub.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl bg-black/40">🐻</div>
              )}
            </div>
            {/* Element badge */}
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-cinzel tracking-[2px] uppercase border"
              style={{ borderColor: personality.elementColor, color: personality.elementColor, background: '#07080f' }}
            >
              {personality.element}
            </div>
          </div>

          {/* Identity */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div
              className="font-cinzel text-[9px] tracking-[3px] uppercase opacity-60"
              style={{ color: rarityColor }}
            >
              {cub.rarity || 'common'} · #{cub.number}
            </div>
            <h2 className="gold-text font-cinzel-deco text-2xl font-black leading-tight">
              {cub.name}
            </h2>
            <div className="font-cinzel text-[12px] tracking-[2px] text-silver opacity-70">
              {personality.title}
            </div>
            <div className="font-crimson text-[14px] text-silver opacity-50 italic">
              "{personality.tagline}"
            </div>

            {/* Badges */}
            {personality.badges.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start pt-1">
                {personality.badges.map(b => (
                  <span
                    key={b}
                    className="font-cinzel text-[8px] tracking-[1px] uppercase px-2 py-0.5 border border-gold/20 text-gold opacity-60 rounded-sm"
                  >
                    {b}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="rule" />

        {/* Bio */}
        <div className="space-y-1">
          <div className="font-cinzel text-[9px] tracking-[4px] text-gold opacity-40 uppercase">Chronicle</div>
          <p className="font-crimson text-[15px] text-silver opacity-70 leading-relaxed italic">
            {personality.bio}
          </p>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="font-cinzel text-[9px] tracking-[4px] text-gold opacity-40 uppercase">Strata Stats</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <StatBar label="Strength" value={personality.stats.str} color={personality.elementColor} />
            <StatBar label="Defense"  value={personality.stats.def} color={personality.elementColor} />
            <StatBar label="Speed"    value={personality.stats.spd} color={personality.elementColor} />
            <StatBar label="Luck"     value={personality.stats.lck} color={personality.elementColor} />
            <StatBar label="Wisdom"   value={personality.stats.wis} color={personality.elementColor} />
          </div>
        </div>

        {/* Combat + Era */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="font-cinzel text-[9px] tracking-[4px] text-gold opacity-40 uppercase">Combat Style</div>
            <p className="font-crimson text-[14px] text-silver opacity-60 italic leading-snug">
              {personality.combatStyle}
            </p>
          </div>
          <div className="space-y-1">
            <div className="font-cinzel text-[9px] tracking-[4px] text-gold opacity-40 uppercase">Signature Quirk</div>
            <p className="font-crimson text-[14px] text-silver opacity-60 italic leading-snug">
              {personality.quirk}
            </p>
          </div>
        </div>

        {/* Era affinity */}
        <div className="text-center pt-2">
          <div className="font-cinzel text-[9px] tracking-[4px] text-gold opacity-40 uppercase mb-2">Era Affinity</div>
          <span
            className="font-cinzel text-[10px] tracking-[3px] uppercase px-5 py-1.5 border rounded-sm"
            style={{ borderColor: personality.elementColor, color: personality.elementColor }}
          >
            {personality.favoriteEra} Era
          </span>
        </div>

        {/* Traits table */}
        {Object.keys(cub.traits || {}).length > 0 && (
          <div className="space-y-2">
            <div className="font-cinzel text-[9px] tracking-[4px] text-gold opacity-40 uppercase">On-Chain Traits</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(cub.traits!).map(([k, v]) => (
                <div key={k} className="card-border p-2 text-center">
                  <div className="font-cinzel text-[8px] tracking-[1px] text-gold opacity-40 uppercase mb-0.5">{k}</div>
                  <div className="font-cinzel text-[10px] tracking-[1px] text-silver opacity-70">{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
        <a
          href={`/products/hoodie?cub=${encodeURIComponent(cub.id)}&wallet=${wallet}`}
          className="btn-gold text-center"
        >
          🧥 Merch This Cub
        </a>
        <a
          href="/game.html"
          className="font-cinzel text-[10px] tracking-[3px] uppercase px-8 py-3 border border-gold/30 text-gold/60 hover:border-gold hover:text-gold transition-all text-center"
        >
          ⛏ Enter the RPG
        </a>
      </div>

      {/* Nav */}
      <div className="text-center">
        <a href={`/?wallet=${wallet}`} className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase">
          ← All Products
        </a>
      </div>
    </div>
  );
}

export default function MoltbookPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
      </div>
    }>
      <MoltbookInner />
    </Suspense>
  );
}
