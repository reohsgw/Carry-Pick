import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronRight, ExternalLink, FileText, MessageCircle } from '../components/icons';
import { api, assetUrl, type Order } from '../api';
import { ReceiptLine, ReceiptStrip, StatusTimeline, firstName, useRoute } from '../components/cards';
import { Screen } from '../components/Layout';
import { usePayment } from '../components/payment';
import { ReceiptCapture } from '../components/receipt';
import { ActionBar, Avatar, ErrorBox, Field, Loading, Modal, MoneyInput, Notice, ProductThumb, Sheet, StatusBadge } from '../components/ui';
import { krw, shortDate } from '../format';
import { useErrorText, useI18n, type Key } from '../i18n';
import { useConfirm } from '../components/confirm';
import { PhotoPick } from '../components/PhotoPick';
import { AutoConfirmNote, DisputePanel, HandoverModal, HandoverProof, ReportProblem } from '../components/dispute';
import { markOrderSeen } from '../seen';

export default function OrderDetail() {
  const id = Number(useParams().id);
  const { t, lang } = useI18n();
  const route = useRoute();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id), refetchInterval: 15_000 });
  const seenStatus = order.data?.status;
  useEffect(() => { if (seenStatus) markOrderSeen({ id, status: seenStatus }); }, [id, seenStatus]);

  if (order.isLoading) return <Screen back title={t('order.title')}><Loading /></Screen>;
  if (order.error || !order.data) return <Screen back title={t('order.title')}><ErrorBox error={order.error} /></Screen>;

  const o = order.data;
  const buyer = o.myRole === 'BUYER';
  const other = buyer ? o.traveler : o.buyer;

  const extraLines = o.extraItemAmount > 0
    ? [
        { label: t('price.extra'), value: o.extraItemAmount },
        { label: t('price.extraFee'), value: o.extraFee },
      ]
    : undefined;

  return (
    <Screen back title={t('order.title')} hideNav wide>
      <div className="od-grid">
        <div className="od-main">
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
                {o.expectedDelivery && <span>{shortDate(o.expectedDelivery, lang)}</span>}
                <span className="od-person">
                  <Avatar size={20} name={other.name} src={other.avatarUrl} />
                  {buyer ? t('order.traveler') : t('order.buyer')} {firstName(other.name)}
                </span>
              </p>
              <p className="od-next">{t(`next.${buyer ? 'b' : 't'}.${o.status}` as Key)}</p>
              {(o.productLink || o.options) && (
                <p className="od-extra">
                  {o.options && <span>{t('order.options')}: {o.options}</span>}
                  {o.productLink && (
                    <a className="link small" href={o.productLink} target="_blank" rel="noreferrer">
                      {t('order.link')} <ExternalLink size={14} aria-hidden />
                    </a>
                  )}
                </p>
              )}
            </div>
          </section>

          <DisputePanel order={o} />

          <Sheet title={t('order.progress')}>
            <StatusTimeline order={o} />
          </Sheet>

          <HandoverProof order={o} />

          {o.priceTagUrl && (
            <Sheet title={t('pc.tag')} aside={<span className="amount">{krw(o.quotedPrice)}</span>}>
              <a href={assetUrl(o.priceTagUrl) ?? '#'} target="_blank" rel="noreferrer" className="receipt-photo">
                <img src={assetUrl(o.priceTagUrl) ?? ''} alt={t('pc.tag')} />
              </a>
            </Sheet>
          )}

          {o.receiptUrl && (
            <Sheet title={t('order.receipt')} aside={<span className="amount">{krw(o.actualPrice)}</span>}>
              <a href={assetUrl(o.receiptUrl) ?? '#'} target="_blank" rel="noreferrer" className="receipt-photo">
                {o.receiptUrl.endsWith('.pdf')
                  ? <span className="link"><FileText size={18} aria-hidden /> {t('order.receiptPdf')}</span>
                  : <img src={assetUrl(o.receiptUrl) ?? ''} alt={t('order.receipt')} />}
              </a>
            </Sheet>
          )}

        </div>
        <div className="od-side">
          <Link to={`/orders/${o.id}/chat`} className="status-strip chat-link">
            <MessageCircle size={20} aria-hidden />
            <span className="grow">
              <b>{t('chat.open', { name: firstName(buyer ? o.traveler.name : o.buyer.name) })}</b>
              <small>{t('chat.openHint')}</small>
            </span>
            {o.unreadMessages > 0 && <span className="dot is-inline">{o.unreadMessages > 9 ? '9+' : o.unreadMessages}</span>}
            <ChevronRight size={18} className="row-chevron" aria-hidden />
          </Link>

          <aside className="summary-card">
            <div className="summary-head"><h2>{buyer ? t('order.amountsBuyer') : t('order.amountsTraveler')}</h2></div>
            <ReceiptStrip
              quote={{ budget: o.budget, reward: o.reward, fee: o.fee, tax: o.tax, total: o.initialCharge }}
              budgetLabel={o.source === 'REQUEST' ? t('price.itemBudget') : t('price.itemEstimate')}
              extra={extraLines}
            />
            {o.extraItemAmount > 0 && (
              <ReceiptLine label={t('price.extraTotal')} value={o.extraCharge} strong />
            )}
            {o.actualPrice != null && !o.settlement && o.actualPrice < o.itemLimit && (
              <div className="settle">
                <ReceiptLine label={t('price.refundDue')} value={o.itemLimit - o.actualPrice} />
                <p className="receipt-note">{t('price.refundDueNote')}</p>
              </div>
            )}
            {o.settlement && (
              <div className="settle">
                <ReceiptLine label={t('price.payout')} value={o.settlement.travelerPayout} />
                <ReceiptLine label={t('price.refund')} value={o.settlement.buyerRefund} />
              </div>
            )}
          </aside>

          <AutoConfirmNote order={o} />
          {buyer ? <BuyerActions order={o} /> : <TravelerActions order={o} />}
          <ReportProblem order={o} />
        </div>
      </div>
    </Screen>
  );
}

function BuyerActions({ order: o }: { order: Order }) {
  const ask = useConfirm();
  const { t } = useI18n();
  const errText = useErrorText();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const payment = usePayment(o.id);
  const [approvalOpen, setApprovalOpen] = useState(o.status === 'AWAITING_APPROVAL');
  const refresh = () => qc.invalidateQueries();

  const confirm = useMutation({ mutationFn: () => api.confirmReceived(o.id), onSuccess: refresh });
  const [rejectStep, setRejectStep] = useState(false);
  const reject = useMutation({ mutationFn: (reopen: boolean) => api.reject(o.id, reopen), onSuccess: () => { setApprovalOpen(false); setRejectStep(false); refresh(); } });
  const cancel = useMutation({ mutationFn: () => api.cancelOrder(o.id), onSuccess: refresh });
  const err = confirm.error ?? reject.error ?? cancel.error;

  const canCancel = ['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'AWAITING_APPROVAL'].includes(o.status);
  const paid = o.status === 'PAID' || o.status === 'AWAITING_APPROVAL';

  return (
    <>
      {err && <Notice tone="bad">{errText(err)}</Notice>}
      {payment.error && <Notice tone="bad">{payment.error}</Notice>}
      {canCancel && (
        <button className="link danger center-block" disabled={cancel.isPending}
          onClick={async () => (await ask({ message: t('order.cancelConfirm') + (paid ? `\n${t('order.cancelRefund')}` : ''), mood: 'alert', danger: true })) && cancel.mutate()}>
          {t('order.cancel')}
        </button>
      )}

      <ActionBar>
        {(o.status === 'PENDING_PAYMENT' || o.status === 'PAYMENT_FAILED') && (
          <button className="btn btn-primary btn-block btn-tall" onClick={() => navigate(`/orders/${o.id}/pay`)}>
            {o.status === 'PAYMENT_FAILED' ? t('pay.tryAgain') : t('pay.pay', { amount: krw(o.initialCharge) })}
          </button>
        )}
        {o.status === 'AWAITING_APPROVAL' && (
          <button className="btn btn-primary btn-block btn-tall" onClick={() => setApprovalOpen(true)}>{t('order.reviewPrice')}</button>
        )}
        {o.status === 'DELIVERED' && (
          <button className="btn btn-primary btn-block btn-tall" disabled={confirm.isPending}
            onClick={async () => (await ask({ message: t('order.receivedConfirm'), mood: 'unbox' })) && confirm.mutate()}>
            {confirm.isPending ? t('order.confirming') : t('order.received')}
          </button>
        )}
        {['PAID', 'PURCHASED', 'DISPUTED', 'COMPLETED', 'SETTLED', 'CANCELLED'].includes(o.status) && (
          <Link to="/orders" className="btn btn-quiet btn-block">{t('order.backToOrders')}</Link>
        )}
      </ActionBar>

      <Modal open={approvalOpen && o.status === 'AWAITING_APPROVAL'} onClose={() => { setApprovalOpen(false); setRejectStep(false); }} title={t('order.approvalTitle')} eyebrow={t('st.AWAITING_APPROVAL')}>
        <div className="stack">
          <div className="compare">
            <div><span>{t('order.yourBudget')}</span><strong>{krw(o.budget)}</strong></div>
            <div><span>{t('order.actualPrice')}</span><strong className="danger">{krw(o.quotedPrice)}</strong></div>
          </div>
          {o.priceTagUrl && <img className="receipt-small" src={assetUrl(o.priceTagUrl) ?? ''} alt={t('pc.tag')} />}
          <p className="body-text">{t('order.approvalBody', { extra: krw(o.extraItemAmount), fee: krw(o.extraFee) })}</p>
          <button className="btn btn-primary btn-block btn-tall" disabled={payment.busy}
            onClick={() => { setApprovalOpen(false); payment.start(() => api.approve(o.id)); }}>
            {t('order.approve', { amount: krw(o.extraCharge) })}
          </button>
          {!rejectStep ? (
            <button className="btn btn-quiet btn-block danger" disabled={reject.isPending}
              onClick={() => (o.source === 'REQUEST' ? setRejectStep(true) : reject.mutate(false))}>
              {t('order.reject')}
            </button>
          ) : (
            <div className="reject-choice stack">
              <p className="body-text"><b>{t('order.reopenTitle')}</b><br />{t('order.reopenBody', { name: o.traveler.name })}</p>
              <button className="btn btn-primary btn-block" disabled={reject.isPending} onClick={() => reject.mutate(true)}>
                {t('order.reopenYes')}
              </button>
              <button className="btn btn-quiet btn-block danger" disabled={reject.isPending} onClick={() => reject.mutate(false)}>
                {t('order.reopenNo')}
              </button>
            </div>
          )}
        </div>
      </Modal>
      {payment.sheet}
    </>
  );
}

function TravelerActions({ order: o }: { order: Order }) {
  const ask = useConfirm();
  const { t } = useI18n();
  const errText = useErrorText();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [price, setPrice] = useState<number | ''>('');
  const [file, setFile] = useState<File | null>(null);
  const [checkOpen, setCheckOpen] = useState(false);
  const [tagPrice, setTagPrice] = useState<number | ''>('');
  const [tagPhoto, setTagPhoto] = useState<File | null>(null);
  const refresh = () => qc.invalidateQueries();

  const purchase = useMutation({
    mutationFn: () => api.purchase(o.id, Number(price), file!),
    onSuccess: () => { setOpen(false); refresh(); },
  });
  const priceCheck = useMutation({
    mutationFn: () => api.priceCheck(o.id, Number(tagPrice), tagPhoto!),
    onSuccess: () => { setCheckOpen(false); refresh(); },
  });
  const [handOpen, setHandOpen] = useState(false);
  const cancel = useMutation({ mutationFn: () => api.cancelOrder(o.id), onSuccess: refresh });
  const err = cancel.error;
  const approved = o.extraItemAmount > 0;
  const over = price !== '' && price > o.itemLimit;
  const under = price !== '' && price > 0 && price < o.itemLimit;
  const tagOk = tagPrice !== '' && tagPrice > o.budget;

  return (
    <>
      {o.status === 'PAID' && (approved
        ? <Notice tone="good">{t('pc.approvedLimit', { amount: krw(o.itemLimit) })}</Notice>
        : <Notice>{t('order.budgetLimit', { amount: krw(o.budget) })}</Notice>)}
      {err && <Notice tone="bad">{errText(err)}</Notice>}
      {['PENDING_PAYMENT', 'PAYMENT_FAILED', 'PAID', 'AWAITING_APPROVAL'].includes(o.status) && (
        <button className="link danger center-block" disabled={cancel.isPending}
          onClick={async () => (await ask({ message: t('order.travelerCancelConfirm'), mood: 'alert', danger: true })) && cancel.mutate()}>
          {t('order.cancel')}
        </button>
      )}

      <ActionBar>
        {o.status === 'PAID' && !approved && (
          <button className="btn btn-quiet btn-tall" onClick={() => setCheckOpen(true)}>{t('pc.open')}</button>
        )}
        {o.status === 'PAID' && (
          <button className="btn btn-primary btn-block btn-tall" onClick={() => setOpen(true)}>{t('order.bought')}</button>
        )}
        {o.status === 'PURCHASED' && (
          <button className="btn btn-primary btn-block btn-tall" onClick={() => setHandOpen(true)}>
            {t('order.handedOver')}
          </button>
        )}
        {!['PAID', 'PURCHASED'].includes(o.status) && (
          <Link to="/t/orders" className="btn btn-quiet btn-block">{t('order.backToOrders')}</Link>
        )}
      </ActionBar>

      <HandoverModal order={o} open={handOpen} onClose={() => setHandOpen(false)} />

      <Modal open={open} onClose={() => setOpen(false)} title={t('buy.title')} eyebrow={o.productName}>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); purchase.mutate(); }}>
          <ReceiptCapture file={file} onFile={setFile} onAmount={setPrice} />
          <Field label={t('buy.price')} hint={t('buy.priceHint', { amount: krw(o.itemLimit) })}>
            <MoneyInput value={price} onChange={setPrice} required />
          </Field>
          {over && <Notice tone="bad">{t(approved ? 'buy.overApproved' : 'buy.over', { amount: krw(o.itemLimit) })}</Notice>}
          {under && <Notice tone="good">{t('buy.under', { amount: krw(o.itemLimit - Number(price)) })}</Notice>}
          {purchase.error && <Notice tone="bad">{errText(purchase.error)}</Notice>}
          <button className="btn btn-primary btn-block btn-tall" disabled={purchase.isPending || !price || !file || over}>
            {purchase.isPending ? t('buy.uploading') : t('buy.save')}
          </button>
        </form>
      </Modal>

      <Modal open={checkOpen} onClose={() => setCheckOpen(false)} title={t('pc.title')} eyebrow={o.productName}>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); priceCheck.mutate(); }}>
          <p className="body-text">{t('pc.body', { amount: krw(o.budget) })}</p>
          <PhotoPick file={tagPhoto} onFile={setTagPhoto} label={t('pc.photo')} hint={t('pc.photoHint')} />
          <Field label={t('pc.price')} hint={t('buy.priceHint', { amount: krw(o.budget) })}>
            <MoneyInput value={tagPrice} onChange={setTagPrice} required />
          </Field>
          {tagOk && <Notice tone="warn">{t('pc.extra', { amount: krw(Number(tagPrice) - o.budget) })}</Notice>}
          {tagPrice !== '' && !tagOk && <Notice>{t('pc.notOver')}</Notice>}
          {priceCheck.error && <Notice tone="bad">{errText(priceCheck.error)}</Notice>}
          <button className="btn btn-primary btn-block btn-tall" disabled={priceCheck.isPending || !tagOk || !tagPhoto}>
            {priceCheck.isPending ? t('buy.uploading') : t('pc.send')}
          </button>
        </form>
      </Modal>
    </>
  );
}
