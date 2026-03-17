import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export async function createCheckoutSession(params: {
  productName: string;
  imageUrl: string;
  amountCents: number;
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
          product_data: {
            name: params.productName,
            images: [params.imageUrl],
          },
        },
      },
    ],
    metadata: {
      cubId:       params.cubId,
      cubImage:    params.cubImage,
      productType: params.productType,
      variantId:   String(params.variantId),
    },
    shipping_address_collection: { allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'ES', 'MX'] },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}
