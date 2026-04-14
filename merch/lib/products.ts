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
    description: 'Unisex fleece sweatpants with your Cub printed on the front.',
    basePrice: 4500, // $45.00
    // Cotton Heritage M7580 Unisex Fleece Sweatpants — catalog product 412
    // Variant IDs verified via /api/printful/catalog
    printfulProductId: 412,
    printPlacement: 'front',
    // Cub image centered on the front thigh area
    printPosition: { area_width: 1800, area_height: 2400, width: 900, height: 900, top: 600, left: 450 },
    variants: [
      { size: 'S',  color: 'Black',            colorHex: '#1a1a1a', printfulVariantId: 11266 },
      { size: 'M',  color: 'Black',            colorHex: '#1a1a1a', printfulVariantId: 11267 },
      { size: 'L',  color: 'Black',            colorHex: '#1a1a1a', printfulVariantId: 11268 },
      { size: 'XL', color: 'Black',            colorHex: '#1a1a1a', printfulVariantId: 11269 },
      { size: 'S',  color: 'Carbon Grey',      colorHex: '#3a3a3a', printfulVariantId: 11278 },
      { size: 'M',  color: 'Carbon Grey',      colorHex: '#3a3a3a', printfulVariantId: 11279 },
      { size: 'L',  color: 'Carbon Grey',      colorHex: '#3a3a3a', printfulVariantId: 11280 },
      { size: 'XL', color: 'Carbon Grey',      colorHex: '#3a3a3a', printfulVariantId: 11281 },
      { size: 'S',  color: 'Navy Blazer',      colorHex: '#1b2a4a', printfulVariantId: 13852 },
      { size: 'M',  color: 'Navy Blazer',      colorHex: '#1b2a4a', printfulVariantId: 13853 },
      { size: 'L',  color: 'Navy Blazer',      colorHex: '#1b2a4a', printfulVariantId: 13854 },
      { size: 'XL', color: 'Navy Blazer',      colorHex: '#1b2a4a', printfulVariantId: 13855 },
    ],
  },

  cap: {
    type: 'cap',
    name: 'OkayCubs Cap',
    description: 'Classic 5-panel cap with your Cub printed on the front.',
    basePrice: 2800, // $28.00
    // Yupoong 7005 5 Panel Cap — catalog product 92
    // Variant IDs verified via /api/printful/catalog
    printfulProductId: 92,
    printPlacement: 'front',
    // Front panel is roughly 1800×600 px at template resolution; center the Cub design
    printPosition: { area_width: 1800, area_height: 600, width: 700, height: 500, top: 50, left: 550 },
    variants: [
      { color: 'Black',  colorHex: '#1a1a1a', printfulVariantId: 4622 },
      { color: 'Grey',   colorHex: '#888888', printfulVariantId: 4624 },
      { color: 'Khaki',  colorHex: '#c8b89a', printfulVariantId: 4625 },
      { color: 'Navy',   colorHex: '#1b2a4a', printfulVariantId: 4626 },
      { color: 'Olive',  colorHex: '#6b6b3a', printfulVariantId: 4627 },
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
