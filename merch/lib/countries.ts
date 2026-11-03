// Pure data, safe to import from client components.
// Where we ship. Printful delivers to most of the world; the list is the countries we expose in the
// checkout. Sanctioned or unserved destinations are left out on purpose.
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'MX', name: 'Mexico' },
  { code: 'CO', name: 'Colombia' }, { code: 'AR', name: 'Argentina' }, { code: 'BR', name: 'Brazil' }, { code: 'CL', name: 'Chile' },
  { code: 'PE', name: 'Peru' }, { code: 'EC', name: 'Ecuador' }, { code: 'UY', name: 'Uruguay' }, { code: 'PA', name: 'Panama' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'DO', name: 'Dominican Republic' }, { code: 'GT', name: 'Guatemala' }, { code: 'PR', name: 'Puerto Rico' },
  { code: 'GB', name: 'United Kingdom' }, { code: 'IE', name: 'Ireland' },
  { code: 'DE', name: 'Germany' }, { code: 'FR', name: 'France' }, { code: 'ES', name: 'Spain' }, { code: 'PT', name: 'Portugal' }, { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' }, { code: 'BE', name: 'Belgium' }, { code: 'LU', name: 'Luxembourg' }, { code: 'AT', name: 'Austria' }, { code: 'CH', name: 'Switzerland' },
  { code: 'DK', name: 'Denmark' }, { code: 'SE', name: 'Sweden' }, { code: 'NO', name: 'Norway' }, { code: 'FI', name: 'Finland' }, { code: 'IS', name: 'Iceland' },
  { code: 'PL', name: 'Poland' }, { code: 'CZ', name: 'Czechia' }, { code: 'SK', name: 'Slovakia' }, { code: 'HU', name: 'Hungary' }, { code: 'RO', name: 'Romania' },
  { code: 'BG', name: 'Bulgaria' }, { code: 'GR', name: 'Greece' }, { code: 'HR', name: 'Croatia' }, { code: 'SI', name: 'Slovenia' }, { code: 'EE', name: 'Estonia' },
  { code: 'LV', name: 'Latvia' }, { code: 'LT', name: 'Lithuania' }, { code: 'MT', name: 'Malta' }, { code: 'CY', name: 'Cyprus' },
  { code: 'AU', name: 'Australia' }, { code: 'NZ', name: 'New Zealand' }, { code: 'JP', name: 'Japan' }, { code: 'KR', name: 'South Korea' },
  { code: 'SG', name: 'Singapore' }, { code: 'HK', name: 'Hong Kong' }, { code: 'TW', name: 'Taiwan' }, { code: 'MY', name: 'Malaysia' }, { code: 'TH', name: 'Thailand' },
  { code: 'PH', name: 'Philippines' }, { code: 'ID', name: 'Indonesia' }, { code: 'IN', name: 'India' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'SA', name: 'Saudi Arabia' }, { code: 'IL', name: 'Israel' }, { code: 'TR', name: 'Turkey' }, { code: 'ZA', name: 'South Africa' },
];
export const COUNTRY_CODES = new Set(COUNTRIES.map(c => c.code));
export const EU = new Set(['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE']);
// Countries where Printful requires a state/province code on the address
export const STATE_REQUIRED = new Set(['US', 'CA', 'AU', 'JP']);

