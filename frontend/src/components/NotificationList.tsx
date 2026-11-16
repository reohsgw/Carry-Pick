import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell, NotifAccepted, NotifBooked, NotifCancelled, NotifDelivered, NotifExtraPaid, NotifMessage,
  NotifOverBudget, NotifPaid, NotifPurchased, NotifRejected, NotifSettled, type Icon,
} from './icons';
import { api, type Notification, type NotificationKind } from '../api';
import { dateTime, krw } from '../format';
import { useI18n, type Key, type T } from '../i18n';
import { useSession } from '../session';
import { firstName } from './cards';
import { Empty, ErrorBox, Loading } from './ui';

function sentence(n: Notification, t: T): string {
  if (!n.kind) return n.message;
  return t(`n.${n.kind}` as Key, {
    actor: n.actorName ? firstName(n.actorName) : '',
    product: n.productName ?? '',
    amount: n.kind === 'BOOKED' ? n.amount : n.amount == null ? '' : krw(n.amount),
  });
}

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
};

export function NotificationList() {
  const { refreshMe } = useSession();
  const { t, lang } = useI18n();
  const list = useQuery({ queryKey: ['notifications'], queryFn: api.notifications });

  useEffect(() => {
    if (!list.data?.some((n) => !n.read)) return;
    api.readAllNotifications().then(refreshMe).catch(() => {});
  }, [list.data, refreshMe]);

  if (list.isLoading) return <Loading />;
  if (list.error) return <ErrorBox error={list.error} onRetry={() => list.refetch()} />;
  if (!list.data?.length) return <Empty icon={Bell} title={t('n.empty')} />;
  return (
    <ul className="rows notif-list">
      {list.data.map((n) => {
        const { icon: KindIcon, tone } = (n.kind && KIND_ICON[n.kind]) || { icon: Bell, tone: 'neutral' as const };
        const body = (
          <>
            <span className={`notif-icon is-${tone}`} aria-hidden><KindIcon size={18} /></span>
            <span className="notif-body">
              <span className="notif-text">{sentence(n, t)}</span>
              <span className="notif-at">{dateTime(n.createdAt, lang)}</span>
            </span>
          </>
        );
        const href = n.orderId == null ? null
          : n.kind === 'MESSAGE' ? `/orders/${n.orderId}/chat` : `/orders/${n.orderId}`;
        return (
          <li key={n.id} className={n.read ? '' : 'is-unread'}>
            {href ? <Link to={href} className="notif">{body}</Link> : <div className="notif">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}
