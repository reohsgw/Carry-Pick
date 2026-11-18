import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Plane as PlaneIcon, Search as SearchIcon } from '../components/icons';
import HeroLogo from '../components/HeroLogo';
import { api } from '../api';
import { OfferCard, ProductCard } from '../components/cards';
import { Screen } from '../components/Layout';
import { ErrorBox, Loading, Mascot, SectionHeading, categoryIcon } from '../components/ui';
import { ALL_COUNTRIES, CATEGORIES, countryName, displayCode } from '../format';
import { HERO_LANDMARKS } from '../images';
import { useI18n, type Key } from '../i18n';
import { useSession } from '../session';
import { useCountry } from '../country';
import CountryPicker from '../components/CountryPicker';

const HOME_CATEGORIES = CATEGORIES.filter((c) => c !== 'Other');

export default function BuyerHome() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const { country } = useCountry();
  const [q, setQ] = useState('');
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
    <Screen flush headerExtra={<CountryPicker />}>
      <section className="hero-section">
        <div className="hero-inner">
          <h1 className="hero-logo-wrap"><HeroLogo label="CarryPick" /></h1>
          <Mascot className="hero-whale" />
          <Mascot mood="shop" className="hero-whale-2" />
          <p className="hero-body">{t('home.heroBody')}</p>
          <form
            className="hero-search"
            role="search"
            onSubmit={(e) => { e.preventDefault(); navigate(`/search?q=${encodeURIComponent(q)}${country === ALL_COUNTRIES ? '' : `&country=${country}`}`); }}
          >
            <SearchIcon size={20} aria-hidden />
            <input placeholder={t('home.searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t('nav.search')} />
            <button className="btn btn-primary hero-search-btn">{t('home.searchBtn')}</button>
          </form>

          <nav className="home-cats" aria-label={t('home.catsLabel')}>
            {HOME_CATEGORIES.map((c) => {
              const Icon = categoryIcon(c);
              return (
                <Link key={c} to={`/country/${country}?category=${c}`} className="home-cat">
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
          eyebrow={t('home.trendEyebrow', { country: name })}
          title={t('home.trendTitle')}
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
            <p className="eyebrow">{t('home.liveEyebrow', { country: name })}</p>
            <h2 className="live-title">{t('home.liveTitle')}</h2>
            <p className="live-body">{t('home.liveBody')}</p>
          </div>
          <div className="live-route" aria-hidden>
            <span className="live-code">{country === ALL_COUNTRIES ? '🌐' : displayCode(country)}</span>
            <span className="live-path"><span className="live-plane"><PlaneIcon size={20} /></span></span>
            <span className="live-code">KR</span>
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
          <Link to={`/country/${country}`} className="link-button center-block">
            {t('home.browse', { country: name })} <ArrowRight size={15} />
          </Link>
        )}
      </section>

      <section className="ask-panel">
        <div className="ask-copy">
          <p className="ask-bubble">{t('home.ctaEyebrow')}</p>
          <h2 className="ask-title">
            <span>{t('home.ctaTitleA')}</span> <em>{t('home.ctaTitleB')}</em>
          </h2>
          <p className="ask-body">{t('home.requestBody')}</p>
          <Link to={`/requests/new?country=${country === ALL_COUNTRIES ? 'JP' : country}`} className="ask-btn">
            {t('home.ctaBtn')} <ArrowRight size={20} aria-hidden />
          </Link>
        </div>
        <div className="ask-stamp-wrap">
          <ol className="ask-stamp">
            {(['shop', 'fly', 'unbox'] as const).map((mood, i) => (
              <li key={mood}>
                <span className="ask-n">{String(i + 1).padStart(2, '0')}</span>
                <Mascot mood={mood} className="ask-whale" size={150} />
                <p>{t(`home.how${i + 1}` as 'home.how1')}</p>
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
