import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { firstName, ReceiptStrip, useRoute } from '../components/cards';
import { DetailLayout, Screen } from '../components/Layout';
import { usePayment } from '../components/payment';
import { Avatar, ErrorBox, Loading, Mascot, Notice, ProductThumb, Sheet, StatusBadge, type Mood } from '../components/ui';
import { krw, money, shortDate } from '../format';
import { useI18n, type Key } from '../i18n';

const STEPS: { mood: Mood; key: Key }[] = [
  { mood: 'happy', key: 'pay.s1' },
  { mood: 'fly', key: 'pay.s2' },
  { mood: 'unbox', key: 'pay.s3' },
];

export default function Checkout() {
  const id = Number(useParams().id);
  const { t, lang } = useI18n();
  const route = useRoute();
  const navigate = useNavigate();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id) });
  const payment = usePayment(id);

  if (order.isLoading) return <Screen back title={t('pay.title')}><Loading /></Screen>;
  if (order.error || !order.data) return <Screen back title={t('pay.title')}><ErrorBox error={order.error} /></Screen>;

  const o = order.data;
  const payable = o.myRole === 'BUYER' && (o.status === 'PENDING_PAYMENT' || o.status === 'PAYMENT_FAILED');
  const traveler = firstName(o.traveler.name);

  const payButton = payable ? (
    <button className="btn btn-primary btn-block btn-tall" disabled={payment.busy}
      onClick={() => payment.start(() => api.preparePayment(o.id))}>
      {payment.busy ? t('pay.opening') : t('pay.pay', { amount: krw(o.initialCharge) })}
    </button>
  ) : (
    <button className="btn btn-quiet btn-block" onClick={() => navigate(`/orders/${o.id}`)}>{t('pay.viewOrder')}</button>
  );

  return (
    <Screen back={`/orders/${o.id}`} title={t('pay.title')} hideNav wide>
      <div className="whale-say of-hello">
        <div className="whale-say-bubble">
          <p>{payable ? t('pay.hello', { name: traveler }) : t('pay.notPayable')}</p>
        </div>
      </div>

      <DetailLayout
        actions={payButton}
        aside={(
          <>
            <aside className="summary-card">
              <div className="summary-head"><h2>{t('pay.heading')}</h2></div>
              <ReceiptStrip
                quote={{ budget: o.budget, reward: o.reward, fee: o.fee, tax: o.tax, total: o.initialCharge }}
                budgetLabel={o.source === 'REQUEST' ? t('price.itemBudget') : t('price.itemEstimate')}
                budgetNote={o.currency && o.limitLocal != null
                  ? t('price.unitTimes', { price: money(Number(o.limitLocal) / Math.max(1, o.quantity), o.currency), n: o.quantity })
                  : undefined}
                note={t('pay.note')}
              />
            </aside>
            {o.status === 'PAYMENT_FAILED' && <Notice tone="bad">{t('pay.failedBefore')}</Notice>}
            {payment.error && <Notice tone="bad">{payment.error}</Notice>}
          </>
        )}
      >
        <section className="od-head">
          <ProductThumb src={o.imageUrl} category={o.category} size={104} />
          <div className="od-head-body">
            <div className="od-head-top">
              <StatusBadge status={o.status} />
              <span className="od-code">CP-{String(o.id).padStart(5, '0')}</span>
            </div>
            <h1>{o.productName}{o.quantity > 1 && <span className="qty"> × {o.quantity}</span>}</h1>
            <p className="od-meta">
              <span>{route(null, o.countryCode)}</span>
              {o.expectedDelivery && <span>{t('pay.arrives', { date: shortDate(o.expectedDelivery, lang) })}</span>}
              <span className="od-person">
                <Avatar size={20} name={o.traveler.name} src={o.traveler.avatarUrl} />
                {t('order.traveler')} {traveler}
              </span>
            </p>
          </div>
        </section>

        <Sheet title={t('pay.steps')}>
          {/* Same journey as the home page: numbered stops on a route line, a whale for each step */}
          <ol className="ask-stamp is-plain">
            {STEPS.map((s, i) => (
              <li key={s.key}>
                <span className="ask-n">{i + 1}</span>
                <Mascot mood={s.mood} className="ask-whale" size={120} />
                <div className="ask-text"><p>{t(s.key, { name: traveler })}</p></div>
              </li>
            ))}
          </ol>
        </Sheet>
      </DetailLayout>
      {payment.sheet}
    </Screen>
  );
}
