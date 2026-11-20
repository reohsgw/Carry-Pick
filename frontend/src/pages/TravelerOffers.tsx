import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ChevronDown, Plane } from '../components/icons';
import { api, type Offer } from '../api';
import { firstName, useRoute } from '../components/cards';
import { Screen } from '../components/Layout';
import { useCountry } from '../country';
import { Avatar, Empty, ErrorBox, Loading, Mascot, ProductPhoto } from '../components/ui';
import { ALL_COUNTRIES, CATEGORIES, countryLabel, countryName, daysUntil, krw, shortDate, boardDate, weight, offerPriceText } from '../format';
import { useI18n, type Key } from '../i18n';
import { useSession } from '../session';

const MAX_COMPARE = 5;

type Sort = 'best' | 'reward' | 'arrival';
type Window = 'any' | '7' | '14';

const catOf = (c: string | null | undefined) => (c === 'Snacks' ? 'Food' : c ?? 'Other');

export default function TravelerOffers() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { country, setCountry } = useCountry();
  const linked = params.get('country');
  useEffect(() => { if (linked && linked !== country) setCountry(linked); }, []);
  const arriveBy = params.get('by') ?? '';

  const [draftCountry, setDraftCountry] = useState(linked ?? country);
  const [draftBy, setDraftBy] = useState(arriveBy);

  const offers = useQuery({ queryKey: ['offers', country], queryFn: () => api.offers(country) });
  const [sort, setSort] = useState<Sort>('best');
  const [win, setWin] = useState<Window>('any');
  const [cats, setCats] = useState<string[]>(() => {
    const c = params.get('category');
    return c && c !== 'All' ? [catOf(c)] : [];
  });
  const tripId = params.get('trip') ? Number(params.get('trip')) : null;
  const [maxWeight, setMaxWeight] = useState<number | null>(null);
  const weightLimit = maxWeight != null && maxWeight < 5000 ? maxWeight : null;
  const [compare, setCompare] = useState<number[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const all = offers.data ?? [];
  const rewardCap = useMemo(() => Math.max(5000, ...all.map((o) => o.reward)), [all]);
  const [maxReward, setMaxReward] = useState<number | null>(null);
  const rewardLimit = maxReward ?? rewardCap;
  const categories = useMemo(() => {
    const present = new Set(all.map((o) => catOf(o.category)));
    return (CATEGORIES as readonly string[]).filter((c) => present.has(c));
  }, [all]);

  const list = useMemo(() => {
    const items = all.filter((o) =>
      o.bookable
      && o.reward <= rewardLimit
      && (!cats.length || cats.includes(catOf(o.category)))
      && (!tripId || o.trip.id === tripId)
      && (weightLimit == null || (o.weightGrams != null && o.weightGrams <= weightLimit))
      && (win === 'any' || daysUntil(o.trip.returnDate) <= Number(win))
      && (!arriveBy || o.trip.returnDate <= arriveBy));
    return [...items].sort((a, b) => {
      if (sort === 'reward') return a.reward - b.reward;
      if (sort === 'arrival') return a.trip.returnDate.localeCompare(b.trip.returnDate);
      return Number(b.bookable) - Number(a.bookable)
        || a.unitQuote.total - b.unitQuote.total
        || a.trip.returnDate.localeCompare(b.trip.returnDate);
    });
  }, [all, rewardLimit, cats, win, arriveBy, sort, tripId, weightLimit]);

  const compared = all.filter((o) => compare.includes(o.id));
  const cheapest = compared.length ? Math.min(...compared.map((o) => o.unitQuote.total)) : 0;

  const prevCountry = useRef(country);
  useEffect(() => {
    if (prevCountry.current === country) return;
    prevCountry.current = country;
    setDraftCountry(country);
    setCats([]); setCompare([]); setMaxReward(null); setMaxWeight(null);
  }, [country]);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    setParams(draftBy ? { by: draftBy } : {}, { replace: true });
    if (draftCountry !== country) setCountry(draftCountry);
  }

  function toggleCompare(id: number) {
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length < MAX_COMPARE ? [...c, id] : c));
  }

  return (
    <Screen wide>
      <section className="home-section offers-page">
        <div className="section-heading">
          <div>
            <h2 className="font-display">{t('to.title')}</h2>
            <div className="live-say to-say">
              <Mascot mood="question" className="live-say-whale" size={76} />
              <p className="live-say-bubble">{t('to.copy')}</p>
            </div>
          </div>
        </div>

        <form className="offer-searchbar" onSubmit={apply}>
          <label>
            <span>{t('to.shoppingIn')}</span>
            <select value={draftCountry} onChange={(e) => setDraftCountry(e.target.value)}>
              <option value={ALL_COUNTRIES}>{countryName(config, ALL_COUNTRIES, lang)}</option>
              {(config?.countries ?? []).map((c) => (
                <option key={c.code} value={c.code}>{countryLabel(c, lang)}</option>
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
          <aside className={`filter-sidebar${filtersOpen ? ' is-open' : ''}`}>
            <h3>
              <button type="button" className="filter-toggle" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((o) => !o)}>
                {t('to.refine')}
                <ChevronDown size={18} aria-hidden className="filter-toggle-icon" />
              </button>
            </h3>
            <div className="range-label"><span>{t('to.maxReward')}</span><strong>{krw(rewardLimit)}</strong></div>
            <input
              type="range" min={0} max={rewardCap} step={1000} value={rewardLimit}
              onChange={(e) => setMaxReward(Number(e.target.value))} aria-label={t('to.maxReward')}
            />
            <hr />
            <div className="range-label"><span>{t('rb.f.maxWeight')}</span><strong>{weightLimit != null ? weight(weightLimit) : t('rb.f.any')}</strong></div>
            <input
              type="range" min={100} max={5000} step={100} value={weightLimit ?? 5000}
              onChange={(e) => setMaxWeight(Number(e.target.value))} aria-label={t('rb.f.maxWeight')}
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
                    comparing={compare.includes(o.id)} compareFull={compare.length >= MAX_COMPARE}
                    onCompare={() => toggleCompare(o.id)}
                  />
                ))}
              </div>
            )}
            {list.length > 0 && (
              <div className="offers-more">
                <p>{t('country.footer')}</p>
                <Link className="btn btn-primary btn-small" to={`/requests/new?country=${country === ALL_COUNTRIES ? 'JP' : country}`}>
                  {t('home.requestCta')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="home-section comparison-board">
        <div className="comparison-head">
          <div>
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
                <div className="compare-photo"><ProductPhoto src={o.imageUrl} category={o.category} /></div>
                <b>{o.productName}</b>
                <span className="fine">{t('to.traveler')}</span>
                <b>{firstName(o.traveler.name)}</b>
                <span className="fine">{t('to.arrival')}</span>
                <b>{shortDate(o.trip.returnDate, lang)}</b>
                <span className="fine">{t('to.itemPrice')} / {t('to.reward')}</span>
                <b>{offerPriceText(o, lang)} + {krw(o.reward)}</b>
                <span className="fine">{t('to.total')}</span>
                <b className="amount">{krw(o.unitQuote.total)}</b>
                <button className="btn btn-primary btn-small" onClick={() => navigate(`/offers/${o.id}`)}>{t('to.select')}</button>
              </div>
            ))}
          </div>
        )}
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
      <Link to={`/offers/${offer.id}`} className="ticket-product has-photo">
        <span className="ticket-photo"><ProductPhoto src={offer.imageUrl} category={offer.category} iconSize={48} /></span>
        <div className="grow">
          <span className="meta-label">{offer.category ? t(`cat.${offer.category}` as Key) : ' '}</span>
          <strong title={offer.productName}>{offer.productName}</strong>
        </div>
      </Link>
      <div className="offer-ticket">
        <div className="price-line"><span>{t('to.route')}</span><b>{from} → {to}</b></div>
        <div className="price-line"><span>{t('to.dates')}</span><b>{boardDate(offer.trip.departDate)} – {boardDate(offer.trip.returnDate)}</b></div>
        <div className="price-line"><span>{t('to.itemPrice')}</span><b>{offerPriceText(offer, lang)}</b></div>
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
