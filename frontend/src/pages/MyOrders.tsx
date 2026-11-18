import { Link, NavLink, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ClipboardList, MessageCircle, Package, Plus } from '../components/icons';
import { api, type Order, type PurchaseRequest } from '../api';
import { firstName, useRoute } from '../components/cards';
import { Screen } from '../components/Layout';
import { Avatar, Empty, ErrorBox, Loading, ProductThumb, StatusBadge, Tag } from '../components/ui';
import { krw, shortDate } from '../format';
import { useI18n, type Key } from '../i18n';

const DONE = new Set(['COMPLETED', 'SETTLED']);

type Tab = 'all' | 'active' | 'done' | 'cancelled' | 'requests';

const orderNo = (id: number) => `CP-${String(id).padStart(5, '0')}`;

export default function MyOrders({ role }: { role: 'buyer' | 'traveler' }) {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const buyer = role === 'buyer';
  const orders = useQuery({ queryKey: ['myOrders', role], queryFn: () => api.myOrders(role) });
  const requests = useQuery({ queryKey: ['myRequests'], queryFn: api.myRequests, enabled: buyer });

  const all = orders.data ?? [];
  const groups: Record<Exclude<Tab, 'requests'>, Order[]> = {
    all,
    active: all.filter((o) => !DONE.has(o.status) && o.status !== 'CANCELLED'),
    done: all.filter((o) => DONE.has(o.status)),
    cancelled: all.filter((o) => o.status === 'CANCELLED'),
  };
  const tabs: { key: Tab; count?: number }[] = [
    { key: 'all' },
    { key: 'active', count: groups.active.length },
    { key: 'done' },
    { key: 'cancelled' },
  ];
  if (buyer) tabs.push({ key: 'requests', count: requests.data?.filter((r) => r.status === 'OPEN').length });
  const asked = params.get('tab') as Tab | null;
  const tab: Tab = asked && tabs.some((x) => x.key === asked) ? asked : 'all';
  const pick = (key: Tab) => setParams({ tab: key }, { replace: true });

  return (
    <Screen>
      <div className="ob-layout">
        <aside className="ob-side" aria-label={t('ob.title')}>
          {(['buyer', 'traveler'] as const).map((r) => (
            <div key={r} className="ob-side-group">
              <NavLink to={r === 'buyer' ? '/orders' : '/t/orders'} end className="ob-side-head">
                {t(r === 'buyer' ? 'orders.buying' : 'orders.carrying')}
              </NavLink>
              {r === role && (
                <ul>
                  {tabs.map((x) => (
                    <li key={x.key}>
                      <button type="button" aria-current={tab === x.key} onClick={() => pick(x.key)}>
                        {t(`orders.tab.${x.key}`)}
                        {!!x.count && <span className="ob-count">{x.count}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </aside>

        <section className="ob-main">
          <header className="ob-head">
            <h1>{buyer ? t('ob.title') : t('orders.travelerTitle')}</h1>
            {buyer && <Link to="/requests/new" className="ob-new"><Plus size={16} aria-hidden /> {t('bd.new')}</Link>}
          </header>

          <div className="ob-tabs" role="tablist">
            {tabs.map((x) => (
              <button key={x.key} type="button" role="tab" aria-selected={tab === x.key} onClick={() => pick(x.key)}>
                {t(`orders.tab.${x.key}`)}
                {!!x.count && <span className="ob-count">{x.count}</span>}
              </button>
            ))}
          </div>

          {tab !== 'requests' ? (
            <>
              {orders.isLoading && <Loading />}
              {orders.error && <ErrorBox error={orders.error} onRetry={() => orders.refetch()} />}
              {orders.data && groups[tab].length === 0 && (
                <Empty icon={Package} title={tab === 'active' ? t('orders.emptyActive') : t('orders.empty')}>
                  {buyer && <Link to="/" className="btn btn-primary">{t('orders.find')}</Link>}
                  {!buyer && <Link to="/t/requests" className="btn btn-primary">{t('orders.seeRequests')}</Link>}
                </Empty>
              )}
              {orders.data && groups[tab].length > 0 && (
                <>
                  <div className="ob-list">{groups[tab].map((o) => <OrderCard key={o.id} order={o} />)}</div>
                  <p className="ob-end">{t('ob.noMore')}</p>
                </>
              )}
            </>
          ) : (
            <>
              {requests.isLoading && <Loading />}
              {requests.error && <ErrorBox error={requests.error} />}
              {requests.data?.length === 0 && (
                <Empty icon={ClipboardList} title={t('orders.noRequests')}>
                  <Link to="/requests/new" className="btn btn-primary">{t('home.requestCta')}</Link>
                </Empty>
              )}
              {!!requests.data?.length && (
                <>
                  <div className="ob-list">{requests.data.map((r) => <RequestTicket key={r.id} request={r} />)}</div>
                  <p className="ob-end">{t('ob.noMore')}</p>
                </>
              )}
            </>
          )}
        </section>
      </div>
    </Screen>
  );
}

function OrderCard({ order }: { order: Order }) {
  const { t, lang } = useI18n();
  const route = useRoute();
  const buyer = order.myRole === 'BUYER';
  const other = buyer ? order.traveler : order.buyer;
  const to = `/orders/${order.id}`;
  return (
    <article className="ob-card">
      <div className="ob-card-top">
        <Package size={18} aria-hidden />
        <span>{t('ob.orderNo')} <b>{orderNo(order.id)}</b></span>
        <span className="ob-sep" aria-hidden />
        <span>{t('ob.ordered', { date: shortDate(order.createdAt, lang) })}</span>
        <span className="ob-status"><StatusBadge status={order.status} /></span>
      </div>

      <div className="ob-card-body">
        <Link to={to} className="ob-thumb" tabIndex={-1} aria-hidden>
          <ProductThumb src={order.imageUrl} category={order.category} size={132} />
        </Link>
        <div className="ob-card-main">
          <div className="ob-title-row">
            <h3><Link to={to}>{order.productName}{order.quantity > 1 ? ` × ${order.quantity}` : ''}</Link></h3>
            <strong className="ob-price">{krw(order.initialCharge + order.extraCharge)}</strong>
          </div>
          <dl className="ob-facts">
            <div>
              <dt>{route(null, order.countryCode)}</dt>
              <dd>{order.expectedDelivery ? t('ob.arrives', { date: shortDate(order.expectedDelivery, lang) }) : t('ob.noDate')}</dd>
            </div>
            <div>
              <dt>{buyer ? t('order.traveler') : t('order.buyer')}</dt>
              <dd className="ob-person"><Avatar size={22} name={other.name} src={other.avatarUrl} /> {firstName(other.name)}</dd>
            </div>
            <div>
              <dt>{t(`st.${order.status}` as Key)}</dt>
              <dd>{t(`next.${buyer ? 'b' : 't'}.${order.status}` as Key)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="ob-card-foot">
        {order.unreadMessages > 0 ? <span className="ob-note">{t('chat.unread', { n: order.unreadMessages })}</span> : <span />}
        <div className="ob-actions">
          <Link to={`${to}/chat`} className="ob-btn"><MessageCircle size={16} aria-hidden /> {t('ob.chat')}</Link>
          <Link to={to} className="ob-btn is-solid">{t('ob.view')}</Link>
        </div>
      </div>
    </article>
  );
}

function RequestTicket({ request }: { request: PurchaseRequest }) {
  const { t, lang } = useI18n();
  const route = useRoute();
  const to = request.orderId ? `/orders/${request.orderId}` : `/my-requests/${request.id}`;
  return (
    <article className="ob-card">
      <div className="ob-card-top">
        <ClipboardList size={18} aria-hidden />
        <span>{t('ob.requestNo')} <b>R-{String(request.id).padStart(5, '0')}</b></span>
        <span className="ob-sep" aria-hidden />
        <span>{t('ob.posted', { date: shortDate(request.createdAt, lang) })}</span>
        <span className="ob-status">
          <Tag tone={request.status === 'OPEN' ? 'progress' : 'neutral'}>{t(`req.status.${request.status}` as Key)}</Tag>
        </span>
      </div>

      <div className="ob-card-body">
        <Link to={to} className="ob-thumb" tabIndex={-1} aria-hidden>
          <ProductThumb src={request.imageUrl} size={132} />
        </Link>
        <div className="ob-card-main">
          <div className="ob-title-row">
            <h3><Link to={to}>{request.productName}</Link></h3>
            <strong className="ob-price">{krw(request.maxBudget)}</strong>
          </div>
          <dl className="ob-facts">
            <div>
              <dt>{route(null, request.countryCode)}</dt>
              <dd>{t('orders.by', { date: shortDate(request.deadline, lang) })}</dd>
            </div>
            <div>
              <dt>{t('rb.yourReward')}</dt>
              <dd>{krw(request.reward)}</dd>
            </div>
            {request.traveler && (
              <div>
                <dt>{t('order.traveler')}</dt>
                <dd className="ob-person"><Avatar size={22} name={request.traveler.name} src={request.traveler.avatarUrl} /> {firstName(request.traveler.name)}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="ob-card-foot">
        <span />
        <div className="ob-actions">
          <Link to={to} className="ob-btn is-solid">{request.orderId ? t('ob.view') : t('rb.view')}</Link>
        </div>
      </div>
    </article>
  );
}
