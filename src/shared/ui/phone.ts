export interface Country {
  code: string;
  dial: string;
  flag: string;
  name: string;
  pattern: RegExp;
  placeholder: string;
}

export const COUNTRIES: Country[] = [
  {
    code: 'RU',
    dial: '+7',
    flag: '\u{1F1F7}\u{1F1FA}',
    name: 'Russian Federation',
    pattern: /^\+7 \(\d{3}\) \d{3}-\d{2}-\d{2}$/,
    placeholder: '+7 (999) 123-45-67',
  },
  {
    code: 'US',
    dial: '+1',
    flag: '\u{1F1FA}\u{1F1F8}',
    name: 'United States',
    pattern: /^\+1 \(\d{3}\) \d{3}-\d{4}$/,
    placeholder: '+1 (555) 123-4567',
  },
  {
    code: 'DE',
    dial: '+49',
    flag: '\u{1F1E9}\u{1F1EA}',
    name: 'Germany',
    pattern: /^\+49 \d{2,5} \d+$/,
    placeholder: '+49 170 1234567',
  },
  {
    code: 'GB',
    dial: '+44',
    flag: '\u{1F1EC}\u{1F1E7}',
    name: 'United Kingdom',
    pattern: /^\+44 \d{4} \d{6}$/,
    placeholder: '+44 7911 123456',
  },
];

const DIGIT_STRIP = /\D/g;

function digitsOnly(value: string): string {
  return value.replace(DIGIT_STRIP, '');
}

export function formatPhone(raw: string, country: Country): string {
  const d = digitsOnly(raw);
  if (country.code === 'RU') {
    const digits = d.startsWith('7') || d.startsWith('8') ? d.slice(1) : d;
    const p = digits.slice(0, 10);
    if (p.length === 0) return '';
    if (p.length <= 3) return `+7 (${p}`;
    if (p.length <= 6) return `+7 (${p.slice(0, 3)}) ${p.slice(3)}`;
    if (p.length <= 8) return `+7 (${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6)}`;
    return `+7 (${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6, 8)}-${p.slice(8, 10)}`;
  }
  if (country.code === 'US') {
    const p = d.startsWith('1') ? d.slice(1) : d;
    if (p.length === 0) return '';
    if (p.length <= 3) return `+1 (${p}`;
    if (p.length <= 6) return `+1 (${p.slice(0, 3)}) ${p.slice(3)}`;
    return `+1 (${p.slice(0, 3)}) ${p.slice(3, 6)}-${p.slice(6, 10)}`;
  }
  // Generic: +DIAL DIGITS
  const prefix = country.dial.length;
  if (d.length <= prefix) return country.dial;
  return `${country.dial} ${d.slice(prefix)}`;
}

export function isValidPhone(raw: string, country: Country): boolean {
  return country.pattern.test(raw);
}

export function phonePayload(raw: string): string {
  return raw.replace(DIGIT_STRIP, '');
}

export function countryFromPhone(raw: string): Country {
  const d = digitsOnly(raw);
  if (d.startsWith('1') && d.length >= 10) {
    return COUNTRIES.find((item) => item.code === 'US') ?? COUNTRIES[0]!;
  }
  if (d.startsWith('49')) {
    return COUNTRIES.find((item) => item.code === 'DE') ?? COUNTRIES[0]!;
  }
  if (d.startsWith('44')) {
    return COUNTRIES.find((item) => item.code === 'GB') ?? COUNTRIES[0]!;
  }
  return COUNTRIES[0]!;
}
