import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, SearchX, X } from '../components/icons';
import { api, type Offer } from '../api';
import { OfferCard, OfferRow, RequestRow } from '../components/cards';
import { Screen } from '../components/Layout';
import { Empty, ErrorBox, Loading, Sheet } from '../components/ui';
import { useI18n, type Key } from '../i18n';
import { CATEGORIES, daysUntil, krw } from '../format';
import { useSession } from '../session';

type Sort = 'best' | 'priceLow' | 'priceHigh' | 'arrival' | 'reward';
const PRICES = [10000, 30000, 50000, 100000];

export default function Search() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const country = params.get('country') ?? '';
  const [text, setText] = useState(q);

  const results = useQuery({
    queryKey: ['search', q, country],
    queryFn: () => api.search(q, country),
    enabled: q.trim().length > 0,
  });

  const requestLink = `/requests/new?${new URLSearchParams({ q, country: country || 'JP' })}`;

  const noMatch = !!results.data && results.data.offers.length === 0;
  const idle = !q.trim();
  const others = useQuery({ queryKey: ['offers', 'ALL'], queryFn: () => api.offers('ALL'), enabled: noMatch || idle });
  const bookable = (others.data ?? []).filter((o) => o.bookable);
  const sameCountry = country ? bookable.filter((o) => o.countryCode === country) : [];
  const suggestions = (sameCountry.length ? sameCountry : bookable).slice(0, 8);
  const [cat, setCat] = useState('');
  const [sort, setSort] = useState<Sort>('best');
  const [within, setWithin] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const filtered = !!(cat || within || maxPrice || sort !== 'best');
  const clear = () => { setCat(''); setSort('best'); setWithin(0); setMaxPrice(0); };
  const apply = useMemo(() => (list: Offer[]) => {
    const out = list.filter((o) =>
      (!cat || (o.category ?? 'Other') === cat)
      && (!within || daysUntil(o.trip.returnDate) <= within)
      && (!maxPrice || o.estPrice <= maxPrice));
    if (sort === 'priceLow') out.sort((a, b) => a.estPrice - b.estPrice);
    if (sort === 'priceHigh') out.sort((a, b) => b.estPrice - a.estPrice);
    if (sort === 'arrival') out.sort((a, b) => a.trip.returnDate.localeCompare(b.trip.returnDate));
    if (sort === 'reward') out.sort((a, b) => a.reward - b.reward);
    return out;
  }, [cat, sort, within, maxPrice]);
  const browse = apply(country ? sameCountry : bookable).slice(0, 8);
  const matches = results.data ? apply(results.data.offers) : [];
  const countryLabel = config?.countries.find((c) => c.code === country);

  return (
    <Screen title={t('search.title')} wide>
      <div className="search-layout">
      <aside className="search-filters" aria-label={t('search.f.title')}>
        <h2 className="search-side-title">{t('search.f.title')}</h2>
        <p className="search-side-label">{t('to.category')}</p>
        <div className="search-chips" role="group" aria-label="Category">
          {['', ...CATEGORIES].map((c) => (
            <button key={c || 'all'} type="button" aria-pressed={cat === c} onClick={() => setCat(c)}>
              {c ? t(`cat.${c}` as Key) : t('search.f.all')}
            </button>
          ))}
        </div>
        <div className="search-selects">
          <p className="search-side-label">{t('to.sortBy')}</p>
          <select className="search-select" aria-label={t('to.sortBy')} value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="best">{t('to.sort.best')}</option>
            <option value="priceLow">{t('search.f.priceLow')}</option>
            <option value="priceHigh">{t('search.f.priceHigh')}</option>
            <option value="arrival">{t('to.sort.arrival')}</option>
            <option value="reward">{t('to.sort.reward')}</option>
          </select>
          <p className="search-side-label">{t('search.f.arrival')}</p>
          <select className="search-select" aria-label={t('search.f.anyArrival')} value={within} onChange={(e) => setWithin(+e.target.value)}>
            <option value={0}>{t('search.f.anyArrival')}</option>
            {[7, 14, 30].map((n) => <option key={n} value={n}>{t('search.f.within', { n })}</option>)}
          </select>
          <p className="search-side-label">{t('search.f.price')}</p>
          <select className="search-select" aria-label={t('search.f.anyPrice')} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)}>
            <option value={0}>{t('search.f.anyPrice')}</option>
            {PRICES.map((p) => <option key={p} value={p}>{t('search.f.under', { amount: krw(p) })}</option>)}
          </select>
          {filtered && (
            <button type="button" className="search-clear" onClick={clear}><X size={14} aria-hidden /> {t('search.f.clear')}</button>
          )}
        </div>
      </aside>


      <div className="search-main">
      <form
        className="searchbar has-select"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setParams({ q: text, ...(country ? { country } : {}) });
        }}
      >
        <SearchIcon size={20} aria-hidden />
        <input autoFocus placeholder={t('search.placeholder')} value={text} onChange={(e) => setText(e.target.value)} aria-label={t('search.title')} />
        <select
          aria-label={t('req.country')}
          value={country}
          onChange={(e) => setParams({ q, ...(e.target.value ? { country: e.target.value } : {}) })}
        >
          <option value="">{t('search.allCountries')}</option>
          {config?.countries.map((c) => <option key={c.code} value={c.code}>{lang === 'ko' ? c.nameKo : c.name}</option>)}
        </select>
      </form>

      {idle && (
        <>
          <p className="search-idle-hint"><SearchIcon size={16} aria-hidden /> {t('search.idle')}</p>
          {others.isLoading && <Loading />}
          {browse.length > 0 && (
            <section className="search-suggest search-browse" aria-labelledby="browse-title">
              <h2 id="browse-title" className="search-suggest-title">
                {countryLabel ? t('search.browseCountry', { country: lang === 'ko' ? countryLabel.nameKo : countryLabel.name }) : t('search.browseTitle')}
              </h2>
              <div className="card-grid live-grid suggest-grid">
                {browse.map((o) => <OfferCard key={o.id} offer={o} />)}
              </div>
            </section>
          )}
          {others.data && browse.length === 0 && (
            <Empty icon={SearchX} title={filtered ? t('search.f.none') : t('search.idle')}>
              {filtered && <button type="button" className="btn btn-quiet" onClick={clear}>{t('search.f.clear')}</button>}
            </Empty>
          )}
        </>
      )}
      {results.isLoading && <Loading />}
      {results.error && <ErrorBox error={results.error} onRetry={() => results.refetch()} />}

      {results.data && (
        <>
          {results.data.offers.length === 0 && (
            <Empty icon={SearchX} title={t('search.noOffers', { q })}>
              <p className="fine">{t('search.noOffersHint')}</p>
              <Link to={requestLink} className="btn btn-primary">{t('home.requestCta')}</Link>
            </Empty>
          )}

          {noMatch && suggestions.length > 0 && (
            <section className="search-suggest" aria-labelledby="suggest-title">
              <h2 id="suggest-title" className="search-suggest-title">{t('search.suggestTitle')}</h2>
              <p className="search-suggest-sub">{t('search.suggestEyebrow')}</p>
              <div className="card-grid live-grid suggest-grid">
                {suggestions.map((o) => <OfferCard key={o.id} offer={o} />)}
              </div>
            </section>
          )}

          {results.data.offers.length > 0 && matches.length === 0 && (
            <Empty icon={SearchX} title={t('search.f.none')}>
              <button type="button" className="btn btn-quiet" onClick={clear}>{t('search.f.clear')}</button>
            </Empty>
          )}
          {matches.length > 0 && (
            <Sheet title={t('search.offers')} aside={<span className="count">{matches.length}</span>} flush>
              <div className="rows">{matches.map((o) => <OfferRow key={o.id} offer={o} />)}</div>
            </Sheet>
          )}

          {results.data.requests.length > 0 && (
            <Sheet title={t('search.othersWant')} flush>
              <div className="rows">
                {results.data.requests.map((r) => <RequestRow key={r.id} request={r} to={requestLink} />)}
              </div>
            </Sheet>
          )}
        </>
      )}
      </div>
      </div>
    </Screen>
  );
}
