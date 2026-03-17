'use client';

import { useState, useEffect } from 'react';
import { PRODUCTS } from '@/lib/products';
import Link from 'next/link';
import Image from 'next/image';

interface Cub {
  id: string;
  name: string;
  image: string;
  number: number;
}

const PRODUCT_ICONS: Record<string, string> = {
  hoodie:  '🧥',
  joggers: '👖',
  cap:     '🧢',
};

export default function HomePage() {
  const [wallet, setWallet]   = useState<string | null>(null);
  const [cubs, setCubs]       = useState<Cub[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus]   = useState('');

  // On mount: restore wallet from localStorage or load browse mode
  useEffect(() => {
    const saved = localStorage.getItem('okaycubs_wallet');
    if (saved) {
      setWallet(saved);
      loadCubs(saved);
    } else {
      loadAllCubs();
    }
  }, []);

  async function connectWallet() {
    const sol = (window as Window & { solana?: { isPhantom?: boolean; connect: () => Promise<{ publicKey: { toString: () => string } }> } }).solana;
    if (!sol?.isPhantom) {
      setStatus('Phantom not detected — please install the Phantom wallet extension');
      return;
    }
    try {
      const resp = await sol.connect();
      const addr = resp.publicKey.toString();
      setWallet(addr);
      localStorage.setItem('okaycubs_wallet', addr);
      loadCubs(addr);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      setStatus(`Wallet error: ${msg}`);
    }
  }

  function disconnectWallet() {
    setWallet(null);
    localStorage.removeItem('okaycubs_wallet');
    loadAllCubs();
  }

  async function loadCubs(addr: string) {
    setLoading(true);
    setStatus('Scanning the strata for your Cubs…');
    try {
      const res  = await fetch(`/api/cubs?wallet=${encodeURIComponent(addr)}`);
      const data = await res.json() as Cub[];
      setCubs(data);
      setStatus(data.length > 0
        ? `✦ ${data.length} OkayCubs loaded from chain ✦`
        : 'No OkayCubs found in this wallet');
    } catch {
      setStatus('Error loading Cubs — please try again');
    } finally {
      setLoading(false);
    }
  }

  async function loadAllCubs() {
    setLoading(true);
    setStatus('');
    try {
      const res  = await fetch('/api/cubs');
      const data = await res.json() as Cub[];
      setCubs(data);
      if (data.length > 0) setStatus(`✦ ${data.length} OkayCubs available ✦`);
    } catch {
      setCubs([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      {/* PRODUCT TYPES */}
      <section>
        <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase text-center mb-5">
          ✦ Choose Your Item ✦
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-16">
          {Object.values(PRODUCTS).map(p => (
            <Link
              key={p.type}
              href={`/products/${p.type}${wallet ? `?wallet=${wallet}` : ''}`}
              className="card-border p-6 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 group"
            >
              <div className="text-4xl mb-3">{PRODUCT_ICONS[p.type]}</div>
              <div className="font-cinzel text-[13px] font-semibold text-quartz mb-1 group-hover:text-gold transition-colors">
                {p.name.replace('OkayCubs ', '')}
              </div>
              <div className="font-crimson text-[12px] text-silver opacity-50 mb-3 leading-snug">
                {p.description}
              </div>
              <div className="font-cinzel text-[11px] tracking-[2px] text-gold opacity-80">
                from ${(p.basePrice / 100).toFixed(2)}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* WALLET */}
      <section className="text-center mb-10">
        {wallet ? (
          <div className="space-y-2">
            <div className="font-cinzel text-[11px] tracking-[3px] uppercase" style={{ color: '#2ecc71', opacity: 0.85 }}>
              ✓ Phantom Connected
            </div>
            <div className="font-cinzel text-[10px] tracking-[2px] text-silver opacity-45">
              {wallet.slice(0, 4)}…{wallet.slice(-4)}
            </div>
            <button
              onClick={disconnectWallet}
              className="font-cinzel text-[9px] tracking-[2px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase underline"
            >
              disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={connectWallet}
            className="font-cinzel text-[12px] tracking-[3px] uppercase px-9 py-3.5 border border-gold text-gold hover:bg-gold/10 transition-all"
            style={{ boxShadow: undefined }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 24px rgba(212,175,55,.25)')}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
          >
            ⬡ Connect Phantom Wallet
          </button>
        )}
        {status && (
          <div className="font-cinzel text-[10px] tracking-[2px] mt-3 text-gold opacity-60">
            {status}
          </div>
        )}
      </section>

      {/* CUBS GALLERY */}
      <section>
        <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase text-center mb-5">
          {wallet ? '✦ Your Cubs ✦' : '✦ Browse Cubs ✦'}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
            <div className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-40 uppercase">
              Scanning the strata…
            </div>
          </div>
        ) : cubs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {cubs.map(cub => (
              <Link
                key={cub.id}
                href={`/products/hoodie?cub=${encodeURIComponent(cub.id)}${wallet ? `&wallet=${wallet}` : ''}`}
                className="card-border p-4 text-center cursor-pointer transition-all duration-300 hover:-translate-y-1 group"
              >
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold/25 mx-auto mb-3 relative">
                  {cub.image ? (
                    <Image
                      src={cub.image}
                      alt={cub.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl bg-black/40">🐻</div>
                  )}
                </div>
                <div className="font-cinzel text-[12px] text-quartz group-hover:text-gold transition-colors">
                  {cub.name}
                </div>
              </Link>
            ))}
          </div>
        ) : !wallet ? (
          <div className="text-center py-12 card-border space-y-4">
            <div className="text-4xl">🐻</div>
            <div className="font-cinzel text-[11px] tracking-[3px] text-gold opacity-60 uppercase">
              Don&apos;t own an OkayCub yet?
            </div>
            <div className="font-crimson text-[14px] text-silver opacity-50 italic">
              Connect your Phantom wallet above to use your own Cubs,<br />
              or pick any featured Cub from our collection below.
            </div>
            <button
              onClick={loadAllCubs}
              className="font-cinzel text-[10px] tracking-[3px] uppercase px-7 py-2.5 border border-gold/50 text-gold/70 hover:border-gold hover:text-gold transition-all"
            >
              ✦ Browse Featured Cubs ✦
            </button>
          </div>
        ) : (
          <div className="text-center py-12 card-border">
            <div className="text-4xl mb-4">🐻</div>
            <div className="font-cinzel text-[11px] tracking-[3px] text-gold opacity-60 uppercase mb-2">
              No OkayCubs found
            </div>
            <div className="font-crimson text-[14px] text-silver opacity-40 italic">
              This wallet doesn&apos;t hold any OkayCubs
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
