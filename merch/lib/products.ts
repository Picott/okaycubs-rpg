// Printful product IDs + variant config
// https://developers.printful.com/docs/#tag/Catalog

export type ProductType = 'hoodie' | 'joggers' | 'cap';

export interface ProductVariant {
  size?: string;
  color: string;
  colorHex: string;
  printfulVariantId: number;
}

export interface Product {
  type: ProductType;
  name: string;
  description: string;
  basePrice: number; // USD cents
  printfulProductId: number;
  // Printful placement key for the print area
  printPlacement: string;
  variants: ProductVariant[];
}

export const PRODUCTS: Record<ProductType, Product> = {
  hoodie: {
    type: 'hoodie',
    name: 'OkayCubs Hoodie',
    description: 'Unisex pullover fleece hoodie with your Cub printed on the front.',
    basePrice: 5500, // $55.00
    printfulProductId: 380,
    printPlacement: 'front',
    variants: [
      { size: 'S',  color: 'Black',     colorHex: '#1a1a1a', printfulVariantId: 13535 },
      { size: 'M',  color: 'Black',     colorHex: '#1a1a1a', printfulVariantId: 13536 },
      { size: 'L',  color: 'Black',     colorHex: '#1a1a1a', printfulVariantId: 13537 },
      { size: 'XL', color: 'Black',     colorHex: '#1a1a1a', printfulVariantId: 13538 },
      { size: 'S',  color: 'Navy',      colorHex: '#1b2a4a', printfulVariantId: 13555 },
      { size: 'M',  color: 'Navy',      colorHex: '#1b2a4a', printfulVariantId: 13556 },
      { size: 'L',  color: 'Navy',      colorHex: '#1b2a4a', printfulVariantId: 13557 },
      { size: 'XL', color: 'Navy',      colorHex: '#1b2a4a', printfulVariantId: 13558 },
      { size: 'S',  color: 'Vintage White', colorHex: '#ede8df', printfulVariantId: 13575 },
      { size: 'M',  color: 'Vintage White', colorHex: '#ede8df', printfulVariantId: 13576 },
      { size: 'L',  color: 'Vintage White', colorHex: '#ede8df', printfulVariantId: 13577 },
      { size: 'XL', color: 'Vintage White', colorHex: '#ede8df', printfulVariantId: 13578 },
    ],
  },

  joggers: {
    type: 'joggers',
    name: 'OkayCubs Joggers',
    description: 'Unisex fleece joggers with your Cub on the left leg.',
    basePrice: 4800, // $48.00
    printfulProductId: 447,
    printPlacement: 'left_leg',
    variants: [
      { size: 'S',  color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 14302 },
      { size: 'M',  color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 14303 },
      { size: 'L',  color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 14304 },
      { size: 'XL', color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 14305 },
      { size: 'S',  color: 'Navy',  colorHex: '#1b2a4a', printfulVariantId: 14312 },
      { size: 'M',  color: 'Navy',  colorHex: '#1b2a4a', printfulVariantId: 14313 },
      { size: 'L',  color: 'Navy',  colorHex: '#1b2a4a', printfulVariantId: 14314 },
      { size: 'XL', color: 'Navy',  colorHex: '#1b2a4a', printfulVariantId: 14315 },
    ],
  },

  cap: {
    type: 'cap',
    name: 'OkayCubs Cap',
    description: 'Classic unstructured dad hat with embroidered Cub number.',
    basePrice: 3200, // $32.00
    printfulProductId: 74,
    printPlacement: 'front',
    variants: [
      { color: 'Black',         colorHex: '#1a1a1a', printfulVariantId: 3502 },
      { color: 'Navy',          colorHex: '#1b2a4a', printfulVariantId: 3503 },
      { color: 'Khaki',         colorHex: '#c8b89a', printfulVariantId: 3506 },
      { color: 'Stone',         colorHex: '#9e9e8e', printfulVariantId: 3508 },
      { color: 'Vintage White', colorHex: '#ede8df', printfulVariantId: 3510 },
    ],
  },
};

export const UNIQUE_COLORS = (type: ProductType) =>
  Array.from(new Map(PRODUCTS[type].variants.map(v => [v.color, v])).values());

export const SIZES = (type: ProductType, color: string) =>
  PRODUCTS[type].variants.filter(v => v.color === color && v.size).map(v => v.size!);

export function getVariant(type: ProductType, color: string, size?: string) {
  return PRODUCTS[type].variants.find(
    v => v.color === color && (!size || v.size === size)
  ) ?? null;
}
