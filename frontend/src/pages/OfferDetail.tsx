import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Calendar, Minus, Plane, Plus, Receipt } from '../components/icons';
import { api, assetUrl } from '../api';
import { firstName, ReceiptStrip } from '../components/cards';
import { DetailLayout, Screen } from '../components/Layout';
import { Avatar, ErrorBox, Loading, Modal, Notice, ProductPhoto, Tag } from '../components/ui';
import { countryName, daysUntil, krw, quote, shortDate, weight, money } from '../format';
import { useErrorText, useI18n, type Key } from '../i18n';
import { useSession } from '../session';
import { useConfirm } from '../components/confirm';
import { usePayment } from '../components/payment';

export default function OfferDetail() {
  const id = Number(useParams().id);
  const { config, user } = useSession();
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const navigate = useNavigate();
  const offer = useQuery({ queryKey: ['offer', id], queryFn: () => api.offer(id) });
  const ask = useConfirm();
  const [qty, setQty] = useState(1);
  const location = useLocation();
  const flags = location.state as { posted?: boolean; edited?: boolean } | null;
  const [posted, setPosted] = useState(() => !!flags?.posted);
  const [edited, setEdited] = useState(() => !!flags?.edited);
  const closePosted = () => { setPosted(false); setEdited(false); navigate(location.pathname, { replace: true, state: null }); };

  const payment = usePayment(undefined, { onCancel: (orderId) => navigate(`/orders/${orderId}/pay`) });
  const book = useMutation({
    mutationFn: () => api.book(id, qty),
    onSuccess: (order) => payment.start(() => api.preparePayment(order.id), order.id),
  });

  if (offer.isLoading) return <Screen back title={t('offer.title')}><Loading /></Screen>;
  if (offer.error || !offer.data) return <Screen back title={t('offer.title')}><ErrorBox error={offer.error} /></Screen>;

  const o = offer.data;
  const mine = user?.id === o.traveler.id;
  const q = quote(config, o.estPrice * qty, o.reward * qty);
  const local = o.priceLocal != null && o.priceCurrency && o.priceCurrency !== 'KRW' ? { amount: Number(o.priceLocal), currency: o.priceCurrency } : null;
  const closesIn = daysUntil(o.trip.returnDate) - 1;
  const country = countryName(config, o.countryCode, lang);

  return (
    <Screen back title={country} hideNav wide>
      <DetailLayout
        actions={(
          <>
          {mine ? (
            <button className="btn btn-quiet btn-block" onClick={() => navigate(`/t/offers/${o.id}/edit`)}>{t('offer.mine')}</button>
          ) : (
            <button className="btn btn-primary btn-block btn-tall btn-split" disabled={!o.bookable || book.isPending || payment.busy} onClick={async () => (await ask({
                title: o.productName,
                message: t('offer.bookConfirm', { total: krw(q.total) }),
                mood: 'love', okLabel: t('offer.bookConfirmOk'),
              })) && book.mutate()}>
              <span>{book.isPending || payment.busy ? t('offer.booking') : o.bookable ? t('offer.book', { n: qty }) : t('offer.unavailable')}</span>
              {o.bookable && <span className="btn-amount">{krw(q.total)} <ArrowRight size={15} style={{ verticalAlign: -2 }} /></span>}
            </button>
          )}
          </>
        )}
        aside={(
            <section className="summary-card">
              <div className="summary-head">
                <h2>{t('offer.summary')}</h2>
              </div>
              <div className="od-price-stub">
                <small>{o.receiptUrl ? t('offer.boughtPrice') : t('offer.estPrice')}</small>
                <strong>{o.priceLocal != null && o.priceCurrency ? money(Number(o.priceLocal), o.priceCurrency) : krw(o.estPrice)}</strong>
                {o.priceLocal != null && o.priceCurrency && <span className="od-fact-sub">{lang === 'ko' ? '약 ' : '≈ '}{krw(o.estPrice)}</span>}
              </div>
              <ReceiptStrip quote={q}
                budgetLabel={t(o.receiptUrl ? 'price.itemPaid' : 'price.itemEstimate')}
                budgetNote={t('price.unitTimes', { price: local ? money(local.amount, local.currency) : krw(o.estPrice), n: qty })} />
              <ul className="od-facts-list">
                <li>
                  <Calendar size={20} aria-hidden />
                  <div>
                    <b>{o.bookable ? t('offer.arriveBy', { date: shortDate(o.trip.returnDate, lang) }) : t('offer.notBookable')}</b>
                    <span>{o.bookable ? t('offer.arriveSub', { name: firstName(o.traveler.name) }) : t('offer.tipClosed')}</span>
                  </div>
                </li>
                <li className="is-good">
                  <Receipt size={20} aria-hidden />
                  <div>
                    <b>{o.receiptUrl ? t('offer.policyBought') : t('offer.policyReceipt')}</b>
                    <span>{o.receiptUrl ? t('offer.boughtNote') : t('offer.policyReceiptSub')}</span>
                  </div>
                </li>
              </ul>
              {o.receiptUrl && (
                <a className="link small" href={assetUrl(o.receiptUrl) ?? '#'} target="_blank" rel="noreferrer" style={{ marginTop: 12 }}>
                  {t('offer.seeReceipt')}
                </a>
              )}
            </section>
        )}
      >
        <div className="od-top">
          <div className="detail-media od-photo">
            <ProductPhoto src={o.imageUrl} category={o.category} iconSize={56} />
          </div>
          <div className="od-top-text">
            <h1 className="detail-title font-display">{o.productName}</h1>
            <p className="od-meta">{o.category ? `${t(`cat.${o.category}` as Key)} · ${country}` : country}</p>
            {o.bookable && !mine && (
              <div className="od-qty">
                <span>{t('offer.qty')}</span>
                <div className="stepper" aria-label={t('offer.qty')}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} disabled={qty <= 1} aria-label={t('offer.fewer')}><Minus size={15} /></button>
                  <span>{qty}</span>
                  <button onClick={() => setQty(Math.min(o.quantity, qty + 1))} disabled={qty >= o.quantity} aria-label={t('offer.more')}><Plus size={15} /></button>
                </div>
              </div>
            )}
          </div>
        </div>

        <section className="od-pass" aria-label={t('offer.trip')}>
          <div className="od-pass-main">
            <div className="od-pass-head">
              <Avatar name={o.traveler.name} src={o.traveler.avatarUrl} />
              <div className="od-pass-who">
                <small>{t('pass.carrier')}</small>
                <p>{firstName(o.traveler.name)}</p>
              </div>
              <div className="od-pass-tags">
                {o.receiptUrl && <Tag tone="good">{t('offer.bought')}</Tag>}
                {!o.bookable && <Tag>{o.status === 'SOLD_OUT' ? t('offer.soldOut') : t('offer.closed')}</Tag>}
                {o.bookable && closesIn <= 7 && <Tag tone="action">{closesIn <= 0 ? t('offer.closesToday') : t('offer.closesIn', { n: closesIn })}</Tag>}
              </div>
            </div>
            <div className="od-pass-route">
              <div>
                <small>{t('pass.from')}</small>
                <strong>{o.trip.city ?? country}</strong>
                <span>{shortDate(o.trip.departDate, lang)} – {shortDate(o.trip.returnDate, lang)}</span>
              </div>
              <div className="od-pass-line" aria-hidden><Plane size={18} /></div>
              <div className="is-to">
                <small>{t('pass.to')}</small>
                <strong>{lang === 'ko' ? '서울' : 'Seoul'}</strong>
                <span>{t('offer.deliveryValue', { date: shortDate(o.trip.returnDate, lang) })}</span>
              </div>
            </div>
            <dl className="od-pass-fields">
              <div><dt>{t('card.reward')}</dt><dd className="is-reward">{krw(o.reward)}</dd></div>
              <div><dt>{t('offer.leftLabel')}</dt><dd>{o.quantity}</dd></div>
              {o.weightGrams != null && <div><dt>{t('w.label')}</dt><dd>{weight(o.weightGrams)}</dd></div>}
              {o.trip.luggageNote && <div className="is-wide"><dt>{t('offer.luggage')}</dt><dd>{o.trip.luggageNote}</dd></div>}
              {o.description && <div className="is-wide is-note"><dt>{t('offer.noteFrom', { name: firstName(o.traveler.name) })}</dt><dd>“{o.description}”</dd></div>}
            </dl>
          </div>
        </section>

        {book.error && <Notice tone="bad">{errText(book.error)}</Notice>}
        {payment.error && <Notice tone="bad">{payment.error}</Notice>}
      </DetailLayout>

      <Modal open={edited && mine} onClose={closePosted} title={o.productName} eyebrow={t('edited.eyebrow')} mood="happy" hideClose>
        <div className="stack posted">
          <p className="posted-msg">{t('edited.body')}</p>
          <button type="button" className="btn btn-primary btn-block" onClick={closePosted}>{t('cf.ok')}</button>
        </div>
      </Modal>
      <Modal open={posted && mine} onClose={closePosted} title={o.productName} eyebrow={t('posted.eyebrow')} mood="happy" hideClose>
        <div className="stack posted">
          <p className="posted-msg">{t('posted.body', { country, date: shortDate(o.trip.returnDate, lang) })}</p>
          <div className="posted-actions">
            <Link to="/t/offers/new" className="btn btn-quiet" onClick={() => setPosted(false)}>{t('posted.another')}</Link>
            <button type="button" className="btn btn-primary" onClick={closePosted}>{t('posted.view')}</button>
          </div>
        </div>
      </Modal>
      {payment.sheet}
    </Screen>
  );
}
