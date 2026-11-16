import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, SearchX } from '../components/icons';
import { api } from '../api';
import { OfferCard, OfferRow, RequestRow } from '../components/cards';
import { Screen } from '../components/Layout';
import { Empty, ErrorBox, Loading, Sheet } from '../components/ui';
import { useI18n } from '../i18n';
import { useSession } from '../session';

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
  const others = useQuery({ queryKey: ['offers', 'ALL'], queryFn: () => api.offers('ALL'), enabled: noMatch });
  const bookable = (others.data ?? []).filter((o) => o.bookable);
  const sameCountry = country ? bookable.filter((o) => o.countryCode === country) : [];
  const suggestions = (sameCountry.length ? sameCountry : bookable).slice(0, 8);

  return (
    <Screen title={t('search.title')}>
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

      {!q && <Empty icon={SearchIcon} title={t('search.idle')} />}
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
              <p className="eyebrow">{t('search.suggestEyebrow')}</p>
              <h2 id="suggest-title" className="search-suggest-title">{t('search.suggestTitle')}</h2>
              <div className="card-grid live-grid suggest-grid">
                {suggestions.map((o) => <OfferCard key={o.id} offer={o} />)}
              </div>
            </section>
          )}

          {results.data.offers.length > 0 && (
            <Sheet title={t('search.offers')} aside={<span className="count">{results.data.offers.length}</span>} flush>
              <div className="rows">{results.data.offers.map((o) => <OfferRow key={o.id} offer={o} />)}</div>
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
    </Screen>
  );
}
