// fedex-country-codes.ts
const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  'united states': 'US',
  'united states of america': 'US',
  'usa': 'US',
  'canada': 'CA',
  'united kingdom': 'GB',
  'great britain': 'GB',
  'mexico': 'MX',
  'germany': 'DE',
  'france': 'FR',
  'china': 'CN',
  'japan': 'JP',
  'india': 'IN',
  'australia': 'AU',
  'brazil': 'BR',
  'south korea': 'KR',
  'korea': 'KR',
  'russia': 'RU',
  'russian federation': 'RU',
  'italy': 'IT',
  'spain': 'ES',
  'netherlands': 'NL',
  'switzerland': 'CH',
  'sweden': 'SE',
  'norway': 'NO',
  'denmark': 'DK',
  'finland': 'FI',
  'poland': 'PL',
  'belgium': 'BE',
  'austria': 'AT',
  'ireland': 'IE',
  'portugal': 'PT',
  'greece': 'GR',
  'turkey': 'TR',
  'israel': 'IL',
  'saudi arabia': 'SA',
  'uae': 'AE',
  'united arab emirates': 'AE',
  'singapore': 'SG',
  'hong kong': 'HK',
  'taiwan': 'TW',
  'thailand': 'TH',
  'malaysia': 'MY',
  'indonesia': 'ID',
  'philippines': 'PH',
  'vietnam': 'VN',
  'new zealand': 'NZ',
  'south africa': 'ZA',
  'egypt': 'EG',
  'nigeria': 'NG',
  'kenya': 'KE',
  'pakistan': 'PK',
  'bangladesh': 'BD',
  'argentina': 'AR',
  'chile': 'CL',
  'colombia': 'CO',
  'peru': 'PE',
  'venezuela': 'VE',
};

export function toFedExCountryCode(country: string | undefined): string {
  if (!country) return 'US'; // default fallback
  
  const normalized = country.trim().toLowerCase();
  
  // Already a 2-letter code?
  if (/^[a-z]{2}$/i.test(normalized)) {
    return normalized.toUpperCase();
  }
  
  // Already a 3-letter code? Map common ones
  const alpha3ToAlpha2: Record<string, string> = {
    'USA': 'US', 'CAN': 'CA', 'GBR': 'GB', 'MEX': 'MX', 'DEU': 'DE',
    'FRA': 'FR', 'CHN': 'CN', 'JPN': 'JP', 'IND': 'IN', 'AUS': 'AU',
  };
  if (alpha3ToAlpha2[normalized.toUpperCase()]) {
    return alpha3ToAlpha2[normalized.toUpperCase()];
  }
  
  return COUNTRY_NAME_TO_CODE[normalized] || normalized.toUpperCase().slice(0, 2);
}