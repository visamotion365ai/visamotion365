// -----------------------------------------------------------------------------
// lib/countries.ts — destination catalogue for the country cards.
// Flags are real images from flagcdn with the emoji as a graceful fallback.
// -----------------------------------------------------------------------------

export interface Country {
  /** ISO 3166-1 alpha-2, lower-case (used by flagcdn). */
  code: string;
  name: string;
  /** Emoji fallback when the flag image cannot load (offline). */
  flag: string;
  region: "Americas" | "Europe" | "Asia" | "Gulf & Middle East" | "Oceania" | "Africa";
  /** Most requested route for this destination. */
  visa: string;
  /** One-line hook shown on the card. */
  note: string;
}

export const COUNTRIES: Country[] = [
  { code: "ca", name: "Canada", flag: "🇨🇦", region: "Americas", visa: "Express Entry / Work Permit", note: "CRS points & PNP routes" },
  { code: "us", name: "United States", flag: "🇺🇸", region: "Americas", visa: "B1/B2 · H-1B · F-1", note: "Interview & DS-160 prep" },
  { code: "gb", name: "United Kingdom", flag: "🇬🇧", region: "Europe", visa: "Skilled Worker / Student", note: "Certificate of Sponsorship" },
  { code: "au", name: "Australia", flag: "🇦🇺", region: "Oceania", visa: "189 / 190 / 491", note: "Points test & SkillSelect" },
  { code: "nz", name: "New Zealand", flag: "🇳🇿", region: "Oceania", visa: "Accredited Employer Work", note: "Green List roles" },
  { code: "de", name: "Germany", flag: "🇩🇪", region: "Europe", visa: "Opportunity Card / Blue Card", note: "EU Blue Card routes" },
  { code: "fr", name: "France", flag: "🇫🇷", region: "Europe", visa: "Talent Passport / Student", note: "Campus France support" },
  { code: "nl", name: "Netherlands", flag: "🇳🇱", region: "Europe", visa: "Highly Skilled Migrant", note: "Recognised sponsor needed" },
  { code: "ie", name: "Ireland", flag: "🇮🇪", region: "Europe", visa: "Critical Skills Permit", note: "Stamp 1 / Stamp 4" },
  { code: "se", name: "Sweden", flag: "🇸🇪", region: "Europe", visa: "Work Permit / Study", note: "Job-offer first route" },
  { code: "ch", name: "Switzerland", flag: "🇨🇭", region: "Europe", visa: "Work Permit / Student", note: "Quota-based permits" },
  { code: "it", name: "Italy", flag: "🇮🇹", region: "Europe", visa: "EU Blue Card / Study", note: "Decreto Flussi quotas" },
  { code: "es", name: "Spain", flag: "🇪🇸", region: "Europe", visa: "Digital Nomad / Study", note: "Beckham-law tax path" },
  { code: "pt", name: "Portugal", flag: "🇵🇹", region: "Europe", visa: "D7 / Digital Nomad", note: "D8 remote-work visa" },
  { code: "sc", name: "Schengen Area", flag: "🇪🇺", region: "Europe", visa: "Short-stay Visa C", note: "90/180-day rule" },
  { code: "ae", name: "United Arab Emirates", flag: "🇦🇪", region: "Gulf & Middle East", visa: "Golden / Employment Visa", note: "Free-zone sponsorship" },
  { code: "sa", name: "Saudi Arabia", flag: "🇸🇦", region: "Gulf & Middle East", visa: "Qiwa Work / Umrah", note: "Musaned & Qiwa portals" },
  { code: "qa", name: "Qatar", flag: "🇶🇦", region: "Gulf & Middle East", visa: "Work Visa / Hayya", note: "Hukoomi processing" },
  { code: "kw", name: "Kuwait", flag: "🇰🇼", region: "Gulf & Middle East", visa: "Work / Family Visa", note: "Article 18 permits" },
  { code: "om", name: "Oman", flag: "🇴🇲", region: "Gulf & Middle East", visa: "Employment / Visit", note: "Royal Oman Police" },
  { code: "tr", name: "Türkiye", flag: "🇹🇷", region: "Gulf & Middle East", visa: "Work / Residence Permit", note: "e-İkamet steps" },
  { code: "sg", name: "Singapore", flag: "🇸🇬", region: "Asia", visa: "EP / S Pass", note: "COMPASS points" },
  { code: "jp", name: "Japan", flag: "🇯🇵", region: "Asia", visa: "SSW / Highly Skilled", note: "COE before visa" },
  { code: "kr", name: "South Korea", flag: "🇰🇷", region: "Asia", visa: "E-7 / D-2 Study", note: "ARC after arrival" },
  { code: "my", name: "Malaysia", flag: "🇲🇾", region: "Asia", visa: "Employment Pass / MM2H", note: "MDEC & ESD" },
  { code: "th", name: "Thailand", flag: "🇹🇭", region: "Asia", visa: "LTR / Digital Nomad", note: "Long-term resident" },
  { code: "cn", name: "China", flag: "🇨🇳", region: "Asia", visa: "Z Work / X Study", note: "PU letter era rules" },
  { code: "za", name: "South Africa", flag: "🇿🇦", region: "Africa", visa: "Critical Skills / Study", note: "VFS lodgement" },
  { code: "ke", name: "Kenya", flag: "🇰🇪", region: "Africa", visa: "Work Permit / eTA", note: "eFNS portal" },
  { code: "eg", name: "Egypt", flag: "🇪🇬", region: "Africa", visa: "Work / Residence", note: "Work permit first" },
];

export const REGIONS = [
  "Americas",
  "Europe",
  "Asia",
  "Gulf & Middle East",
  "Oceania",
  "Africa",
] as const;

export function flagUrl(code: string, width: 80 | 160 = 160): string {
  return `https://flagcdn.com/w${width}/${code}.png`;
}

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((country) => country.code === code);
}
