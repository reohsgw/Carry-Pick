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
import biodermaSensibio from './assets/bioderma-sensibio.jpg';
import helloKittyTokyo from './assets/hello-kitty-tokyo.jpg';
import leLaboSantal33 from './assets/le-labo-santal33.jpg';
import jimThompsonScarf from './assets/jim-thompson-scarf.jpg';
import luPetitBeurre from './assets/lu-petit-beurre.jpg';
import bonneMamanMadeleines from './assets/bonne-maman-madeleines.jpg';
import mailleDijon from './assets/maille-dijon.jpg';
import kusmiTea from './assets/kusmi-tea.jpg';
import parisKeyring from './assets/paris-keyring.jpg';
import tjPbCups from './assets/tj-pb-cups.jpg';
import ghirardelliSquares from './assets/ghirardelli-squares.jpg';
import foamingHandSoap from './assets/foaming-hand-soap.jpg';
import beenThereMug from './assets/been-there-mug.jpg';
import coachWristlet from './assets/coach-wristlet.jpg';
import walkersShortbread from './assets/walkers-shortbread.jpg';
import fortnumRoyalBlend from './assets/fortnum-royal-blend.jpg';
import cadburyDairyMilk from './assets/cadbury-dairy-milk.jpg';
import whittardHotChocolate from './assets/whittard-hot-chocolate.jpg';
import paddingtonKeyring from './assets/paddington-keyring.jpg';
import bentoSquid from './assets/bento-squid.jpg';
import kohKaePeanuts from './assets/koh-kae-peanuts.jpg';
import chatramueThaiTea from './assets/chatramue-thai-tea.jpg';
import narayaPouch from './assets/naraya-pouch.jpg';
import poySianInhaler from './assets/poy-sian-inhaler.jpg';
import indomieGoreng from './assets/indomie-goreng.jpg';
import kopiLuwak from './assets/kopi-luwak.jpg';
import pieSusuBali from './assets/pie-susu-bali.jpg';
import ellipsHairVitamin from './assets/ellips-hair-vitamin.jpg';
import batikPouch from './assets/batik-pouch.jpg';
import { assetUrl } from './api';

export const IMAGES = { hero, keychain, skincare, snacks };

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
  'bioderma-sensibio': biodermaSensibio,
  'hello-kitty-tokyo': helloKittyTokyo,
  'le-labo-santal33': leLaboSantal33,
  'jim-thompson-scarf': jimThompsonScarf,
  'lu-petit-beurre': luPetitBeurre,
  'bonne-maman-madeleines': bonneMamanMadeleines,
  'maille-dijon': mailleDijon,
  'kusmi-tea': kusmiTea,
  'paris-keyring': parisKeyring,
  'tj-pb-cups': tjPbCups,
  'ghirardelli-squares': ghirardelliSquares,
  'foaming-hand-soap': foamingHandSoap,
  'been-there-mug': beenThereMug,
  'coach-wristlet': coachWristlet,
  'walkers-shortbread': walkersShortbread,
  'fortnum-royal-blend': fortnumRoyalBlend,
  'cadbury-dairy-milk': cadburyDairyMilk,
  'whittard-hot-chocolate': whittardHotChocolate,
  'paddington-keyring': paddingtonKeyring,
  'bento-squid': bentoSquid,
  'koh-kae-peanuts': kohKaePeanuts,
  'chatramue-thai-tea': chatramueThaiTea,
  'naraya-pouch': narayaPouch,
  'poy-sian-inhaler': poySianInhaler,
  'indomie-goreng': indomieGoreng,
  'kopi-luwak': kopiLuwak,
  'pie-susu-bali': pieSusuBali,
  'ellips-hair-vitamin': ellipsHairVitamin,
  'batik-pouch': batikPouch,
};

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
