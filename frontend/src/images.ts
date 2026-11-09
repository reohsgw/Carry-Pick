import hero from './assets/hero.jpg';
import keychain from './assets/keychain.jpg';
import skincare from './assets/skincare.jpg';
import snacks from './assets/snacks.jpg';
import tokyoBanana from './assets/tokyo-banana.jpg';
import royce from './assets/royce.jpg';
import anessa from './assets/anessa.jpg';
import kitkat from './assets/kitkat.jpg';
import uniqloTshirt from './assets/uniqlo-tshirt.jpg';
import laduree from './assets/laduree.jpg';
import levis501 from './assets/levis-501.jpg';
import traderJoesTote from './assets/trader-joes-tote.jpg';
import mamaTomYum from './assets/mama-tom-yum.jpg';
import narayaBag from './assets/naraya-bag.jpg';
import diptyqueBaies from './assets/diptyque-baies.jpg';
import { assetUrl } from './api';

/* Photos taken from the team's Figma design. */
export const IMAGES = { hero, keychain, skincare, snacks };

/**
 * Photos bundled with the web app for the demo data. The backend seeds an offer's imageUrl as
 * "demo:<key>" and the matching file here is shown, so no upload is needed.
 */
const DEMO_PHOTOS: Record<string, string> = {
  'tokyo-banana': tokyoBanana,
  royce,
  anessa,
  kitkat,
  'uniqlo-tshirt': uniqloTshirt,
  laduree,
  'levis-501': levis501,
  'trader-joes-tote': traderJoesTote,
  'mama-tom-yum': mamaTomYum,
  'naraya-bag': narayaBag,
  'diptyque-baies': diptyqueBaies,
};

/**
 * The photo to show for a product: the traveler's own upload if there is one,
 * otherwise a category photo so lists don't look empty in the demo. Categories without a
 * matching photo return null and get an icon tile instead.
 */
export function productPhoto(imageUrl: string | null | undefined, category: string | null | undefined): string | null {
  if (imageUrl?.startsWith('demo:')) {
    const demo = DEMO_PHOTOS[imageUrl.slice('demo:'.length)];
    if (demo) return demo;
    imageUrl = null;
  }
  const own = assetUrl(imageUrl);
  if (own) return own;
  switch ((category ?? '').toLowerCase()) {
    case 'snacks':
    case 'food':
      return snacks;
    case 'beauty':
      return skincare;
    case 'other':
      return keychain;
    default:
      return null;
  }
}

import landmarkJp from './assets/landmark-jp.jpg';
import landmarkUs from './assets/landmark-us.jpg';
import landmarkFr from './assets/landmark-fr.jpg';
import landmarkTh from './assets/landmark-th.jpg';
import landmarkVn from './assets/landmark-vn.jpg';
import landmarkId from './assets/landmark-id.jpg';
import landmarkIt from './assets/landmark-it.jpg';
import landmarkCn from './assets/landmark-cn.jpg';
import landmarkHk from './assets/landmark-hk.jpg';
import landmarkMo from './assets/landmark-mo.jpg';
import landmarkTw from './assets/landmark-tw.jpg';
import landmarkGb from './assets/landmark-gb.jpg';

/**
 * Landmark photos the home hero's scrapbook pieces rotate through, one per destination.
 * Purely decorative: some of these places (Italy, China, Hong Kong, Macau) are not ordering
 * countries in the app, so their names are kept here rather than read from the country list.
 */
export const HERO_LANDMARKS: { code: string; name: string; nameKo: string; photo: string }[] = [
  { code: 'JP', name: 'Japan', nameKo: '일본', photo: landmarkJp },
  { code: 'US', name: 'United States', nameKo: '미국', photo: landmarkUs },
  { code: 'FR', name: 'France', nameKo: '프랑스', photo: landmarkFr },
  { code: 'TH', name: 'Thailand', nameKo: '태국', photo: landmarkTh },
  { code: 'VN', name: 'Vietnam', nameKo: '베트남', photo: landmarkVn },
  { code: 'ID', name: 'Indonesia', nameKo: '인도네시아', photo: landmarkId },
  { code: 'IT', name: 'Italy', nameKo: '이탈리아', photo: landmarkIt },
  { code: 'CN', name: 'China', nameKo: '중국', photo: landmarkCn },
  { code: 'HK', name: 'Hong Kong', nameKo: '홍콩', photo: landmarkHk },
  { code: 'MO', name: 'Macau', nameKo: '마카오', photo: landmarkMo },
  { code: 'TW', name: 'Taiwan', nameKo: '대만', photo: landmarkTw },
  { code: 'GB', name: 'United Kingdom', nameKo: '영국', photo: landmarkGb },
];
