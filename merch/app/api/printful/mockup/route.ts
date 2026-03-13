import { NextRequest, NextResponse } from 'next/server';
import { generateMockup } from '@/lib/printful';
import { PRODUCTS, ProductType } from '@/lib/products';

export async function POST(req: NextRequest) {
  const { productType, variantId, imageUrl } = await req.json();

  if (!productType || !variantId || !imageUrl) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const product = PRODUCTS[productType as ProductType];
  if (!product) {
    return NextResponse.json({ error: 'Invalid product type' }, { status: 400 });
  }

  const mockupUrl = await generateMockup(
    product.printfulProductId,
    variantId,
    product.printPlacement,
    imageUrl
  );

  if (!mockupUrl) {
    return NextResponse.json({ error: 'Mockup generation failed' }, { status: 502 });
  }

  return NextResponse.json({ mockupUrl });
}
