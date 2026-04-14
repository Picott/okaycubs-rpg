// Printful product IDs + variant config
// https://developers.printful.com/docs/#tag/Catalog

export type ProductType = 'hoodie' | 'joggers' | 'cap';

export interface ProductVariant {
  size?: string;
  color: string;
  colorHex: string;
  printfulVariantId: number;
}

export interface PrintPosition {
  area_width: number;
  area_height: number;
  width: number;
  height: number;
  top: number;
  left: number;
}

export interface Product {
  type: ProductType;
  name: string;
  description: string;
  basePrice: number; // USD cents
  printfulProductId: number;
  printPlacement: string;
  // Position of the design within the print area (pixels at product template resolution).
  // Values come from GET /mockup-generator/printfiles/{product_id}.
  // If omitted, Printful uses the default center position (recommended for caps/joggers).
  printPosition?: PrintPosition;
  variants: ProductVariant[];
}

export const PRODUCTS: Record<ProductType, Product> = {
  hoodie: {
    // Cotton Heritage M2580 I Unisex Premium Pullover Hoodie — catalog product 380
    // Variant IDs verified via /api/printful/catalog
    type: 'hoodie',
    name: 'OkayCubs Hoodie',
    description: 'Unisex pullover fleece hoodie with your Cub printed on the front.',
    basePrice: 5500, // $55.00
    printfulProductId: 380,
    printPlacement: 'front',
    // Dimensions from GET /mockup-generator/printfiles/380 — front template is 1800×2400 px
    printPosition: { area_width: 1800, area_height: 2400, width: 1800, height: 1800, top: 300, left: 0 },
    variants: [
      { size: 'S',  color: 'Black',          colorHex: '#1a1a1a', printfulVariantId: 10779 },
      { size: 'M',  color: 'Black',          colorHex: '#1a1a1a', printfulVariantId: 10780 },
      { size: 'L',  color: 'Black',          colorHex: '#1a1a1a', printfulVariantId: 10781 },
      { size: 'XL', color: 'Black',          colorHex: '#1a1a1a', printfulVariantId: 10782 },
      { size: 'S',  color: 'Navy',           colorHex: '#1b2a4a', printfulVariantId: 11491 },
      { size: 'M',  color: 'Navy',           colorHex: '#1b2a4a', printfulVariantId: 11492 },
      { size: 'L',  color: 'Navy',           colorHex: '#1b2a4a', printfulVariantId: 11493 },
      { size: 'XL', color: 'Navy',           colorHex: '#1b2a4a', printfulVariantId: 11494 },
      { size: 'S',  color: 'Vintage White',  colorHex: '#ede8df', printfulVariantId: 24975 },
      { size: 'M',  color: 'Vintage White',  colorHex: '#ede8df', printfulVariantId: 24976 },
      { size: 'L',  color: 'Vintage White',  colorHex: '#ede8df', printfulVariantId: 24977 },
      { size: 'XL', color: 'Vintage White',  colorHex: '#ede8df', printfulVariantId: 24978 },
    ],
  },

  joggers: {
    type: 'joggers',
    name: 'OkayCubs Joggers',
    description: 'Unisex fleece joggers with your Cub on the front.',
    basePrice: 4800, // $48.00
    // Bella+Canvas 3727 Unisex Polycotton Fleece Jogger — catalog product 374
    // Run /api/printful/catalog to verify IDs; update if 374 returns httpStatus 404
    printfulProductId: 374,
    printPlacement: 'front',
    printPosition: { area_width: 1800, area_height: 2400, width: 900, height: 900, top: 600, left: 450 },
    variants: [
      // Variant IDs for product 374 — fetch /api/printful/catalog to get real IDs
      // Placeholder IDs below — MUST be updated after checking catalog
      { size: 'S',  color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 10799 },
      { size: 'M',  color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 10800 },
      { size: 'L',  color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 10801 },
      { size: 'XL', color: 'Black', colorHex: '#1a1a1a', printfulVariantId: 10802 },
      { size: 'S',  color: 'Dark Heather', colorHex: '#333333', printfulVariantId: 10811 },
      { size: 'M',  color: 'Dark Heather', colorHex: '#333333', printfulVariantId: 10812 },
      { size: 'L',  color: 'Dark Heather', colorHex: '#333333', printfulVariantId: 10813 },
      { size: 'XL', color: 'Dark Heather', colorHex: '#333333', printfulVariantId: 10814 },
    ],
  },

  cap: {
    type: 'cap',
    name: 'OkayCubs Cap',
    description: 'Classic unstructured dad hat with your Cub printed on the front.',
    basePrice: 3200, // $32.00
    // Yupoong 6089 Unstructured Classic Dad Hat — catalog product 3719
    // Run /api/printful/catalog to verify IDs; update if 3719 returns httpStatus 404
    printfulProductId: 3719,
    printPlacement: 'front',
    printPosition: { area_width: 1800, area_height: 450, width: 800, height: 350, top: 50, left: 500 },
    variants: [
      // Variant IDs for product 3719 — fetch /api/printful/catalog to get real IDs
      { color: 'Black',         colorHex: '#1a1a1a', printfulVariantId: 60213 },
      { color: 'Navy',          colorHex: '#1b2a4a', printfulVariantId: 60214 },
      { color: 'Khaki',         colorHex: '#c8b89a', printfulVariantId: 60219 },
      { color: 'Stone',         colorHex: '#9e9e8e', printfulVariantId: 60222 },
      { color: 'White',         colorHex: '#f5f5f0', printfulVariantId: 60210 },
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
