import Stripe from 'stripe';

// trimmed: a stray space or newline from the dashboard paste would otherwise break every call
export const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || '').trim(), {
  apiVersion: '2025-02-24.acacia',
});

export async function createCheckoutSession(params: {
  productName: string;
  imageUrl: string;
  amountCents: number;
  shippingCents: number;
  shippingLabel: string;
  country: string;          // the quote is only valid for this destination, so the address is locked to it
  cubId: string;
  cubImage: string;
  productType: string;
  variantId: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: params.amountCents,
          product_data: { name: params.productName, images: [params.imageUrl] },
        },
      },
    ],
    shipping_options: [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          display_name: params.shippingLabel,
          fixed_amount: { amount: params.shippingCents, currency: 'usd' },
        },
      },
    ],
    metadata: {
      cubId:         params.cubId,
      cubImage:      params.cubImage,
      productType:   params.productType,
      variantId:     String(params.variantId),
      shippingCents: String(params.shippingCents),
      country:       params.country,
    },
    shipping_address_collection: { allowed_countries: [params.country as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry] },
    phone_number_collection: { enabled: true },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}
