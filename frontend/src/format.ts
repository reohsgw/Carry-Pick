import type { AppConfig, Country, OrderStatus, Quote } from './api';
import type { Lang } from './i18n';

export const krw = (n: number | null | undefined) =>
  n == null ? '-' : `₩${Math.round(n).toLocaleString('ko-KR')}`;

function toDate(iso: string): Date {
  return iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso);
}

export function shortDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '-';
  return toDate(iso).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric' });
}

/** Date with the year, e.g. "2025년 2월 20일" / "Feb 20, 2025". */
export function yearDate(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '-';
  return toDate(iso).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** A date range with the year: shown once when both dates are in the same year. */
export function yearRange(a: string, b: string, lang: Lang): string {
  const sameYear = toDate(a).getFullYear() === toDate(b).getFullYear();
  return `${yearDate(a, lang)} – ${sameYear ? shortDate(b, lang) : yearDate(b, lang)}`;
}

export function boardDate(iso: string): string {
  const d = toDate(iso);
  return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function dateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '';
  return new Date(iso).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function isoDay(daysFromToday = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function daysUntil(isoDate: string): number {
  const target = new Date(`${isoDate}T00:00:00`).getTime();
  const today = new Date(`${isoDay(0)}T00:00:00`).getTime();
  return Math.round((target - today) / 86_400_000);
}

export function countryOf(config: AppConfig | undefined, code: string): Country {
  return config?.countries.find((c) => c.code === code) ?? { code, name: code, nameKo: code, currency: '', flag: '' };
}

export const ALL_COUNTRIES = 'ALL';

export function countryName(config: AppConfig | undefined, code: string, lang: Lang): string {
  if (code === ALL_COUNTRIES) return lang === 'ko' ? '전체 국가' : 'All countries';
  const c = countryOf(config, code);
  return lang === 'ko' ? c.nameKo : c.name;
}

const CITY_CODES: Record<string, string> = {
  tokyo: 'TYO', '도쿄': 'TYO', osaka: 'OSA', '오사카': 'OSA', kyoto: 'UKY', '교토': 'UKY', fukuoka: 'FUK', '후쿠오카': 'FUK',
  sapporo: 'SPK', '삿포로': 'SPK', okinawa: 'OKA', naha: 'OKA', nagoya: 'NGO',
  'new york': 'NYC', '뉴욕': 'NYC', 'los angeles': 'LAX', la: 'LAX', 'san francisco': 'SFO', seattle: 'SEA', hawaii: 'HNL', honolulu: 'HNL',
  paris: 'PAR', '파리': 'PAR', nice: 'NCE', lyon: 'LYS',
  london: 'LON', '런던': 'LON', manchester: 'MAN', edinburgh: 'EDI',
  bangkok: 'BKK', '방콕': 'BKK', 'chiang mai': 'CNX', phuket: 'HKT',
  hanoi: 'HAN', '하노이': 'HAN', 'ho chi minh': 'SGN', saigon: 'SGN', 'da nang': 'DAD', danang: 'DAD', '다낭': 'DAD',
  bali: 'DPS', '발리': 'DPS', jakarta: 'JKT',
  taipei: 'TPE', '타이베이': 'TPE', kaohsiung: 'KHH',
};
const COUNTRY_HUB: Record<string, string> = { JP: 'TYO', US: 'NYC', FR: 'PAR', GB: 'LON', TH: 'BKK', VN: 'HAN', ID: 'JKT', TW: 'TPE' };
export const HOME_CODE = 'SEL';

export function displayCode(code: string): string {
  return code === 'GB' ? 'UK' : code;
}

export function cityCode(city: string | null | undefined, countryCode: string): string {
  const key = (city ?? '').trim().toLowerCase();
  return CITY_CODES[key] ?? COUNTRY_HUB[countryCode] ?? displayCode(countryCode);
}

export function quote(config: AppConfig | undefined, budget: number, reward: number): Quote {
  const feeRate = config?.feeRate ?? 0.1;
  const fee = Math.round(feeRate * (budget + reward));
  const tax = 0;
  return { budget, reward, fee, tax, total: budget + reward + fee + tax };
}

// Snacks were merged into Food; the server turns any old "Snacks" into "Food".
export const CATEGORIES = ['Food', 'Beauty', 'Fashion', 'Home', 'Electronics', 'Other'] as const;

export type Tone = 'neutral' | 'action' | 'progress' | 'good' | 'bad';

export const STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING_PAYMENT: 'action',
  PAYMENT_FAILED: 'bad',
  PAID: 'progress',
  AWAITING_APPROVAL: 'action',
  PURCHASED: 'progress',
  DELIVERED: 'action',
  DISPUTED: 'bad',
  COMPLETED: 'good',
  SETTLED: 'good',
  CANCELLED: 'neutral',
};

export const ACTIVE_STATUSES: OrderStatus[] = ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'AWAITING_APPROVAL', 'PURCHASED', 'DELIVERED', 'DISPUTED'];

/** 350 → "350g", 1200 → "1.2kg", 2000 → "2kg". */
export function weight(grams: number | null | undefined): string {
  if (grams == null) return '';
  if (grams < 1000) return `${grams}g`;
  const kg = grams / 1000;
  return `${Number.isInteger(kg) ? kg : kg.toFixed(1)}kg`;
}

/** Highest reward allowed for an item at this price (server rule: a share of the item price). */
export function maxReward(config: AppConfig | undefined, itemPrice: number): number {
  return Math.floor(itemPrice * (config?.maxRewardRate ?? 0.5));
}
