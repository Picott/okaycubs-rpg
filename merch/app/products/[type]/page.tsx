'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef, Suspense } from 'react';
import Image from 'next/image';
import { PRODUCTS, ProductType, UNIQUE_COLORS, SIZES, getVariant } from '@/lib/products';

interface Cub {
  id: string;
  name: string;
  image: string;
  number: number;
}

async function fetchCubs(wallet?: string | null): Promise<Cub[]> {
  const url = wallet ? `/api/cubs?wallet=${encodeURIComponent(wallet)}` : '/api/cubs';
  const res = await fetch(url);
  if (!res.ok) return [];
  return res.json();
}

function ProductPageInner() {
  const params       = useParams();
  const searchParams = useSearchParams();
  const type         = params.type as ProductType;
  const product      = PRODUCTS[type];

  const [cubs, setCubs]             = useState<Cub[]>([]);
  const [selectedCub, setSelectedCub] = useState<Cub | null>(null);
  const [selectedColor, setColor]   = useState<string>('');
  const [selectedSize, setSize]     = useState<string>('');
  const [mockupUrl, setMockupUrl]   = useState<string>('');
  const [loadingMockup, setLoadingMockup] = useState(false);
  const [mockupFailed, setMockupFailed] = useState(false);
  const mockupDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockupReqId   = useRef(0);
  const [paying, setPaying]         = useState(false);
  const [solPrice, setSolPrice]     = useState<number>(0);
  const [qrUrl, setQrUrl]           = useState<string>('');
  const [payMode, setPayMode]       = useState<'card' | 'sol'>('card');
  // Solana Pay — reference key + order snapshot for post-payment fulfillment
  const [solReference, setSolReference] = useState<string>('');
  const [solLamports, setSolLamports]   = useState<number>(0);
  const [solStatus, setSolStatus]       = useState<'idle'|'waiting'|'confirmed'|'failed'>('idle');
  const solPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Shipping form (required for SOL checkout)
  const [showShipping, setShowShipping] = useState(false);
  const [shipping, setShipping] = useState({ name:'', address1:'', city:'', state:'', country:'US', zip:'' });

  const colors   = product ? UNIQUE_COLORS(type) : [];
  const sizes    = selectedColor ? SIZES(type, selectedColor) : [];
  const variant  = selectedColor ? getVariant(type, selectedColor, selectedSize || undefined) : null;

  // Load cubs — wallet comes from ?wallet= param or localStorage
  useEffect(() => {
    const walletParam = searchParams.get('wallet');
    const wallet = walletParam || (typeof window !== 'undefined' ? localStorage.getItem('okaycubs_wallet') : null);
    fetchCubs(wallet).then(data => {
      setCubs(data);
      const preselect = searchParams.get('cub');
      if (preselect) {
        const found = data.find(c => c.id === preselect);
        if (found) setSelectedCub(found);
      }
    });
    // default color
    if (colors.length) setColor(colors[0].color);
  }, [type]);

  // Fetch SOL price
  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
      .then(r => r.json())
      .then(d => setSolPrice(d?.solana?.usd ?? 0))
      .catch(() => {});
  }, []);

  // Generate mockup when cub + variant are ready — debounced to avoid 429s
  useEffect(() => {
    if (!selectedCub?.image || !variant) return;

    // Cancel any in-flight debounce timer
    if (mockupDebounce.current) clearTimeout(mockupDebounce.current);

    // Reset state for the new selection immediately
    setMockupUrl('');
    setMockupFailed(false);
    setLoadingMockup(false);

    // Increment request counter — each request owns its ID; only the latest clears loading
    const reqId = ++mockupReqId.current;

    // Debounce: wait 600ms after the last change before calling Printful
    mockupDebounce.current = setTimeout(() => {
      // Abort if a newer request has already been scheduled
      if (mockupReqId.current !== reqId) return;

      setLoadingMockup(true);

      const absImage = selectedCub.image.startsWith('http')
        ? selectedCub.image
        : window.location.origin + selectedCub.image;

    (async () => {
      try {
        // Step 1: create task — retry once on 429
        let taskKey: string | null = null;
        for (let attempt = 0; attempt < 2; attempt++) {
          if (mockupReqId.current !== reqId) return;
          const createRes = await fetch('/api/printful/mockup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productType: type, variantId: variant.printfulVariantId, imageUrl: absImage }),
          });
          const createData = await createRes.json() as { taskKey?: string; error?: string; retryAfter?: number; detail?: unknown };

          // 400 = bad product config — not retriable
          if (createRes.status === 400) {
            console.error('[mockup] Bad config (variant/product mismatch):', JSON.stringify(createData));
            if (mockupReqId.current === reqId) setMockupFailed(true);
            return;
          }

          // 429 = rate limited — back off then retry once
          if (createRes.status === 429) {
            if (attempt >= 1) {
              console.warn('[mockup] Still rate limited after retry — giving up');
              if (mockupReqId.current === reqId) setMockupFailed(true);
              return;
            }
            const wait = Math.min((createData.retryAfter ?? 30), 90) * 1000;
            console.warn(`[mockup] Rate limited — backing off ${wait / 1000}s then retrying…`);
            await new Promise(r => setTimeout(r, wait));
            if (mockupReqId.current !== reqId) return;
            continue;
          }

          if (!createData.taskKey) {
            console.error('[mockup] Printful error:', JSON.stringify(createData));
            if (mockupReqId.current === reqId) setMockupFailed(true);
            return;
          }
          taskKey = createData.taskKey;
          break;
        }

        if (!taskKey) {
          if (mockupReqId.current === reqId) setMockupFailed(true);
          return;
        }

        // Step 2: poll every 2s until done (max 60s)
        for (let i = 0; i < 30; i++) {
          await new Promise(r => setTimeout(r, 2000));
          if (mockupReqId.current !== reqId) return;

          const pollRes = await fetch(`/api/printful/mockup?task_key=${taskKey}`);
          const data = await pollRes.json() as { status: string; mockupUrl?: string; reason?: unknown };

          if (data.status === 'completed') {
            if (mockupReqId.current === reqId && data.mockupUrl) setMockupUrl(data.mockupUrl);
            return;
          }
          if (data.status === 'failed') {
            // Log the actual Printful reason so we can debug
            console.error('[mockup] Printful task failed. Reason:', JSON.stringify(data.reason ?? data));
            if (mockupReqId.current === reqId) setMockupFailed(true);
            return;
          }
        }
        // timed out
        if (mockupReqId.current === reqId) setMockupFailed(true);
      } catch {
        if (mockupReqId.current === reqId) setMockupFailed(true);
      } finally {
        // Only the owning request clears the loading spinner
        if (mockupReqId.current === reqId) setLoadingMockup(false);
      }
    })();
    }, 600); // debounce: only fire after 600ms of no changes

    return () => {
      // Invalidate this request by bumping the counter if debounce hasn't fired yet
      if (mockupDebounce.current) {
        clearTimeout(mockupDebounce.current);
        mockupReqId.current++;
      }
    };
  }, [selectedCub, variant?.printfulVariantId]);

  if (!product) {
    return (
      <div className="text-center py-20">
        <div className="font-cinzel text-gold opacity-60">Product not found.</div>
      </div>
    );
  }

  const canCheckout = !!selectedCub && !!variant && (type === 'cap' || !!selectedSize);
  const priceUsd    = product.basePrice / 100;
  const priceSol    = solPrice ? (priceUsd / solPrice).toFixed(4) : '…';

  async function handleStripeCheckout() {
    if (!canCheckout) return;
    setPaying(true);
    try {
      const res = await fetch('/api/checkout/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productType: type,
          variantId: variant!.printfulVariantId,
          cubId:   selectedCub!.id,
          cubName: selectedCub!.name,
          cubImage: selectedCub!.image
            ? (selectedCub!.image.startsWith('http') ? selectedCub!.image : window.location.origin + selectedCub!.image)
            : '',
          mockupUrl,
        }),
      });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setPaying(false);
    }
  }

  // Stop any active Solana polling
  function stopSolPoll() {
    if (solPollRef.current) { clearInterval(solPollRef.current); solPollRef.current = null; }
  }

  // Show shipping form before generating QR
  function initiateSolanaCheckout() {
    if (!canCheckout || !solPrice) return;
    setShowShipping(true);
  }

  async function handleSolanaCheckout() {
    if (!canCheckout || !solPrice) return;
    // Validate shipping
    if (!shipping.name || !shipping.address1 || !shipping.city || !shipping.country) return;

    setShowShipping(false);
    setPaying(true);
    setSolStatus('idle');
    stopSolPoll();

    try {
      const res = await fetch('/api/checkout/solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productType: type, cubId: selectedCub!.id, solPriceUsd: solPrice }),
      });
      const data = await res.json() as { url?: string; solAmount?: string; memo?: string; reference?: string; lamports?: number };
      if (!data.url) return;

      // Save reference + lamports for fulfillment polling
      if (data.reference) setSolReference(data.reference);
      if (data.lamports)  setSolLamports(data.lamports);

      if (/Mobi|Android/i.test(navigator.userAgent)) {
        window.location.href = data.url;
      } else {
        const qr = await import('qrcode');
        const dataUrl = await qr.default.toDataURL(data.url, { width: 280, margin: 2, color: { dark: '#d4af37', light: '#07080f' } });
        setQrUrl(dataUrl);
        setSolStatus('waiting');

        // Poll every 4s until payment confirmed (max 5 min)
        let attempts = 0;
        solPollRef.current = setInterval(async () => {
          attempts++;
          if (attempts > 75) { stopSolPoll(); setSolStatus('failed'); return; }
          if (!data.reference || !data.lamports) return;

          try {
            const fulfillRes = await fetch('/api/checkout/solana/fulfill', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                reference:   data.reference,
                lamports:    data.lamports,
                productType: type,
                variantId:   variant!.printfulVariantId,
                cubId:       selectedCub!.id,
                cubImage:    selectedCub!.image
                  ? (selectedCub!.image.startsWith('http') ? selectedCub!.image : window.location.origin + selectedCub!.image)
                  : '',
                shipping,
              }),
            });
            const result = await fulfillRes.json() as { verified?: boolean; pending?: boolean };
            if (result.verified) {
              stopSolPoll();
              setSolStatus('confirmed');
              // Redirect to success after short delay
              setTimeout(() => { window.location.href = '/order/success'; }, 1500);
            }
            // if pending: keep polling
          } catch { /* network hiccup — keep polling */ }
        }, 4000);
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <main className="animate-fade-up">
      <div className="font-cinzel text-[11px] tracking-[5px] text-gold opacity-55 uppercase text-center mb-8">
        ✦ {product.name} ✦
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* LEFT — preview */}
        <div className="space-y-5">
          {/* Mockup / placeholder */}
          <div className="card-border p-2 flex items-center justify-center" style={{ minHeight: 340 }}>
            {mockupUrl ? (
              <Image src={mockupUrl} alt="Product mockup" width={400} height={400} className="w-full object-contain" unoptimized />
            ) : selectedCub?.image && selectedColor ? (() => {
              const colorHex = UNIQUE_COLORS(type).find(c => c.color === selectedColor)?.colorHex ?? '#1a1a1a';
              return (
                <div className="relative w-full flex flex-col items-center justify-center gap-4" style={{ minHeight: 320 }}>
                  {/* Ambient glow behind the swatch */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(ellipse at 50% 45%, ${colorHex}55 0%, transparent 68%)` }} />
                  {/* Colour swatch with cub */}
                  <div
                    className="relative flex items-center justify-center rounded-2xl overflow-hidden"
                    style={{ width: 230, height: 230, background: colorHex, boxShadow: `0 8px 40px ${colorHex}88, 0 0 0 1px ${colorHex}33` }}
                  >
                    <Image src={selectedCub.image} alt={selectedCub.name} width={190} height={190} className="object-contain rounded-full" />
                    {loadingMockup && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 uppercase text-center">
                    {loadingMockup ? 'Generating mockup…' : mockupFailed ? `${selectedCub.name} — Color Preview` : selectedCub.name}
                  </div>
                </div>
              );
            })() : selectedCub?.image ? (
              <div className="text-center py-12 opacity-40">
                <div className="font-cinzel text-[10px] tracking-[3px] text-gold uppercase">Select a color to preview</div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-5xl mb-4">
                  {type === 'hoodie' ? '🧥' : type === 'joggers' ? '👖' : '🧢'}
                </div>
                <div className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-50 uppercase">Select your Cub below</div>
              </div>
            )}
          </div>

          {/* Price */}
          <div className="text-center">
            <div className="font-cinzel-deco text-gold text-2xl">${priceUsd.toFixed(2)}</div>
            {solPrice > 0 && (
              <div className="font-cinzel text-[10px] tracking-[2px] opacity-40 mt-1">
                ≈ {priceSol} SOL
              </div>
            )}
          </div>
        </div>

        {/* RIGHT — config */}
        <div className="space-y-7">

          {/* Cub selector */}
          <div>
            <div className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-60 uppercase mb-3">
              Your Cub
            </div>
            {cubs.length === 0 ? (
              <div className="font-crimson italic text-silver opacity-40 text-sm">No Cubs loaded yet.</div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                {cubs.map(cub => (
                  <button
                    key={cub.id}
                    onClick={() => setSelectedCub(cub)}
                    className={`card-border p-1.5 transition-all ${selectedCub?.id === cub.id ? 'selected' : ''}`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-gold/20 mx-auto mb-1 relative">
                      {cub.image ? (
                        <Image src={cub.image} alt={cub.name} fill className="object-cover" unoptimized />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl bg-black/40">🐻</div>
                      )}
                    </div>
                    <div className="font-cinzel text-[8px] text-center leading-tight opacity-70 truncate">{cub.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Color selector */}
          <div>
            <div className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-60 uppercase mb-3">
              Color
            </div>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c.color}
                  onClick={() => { setColor(c.color); setSize(''); }}
                  title={c.color}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${selectedColor === c.color ? 'border-gold scale-110' : 'border-white/10 hover:border-gold/50'}`}
                  style={{ background: c.colorHex }}
                />
              ))}
            </div>
            {selectedColor && (
              <div className="font-cinzel text-[9px] tracking-[2px] opacity-40 mt-2">{selectedColor}</div>
            )}
          </div>

          {/* Size selector (not for caps) */}
          {sizes.length > 0 && (
            <div>
              <div className="font-cinzel text-[10px] tracking-[3px] text-gold opacity-60 uppercase mb-3">
                Size
              </div>
              <div className="flex flex-wrap gap-2">
                {sizes.map(s => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`font-cinzel text-[10px] tracking-[2px] px-4 py-2 border transition-all ${
                      selectedSize === s
                        ? 'border-gold text-gold bg-gold/10'
                        : 'border-white/10 text-silver/60 hover:border-gold/50'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Payment buttons */}
          <div className="space-y-3 pt-2">
            <div className="flex gap-3">
              <button
                onClick={() => setPayMode('card')}
                className={`flex-1 font-cinzel text-[10px] tracking-[2px] uppercase py-2 border transition-all ${
                  payMode === 'card' ? 'border-gold text-gold' : 'border-white/10 text-silver/40'
                }`}
              >
                Card
              </button>
              <button
                onClick={() => setPayMode('sol')}
                className={`flex-1 font-cinzel text-[10px] tracking-[2px] uppercase py-2 border transition-all ${
                  payMode === 'sol' ? 'border-[#9945ff] text-[#9945ff]' : 'border-white/10 text-silver/40'
                }`}
              >
                ◎ SOL
              </button>
            </div>

            {payMode === 'card' ? (
              <button
                className="btn-gold w-full"
                disabled={!canCheckout || paying}
                onClick={handleStripeCheckout}
              >
                {paying ? 'Redirecting…' : `Pay $${priceUsd.toFixed(2)} with Card`}
              </button>
            ) : (
              <>
                {/* Shipping form — shown before QR */}
                {showShipping && (
                  <div className="card-border p-4 space-y-3 animate-fade-up">
                    <div className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-60 uppercase mb-1">Shipping Address</div>
                    {(['name','address1','city','state','zip'] as const).map(field => (
                      <input
                        key={field}
                        type="text"
                        placeholder={field === 'address1' ? 'Address' : field === 'name' ? 'Full Name' : field.charAt(0).toUpperCase() + field.slice(1)}
                        value={shipping[field]}
                        onChange={e => setShipping(s => ({ ...s, [field]: e.target.value }))}
                        className="w-full bg-black/30 border border-white/10 text-silver text-[12px] px-3 py-2 font-crimson focus:border-gold/50 outline-none"
                      />
                    ))}
                    <select
                      value={shipping.country}
                      onChange={e => setShipping(s => ({ ...s, country: e.target.value }))}
                      className="w-full bg-black/30 border border-white/10 text-silver text-[12px] px-3 py-2 font-crimson focus:border-gold/50 outline-none"
                    >
                      {['US','CA','GB','AU','DE','FR','ES','MX'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button
                      onClick={handleSolanaCheckout}
                      disabled={!shipping.name || !shipping.address1 || !shipping.city || !shipping.country}
                      className="btn-sol w-full"
                    >
                      Generate QR · {priceSol} SOL
                    </button>
                    <button onClick={() => setShowShipping(false)} className="font-cinzel text-[8px] tracking-[2px] text-gold opacity-30 hover:opacity-60 w-full text-center uppercase">Cancel</button>
                  </div>
                )}

                {!showShipping && !qrUrl && (
                  <button
                    className="btn-sol w-full"
                    disabled={!canCheckout || paying || !solPrice}
                    onClick={initiateSolanaCheckout}
                  >
                    {paying ? 'Preparing…' : `Pay ${priceSol} SOL`}
                  </button>
                )}

                {qrUrl && (
                  <div className="card-border p-4 text-center animate-fade-up space-y-3">
                    <div className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-60 uppercase">
                      Scan with Phantom
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={qrUrl} alt="Solana Pay QR" className="mx-auto w-52" />
                    <div className={`font-cinzel text-[8px] tracking-[2px] uppercase ${
                      solStatus === 'confirmed' ? 'text-green-400 opacity-80' :
                      solStatus === 'failed'    ? 'text-red-400 opacity-70'   : 'opacity-30'
                    }`}>
                      {solStatus === 'confirmed' ? '✓ Payment confirmed — placing your order…' :
                       solStatus === 'failed'    ? 'Payment not detected. Please try again.' :
                       'Waiting for payment…'}
                    </div>
                    {solStatus === 'waiting' && (
                      <div className="w-4 h-4 border border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
                    )}
                  </div>
                )}
              </>
            )}

            {!canCheckout && (
              <div className="font-cinzel text-[9px] tracking-[2px] text-center opacity-30 uppercase">
                {!selectedCub ? 'Select a Cub' : !selectedColor ? 'Select a color' : 'Select a size'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav back */}
      <div className="text-center mt-12">
        <a href="/" className="font-cinzel text-[9px] tracking-[3px] text-gold opacity-40 hover:opacity-70 transition-opacity uppercase">
          ← All Products
        </a>
      </div>
    </main>
  );
}

export default function ProductPage() {
  return (
    <Suspense fallback={<div className="text-center py-20 font-cinzel text-gold opacity-40">Loading…</div>}>
      <ProductPageInner />
    </Suspense>
  );
}
