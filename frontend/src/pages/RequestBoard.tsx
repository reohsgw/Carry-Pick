import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, MapPinned, X } from '../components/icons';
import { api, type PurchaseRequest, type Trip } from '../api';
import { RequestCard } from '../components/cards';
import { Screen } from '../components/Layout';
import { Code, Empty, ErrorBox, Loading } from '../components/ui';
import { boardDate, CATEGORIES, displayCode, krw, weight } from '../format';
import { useI18n, type Key } from '../i18n';

type Sort = 'deadline' | 'rewardHigh' | 'light' | 'newest';
const SORTS: Sort[] = ['deadline', 'rewardHigh', 'light', 'newest'];

type Filters = {
  trips: number[];
  minReward: number;
  maxWeight: number | null;
  includeUnknown: boolean;
  maxBudget: number | null;
  cat: string;
};
const NONE: Filters = { trips: [], minReward: 0, maxWeight: null, includeUnknown: true, maxBudget: null, cat: '' };

export default function RequestBoard() {
  const { t } = useI18n();
  const trips = useQuery({ queryKey: ['myTrips'], queryFn: api.myTrips });
  const requests = useQuery({ queryKey: ['openRequests'], queryFn: api.openRequests });
  const [sort, setSort] = useState<Sort>('deadline');
  const [f, setF] = useState<Filters>(NONE);
  const set = (patch: Partial<Filters>) => setF((prev) => ({ ...prev, ...patch }));

  const all = requests.data ?? [];
  const myTrips = trips.data ?? [];
  const caps = useMemo(() => ({
    reward: 50000,
    weight: 5000,
    budget: roundUp(Math.max(10000, ...all.map((r) => r.maxBudget)), 10000),
  }), [all]);
  const categories = useMemo(
    () => CATEGORIES.filter((c) => all.some((r) => r.product?.category === c)),
    [all],
  );

  const weightLimit = f.maxWeight != null && f.maxWeight < caps.weight ? f.maxWeight : null;
  const budgetLimit = f.maxBudget != null && f.maxBudget < caps.budget ? f.maxBudget : null;
  const picked = myTrips.filter((tr) => f.trips.includes(tr.id));
  const toggleTrip = (id: number) =>
    set({ trips: f.trips.includes(id) ? f.trips.filter((x) => x !== id) : [...f.trips, id] });

  const shown = useMemo(() => {
    const out = all.filter((r) =>
      (picked.length === 0 || picked.some((tr) => fitsTrip(r, tr)))
      && r.reward >= f.minReward
      && (weightLimit == null || (r.weightGrams == null ? f.includeUnknown : r.weightGrams <= weightLimit))
      && (budgetLimit == null || r.maxBudget <= budgetLimit)
      && (!f.cat || r.product?.category === f.cat));
    return out.sort(comparator(sort));
  }, [all, picked, f, weightLimit, budgetLimit, sort]);

  const chips: { label: string; clear: Partial<Filters> }[] = [];
  for (const tr of picked) chips.push({ label: tripLabel(tr), clear: { trips: f.trips.filter((x) => x !== tr.id) } });
  if (f.minReward > 0) chips.push({ label: t('rb.f.chipReward', { amount: krw(f.minReward) }), clear: { minReward: 0 } });
  if (weightLimit != null) chips.push({ label: t('rb.f.chipWeight', { w: weight(weightLimit) }), clear: { maxWeight: null, includeUnknown: true } });
  if (budgetLimit != null) chips.push({ label: t('rb.f.chipBudget', { amount: krw(budgetLimit) }), clear: { maxBudget: null } });
  if (f.cat) chips.push({ label: t(`cat.${f.cat}` as Key), clear: { cat: '' } });

  const filters = (
    <div className="rf">
      {myTrips.length > 1 && (
        <Group label={t('rb.f.trip')}>
          <div className="rf-list">
            <label className="rf-radio">
              <input type="checkbox" checked={f.trips.length === 0} onChange={() => set({ trips: [] })} />
              <span>{t('rb.f.allTrips')}</span>
            </label>
            {myTrips.map((tr) => (
              <label key={tr.id} className="rf-radio">
                <input type="checkbox" checked={f.trips.includes(tr.id)} onChange={() => toggleTrip(tr.id)} />
                <span><Code>{displayCode(tr.countryCode)}</Code> {tripLabel(tr)}</span>
              </label>
            ))}
          </div>
        </Group>
      )}

      <Group label={t('rb.f.minReward')} value={f.minReward > 0 ? krw(f.minReward) : t('rb.f.any')}>
        <input type="range" min={0} max={caps.reward} step={1000} value={Math.min(f.minReward, caps.reward)}
          aria-label={t('rb.f.minReward')} onChange={(e) => set({ minReward: Number(e.target.value) })} />
      </Group>

      <Group label={t('rb.f.maxWeight')} value={weightLimit != null ? weight(weightLimit) : t('rb.f.any')}>
        <input type="range" min={100} max={caps.weight} step={100} value={weightLimit ?? caps.weight}
          aria-label={t('rb.f.maxWeight')} onChange={(e) => set({ maxWeight: Number(e.target.value) })} />
        {weightLimit != null && (
          <label className="rf-check">
            <input type="checkbox" checked={f.includeUnknown} onChange={(e) => set({ includeUnknown: e.target.checked })} />
            {t('rb.f.includeUnknown')}
          </label>
        )}
      </Group>

      <Group label={t('rb.f.budget')} value={budgetLimit != null ? krw(budgetLimit) : t('rb.f.any')} hint={t('rb.f.budgetHint')}>
        <input type="range" min={10000} max={caps.budget} step={10000} value={budgetLimit ?? caps.budget}
          aria-label={t('rb.f.budget')} onChange={(e) => set({ maxBudget: Number(e.target.value) })} />
      </Group>

      {categories.length > 1 && (
        <Group label={t('rb.f.category')}>
          <div className="rf-chips">
            <button type="button" aria-pressed={!f.cat} onClick={() => set({ cat: '' })}>{t('rb.f.any')}</button>
            {categories.map((c) => (
              <button key={c} type="button" aria-pressed={f.cat === c} onClick={() => set({ cat: c })}>{t(`cat.${c}` as Key)}</button>
            ))}
          </div>
        </Group>
      )}
    </div>
  );

  return (
    <Screen>
      <div className="page-hero rb-head">
        <h1 className="page-title font-display">{t('rb.title')}</h1>
      </div>

      {(requests.isLoading || trips.isLoading) && <Loading />}
      {requests.error && <ErrorBox error={requests.error} onRetry={() => requests.refetch()} />}
      {trips.data?.length === 0 && (
        <Empty icon={MapPinned} title={t('rb.needTrip')}>
          <Link to="/t/trips/new" className="btn btn-primary">{t('t.registerTrip')}</Link>
        </Empty>
      )}
      {myTrips.length > 0 && requests.data?.length === 0 && <Empty icon={ClipboardList} title={t('rb.empty')} />}

      {all.length > 0 && (
        <div className="rb-layout">
          <aside className="rb-side" aria-label={t('rb.f.title')}>
            <h2 className="rb-side-title only-desktop">{t('rb.f.title')}</h2>
            <details className="rb-mobile-filters only-mobile">
              <summary>{t('rb.f.show')}{chips.length > 0 && <span className="rb-badge">{chips.length}</span>}</summary>
              {filters}
            </details>
            <div className="only-desktop">{filters}</div>
          </aside>

          <section className="rb-main">
            <div className="rb-bar">
              <strong>{t('rb.f.count', { n: shown.length })}</strong>
              <label className="rb-sort">
                <span className="sr-only">{t('rb.f.sort')}</span>
                <select className="search-select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  {SORTS.map((s) => <option key={s} value={s}>{t(`rb.f.${s}`)}</option>)}
                </select>
              </label>
            </div>

            {chips.length > 0 && (
              <div className="rb-active">
                {chips.map((c) => (
                  <button key={c.label} type="button" onClick={() => set(c.clear)}>
                    {c.label} <X size={13} aria-hidden />
                  </button>
                ))}
                <button type="button" className="rb-clear" onClick={() => setF(NONE)}>{t('rb.f.clear')}</button>
              </div>
            )}

            {shown.length === 0 ? (
              <div className="rb-none">
                <p>{t('rb.f.none')}</p>
                <button type="button" className="btn btn-quiet btn-small" onClick={() => setF(NONE)}>{t('rb.f.clear')}</button>
              </div>
            ) : (
              <div className="card-grid rb-grid">
                {shown.map((r) => <RequestCard key={r.id} request={r} to={`/t/requests/${r.id}`} />)}
              </div>
            )}
          </section>
        </div>
      )}
    </Screen>
  );
}

function Group({ label, value, hint, children }: { label: string; value?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="rf-group">
      <div className="rf-head"><span>{label}</span>{value && <strong>{value}</strong>}</div>
      {children}
      {hint && <p className="rf-hint">{hint}</p>}
    </div>
  );
}

const tripLabel = (tr: Trip) => `${tr.city ?? ''} ${boardDate(tr.departDate)} – ${boardDate(tr.returnDate)}`.trim();

const fitsTrip = (r: PurchaseRequest, tr: Trip) => r.countryCode === tr.countryCode && tr.returnDate <= r.deadline;

function comparator(sort: Sort) {
  const byDeadline = (a: PurchaseRequest, b: PurchaseRequest) => a.deadline.localeCompare(b.deadline);
  return (a: PurchaseRequest, b: PurchaseRequest) => {
    switch (sort) {
      case 'rewardHigh': return b.reward - a.reward || byDeadline(a, b);
      case 'light': return (a.weightGrams ?? Infinity) - (b.weightGrams ?? Infinity) || byDeadline(a, b);
      case 'newest': return b.createdAt.localeCompare(a.createdAt);
      default: return byDeadline(a, b);
    }
  };
}

const roundUp = (n: number, step: number) => Math.ceil(n / step) * step;
