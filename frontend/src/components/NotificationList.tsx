import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell } from './icons';
import { api, type Notification } from '../api';
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
        const body = (
          <>
            <span className="notif-text">{sentence(n, t)}</span>
            <span className="notif-at">{dateTime(n.createdAt, lang)}</span>
          </>
        );
        return (
          <li key={n.id} className={n.read ? '' : 'is-unread'}>
            {n.orderId ? <Link to={`/orders/${n.orderId}`} className="notif">{body}</Link> : <div className="notif">{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}
