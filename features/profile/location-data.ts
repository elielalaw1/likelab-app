export type Option = { label: string; value: string }

export const GENDER_OPTIONS: Option[] = [
  { label: 'Male', value: 'Male' },
  { label: 'Female', value: 'Female' },
  { label: 'Non-binary', value: 'Non-binary' },
  { label: 'Prefer not to say', value: 'Prefer not to say' },
]

export const CATEGORY_OPTIONS: Option[] = [
  { label: 'Lifestyle', value: 'Lifestyle' },
  { label: 'Fashion', value: 'Fashion' },
  { label: 'Beauty', value: 'Beauty' },
  { label: 'Fitness', value: 'Fitness' },
  { label: 'Food', value: 'Food' },
  { label: 'Travel', value: 'Travel' },
  { label: 'Tech', value: 'Tech' },
  { label: 'Gaming', value: 'Gaming' },
  { label: 'Education', value: 'Education' },
  { label: 'Business', value: 'Business' },
  { label: 'Finance', value: 'Finance' },
  { label: 'Entertainment', value: 'Entertainment' },
  { label: 'Sports', value: 'Sports' },
  { label: 'Automotive', value: 'Automotive' },
  { label: 'Home & Living', value: 'Home & Living' },
]

export const SWEDISH_COUNTIES = [
  'Blekinge län',
  'Dalarnas län',
  'Gotlands län',
  'Gävleborgs län',
  'Hallands län',
  'Jämtlands län',
  'Jönköpings län',
  'Kalmar län',
  'Kronobergs län',
  'Norrbottens län',
  'Skåne län',
  'Stockholms län',
  'Södermanlands län',
  'Uppsala län',
  'Värmlands län',
  'Västerbottens län',
  'Västernorrlands län',
  'Västmanlands län',
  'Västra Götalands län',
  'Örebro län',
  'Östergötlands län',
] as const

export const SWEDISH_MUNICIPALITIES: Record<string, string[]> = {
  'Blekinge län': ['Karlskrona', 'Ronneby', 'Karlshamn', 'Sölvesborg', 'Olofström'],
  'Dalarnas län': ['Falun', 'Borlänge', 'Mora', 'Ludvika', 'Avesta'],
  'Gotlands län': ['Visby', 'Slite', 'Hemse', 'Klintehamn'],
  'Gävleborgs län': ['Gävle', 'Sandviken', 'Hudiksvall', 'Bollnäs', 'Söderhamn'],
  'Hallands län': ['Halmstad', 'Varberg', 'Kungsbacka', 'Falkenberg', 'Laholm'],
  'Jämtlands län': ['Östersund', 'Åre', 'Strömsund', 'Krokom', 'Bräcke'],
  'Jönköpings län': ['Jönköping', 'Nässjö', 'Värnamo', 'Vetlanda', 'Eksjö'],
  'Kalmar län': ['Kalmar', 'Västervik', 'Oskarshamn', 'Nybro', 'Vimmerby'],
  'Kronobergs län': ['Växjö', 'Ljungby', 'Älmhult', 'Alvesta', 'Tingsryd'],
  'Norrbottens län': ['Luleå', 'Piteå', 'Boden', 'Kiruna', 'Gällivare'],
  'Skåne län': ['Malmö', 'Helsingborg', 'Lund', 'Kristianstad', 'Ystad'],
  'Stockholms län': ['Stockholm', 'Solna', 'Danderyd', 'Lidingö', 'Täby', 'Nacka', 'Södertälje', 'Haninge'],
  'Södermanlands län': ['Eskilstuna', 'Nyköping', 'Katrineholm', 'Strängnäs', 'Flen'],
  'Uppsala län': ['Uppsala', 'Enköping', 'Östhammar', 'Knivsta', 'Tierp'],
  'Värmlands län': ['Karlstad', 'Arvika', 'Kristinehamn', 'Sunne', 'Säffle'],
  'Västerbottens län': ['Umeå', 'Skellefteå', 'Lycksele', 'Vilhelmina', 'Nordmaling'],
  'Västernorrlands län': ['Sundsvall', 'Örnsköldsvik', 'Härnösand', 'Timrå', 'Kramfors'],
  'Västmanlands län': ['Västerås', 'Köping', 'Sala', 'Hallstahammar', 'Fagersta'],
  'Västra Götalands län': ['Göteborg', 'Borås', 'Trollhättan', 'Skövde', 'Uddevalla'],
  'Örebro län': ['Örebro', 'Karlskoga', 'Lindesberg', 'Kumla', 'Hallsberg'],
  'Östergötlands län': ['Linköping', 'Norrköping', 'Motala', 'Mjölby', 'Finspång'],
}

type CountryOption = { code: string; label: string; flag: string }

function toFlagEmoji(code: string) {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

const FALLBACK_CODES = [
  'SE', 'NO', 'DK', 'FI', 'IS', 'GB', 'IE', 'DE', 'FR', 'ES', 'IT', 'PT', 'NL', 'BE', 'CH', 'AT', 'PL', 'CZ', 'SK', 'HU',
  'RO', 'BG', 'HR', 'SI', 'EE', 'LV', 'LT', 'US', 'CA', 'MX', 'BR', 'AR', 'CL', 'CO', 'PE', 'AU', 'NZ', 'JP', 'KR', 'CN',
  'IN', 'SG', 'TH', 'MY', 'ID', 'PH', 'VN', 'AE', 'SA', 'ZA', 'EG', 'NG', 'KE', 'IL', 'TR',
]

const FALLBACK_COUNTRY_NAMES: Record<string, string> = {
  SE: 'Sweden',
  NO: 'Norway',
  DK: 'Denmark',
  FI: 'Finland',
  IS: 'Iceland',
  GB: 'United Kingdom',
  IE: 'Ireland',
  DE: 'Germany',
  FR: 'France',
  ES: 'Spain',
  IT: 'Italy',
  PT: 'Portugal',
  NL: 'Netherlands',
  BE: 'Belgium',
  CH: 'Switzerland',
  AT: 'Austria',
  PL: 'Poland',
  CZ: 'Czechia',
  SK: 'Slovakia',
  HU: 'Hungary',
  RO: 'Romania',
  BG: 'Bulgaria',
  HR: 'Croatia',
  SI: 'Slovenia',
  EE: 'Estonia',
  LV: 'Latvia',
  LT: 'Lithuania',
  US: 'United States',
  CA: 'Canada',
  MX: 'Mexico',
  BR: 'Brazil',
  AR: 'Argentina',
  CL: 'Chile',
  CO: 'Colombia',
  PE: 'Peru',
  AU: 'Australia',
  NZ: 'New Zealand',
  JP: 'Japan',
  KR: 'South Korea',
  CN: 'China',
  IN: 'India',
  SG: 'Singapore',
  TH: 'Thailand',
  MY: 'Malaysia',
  ID: 'Indonesia',
  PH: 'Philippines',
  VN: 'Vietnam',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  ZA: 'South Africa',
  EG: 'Egypt',
  NG: 'Nigeria',
  KE: 'Kenya',
  IL: 'Israel',
  TR: 'Türkiye',
}

function regionCodes(): string[] {
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf
  if (typeof supportedValuesOf === 'function') {
    const values = supportedValuesOf('region')
    if (Array.isArray(values) && values.length > 0) return values
  }
  return FALLBACK_CODES
}

export function getCountryOptions(): CountryOption[] {
  const DisplayNamesCtor = (globalThis.Intl as { DisplayNames?: new (locales: string[], options: { type: 'region' }) => { of: (code: string) => string | undefined } } | undefined)
    ?.DisplayNames
  const displayNames = DisplayNamesCtor ? new DisplayNamesCtor(['en'], { type: 'region' }) : null

  const all = regionCodes()
    .map((code) => {
      const label = displayNames?.of(code) || FALLBACK_COUNTRY_NAMES[code] || code
      if (!label) return null
      return { code, label, flag: toFlagEmoji(code) }
    })
    .filter((item): item is CountryOption => Boolean(item))

  const sweden = all.find((item) => item.code === 'SE')
  const rest = all.filter((item) => item.code !== 'SE').sort((a, b) => a.label.localeCompare(b.label))
  return sweden ? [sweden, ...rest] : rest
}

export const PHONE_CODE_OPTIONS: Option[] = [
  { label: '🇸🇪 (+46)', value: '+46' },
  { label: '🇳🇴 (+47)', value: '+47' },
  { label: '🇩🇰 (+45)', value: '+45' },
  { label: '🇫🇮 (+358)', value: '+358' },
  { label: '🇮🇸 (+354)', value: '+354' },
  { label: '🇬🇧 (+44)', value: '+44' },
  { label: '🇮🇪 (+353)', value: '+353' },
  { label: '🇩🇪 (+49)', value: '+49' },
  { label: '🇫🇷 (+33)', value: '+33' },
  { label: '🇪🇸 (+34)', value: '+34' },
  { label: '🇮🇹 (+39)', value: '+39' },
  { label: '🇳🇱 (+31)', value: '+31' },
  { label: '🇧🇪 (+32)', value: '+32' },
  { label: '🇵🇹 (+351)', value: '+351' },
  { label: '🇨🇭 (+41)', value: '+41' },
  { label: '🇦🇹 (+43)', value: '+43' },
  { label: '🇵🇱 (+48)', value: '+48' },
  { label: '🇨🇿 (+420)', value: '+420' },
  { label: '🇸🇰 (+421)', value: '+421' },
  { label: '🇭🇺 (+36)', value: '+36' },
  { label: '🇷🇴 (+40)', value: '+40' },
  { label: '🇭🇷 (+385)', value: '+385' },
  { label: '🇸🇮 (+386)', value: '+386' },
  { label: '🇺🇸 (+1)', value: '+1' },
  { label: '🇨🇦 (+1)', value: '+1' },
  { label: '🇲🇽 (+52)', value: '+52' },
  { label: '🇧🇷 (+55)', value: '+55' },
  { label: '🇦🇷 (+54)', value: '+54' },
  { label: '🇦🇺 (+61)', value: '+61' },
  { label: '🇳🇿 (+64)', value: '+64' },
  { label: '🇯🇵 (+81)', value: '+81' },
  { label: '🇰🇷 (+82)', value: '+82' },
  { label: '🇨🇳 (+86)', value: '+86' },
  { label: '🇮🇳 (+91)', value: '+91' },
  { label: '🇸🇬 (+65)', value: '+65' },
  { label: '🇹🇭 (+66)', value: '+66' },
  { label: '🇲🇾 (+60)', value: '+60' },
  { label: '🇮🇩 (+62)', value: '+62' },
  { label: '🇵🇭 (+63)', value: '+63' },
  { label: '🇻🇳 (+84)', value: '+84' },
  { label: '🇦🇪 (+971)', value: '+971' },
  { label: '🇸🇦 (+966)', value: '+966' },
  { label: '🇹🇷 (+90)', value: '+90' },
  { label: '🇮🇱 (+972)', value: '+972' },
  { label: '🇿🇦 (+27)', value: '+27' },
]
