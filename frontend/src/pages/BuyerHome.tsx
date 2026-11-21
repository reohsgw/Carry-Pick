import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Search as SearchIcon } from '../components/icons';
import HeroLogo from '../components/HeroLogo';
import { api } from '../api';
import { OfferCard, ProductCard } from '../components/cards';
import { Screen } from '../components/Layout';
import { ErrorBox, Loading, Mascot, SectionHeading, categoryIcon } from '../components/ui';
import { ALL_COUNTRIES, CATEGORIES, countryName } from '../format';
import { HERO_LANDMARKS } from '../images';
import { useI18n, type Key } from '../i18n';
import { useSession } from '../session';
import { useCountry } from '../country';

const HOME_CATEGORIES = CATEGORIES.filter((c) => c !== 'Other');

export default function BuyerHome() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { country } = useCountry();
  const [q, setQ] = useState('');
  const heroSearch = useRef<HTMLFormElement>(null);
  const [pinned, setPinned] = useState<{ top: number; left: number; width: number } | null>(null);
  const search = (e: FormEvent) => {
    e.preventDefault();
    navigate(`/search?q=${encodeURIComponent(q)}${country === ALL_COUNTRIES ? '' : `&country=${country}`}`);
  };

  useEffect(() => {
    const form = heroSearch.current;
    if (!form) return;
    const update = () => {
      const header = document.querySelector('.app-header')?.getBoundingClientRect();
      if (!header || form.getBoundingClientRect().bottom >= header.bottom) { setPinned(null); return; }
      setPinned({ top: header.bottom, left: header.left, width: header.width });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);
  const [tipOpen, setTipOpen] = useState<boolean | null>(null);
  const ranking = useQuery({ queryKey: ['ranking', country], queryFn: () => api.ranking(country) });
  const offers = useQuery({ queryKey: ['offers', country], queryFn: () => api.offers(country) });
  const name = countryName(config, country, lang);

  const [liveCat, setLiveCat] = useState('');
  const [liveSort, setLiveSort] = useState<'soonest' | 'cheapest' | 'newest'>('soonest');
  const bookable = (offers.data ?? []).filter((o) => o.bookable);
  const liveCats = CATEGORIES.filter((c) => bookable.some((o) => (o.category ?? 'Other') === c));
  const live = bookable
    .filter((o) => !liveCat || (o.category ?? 'Other') === liveCat)
    .sort((a, b) => liveSort === 'cheapest' ? a.unitQuote.total - b.unitQuote.total
      : liveSort === 'newest' ? b.id - a.id
        : a.trip.returnDate.localeCompare(b.trip.returnDate))
    .slice(0, 8);

  return (
    <Screen flush>
      {pinned && (
        <div className="pinned-search" style={pinned}>
          <form className="hero-search is-pinned" role="search" onSubmit={search}>
            <SearchIcon size={18} aria-hidden />
            <input placeholder={t('home.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('nav.search')} />
            <button className="btn btn-primary hero-search-btn">{t('home.searchBtn')}</button>
          </form>
        </div>
      )}
      <section className="hero-section">
        <div className="hero-inner">
          <h1 className="hero-logo-wrap"><HeroLogo label="CarryPick" /></h1>
          <Mascot className="hero-whale" />
          <Mascot mood="shop" className="hero-whale-2" />
          <p className="hero-body">
            {t('home.heroBody').split('\n').map((line) => <span key={line} className="hero-body-line">{line}</span>)}
          </p>
          <form ref={heroSearch} className="hero-search" role="search" onSubmit={search}>
            <SearchIcon size={20} aria-hidden />
            <input placeholder={t('home.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('nav.search')} />
            <button className="btn btn-primary hero-search-btn">{t('home.searchBtn')}</button>
          </form>

          <nav className="home-cats" aria-label={t('home.catsLabel')}>
            {HOME_CATEGORIES.map((c) => {
              const Icon = categoryIcon(c);
              return (
                <Link key={c} to={`/offers?country=${country}&category=${c}`} className="home-cat">
                  <span className="home-cat-icon"><Icon size={24} strokeWidth={1.75} aria-hidden /></span>
                  <span className="home-cat-label">{t(`cat.${c}`)}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <HeroBackdrop />

      </section>

      <section id="most-wanted" className="home-section most-wanted-section">
        <SectionHeading
          title={country === ALL_COUNTRIES ? t('home.trendTitle') : t('home.trendTitleIn', { country: name })}
        />
        {ranking.isLoading && <Loading />}
        {ranking.error && <ErrorBox error={ranking.error} onRetry={() => ranking.refetch()} />}
        {ranking.data && ranking.data.items.length === 0 && <p className="fine">{t('home.popularEmpty', { country: name })}</p>}
        {!!ranking.data?.items.length && (
          <ol className="top10-row">
            {ranking.data.items.map((it) => <li key={it.productName}><ProductCard item={it} country={country} /></li>)}
          </ol>
        )}
      </section>

      <section className="home-section live-section stack">
        <header className="live-head">
          <div className="live-copy">
            <div className="live-title-row">
              <h2 className="live-title">{t('home.liveTitle')}</h2>
              <span className={`live-tip${tipOpen === true ? ' is-open' : tipOpen === false ? ' is-closed' : ''}`} onMouseLeave={() => setTipOpen(null)}>
                <button type="button" className="live-tip-btn" aria-label={t('home.liveTipLabel')} aria-describedby="live-tip-text"
                  aria-expanded={!!tipOpen} onClick={() => setTipOpen((o) => !o)} onBlur={() => setTipOpen(null)}>
                  <Mascot mood="happy" size={52} />
                </button>
                <span role="tooltip" id="live-tip-text" className="live-say-bubble live-tip-bubble">{t('home.liveBody')}</span>
              </span>
            </div>
          </div>
        </header>
        {offers.isLoading && <Loading />}
        {bookable.length > 0 && (
          <div className="live-filters">
            <div className="lf-chips" role="group" aria-label={t('to.category')}>
              <button type="button" aria-pressed={!liveCat} onClick={() => setLiveCat('')}>{t('search.f.all')}</button>
              {liveCats.map((c) => (
                <button key={c} type="button" aria-pressed={liveCat === c} onClick={() => setLiveCat(c)}>{t(`cat.${c}` as Key)}</button>
              ))}
            </div>
            <select className="search-select" aria-label={t('to.sortBy')} value={liveSort}
              onChange={(e) => setLiveSort(e.target.value as typeof liveSort)}>
              <option value="soonest">{t('country.sort.soonest')}</option>
              <option value="cheapest">{t('country.sort.cheapest')}</option>
              <option value="newest">{t('country.sort.newest')}</option>
            </select>
          </div>
        )}
        {offers.data && bookable.length === 0 && <p className="fine center">{t('home.liveEmpty', { country: name })}</p>}
        {bookable.length > 0 && live.length === 0 && <p className="fine center">{t('search.f.none')}</p>}
        {live.length > 0 && <div className="card-grid live-grid">{live.map((o) => <OfferCard key={o.id} offer={o} />)}</div>}
        {live.length > 0 && (
          <Link to={`/offers?country=${country}`} className="link-button center-block">
            {t('home.browse', { country: name })} <ArrowRight size={15} />
          </Link>
        )}
      </section>

      <section className="ask-panel">
        <div className="ask-copy">
          <h2 className="ask-title">{t('home.requestTitle')}</h2>
          <Link to={`/requests/new?country=${country === ALL_COUNTRIES ? 'JP' : country}`} className="btn btn-primary ask-cta">
            {t('home.requestCta')}
          </Link>
        </div>
        <div className="ask-stamp-wrap">
          <ol className="ask-stamp">
            {(['shop', 'fly', 'unbox'] as const).map((mood, i) => (
              <li key={mood}>
                <span className="ask-n">{i + 1}</span>
                <Mascot mood={mood} className="ask-whale" size={150} />
                <div className="ask-text">
                  <p>{t(`home.how${i + 1}` as 'home.how1')}</p>
                  {t(`home.how${i + 1}Sub` as 'home.how1Sub') && <span className="ask-sub">{t(`home.how${i + 1}Sub` as 'home.how1Sub')}</span>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </Screen>
  );
}

function HeroBackdrop() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => setI((n) => n + 1), 2000);
    return () => window.clearInterval(id);
  }, []);

  const here = HERO_LANDMARKS[i % HERO_LANDMARKS.length];
  return (
    <div className="hero-backdrop" aria-hidden>
      {HERO_LANDMARKS.map((l) => (
        <img key={l.code} src={l.photo} alt="" className={l.code === here.code ? 'is-on' : undefined} />
      ))}
    </div>
  );
}
