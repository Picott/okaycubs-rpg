import { kv, kvConfigured } from './kv';
import { PRODUCTS, ProductType } from './products';
import { printfulHeaders } from './printful';
import { COUNTRIES, COUNTRY_CODES, EU, STATE_REQUIRED } from './countries';
export { COUNTRIES, COUNTRY_CODES, EU, STATE_REQUIRED };

export function shippingZone(country: string): 'us' | 'ca' | 'eu' | 'gb' | 'oceania' | 'row' {
  if (country === 'US' || country === 'PR') return 'us';
  if (country === 'CA') return 'ca';
  if (country === 'GB') return 'gb';
  if (EU.has(country) || country === 'CH' || country === 'NO' || country === 'IS') return 'eu';
  if (country === 'AU' || country === 'NZ' || country === 'JP') return 'oceania';
  return 'row';
}

/** Orders outside Printful's own fulfillment regions may be charged import duties on delivery. */
export function customsApplies(country: string): boolean {
  return !['us', 'ca', 'eu', 'gb', 'oceania'].includes(shippingZone(country)) || country === 'CH' || country === 'NO' || country === 'IS';
}

// Fallback when Printful's rate API is unavailable (public standard rates, rounded up, in cents)
const FALLBACK_CENTS: Record<ReturnType<typeof shippingZone>, { apparel: number; accessory: number }> = {
  us:      { apparel: 899,  accessory: 499 },
  ca:      { apparel: 1099, accessory: 699 },
  eu:      { apparel: 799,  accessory: 499 },
  gb:      { apparel: 799,  accessory: 499 },
  oceania: { apparel: 1199, accessory: 699 },
  row:     { apparel: 1799, accessory: 1199 },
};

export interface ShipTo { country: string; state?: string; zip?: string; city?: string; address1?: string }
export interface ShippingQuote {
  cents: number;            // what the customer pays for standard shipping
  estimated: boolean;       // true when the fallback table was used instead of Printful's live rate
  minDays?: number; maxDays?: number;
  customs: boolean;         // import duties may be charged on delivery
}

function isAccessory(type: ProductType) { return !PRODUCTS[type].variants.some(v => v.size); }

export function fallbackQuote(type: ProductType, country: string): ShippingQuote {
  const z = FALLBACK_CENTS[shippingZone(country)];
  return { cents: isAccessory(type) ? z.accessory : z.apparel, estimated: true, customs: customsApplies(country) };
}

/**
 * Live standard shipping rate from Printful for one unit of the variant to the destination.
 * Cached one hour per (variant, country, state, zip). Falls back to the public rate table.
 */
export async function quoteShipping(type: ProductType, variantId: number, to: ShipTo): Promise<ShippingQuote> {
  const country = (to.country || '').toUpperCase();
  if (!COUNTRY_CODES.has(country)) throw new Error('unsupported_country');
  const state = (to.state || '').toUpperCase().slice(0, 3), zip = (to.zip || '').trim().slice(0, 12);
  const cacheKey = `shipquote:${variantId}:${country}:${state}:${zip}`;
  if (kvConfigured) {
    const hit = await kv.get<ShippingQuote>(cacheKey).catch(() => null);
    if (hit) return hit;
  }
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) return fallbackQuote(type, country);
  try {
    const res = await fetch('https://api.printful.com/shipping/rates', {
      method: 'POST',
      headers: await printfulHeaders(),
      body: JSON.stringify({
        recipient: { address1: to.address1 || '', city: to.city || '', country_code: country, state_code: state || undefined, zip: zip || undefined },
        items: [{ variant_id: variantId, quantity: 1 }],
        currency: 'USD', locale: 'en_US',
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json() as { code?: number; result?: { id: string; rate: string; minDeliveryDays?: number; maxDeliveryDays?: number }[]; error?: { message?: string } };
    if (!res.ok || !Array.isArray(data.result) || !data.result.length) throw new Error(data.error?.message || `rates ${res.status}`);
    const std = data.result.find(r => r.id === 'STANDARD') || data.result[0];
    const quote: ShippingQuote = {
      cents: Math.ceil(parseFloat(std.rate) * 100), estimated: false,
      minDays: std.minDeliveryDays, maxDays: std.maxDeliveryDays, customs: customsApplies(country),
    };
    if (kvConfigured) await kv.set(cacheKey, quote, 3600).catch(() => {});
    return quote;
  } catch (e) {
    console.warn('[shipping] live rate failed, using fallback:', e instanceof Error ? e.message : e);
    return fallbackQuote(type, country);
  }
}
