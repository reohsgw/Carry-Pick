import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search as SearchIcon } from 'lucide-react';
import { api } from '../api';
import { OfferCard, ProductCard } from '../components/cards';
import { Screen } from '../components/Layout';
import { Code, ErrorBox, Loading, SectionHeading } from '../components/ui';
import { countryName } from '../format';
import { HERO_LANDMARKS } from '../images';
import { useI18n } from '../i18n';
import { useSession } from '../session';

const COUNTRY_KEY = 'carrypick.country';

function savedCountry(): string {
  try { return localStorage.getItem(COUNTRY_KEY) ?? 'JP'; } catch { return 'JP'; }
}

/** B1: Buyer home ("Discover"), following the Figma home page. */
export default function BuyerHome() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [country, setCountryState] = useState(savedCountry);
  const [q, setQ] = useState('');
  const board = useQuery({ queryKey: ['board'], queryFn: api.board });
  const ranking = useQuery({ queryKey: ['ranking', country], queryFn: () => api.ranking(country) });
  const offers = useQuery({ queryKey: ['offers', country], queryFn: () => api.offers(country) });
  const name = countryName(config, country, lang);

  // Offer count and first city per country, from the upcoming-trips board.
  const perCountry = useMemo(() => {
    const m: Record<string, { offers: number; city: string | null }> = {};
    for (const r of board.data ?? []) {
      const e = (m[r.countryCode] ??= { offers: 0, city: r.city });
      e.offers += r.offerCount;
    }
    return m;
  }, [board.data]);

  // Countries with trips first, so the row starts with places people can actually order from.
  const countries = useMemo(
    () => [...(config?.countries ?? [])].sort((a, b) => (perCountry[b.code]?.offers ?? 0) - (perCountry[a.code]?.offers ?? 0)),
    [config, perCountry],
  );

  function setCountry(code: string) {
    setCountryState(code);
    try { localStorage.setItem(COUNTRY_KEY, code); } catch { /* ignore */ }
  }

  const live = (offers.data ?? []).filter((o) => o.bookable).slice(0, 3);

  return (
    <Screen flush>
      <section className="hero-section">
        <div className="hero-inner">
          <h1 className="hero-title font-display">{t('home.heroTitle')}</h1>
          <p className="hero-body">{t('home.heroBody')}</p>
          <form
            className="hero-search"
            role="search"
            onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q)}&country=${country}`); }}
          >
            <SearchIcon size={20} aria-hidden />
            <input placeholder={t('home.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('nav.search')} />
            <button className="btn btn-primary hero-search-btn">{t('home.searchBtn')}</button>
          </form>
        </div>

        {/* Decorative scrapbook pieces placed around the centred search (wide screens only). */}
        <HeroAround perCountry={perCountry} />

      </section>

      <section className="home-section">
        <SectionHeading eyebrow={t('home.destEyebrow')} title={t('home.destTitle')} />
        <div className="scroll-row">
          {countries.map((c) => {
            const info = perCountry[c.code];
            return (
              <button key={c.code} className="country-card" aria-pressed={c.code === country} onClick={() => setCountry(c.code)}>
                <Code className="is-big">{c.code}</Code>
                <div>
                  <p className="country-card-name">{lang === 'ko' ? c.nameKo : c.name}</p>
                  <div className="country-card-meta">
                    <span>{info?.city ?? ''}</span>
                    <span>{info ? t('home.offersCount', { n: info.offers }) : t('home.noTrips')}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-section">
        <SectionHeading
          eyebrow={t('home.trendEyebrow', { country: name })}
          title={t('home.trendTitle')}
          action={ranking.data?.demoData ? <span className="demo-tag">{t('common.demoData')}</span> : undefined}
        />
        {ranking.isLoading && <Loading />}
        {ranking.error && <ErrorBox error={ranking.error} onRetry={() => ranking.refetch()} />}
        {ranking.data && ranking.data.items.length === 0 && <p className="fine">{t('home.popularEmpty', { country: name })}</p>}
        {!!ranking.data?.items.length && (
          <div className="scroll-row">
            {ranking.data.items.map((it) => <ProductCard key={it.productName} item={it} country={country} />)}
          </div>
        )}
      </section>

      <section className="home-section stack">
        <div className="dark-panel">
          <p className="eyebrow">{t('home.liveEyebrow', { country: name })}</p>
          <h2 className="font-display">{t('home.liveTitle')}</h2>
          <p>{t('home.liveBody')}</p>
        </div>
        {offers.isLoading && <Loading />}
        {offers.data && live.length === 0 && <p className="fine center">{t('home.liveEmpty', { country: name })}</p>}
        {live.length > 0 && <div className="card-grid">{live.map((o) => <OfferCard key={o.id} offer={o} />)}</div>}
        {live.length > 0 && (
          <Link to={`/country/${country}`} className="link-button center-block">
            {t('home.browse', { country: name })} <ArrowRight size={15} />
          </Link>
        )}
      </section>

      <section className="cta-panel">
        <div>
          <p className="eyebrow">{t('home.ctaEyebrow')}</p>
          <h2 className="font-display">{t('home.ctaTitle')}</h2>
          <p>{t('home.requestBody')}</p>
          <Link to={`/requests/new?country=${country}`} className="btn btn-primary" style={{ marginTop: 22 }}>
            {t('home.ctaBtn')} <ArrowRight size={16} />
          </Link>
        </div>
        <ol className="steps">
          <li><span>01</span>{t('home.step1')}</li>
          <li><span>02</span>{t('home.step2')}</li>
          <li><span>03</span>{t('home.step3')}</li>
        </ol>
      </section>
    </Screen>
  );
}

/**
 * Decorative scrapbook pieces placed around the centred search (wide screens only).
 * Every 2 seconds they move to the next destination: the postcard's landmark photo and caption,
 * the boarding-pass route and its offer count. The snapshot shows the destination halfway round
 * the list, so the two photos never match. Stays still for people who ask for reduced motion.
 */
/**
 * The plane and map for one destination: an old-style world map framed on that city's route to
 * Seoul, with the plane flying the great-circle route once per destination (2 s cycle).
 * The maps are a generated ~128 KB file, so they load after the page instead of with it.
 * For reduced motion the plane parks mid-route.
 */
function FlightPath({ code }: { code: string }) {
  const [maps, setMaps] = useState<typeof import('../worldMap') | null>(null);
  const svg = useRef<SVGSVGElement>(null);
  const still = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    let live = true;
    import('../worldMap').then((m) => { if (live) setMaps(m); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // Start the flight again whenever the destination changes, so the plane always takes off from the new city.
  useEffect(() => { svg.current?.setCurrentTime(0); }, [code, maps]);

  const map = maps?.FLIGHT_MAPS[code];
  if (!maps || !map) return null;
  const { MAP_W, MAP_H } = maps;
  return (
    <svg ref={svg} className="around-flight fx" viewBox={`0 0 ${MAP_W} ${MAP_H}`} aria-hidden>
      {/* Old map underneath: real coastlines (Natural Earth), latitude/longitude lines and a north arrow. */}
      <g className="flight-map">
        <rect x="0" y="0" width={MAP_W} height={MAP_H} rx="3" fill="#efe0bd" />
        <path d={map.graticule} fill="none" stroke="#a98a5c" strokeWidth="0.45" strokeDasharray="1.5 2.5" opacity="0.45" />
        <path d={map.land} fill="#d9bf8f" stroke="#9c7a4a" strokeWidth="0.55" strokeLinejoin="round" />
        <rect x="0.6" y="0.6" width={MAP_W - 1.2} height={MAP_H - 1.2} rx="3" fill="none" stroke="#b39468" strokeWidth="1.2" />
        <rect x="4.5" y="4.5" width={MAP_W - 9} height={MAP_H - 9} rx="2" fill="none" stroke="#b39468" strokeWidth="0.5" opacity="0.7" />
        <g fill="#7d5f2f" opacity="0.75">
          <path d="M14 10L17.5 20L14 17.5L10.5 20Z" />
          <text x="14" y="27" fontSize="6" fontWeight="700" textAnchor="middle" fontFamily="Gotham, Montserrat, sans-serif">N</text>
        </g>
      </g>
      <path d={map.route} fill="none" stroke="#7d5f2f" strokeWidth="1.3" strokeDasharray="3.5 4" strokeLinecap="round" opacity="0.7" />
      {[map.from, map.to].map((c) => (
        <g key={c.label} fill="#a5503a">
          <circle cx={c.x} cy={c.y} r="2.6" stroke="#f6ead0" strokeWidth="1" />
          <text x={c.x} y={c.y + 9} fontSize="5.5" fontWeight="800" letterSpacing="0.6" textAnchor="middle" fontFamily="Gotham, Montserrat, sans-serif" fill="#5a4220">{c.label}</text>
        </g>
      ))}
      <g key={code}>
        {/* Lucide's plane, turned to face along the path and centred on the moving point. */}
        <g transform="rotate(45) scale(0.7) translate(-12 -12)">
          <path
            d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"
            fill="#f6ead0" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
          />
        </g>
        {still ? (
          <animateMotion dur="1s" path={map.route} rotate="auto" keyPoints="0.55;0.55" keyTimes="0;1" calcMode="linear" fill="freeze" />
        ) : (
          <>
            <animateMotion dur={`${FLIGHT_MS}ms`} path={map.route} rotate="auto" fill="freeze" />
            <animate attributeName="opacity" dur={`${FLIGHT_MS}ms`} values="0;1;1;0" keyTimes="0;0.15;0.8;1" fill="freeze" />
          </>
        )}
      </g>
    </svg>
  );
}

/** How long the blur-out (and the blur-in after it) takes, in ms; matches the CSS transition. */
const BLUR_MS = 300;
/** One flight per destination: takes off after the blur-in and lands before the next blur-out. */
const FLIGHT_MS = 2000 - 2 * BLUR_MS;

function HeroAround({ perCountry }: { perCountry: Record<string, { offers: number } | undefined> }) {
  const { t, lang } = useI18n();
  const [i, setI] = useState(0);
  // Each change slowly blurs the two photos out, swaps the destination while blurred, then sharpens them back in.
  const [blurred, setBlurred] = useState(false);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let swap = 0;
    const id = window.setInterval(() => {
      setBlurred(true);
      swap = window.setTimeout(() => { setI((n) => n + 1); setBlurred(false); }, BLUR_MS);
    }, 2000);
    return () => { window.clearInterval(id); window.clearTimeout(swap); };
  }, []);

  // Load every photo once up front so each change shows instantly.
  useEffect(() => {
    for (const l of HERO_LANDMARKS) new Image().src = l.photo;
  }, []);

  const n = HERO_LANDMARKS.length;
  const here = HERO_LANDMARKS[i % n];
  const snapshot = HERO_LANDMARKS[(i + Math.floor(n / 2)) % n];
  return (
    <div className={`hero-around ${blurred ? 'is-blurred' : ''}`} aria-hidden>
      <figure className="scrap postcard around-photo">
        <img className="fx" src={here.photo} alt="" />
        <figcaption><b>{lang === 'ko' ? here.nameKo : here.name}</b><small>{t('brand.tag')}</small></figcaption>
      </figure>
      <FlightPath code={here.code} />
      <span className="stamp is-teal around-stamp"><span>Verified route</span><b>Ready to carry</b></span>
      <div className="scrap ticket around-ticket">
        <span className="stamp is-coral"><span>Air ticket</span><b>Boarding pass</b></span>
        <div className="ticket-route">{here.code} → KR</div>
        <div className="ticket-line"><span>Offers</span><b>{perCountry[here.code]?.offers ?? 0}</b></div>
      </div>
      <figure className="scrap postcard around-snacks">
        <img className="fx" src={snapshot.photo} alt="" />
      </figure>
    </div>
  );
}
