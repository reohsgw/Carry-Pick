import { useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, Camera, ChevronRight, ClipboardList, LogOut, MapPinned, Package, Plane, Plus, ShoppingBag, Ticket,
} from '../components/icons';
import { api, type Order } from '../api';
import { firstName, useRoute } from '../components/cards';
import { Screen } from '../components/Layout';
import { Avatar, Loading, Modal, Notice, ProductThumb, Tag } from '../components/ui';
import { ACTIVE_STATUSES, approx, countryName, daysUntil, krw, money, yearDate, yearRange } from '../format';
import { LangSelect, useErrorText, useI18n, type Key } from '../i18n';
import { useSession } from '../session';
import { PayoutCard } from '../components/payout';
import { useOrderHasNews, useRequestIsNew } from '../seen';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function MyPage() {
  const { user, logout, unread, config, refreshMe } = useSession();
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const navigate = useNavigate();
  const route = useRoute();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trips = useQuery({
    queryKey: ['myTrips', 'withPast'],
    queryFn: api.myTripsWithPast,
    select: (list) => {
      const ended = (tr: (typeof list)[number]) => daysUntil(tr.returnDate) < 0;
      const live = list.filter((tr) => !ended(tr)).sort((a, b) => a.departDate.localeCompare(b.departDate));
      const past = list.filter(ended).sort((a, b) => b.departDate.localeCompare(a.departDate));
      return [...live, ...past];
    },
  });
  const offers = useQuery({ queryKey: ['myOffers'], queryFn: api.myOffers });
  const [payList, setPayList] = useState<'pending' | 'earned' | null>(null);
  const carrying = useQuery({ queryKey: ['myOrders', 'traveler'], queryFn: () => api.myOrders('traveler') });
  const buying = useQuery({ queryKey: ['myOrders', 'buyer'], queryFn: () => api.myOrders('buyer') });
  const requests = useQuery({ queryKey: ['myRequests'], queryFn: api.myRequests });
  const isNew = useRequestIsNew();
  const hasNews = useOrderHasNews();
  if (!user) return null;

  const carryActive = (carrying.data ?? []).filter((o) => ACTIVE_STATUSES.includes(o.status));
  const itemOf = (o: Order) => o.actualPrice ?? o.itemLimit;
  const sumUp = (list: Order[]) => list.reduce(
    (acc, o) => ({ item: acc.item + itemOf(o), reward: acc.reward + o.reward }), { item: 0, reward: 0 });
  const pendingOrders = carryActive.filter((o) => ['PAID', 'AWAITING_APPROVAL', 'PURCHASED', 'DELIVERED', 'DISPUTED'].includes(o.status));
  const earnedOrders = (carrying.data ?? []).filter((o) => o.status === 'SETTLED')
    .sort((a, b) => (b.settledAt ?? b.completedAt ?? '').localeCompare(a.settledAt ?? a.completedAt ?? ''));
  const pending = sumUp(pendingOrders);
  const earned = sumUp(earnedOrders);
  const buyNews = (buying.data ?? []).filter(hasNews).length;
  const carryNews = (carrying.data ?? []).filter(hasNews).length;
  const newRequests = (requests.data ?? []).filter(isNew).length;
  const next = trips.data?.find((tr) => daysUntil(tr.returnDate) > 0);
  const dates = (a: string, b: string) => yearRange(a, b, lang);

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setError(t('me.photoType')); return; }
    if (file.size > MAX_PHOTO_BYTES) { setError(t('me.photoSize')); return; }
    setBusy(true);
    try {
      const { url } = await api.upload(file);
      await api.updateMe({ avatarUrl: url });
      refreshMe();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removePhoto() {
    setError(null);
    setBusy(true);
    try {
      await api.updateMe({ avatarUrl: '' });
      refreshMe();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const shortcuts: { to: string; icon: typeof Package; label: string; count?: number }[] = [
    { to: '/orders', icon: ShoppingBag, label: t('kt.buyHistory'), count: buyNews },
    { to: '/t/orders', icon: Package, label: t('kt.scCarry'), count: carryNews },
    { to: '/orders?tab=requests', icon: ClipboardList, label: t('kt.scRequests'), count: newRequests },
    { to: '#kt-trips', icon: Plane, label: t('kt.scTrips') },
  ];

  return (
    <Screen>
      <div className="kt">
        <div className="kt-aside">
          <section className="kt-sheet kt-profile">
            <div className="kt-photo">
              <Avatar size={64} name={user.name} src={user.avatarUrl} />
              <button
                type="button"
                className="kt-photo-btn"
                aria-label={user.avatarUrl ? t('me.photoChange') : t('me.photoAdd')}
                disabled={busy}
                onClick={() => fileInput.current?.click()}
              >
                <Camera size={14} aria-hidden />
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                onChange={(e) => changePhoto(e.target.files?.[0])}
              />
            </div>
            <div className="kt-profile-text">
              <h1>{firstName(user.name)} {user.test && <Tag tone="action">{t('me.test')}</Tag>}</h1>
              <p>{next ? t('kt.nextTrip', { route: route(next.city, next.countryCode) }) : user.email}</p>
              {next && <p className="kt-profile-dates">{dates(next.departDate, next.returnDate)}</p>}
              {user.avatarUrl && !busy && (
                <button type="button" className="kt-text-btn" onClick={removePhoto}>{t('me.photoRemove')}</button>
              )}
            </div>
          </section>

          {error && <Notice tone="bad">{error}</Notice>}

          <section className="kt-sheet kt-wallet">
            <span className="kt-wallet-title"><Ticket size={18} aria-hidden /> {t('kt.wallet')}</span>
            <div className="kt-wallet-sums">
              <button type="button" className="kt-wallet-sum" onClick={() => setPayList('pending')}>
                <span>{t('kt.pending')} <ChevronRight size={14} aria-hidden /></span>
                <strong>{krw(pending.item + pending.reward)}</strong>
              </button>
              <button type="button" className="kt-wallet-sum" onClick={() => setPayList('earned')}>
                <span>{t('kt.earned')} <ChevronRight size={14} aria-hidden /></span>
                <strong>{krw(earned.item + earned.reward)}</strong>
              </button>
            </div>
            <Modal
              open={payList !== null}
              onClose={() => setPayList(null)}
              title={t(payList === 'earned' ? 'kt.earned' : 'kt.pending')}
              eyebrow={t(payList === 'earned' ? 'kt.earnedNote' : 'kt.pendingNote')}
            >
              {(() => {
                const list = payList === 'earned' ? earnedOrders : pendingOrders;
                const sum = payList === 'earned' ? earned : pending;
                if (list.length === 0) return <p className="kt-empty">{t(payList === 'earned' ? 'kt.earnedEmpty' : 'kt.pendingEmpty')}</p>;
                return (
                  <>
                    <ul className="kt-pay-list">
                      {list.map((o) => (
                        <li key={o.id}>
                          <Link to={`/orders/${o.id}`} className="kt-pay-row" onClick={() => setPayList(null)}>
                            <ProductThumb src={o.imageUrl} category={o.category} size={48} />
                            <div className="kt-pay-body">
                              <h3>{o.productName}</h3>
                              <p>
                                {firstName(o.buyer.name)}
                                {' · '}
                                {payList === 'earned'
                                  ? t('kt.settledOn', { date: yearDate(o.settledAt ?? o.completedAt, lang) })
                                  : o.status === 'DELIVERED' && o.autoConfirmAt
                                    ? t('kt.autoOn', { date: yearDate(o.autoConfirmAt, lang) })
                                    : t(`st.${o.status}` as Key)}
                              </p>
                            </div>
                            <strong>{krw(itemOf(o) + o.reward)}</strong>
                          </Link>
                        </li>
                      ))}
                    </ul>
                    <div className="kt-pay-total">
                      <span>{t('kt.payTotal')}</span>
                      <strong>{krw(sum.item + sum.reward)}</strong>
                    </div>
                  </>
                );
              })()}
            </Modal>
            <div className="kt-wallet-actions">
              <Link to={next ? `/t/offers/new?trip=${next.id}` : '/t/offers/new'} className="kt-btn is-solid is-main">{t('t.offerItem')}</Link>
              <Link to="/t/trips/new" className="kt-btn"><Plus size={16} aria-hidden /> {t('t.addTrip')}</Link>
            </div>
          </section>

          <PayoutCard />

          <section className="kt-sheet kt-shortcuts">
            <h2 className="kt-label">{t('kt.myCarry')}</h2>
            <div className="kt-shortcut-row">
              {shortcuts.map(({ to, icon: Icon, label, count }) => {
                const inner = (
                  <>
                    <span className="kt-shortcut-icon"><Icon size={24} aria-hidden />{!!count && <em>{count}</em>}</span>
                    <span>{label}</span>
                  </>
                );
                return to.startsWith('#')
                  ? <a key={to} href={to} className="kt-shortcut">{inner}</a>
                  : <Link key={to} to={to} className="kt-shortcut">{inner}</Link>;
              })}
            </div>
          </section>

          <section className="kt-sheet kt-menu">
            <h2 className="kt-label">{t('kt.account')}</h2>
            <div className="kt-menu-row">
              <span>{t('lang.label')}</span>
              <LangSelect />
            </div>
            <Link to="/notifications">
              <Bell size={20} aria-hidden /> <span>{t('me.notifications')}</span>
              {unread > 0 && <span className="dot is-inline">{unread}</span>}
              <ChevronRight size={18} aria-hidden />
            </Link>
            <button type="button" className="is-danger" onClick={() => { logout(); navigate('/', { replace: true }); }}>
              <LogOut size={20} aria-hidden /> <span>{t('me.logout')}</span>
            </button>
          </section>
        </div>

        <div className="kt-main">
          <KtSection id="kt-trips" title={t('t.trips')} aside={<Link to="/t/trips/new" className="kt-more"><Plus size={15} aria-hidden /> {t('t.addTrip')}</Link>}>
            {trips.isLoading && <Loading />}
            {trips.data?.length === 0 && (
              <div className="kt-empty">
                <p>{t('t.noTrips')}</p>
                <Link to="/t/trips/new" className="kt-btn is-solid">{t('t.registerTrip')}</Link>
              </div>
            )}
            {trips.data?.map((tr) => {
              const d = daysUntil(tr.departDate);
              const open = daysUntil(tr.returnDate) > 0;
              const ended = daysUntil(tr.returnDate) < 0;
              return (
                <div key={tr.id} className={`kt-item kt-trip${ended ? ' is-past' : ''}`}>
                  <span className="kt-trip-icon"><MapPinned size={22} aria-hidden /></span>
                  <div className="kt-item-body">
                    <h3>{route(tr.city, tr.countryCode)}</h3>
                    <p className="kt-meta">{dates(tr.departDate, tr.returnDate)}{tr.luggageNote ? ` · ${tr.luggageNote}` : ''}</p>
                    <div className="kt-item-line">
                      <Tag tone={ended ? 'neutral' : d > 0 ? 'progress' : 'action'}>{ended ? t('t.done') : d > 0 ? t('t.inDays', { n: d }) : t('t.onTrip')}</Tag>
                      {open && (
                        <span className="kt-trip-actions">
                          <Link to={`/t/trips/${tr.id}/edit`} className="kt-inline-link is-quiet">{t('trip.edit')}</Link>
                          <Link to={`/t/offers/new?trip=${tr.id}`} className="kt-inline-link">{t('t.offerItem')} <ChevronRight size={14} aria-hidden /></Link>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </KtSection>

          <KtSection id="kt-offers" title={t('t.offers')} aside={<Link to="/t/offers/new" className="kt-more"><Plus size={15} aria-hidden /> {t('t.newOffer')}</Link>}>
            {offers.data?.length === 0 && <p className="kt-empty">{t('t.noOffers')}</p>}
            {offers.data?.map((o) => (
              <Link key={o.id} to={`/offers/${o.id}`} className="kt-item">
                <ProductThumb src={o.imageUrl} category={o.category} size={96} />
                <div className="kt-item-body">
                  <h3>{o.productName}</h3>
                  <p className="kt-meta">{countryName(config, o.countryCode, lang)} · {t('country.backOn', { date: yearDate(o.trip.returnDate, lang) })}</p>
                  <div className="kt-item-line">
                    {o.status !== 'ACTIVE' && <Tag>{t(`offer.status.${o.status}` as Key)}</Tag>}
                    <strong>{o.priceLocal != null && o.priceCurrency ? money(Number(o.priceLocal), o.priceCurrency) : krw(o.estPrice)}</strong>
                    {o.priceLocal != null && o.priceCurrency && <small className="kt-won">{approx(lang)}{krw(o.estPrice)}</small>}
                  </div>
                </div>
              </Link>
            ))}
          </KtSection>
        </div>
      </div>

    </Screen>
  );
}

function KtSection({ id, title, aside, children }: { id: string; title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} className="kt-sheet kt-section">
      <header className="kt-section-head">
        <h2>{title}</h2>
        {aside}
      </header>
      <div className="kt-items">{children}</div>
    </section>
  );
}
