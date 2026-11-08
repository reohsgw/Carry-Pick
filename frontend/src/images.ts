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
