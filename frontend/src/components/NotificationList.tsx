import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, NotifAccepted, NotifBooked, NotifCancelled, NotifDelivered, NotifExtraPaid, NotifMessage,
  NotifOverBudget, NotifPaid, NotifPurchased, NotifRejected, NotifSettled, type Icon,
} from './icons';
import { api, type Notification, type NotificationKind, type Order } from '../api';
import { krw } from '../format';
import { useI18n, type Key, type T } from '../i18n';
import { useSession } from '../session';
import { firstName } from './cards';
import { Avatar, Empty, ErrorBox, Loading, ProductThumb } from './ui';

/* Instagram-style activity feed: filter chips, time sections, avatar + bold sentence + short time, thumbnail on the right. */

type Filter = 'all' | 'pay' | 'delivery' | 'chat' | 'issues';
const FILTERS: Record<Exclude<Filter, 'all'>, NotificationKind[]> = {
  pay: ['BOOKED', 'REQUEST_ACCEPTED', 'PAID', 'EXTRA_PAID', 'SETTLED', 'AUTO_CONFIRMED', 'RESOLVED'],
  delivery: ['PURCHASED', 'DELIVERED'],
  chat: ['MESSAGE'],
  issues: ['OVER_BUDGET', 'REJECTED', 'CANCELLED', 'REPORTED'],
};

const KIND_ICON: Record<NotificationKind, { icon: Icon; tone: 'neutral' | 'good' | 'warn' | 'bad' }> = {
  BOOKED: { icon: NotifBooked, tone: 'neutral' },
  REQUEST_ACCEPTED: { icon: NotifAccepted, tone: 'good' },
  PAID: { icon: NotifPaid, tone: 'good' },
  PURCHASED: { icon: NotifPurchased, tone: 'neutral' },
  OVER_BUDGET: { icon: NotifOverBudget, tone: 'warn' },
  DELIVERED: { icon: NotifDelivered, tone: 'neutral' },
  REJECTED: { icon: NotifRejected, tone: 'bad' },
  SETTLED: { icon: NotifSettled, tone: 'good' },
  CANCELLED: { icon: NotifCancelled, tone: 'bad' },
  EXTRA_PAID: { icon: NotifExtraPaid, tone: 'good' },
  MESSAGE: { icon: NotifMessage, tone: 'neutral' },
  REPORTED: { icon: NotifRejected, tone: 'bad' },
  RESOLVED: { icon: NotifSettled, tone: 'good' },
  AUTO_CONFIRMED: { icon: NotifSettled, tone: 'good' },
};

/** A feed row: one notification, or several consecutive messages from the same order folded together. */
type Item = { n: Notification; count: number; unread: boolean };

const A = '\u0001A\u0001';
const P = '\u0001P\u0001';

/** Builds the sentence with the person's name and the product in bold. */
function sentence(item: Item, t: T): ReactNode {
  const { n, count } = item;
  if (!n.kind) return n.message;
  const key = n.kind === 'MESSAGE' && count > 1 ? 'n.MESSAGE_MANY' : `n.${n.kind}`;
  const text = t(key as Key, {
    actor: n.actorName ? A : '',
    product: n.productName ? P : '',
    n: count,
    amount: n.kind === 'BOOKED' ? n.amount : n.amount == null ? '' : krw(n.amount),
  });
  return text.split(/(\u0001[AP]\u0001)/).map((part, i) =>
    part === A ? <b key={i}>{firstName(n.actorName ?? '')}</b>
      : part === P ? <b key={i}>{n.productName}</b>
        : <Fragment key={i}>{part}</Fragment>);
}

function ago(iso: string, t: T): string {
  const min = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return t('n.t.now');
  if (min < 60) return t('n.t.m', { n: min });
  if (min < 60 * 24) return t('n.t.h', { n: Math.floor(min / 60) });
  if (min < 60 * 24 * 7) return t('n.t.d', { n: Math.floor(min / 1440) });
  return t('n.t.w', { n: Math.floor(min / 10080) });
}

function section(iso: string): 'today' | 'week' | 'month' | 'earlier' {
  const d = new Date(iso);
  const start = new Date(); start.setHours(0, 0, 0, 0);
  if (d >= start) return 'today';
  const days = (start.getTime() - d.getTime()) / 86400000;
  if (days < 7) return 'week';
  if (days < 30) return 'month';
  return 'earlier';
}

export function NotificationList() {
  const { refreshMe } = useSession();
  const { t } = useI18n();
  const [filter, setFilter] = useState<Filter>('all');
  const list = useQuery({ queryKey: ['notifications'], queryFn: api.notifications });
  const buying = useQuery({ queryKey: ['myOrders', 'buyer'], queryFn: () => api.myOrders('buyer') });
  const carrying = useQuery({ queryKey: ['myOrders', 'traveler'], queryFn: () => api.myOrders('traveler') });

  useEffect(() => {
    if (!list.data?.some((n) => !n.read)) return;
    api.readAllNotifications().then(refreshMe).catch(() => {});
  }, [list.data, refreshMe]);

  const ordersById = useMemo(() => {
    const map = new Map<number, Order>();
    [...(buying.data ?? []), ...(carrying.data ?? [])].forEach((o) => map.set(o.id, o));
    return map;
  }, [buying.data, carrying.data]);

  const groups = useMemo(() => {
    const items: Item[] = [];
    for (const n of list.data ?? []) {
      if (filter !== 'all' && !(n.kind && FILTERS[filter].includes(n.kind))) continue;
      const prev = items[items.length - 1];
      if (prev && n.kind === 'MESSAGE' && prev.n.kind === 'MESSAGE' && prev.n.orderId === n.orderId
        && section(prev.n.createdAt) === section(n.createdAt)) {
        prev.count += 1;
        prev.unread ||= !n.read;
        continue;
      }
      items.push({ n, count: 1, unread: !n.read });
    }
    const out: { key: ReturnType<typeof section>; items: Item[] }[] = [];
    for (const it of items) {
      const key = section(it.n.createdAt);
      const last = out[out.length - 1];
      if (last?.key === key) last.items.push(it); else out.push({ key, items: [it] });
    }
    return out;
  }, [list.data, filter]);

  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorBox error={list.error} onRetry={() => list.refetch()} />;
  if (!list.data?.length) return <Empty icon={Bell} title={t('n.empty')} />;

  return (
    <div className="nt">
      <div className="nt-chips" role="group" aria-label={t('n.title')}>
        {(['all', 'pay', 'delivery', 'chat', 'issues'] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{t(`n.f.${f}`)}</button>
        ))}
      </div>

      {groups.length === 0 && <p className="nt-empty">{t('n.f.empty')}</p>}

      {groups.map((g) => (
        <section key={g.key} className="nt-group">
          <h3 className="nt-group-title">{t(`n.g.${g.key}`)}</h3>
          <ul className="nt-list">
            {g.items.map((item) => <Row key={item.n.id} item={item} order={item.n.orderId != null ? ordersById.get(item.n.orderId) : undefined} />)}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ item, order }: { item: Item; order?: Order }) {
  const { t } = useI18n();
  const { n } = item;
  const { icon: KindIcon, tone } = (n.kind && KIND_ICON[n.kind]) || { icon: Bell, tone: 'neutral' as const };
  const chat = n.kind === 'MESSAGE';
  const href = n.orderId == null ? null : chat ? `/orders/${n.orderId}/chat` : `/orders/${n.orderId}`;
  const person = order ? (order.myRole === 'BUYER' ? order.traveler : order.buyer) : null;

  const body = (
    <>
      <span className="nt-avatar">
        <Avatar size={44} name={n.actorName ?? person?.name ?? '?'} src={person?.avatarUrl} />
        <span className={`nt-kind is-${tone}`} aria-hidden><KindIcon size={12} /></span>
      </span>
      <span className="nt-text">
        {sentence(item, t)} <span className="nt-ago">{ago(n.createdAt, t)}</span>
      </span>
      {chat
        ? <span className="nt-action">{t('n.reply')}</span>
        : order && <span className="nt-thumb"><ProductThumb src={order.imageUrl} category={order.category} size={44} /></span>}
    </>
  );
  return (
    <li className={item.unread ? 'is-unread' : ''}>
      {href ? <Link to={href} className="nt-row">{body}</Link> : <div className="nt-row">{body}</div>}
    </li>
  );
}
