import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight } from './icons';
import type { Offer, Order, PurchaseRequest, Quote, Ranking } from '../api';
import { countryName, dateTime, daysUntil, krw, shortDate } from '../format';
import { useI18n, type Key } from '../i18n';
import { useSession } from '../session';
import { Avatar, Code, ProductPhoto, ProductThumb, StatusBadge, Tag } from './ui';

export function firstName(name: string): string {
  return name.replace(/\s*\(.*\)\s*$/, '').split(' ')[0];
}

export function useRoute() {
  const { lang } = useI18n();
  const { config } = useSession();
  return (city: string | null | undefined, countryCode: string) =>
    `${city || countryName(config, countryCode, lang)} → ${lang === 'ko' ? '서울' : 'Seoul'}`;
}

export function ProductCard({ item, country }: { item: Ranking['items'][number]; country: string }) {
  const { t, lang } = useI18n();
  const name = lang === 'ko' && item.nameKo ? item.nameKo : item.productName;
  const to = item.offerId ? `/offers/${item.offerId}` : `/requests/new?country=${country}&q=${encodeURIComponent(name)}`;
  const orders = item.orderCount === 1 ? t('home.order') : t('home.orders', { n: item.orderCount });
  return (
    <Link to={to} className={`top10-item${item.rank >= 10 ? ' is-two-digit' : ''}`} aria-label={`${item.rank}. ${name}${item.estPrice != null ? `, ${t('home.estPrice')} ${krw(item.estPrice)}` : ''}, ${orders}`}>
      <span className="top10-rank" aria-hidden>{item.rank}</span>
      <span className="top10-card">
        <span className="top10-poster">
          <ProductPhoto src={item.imageUrl} category={item.category} />
        </span>
        <span className="top10-name">{name}</span>
        {item.estPrice != null && (
          <span className="top10-price">
            <span className="top10-price-label">{t('home.estPrice')}</span> {krw(item.estPrice)}
          </span>
        )}
        <span className="top10-meta">{orders}</span>
      </span>
    </Link>
  );
}

export function OfferCard({ offer }: { offer: Offer }) {
  const { t, lang } = useI18n();
  const route = useRoute();
  return (
    <article className="offer-card">
      <Link to={`/offers/${offer.id}`} className="offer-media">
        <ProductPhoto src={offer.imageUrl} category={offer.category} iconSize={40} />
        <span className="route-chip">{route(offer.trip.city, offer.countryCode)}</span>
      </Link>
      <div className="offer-body">
        <p className="meta-label">{offer.category ? t(`cat.${offer.category}` as Key) : ' '}</p>
        <h3 className="offer-title">{offer.productName}</h3>
        <div className="meta-grid">
          <div><span className="meta-label">{t('card.price')}</span><strong className="meta-value">{krw(offer.estPrice)}</strong></div>
          <div><span className="meta-label">{t('card.reward')}</span><strong className="meta-value">{krw(offer.reward)}</strong></div>
          <div><span className="meta-label">{t('card.arrives')}</span><strong className="meta-value">{shortDate(offer.trip.returnDate, lang)}</strong></div>
        </div>
        <div className="offer-foot">
          <div className="person">
            <Avatar name={offer.traveler.name} src={offer.traveler.avatarUrl} />
            <div>
              <p>{firstName(offer.traveler.name)}</p>
              <small>{offer.bookable ? t('common.left', { n: offer.quantity }) : offer.quantity === 0 ? t('offer.soldOut') : t('offer.closed')}</small>
            </div>
          </div>
          <Link to={`/offers/${offer.id}`} className="round-arrow" aria-label={offer.productName}>
            <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </article>
  );
}

export function RequestCard({ request, to }: { request: PurchaseRequest; to: string }) {
  const { t, lang } = useI18n();
  const { config } = useSession();
  const left = daysUntil(request.deadline);
  return (
    <article className="request-card">
      {request.status === 'MATCHED' && (
        <span className="corner-ribbon"><span>{t('req.ribbon.inProgress')}</span></span>
      )}
      <div className="request-head">
        <ProductThumb src={request.imageUrl} size={72} />
        <div className="grow">
          <div className="person" style={{ marginBottom: 8 }}>
            <Avatar name={request.buyer.name} src={request.buyer.avatarUrl} />
            <p>{firstName(request.buyer.name)}</p>
          </div>
          <h3><Link to={to}>{request.productName}</Link></h3>
          <div className="request-meta">
            <span>{countryName(config, request.countryCode, lang)} → {lang === 'ko' ? '한국' : 'Korea'}</span>
            <span>{t('orders.by', { date: shortDate(request.deadline, lang) })}{request.status === 'OPEN' && left >= 0 ? `, ${t('orders.daysLeft', { n: left })}` : ''}</span>
            <span>{t('orders.budget', { amount: krw(request.maxBudget) })}</span>
          </div>
        </div>
      </div>
      <div className="request-foot">
        <div>
          <span className="meta-label">{t('rb.yourReward')}</span>
          <strong className="reward">{krw(request.reward)}</strong>
        </div>
        {request.status === 'OPEN'
          ? <Link to={to} className="btn btn-quiet btn-small">{t('rb.view')} <ArrowRight size={15} /></Link>
          : <Tag tone={request.status === 'MATCHED' ? 'progress' : 'neutral'}>{t(`req.status.${request.status}` as Key)}</Tag>}
      </div>
    </article>
  );
}

export function OfferRow({ offer }: { offer: Offer }) {
  const { t, lang } = useI18n();
  return (
    <Link to={`/offers/${offer.id}`} className="row">
      <ProductThumb src={offer.imageUrl} category={offer.category} />
      <div className="row-body">
        <div className="row-title">{offer.productName}</div>
        <div className="row-meta">
          <span>{t('country.backOn', { date: shortDate(offer.trip.returnDate, lang) })}</span>
          <span>{firstName(offer.traveler.name)}</span>
        </div>
      </div>
      <div className="row-end">
        <strong className="amount">{krw(offer.unitQuote.total)}</strong>
        {!offer.bookable ? <Tag>{offer.quantity === 0 ? t('offer.soldOut') : t('offer.closed')}</Tag> : <span className="row-sub">{t('country.perItem')}</span>}
      </div>
    </Link>
  );
}

export function RequestRow({ request, to }: { request: PurchaseRequest; to: string }) {
  const { t, lang } = useI18n();
  const { config } = useSession();
  const left = daysUntil(request.deadline);
  return (
    <Link to={to} className="row">
      <ProductThumb src={request.imageUrl} />
      <div className="row-body">
        <div className="row-title">{request.productName}</div>
        <div className="row-meta">
          <span>{countryName(config, request.countryCode, lang)}</span>
          <span>{t('orders.by', { date: shortDate(request.deadline, lang) })}</span>
          {request.status === 'OPEN' && left >= 0 && <span>{t('orders.daysLeft', { n: left })}</span>}
        </div>
      </div>
      <div className="row-end">
        <strong className="amount">{krw(request.maxBudget)}</strong>
        {request.status === 'OPEN'
          ? <span className="row-sub reward">{t('orders.rewardPlus', { amount: krw(request.reward) })}</span>
          : <Tag tone={request.status === 'MATCHED' ? 'progress' : 'neutral'}>{t(`req.status.${request.status}` as Key)}</Tag>}
      </div>
    </Link>
  );
}

export function OrderRow({ order }: { order: Order }) {
  const { t, lang } = useI18n();
  const other = order.myRole === 'BUYER' ? order.traveler.name : order.buyer.name;
  return (
    <Link to={`/orders/${order.id}`} className="row">
      <ProductThumb src={order.imageUrl} category={order.category} />
      <div className="row-body">
        <div className="row-title">
          {order.productName}
          {order.quantity > 1 && <span className="qty"> × {order.quantity}</span>}
        </div>
        <div className="row-meta">
          <span>{firstName(other)}</span>
          <span>{dateTime(order.createdAt, lang)}</span>
          {order.unreadMessages > 0 && <span className="chat-unread">{t('chat.unread', { n: order.unreadMessages })}</span>}
        </div>
        <div className="row-next">
          <StatusBadge status={order.status} />
          <span>{t(`next.${order.myRole === 'BUYER' ? 'b' : 't'}.${order.status}` as Key)}</span>
        </div>
      </div>
      <ChevronRight size={18} className="row-chevron" aria-hidden />
    </Link>
  );
}

export function OrderHero({ order }: { order: Order }) {
  const { t, lang } = useI18n();
  const route = useRoute();
  const buyer = order.myRole === 'BUYER';
  return (
    <div className="order-hero">
      <span className="pill">{t(`st.${order.status}` as Key)}</span>
      <h1 className="font-display">
        {order.productName}{order.quantity > 1 ? ` × ${order.quantity}` : ''}
      </h1>
      <div className="route-line">
        <Code>CP-{String(order.id).padStart(5, '0')}</Code>
        <span>{route(null, order.countryCode)}</span>
        {order.expectedDelivery && <span>{shortDate(order.expectedDelivery, lang)}</span>}
      </div>
      <div className="route-line">
        <Avatar size={26} name={(buyer ? order.traveler : order.buyer).name} src={(buyer ? order.traveler : order.buyer).avatarUrl} />
        <span>{buyer ? t('order.traveler') : t('order.buyer')} {firstName(buyer ? order.traveler.name : order.buyer.name)}</span>
      </div>
    </div>
  );
}

type Line = { label: string; value: number; note?: string; muted?: boolean };

export function ReceiptStrip({ quote, budgetLabel, note, extra }: {
  quote: Quote; budgetLabel?: string; note?: string; extra?: Line[];
}) {
  const { t } = useI18n();
  const lines: Line[] = [
    { label: budgetLabel ?? t('price.itemEstimate'), value: quote.budget },
    { label: t('price.reward'), value: quote.reward },
    { label: t('price.fee'), value: quote.fee },
  ];
  return (
    <div className="receipt-strip">
      <div className="receipt-lines">
        {lines.map((l) => <ReceiptLine key={l.label} {...l} />)}
      </div>
      <div className="receipt-total">
        <span>{t('price.total')}</span>
        <strong>{krw(quote.total)}</strong>
      </div>
      {extra && extra.length > 0 && (
        <div className="receipt-extra">{extra.map((l) => <ReceiptLine key={l.label} {...l} />)}</div>
      )}
      {note && <p className="receipt-note">{note}</p>}
    </div>
  );
}

export function ReceiptLine({ label, value, note, muted, strong }: Line & { strong?: boolean }) {
  return (
    <div className={`receipt-line ${muted ? 'is-muted' : ''} ${strong ? 'is-strong' : ''}`}>
      <span className="receipt-label">{label}{note && <small>{note}</small>}</span>
      <span className="receipt-value">{krw(value)}</span>
    </div>
  );
}

export function StatusTimeline({ order }: { order: Order }) {
  const { t, lang } = useI18n();
  const overBudget = order.extraItemAmount > 0;
  type Step = { id: string; label: string; waiting?: string; at: string | null; done: boolean; current?: boolean; bad?: boolean };
  const steps: Step[] = [
    { id: 'created', label: t('tl.created'), at: order.createdAt, done: true },
    {
      id: 'paid', label: order.status === 'PAYMENT_FAILED' ? t('tl.payFailed') : t('tl.paid'),
      waiting: t('tl.paid.waiting'), at: order.paidAt, done: !!order.paidAt, bad: order.status === 'PAYMENT_FAILED',
    },
  ];
  if (overBudget) {
    steps.push({
      id: 'approval', label: t('tl.over', { amount: krw(order.extraItemAmount) }),
      waiting: t('tl.over.waiting', { amount: krw(order.extraItemAmount) }), at: null,
      done: order.status !== 'AWAITING_APPROVAL', current: order.status === 'AWAITING_APPROVAL',
    });
  }
  steps.push(
    { id: 'purchased', label: t('tl.purchased'), waiting: t('tl.purchased.waiting'), at: order.purchasedAt, done: !!order.purchasedAt },
    { id: 'delivered', label: t('tl.delivered'), waiting: t('tl.delivered.waiting'), at: order.deliveredAt, done: !!order.deliveredAt },
    { id: 'settled', label: t('tl.settled'), waiting: t('tl.settled.waiting'), at: order.settledAt ?? order.completedAt, done: !!order.settledAt },
  );

  let shown: Step[];
  if (order.status === 'CANCELLED') {
    shown = [...steps.filter((s) => s.done), { id: 'cancelled', label: t('tl.cancelled'), at: order.cancelledAt, done: true, bad: true }];
  } else {
    const firstOpen = steps.findIndex((s) => !s.done);
    shown = steps.map((s, i) => ({ ...s, current: s.current || i === firstOpen }));
  }
  return (
    <ol className="timeline">
      {shown.map((s) => (
        <li key={s.id} className={`timeline-item ${s.bad ? 'is-bad' : s.done ? 'is-done' : s.current ? 'is-current' : ''}`}>
          <span className="timeline-dot" aria-hidden />
          <span className="timeline-label">
            {s.current && !s.done && !s.bad ? (s.waiting ?? s.label) : s.label}
            {s.current && !s.done && !s.bad && <span className="timeline-now">{t('tl.now')}</span>}
          </span>
          {s.at && <span className="timeline-at">{dateTime(s.at, lang)}</span>}
        </li>
      ))}
    </ol>
  );
}
