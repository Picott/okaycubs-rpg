import type { ProductType } from './products';

// A Solana payment intent: everything fulfilment needs, fixed when the QR is shown. Stored in Redis
// under the reference; the browser only ever sends the reference back.
export interface SolIntent {
  reference: string; lamports: number; solPrice: number;
  productType: ProductType; variantId: number; cubId: string; cubImage: string;
  itemCents: number; shippingCents: number; totalCents: number;
  shipping: { name: string; email: string; address1: string; address2?: string; city: string; state: string; country: string; zip: string; phone?: string };
  createdAt: number;
}
export const INTENT_TTL = 2 * 3600;
export const intentKey = (reference: string) => `solintent:${reference}`;
