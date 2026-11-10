// Printful product IDs + variant config
// https://developers.printful.com/docs/#tag/Catalog
// Variant ids, costs, placements, printfile sizes and size tables verified against the Printful API on 2026-11-07.
// Costs below are Printful's S–XL price; 2XL carries a +$2.00 markup.

export type ProductType = 'hoodie' | 'crewneck' | 'joggers' | 'tee' | 'beanie' | 'cap';

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
  icon: string;
  description: string;
  basePrice: number;        // USD cents, what the customer pays before shipping
  costCents: number;        // Printful's S–XL cost, for margin reports (not shown to customers)
  printfulProductId: number;
  printPlacement: string;
  // Position of the design within the print area (pixels at product template resolution).
  // Values come from GET /mockup-generator/printfiles/{product_id}.
  printPosition?: PrintPosition;
  variants: ProductVariant[];
}

const run = (sizes: string[], color: string, colorHex: string, ids: number[]): ProductVariant[] =>
  sizes.map((size, i) => ({ size, color, colorHex, printfulVariantId: ids[i] }));
const SIZES_5 = ['S', 'M', 'L', 'XL', '2XL'];

export const PRODUCTS: Record<ProductType, Product> = {
  hoodie: {
    // Cotton Heritage M2580 — catalog product 380. Front printfile 1800×1800 @150dpi.
    type: 'hoodie',
    name: 'OkayCubs Hoodie',
    icon: '🧥',
    description: 'Heavyweight fleece pullover hoodie with your Cub on the chest. The one you board the plane in.',
    basePrice: 5800,
    costCents: 2784,
    printfulProductId: 380,
    printPlacement: 'front',
    printPosition: { area_width: 1800, area_height: 1800, width: 1500, height: 1500, top: 150, left: 150 },
    variants: [
      ...run(SIZES_5, 'Black',            '#080808', [10779, 10780, 10781, 10782, 10783]),
      ...run(SIZES_5, 'Navy Blazer',      '#171f2c', [11491, 11492, 11493, 11494, 11495]),
      ...run(SIZES_5, 'Charcoal Heather', '#463e3d', [11481, 11482, 11483, 11484, 11485]),
      ...run(SIZES_5, 'Bone',             '#f5e8ce', [20284, 20285, 20286, 20287, 20288]),
      ...run(SIZES_5, 'Carbon Grey',      '#c7c3be', [10784, 10785, 10786, 10787, 10788]),
    ],
  },

  crewneck: {
    // Cotton Heritage M2480 — catalog product 411. Same fleece and colors as the hoodie. Front printfile 1800×2400.
    type: 'crewneck',
    name: 'OkayCubs Crewneck',
    icon: '👕',
    description: 'Premium fleece crewneck sweatshirt with your Cub on the chest. Hoodie comfort, no hood.',
    basePrice: 5200,
    costCents: 2453,
    printfulProductId: 411,
    printPlacement: 'front',
    printPosition: { area_width: 1800, area_height: 2400, width: 1500, height: 1500, top: 200, left: 150 },
    variants: [
      ...run(SIZES_5, 'Black',            '#101010', [11254, 11255, 11256, 11257, 11258]),
      ...run(SIZES_5, 'Navy Blazer',      '#171f2c', [13252, 13253, 13254, 13255, 13256]),
      ...run(SIZES_5, 'Charcoal Heather', '#3a3a38', [11259, 11260, 11261, 11262, 11263]),
      ...run(SIZES_5, 'Bone',             '#f5e8ce', [20357, 20356, 20355, 20354, 20353]),
    ],
  },

  joggers: {
    // Cotton Heritage M7580 — catalog product 412. Prints on one leg (DTG), 525×2175 @150dpi.
    type: 'joggers',
    name: 'OkayCubs Joggers',
    icon: '👖',
    description: 'Fleece joggers with your Cub on the left leg. Airport-to-couch approved.',
    basePrice: 6000,
    costCents: 2998,
    printfulProductId: 412,
    printPlacement: 'leg_front_left',
    printPosition: { area_width: 525, area_height: 2175, width: 400, height: 400, top: 0, left: 60 },
    variants: [
      ...run(SIZES_5, 'Black',       '#141414', [11266, 11267, 11268, 11269, 11270]),
      ...run(SIZES_5, 'Carbon Grey', '#d2cec6', [11278, 11279, 11280, 11281, 11282]),   // a light heather, not a dark grey
      ...run(SIZES_5, 'Navy Blazer', '#171f2c', [13852, 13853, 13854, 13855, 13856]),
    ],
  },

  tee: {
    // Bella + Canvas 3001 — catalog product 71. Front printfile 1800×2400 @150dpi.
    type: 'tee',
    name: 'OkayCubs Tee',
    icon: '👚',
    description: 'Soft unisex staple tee with your Cub on the chest. The everyday layer.',
    basePrice: 3000,
    costCents: 1192,
    printfulProductId: 71,
    printPlacement: 'front',
    printPosition: { area_width: 1800, area_height: 2400, width: 1400, height: 1400, top: 250, left: 200 },
    variants: [
      ...run(SIZES_5, 'Black',             '#0c0c0c', [4016, 4017, 4018, 4019, 4020]),
      ...run(SIZES_5, 'White',             '#ffffff', [4011, 4012, 4013, 4014, 4015]),
      ...run(SIZES_5, 'Dark Grey Heather', '#3e3c3d', [8460, 8461, 8462, 8463, 8464]),
      ...run(SIZES_5, 'Silver',            '#e3e3dd', [4146, 4147, 4148, 4149, 4150]),
      ...run(SIZES_5, 'Soft Cream',        '#e7d4c0', [4151, 4152, 4153, 4154, 4155]),
      ...run(SIZES_5, 'Athletic Heather',  '#cececc', [6948, 6949, 6950, 6951, 6952]),
    ],
  },

  beanie: {
    // Yupoong 1501KC cuffed beanie — catalog product 266. Embroidery front 1500×525 @300dpi, one size.
    type: 'beanie',
    name: 'OkayCubs Beanie',
    icon: '🧶',
    description: 'Cuffed knit beanie with your Cub embroidered on the cuff. Cold cabins, warm ears.',
    basePrice: 2800,
    costCents: 1305,
    printfulProductId: 266,
    printPlacement: 'embroidery_front',
    printPosition: { area_width: 1500, area_height: 525, width: 450, height: 450, top: 37, left: 525 },
    variants: [
      { color: 'Black',        colorHex: '#0c0c0c', printfulVariantId: 8936 },
      { color: 'Heather Grey', colorHex: '#a19f9b', printfulVariantId: 8937 },
      { color: 'Navy',         colorHex: '#141323', printfulVariantId: 8940 },
      { color: 'Baby Pink',    colorHex: '#ffc6cd', printfulVariantId: 17494 },
    ],
  },

  cap: {
    // Yupoong 7005 5-panel cap — catalog product 92. Embroidery front 1200×525 @300dpi.
    type: 'cap',
    name: 'OkayCubs Cap',
    icon: '🧢',
    description: 'Classic 5-panel cap with your Cub embroidered on the front.',
    basePrice: 4500,
    costCents: 1793,
    printfulProductId: 92,
    printPlacement: 'embroidery_front',
    printPosition: { area_width: 1200, area_height: 525, width: 500, height: 500, top: 12, left: 350 },
    variants: [
      { color: 'Black',  colorHex: '#262626', printfulVariantId: 4622 },
      { color: 'Grey',   colorHex: '#7b7979', printfulVariantId: 4624 },
      { color: 'Khaki',  colorHex: '#c8b89a', printfulVariantId: 4625 },
      { color: 'Navy',   colorHex: '#222942', printfulVariantId: 4626 },
      { color: 'Olive',  colorHex: '#625c43', printfulVariantId: 4627 },
    ],
  },
};

export const PRODUCT_ORDER: ProductType[] = ['hoodie', 'crewneck', 'joggers', 'tee', 'beanie', 'cap'];

export const UNIQUE_COLORS = (type: ProductType) =>
  Array.from(new Map(PRODUCTS[type].variants.map(v => [v.color, v])).values());

export const SIZES = (type: ProductType, color: string) =>
  PRODUCTS[type].variants.filter(v => v.color === color && v.size).map(v => v.size!);

export const needsSize = (type: ProductType) => PRODUCTS[type].variants.some(v => !!v.size);

export function getVariant(type: ProductType, color: string, size?: string) {
  return PRODUCTS[type].variants.find(
    v => v.color === color && (!size || v.size === size)
  ) ?? null;
}

// Size charts (inches) — from GET /products/{id}/sizes ("measure yourself" tables).
export interface SizeMeasurements {
  [label: string]: string; // e.g. "Chest": "38-41"
}

export const SIZE_CHARTS: Partial<Record<ProductType, Record<string, SizeMeasurements>>> = {
  hoodie: {
    S:   { Chest: '38-41', Length: '27' },
    M:   { Chest: '42-45', Length: '28' },
    L:   { Chest: '46-49', Length: '29' },
    XL:  { Chest: '50-53', Length: '30' },
    '2XL': { Chest: '54-57', Length: '31' },
  },
  crewneck: {
    S:   { Chest: '33-36', Length: '27', Sleeve: '23 ½' },
    M:   { Chest: '37-40', Length: '28', Sleeve: '24' },
    L:   { Chest: '41-43', Length: '29', Sleeve: '24' },
    XL:  { Chest: '44-46', Length: '30', Sleeve: '24' },
    '2XL': { Chest: '47-49', Length: '31', Sleeve: '24' },
  },
  joggers: {
    S:   { Waist: '30', Inseam: '29' },
    M:   { Waist: '32', Inseam: '30' },
    L:   { Waist: '34', Inseam: '31' },
    XL:  { Waist: '36', Inseam: '32' },
    '2XL': { Waist: '38', Inseam: '33' },
  },
  tee: {
    S:   { Chest: '34-37', Length: '28' },
    M:   { Chest: '38-41', Length: '29' },
    L:   { Chest: '42-45', Length: '30' },
    XL:  { Chest: '46-49', Length: '31' },
    '2XL': { Chest: '50-53', Length: '32' },
  },
};
