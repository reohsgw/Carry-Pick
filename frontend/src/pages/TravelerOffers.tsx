import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Lock, Plane } from '../components/icons';
import { api, type Offer } from '../api';
import { firstName, useRoute } from '../components/cards';
import { Screen } from '../components/Layout';
import CountryPicker from '../components/CountryPicker';
import { useCountry } from '../country';
import { Avatar, Empty, ErrorBox, Loading, ProductThumb } from '../components/ui';
import { ALL_COUNTRIES, daysUntil, krw, shortDate } from '../format';
import { useI18n, type Key } from '../i18n';
import { useSession } from '../session';

type Sort = 'best' | 'reward' | 'arrival';
type Window = 'any' | '7' | '14';

export default function TravelerOffers() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { country, setCountry } = useCountry();
  const linked = params.get('country');
  useEffect(() => { if (linked && linked !== country) setCountry(linked); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const arriveBy = params.get('by') ?? '';

  const [draftCountry, setDraftCountry] = useState(country);
  const [draftBy, setDraftBy] = useState(arriveBy);

  const offers = useQuery({ queryKey: ['offers', country], queryFn: () => api.offers(country) });
  const [sort, setSort] = useState<Sort>('best');
  const [win, setWin] = useState<Window>('any');
  const [cats, setCats] = useState<string[]>([]);
  const [bookableOnly, setBookableOnly] = useState(true);
  const [compare, setCompare] = useState<number[]>([]);

  const all = offers.data ?? [];
  const rewardCap = useMemo(() => Math.max(5000, ...all.map((o) => o.reward)), [all]);
  const [maxReward, setMaxReward] = useState<number | null>(null);
  const rewardLimit = maxReward ?? rewardCap;
  const categories = useMemo(() => Array.from(new Set(all.map((o) => o.category ?? 'Other'))), [all]);

  const list = useMemo(() => {
    const items = all.filter((o) =>
      (!bookableOnly || o.bookable)
      && o.reward <= rewardLimit
      && (!cats.length || cats.includes(o.category ?? 'Other'))
      && (win === 'any' || daysUntil(o.trip.returnDate) <= Number(win))
      && (!arriveBy || o.trip.returnDate <= arriveBy));
    return [...items].sort((a, b) => {
      if (sort === 'reward') return a.reward - b.reward;
      if (sort === 'arrival') return a.trip.returnDate.localeCompare(b.trip.returnDate);
      return Number(b.bookable) - Number(a.bookable)
        || a.unitQuote.total - b.unitQuote.total
        || a.trip.returnDate.localeCompare(b.trip.returnDate);
    });
  }, [all, bookableOnly, rewardLimit, cats, win, arriveBy, sort]);

  const compared = all.filter((o) => compare.includes(o.id));
  const cheapest = compared.length ? Math.min(...compared.map((o) => o.unitQuote.total)) : 0;

  const prevCountry = useRef(country);
  useEffect(() => {
    if (prevCountry.current === country) return;
    prevCountry.current = country;
    setDraftCountry(country);
    setCats([]); setCompare([]); setMaxReward(null);
  }, [country]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setParams(draftBy ? { by: draftBy } : {}, { replace: true });
    if (draftCountry !== country) setCountry(draftCountry);
  }

  function toggleCompare(id: number) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < 3 ? [...c, id] : c));
  }

  return (
    <Screen wide headerExtra={<CountryPicker />}>
      <section className="home-section offers-page">
        <div className="section-heading">
          <div>
            <p className="script-note">{t('to.script')}</p>
            <h2 className="font-display">{t('to.title')}</h2>
            <p className="section-copy">{t('to.copy')}</p>
          </div>
        </div>

        <form className="offer-searchbar" onSubmit={apply}>
          <label>
            <span>{t('to.shoppingIn')}</span>
            <select value={draftCountry} onChange={(e) => setDraftCountry(e.target.value)}>
              <option value={ALL_COUNTRIES}>{lang === 'ko' ? '전체 국가' : 'All countries'}</option>
              {(config?.countries ?? []).map((c) => (
                <option key={c.code} value={c.code}>{lang === 'ko' ? c.nameKo : c.name}</option>
              ))}
            </select>
          </label>
          <span className="swap" aria-hidden>→</span>
          <label>
            <span>{t('to.deliveringTo')}</span>
            <input value={t('to.seoul')} readOnly />
          </label>
          <label>
            <span>{t('to.arriveBy')}</span>
            <input type="date" value={draftBy} onChange={(e) => setDraftBy(e.target.value)} />
          </label>
          <button className="btn btn-primary">{t('to.update')}</button>
        </form>

        <div className="results-bar">
          <p><strong>{t('to.foundN', { n: list.length })}</strong> {t('to.foundRest')}</p>
          <label className="results-sort">
            {t('to.sortBy')}
            <select className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="best">{t('to.sort.best')}</option>
              <option value="reward">{t('to.sort.reward')}</option>
              <option value="arrival">{t('to.sort.arrival')}</option>
            </select>
          </label>
        </div>

        <div className="offers-main">
          <aside className="filter-sidebar">
            <h3>{t('to.refine')}</h3>
            <div className="range-label"><span>{t('to.maxReward')}</span><strong>{krw(rewardLimit)}</strong></div>
            <input
              type="range" min={0} max={rewardCap} step={1000} value={rewardLimit}
              onChange={(e) => setMaxReward(Number(e.target.value))} aria-label={t('to.maxReward')}
            />
            <hr />
            <p className="filter-label">{t('to.window')}</p>
            {(['any', '7', '14'] as const).map((w) => (
              <label key={w} className="check-row">
                <input type="radio" name="arrival" checked={win === w} onChange={() => setWin(w)} />
                {t(w === 'any' ? 'to.any' : w === '7' ? 'to.within7' : 'to.within14')}
              </label>
            ))}
            {categories.length > 1 && (
              <>
                <hr />
                <p className="filter-label">{t('to.category')}</p>
                {categories.map((c) => (
                  <label key={c} className="check-row">
                    <input
                      type="checkbox" checked={cats.includes(c)}
                      onChange={() => setCats((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))}
                    />
                    {t(`cat.${c}` as Key)}
                  </label>
                ))}
              </>
            )}
            <hr />
            <label className="check-row">
              <input type="checkbox" checked={bookableOnly} onChange={(e) => setBookableOnly(e.target.checked)} />
              {t('to.availableOnly')}
            </label>
          </aside>

          <div>
            {offers.isLoading && <Loading />}
            {offers.error && <ErrorBox error={offers.error} onRetry={() => offers.refetch()} />}
            {offers.data && list.length === 0 && (
              <Empty icon={Plane} title={t('to.empty')}>
                <Link to={`/requests/new?country=${country}`} className="btn btn-primary">{t('home.requestCta')}</Link>
              </Empty>
            )}
            {list.length > 0 && (
              <div className="ticket-grid">
                {list.map((o, i) => (
                  <TicketCard
                    key={o.id} offer={o} best={i === 0 && sort === 'best'}
                    comparing={compare.includes(o.id)} compareFull={compare.length >= 3}
                    onCompare={() => toggleCompare(o.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="home-section comparison-board">
        <div className="comparison-head">
          <div>
            <p className="eyebrow">{t('to.compareKicker')}</p>
            <h3 className="font-display">{t('to.compareTitle')}</h3>
          </div>
          <b>{t('to.selected', { n: compared.length })}</b>
        </div>
        {compared.length === 0 ? (
          <p className="fine">{t('to.compareEmpty')}</p>
        ) : (
          <div className="compare-grid">
            {compared.map((o) => (
              <div key={o.id} className={`compare-col ${o.unitQuote.total === cheapest && compared.length > 1 ? 'is-best' : ''}`}>
                {o.unitQuote.total === cheapest && compared.length > 1 && <span className="best-tag">{t('to.bestValue')}</span>}
                <b>{o.productName}</b>
                <span className="fine">{t('to.traveler')}</span>
                <b>{firstName(o.traveler.name)}</b>
                <span className="fine">{t('to.arrival')}</span>
                <b>{shortDate(o.trip.returnDate, lang)}</b>
                <span className="fine">{t('to.itemPrice')} / {t('to.reward')}</span>
                <b>{krw(o.estPrice)} + {krw(o.reward)}</b>
                <span className="fine">{t('to.total')}</span>
                <b className="amount">{krw(o.unitQuote.total)}</b>
                <button className="btn btn-primary btn-small" onClick={() => navigate(`/offers/${o.id}`)}>{t('to.select')}</button>
              </div>
            ))}
          </div>
        )}
        <p className="protection-note"><Lock size={13} aria-hidden /> {t('to.protect')}</p>
      </section>
    </Screen>
  );
}

function TicketCard({ offer, best, comparing, compareFull, onCompare }: {
  offer: Offer; best: boolean; comparing: boolean; compareFull: boolean; onCompare: () => void;
}) {
  const { t, lang } = useI18n();
  const route = useRoute();
  const [from, to] = route(offer.trip.city, offer.countryCode).split(' → ');
  return (
    <article className="ticket-card">
      {best && <span className="best-tag">{t('to.best')}</span>}
      <div className="offer-head">
        <Avatar className="is-big" name={offer.traveler.name} src={offer.traveler.avatarUrl} />
        <div>
          <h3>{firstName(offer.traveler.name)}</h3>
          <p className="fine">{t('card.backFrom', { city: offer.trip.city ?? offer.countryCode })}</p>
        </div>
      </div>
      <Link to={`/offers/${offer.id}`} className="ticket-product">
        <ProductThumb src={offer.imageUrl} category={offer.category} size={56} />
        <div className="grow">
          <span className="meta-label">{offer.category ? t(`cat.${offer.category}` as Key) : ' '}</span>
          <strong>{offer.productName}</strong>
        </div>
      </Link>
      <div className="offer-ticket">
        <span className="ticket-pill">{from} <span className="route-arrow">→</span> {to}</span>
        <div className="price-line"><span>{t('to.dates')}</span><b>{shortDate(offer.trip.departDate, lang)} – {shortDate(offer.trip.returnDate, lang)}</b></div>
        <div className="price-line"><span>{t('to.itemPrice')}</span><b>{krw(offer.estPrice)}</b></div>
        <div className="price-line"><span>{t('to.reward')}</span><b>{krw(offer.reward)}</b></div>
        <div className="price-line">
          <span>{t('to.left')}</span>
          <b>{offer.bookable ? t('common.left', { n: offer.quantity }) : offer.quantity === 0 ? t('offer.soldOut') : t('offer.closed')}</b>
        </div>
      </div>
      <div className="offer-actions">
        <button
          type="button" className={`btn btn-quiet btn-small ${comparing ? 'is-on' : ''}`}
          aria-pressed={comparing} disabled={!comparing && compareFull} onClick={onCompare}
        >
          {comparing ? t('to.comparing') : t('to.compare')}
        </button>
        <Link to={`/offers/${offer.id}`} className="btn btn-primary btn-small">{t('to.view')} <ArrowRight size={14} /></Link>
      </div>
    </article>
  );
}
