import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Camera, ChevronRight, ExternalLink, FileText, MessageCircle } from '../components/icons';
import { api, assetUrl, type Order } from '../api';
import { OrderHero, ReceiptLine, ReceiptStrip, StatusTimeline, firstName } from '../components/cards';
import { Screen } from '../components/Layout';
import { usePayment } from '../components/payment';
import { ReceiptCapture } from '../components/receipt';
import { ActionBar, ErrorBox, Field, KV, Loading, Modal, MoneyInput, Notice, ProductThumb, Sheet, StatusBadge } from '../components/ui';
import { krw } from '../format';
import { useErrorText, useI18n, type Key } from '../i18n';

export default function OrderDetail() {
  const id = Number(useParams().id);
  const { t } = useI18n();
  const order = useQuery({ queryKey: ['order', id], queryFn: () => api.order(id), refetchInterval: 15_000 });

  if (order.isLoading) return <Screen back title={t('order.title')}><Loading /></Screen>;
  if (order.error || !order.data) return <Screen back title={t('order.title')}><ErrorBox error={order.error} /></Screen>;

  const o = order.data;
  const buyer = o.myRole === 'BUYER';

  const extraLines = o.extraItemAmount > 0
    ? [
        { label: t('price.extra'), value: o.extraItemAmount },
        { label: t('price.extraFee'), value: o.extraFee },
      ]
    : undefined;

  return (
    <Screen back title={t('order.title')} hideNav>
      <OrderHero order={o} />

      <div className="status-strip pull-up">
        <StatusBadge status={o.status} />
        <span>{t(`next.${buyer ? 'b' : 't'}.${o.status}` as Key)}</span>
      </div>

      <Link to={`/orders/${o.id}/chat`} className="status-strip chat-link">
        <MessageCircle size={20} aria-hidden />
        <span className="grow">
          <b>{t('chat.open', { name: firstName(buyer ? o.traveler.name : o.buyer.name) })}</b>
          <small>{t('chat.openHint')}</small>
        </span>
        {o.unreadMessages > 0 && <span className="dot is-inline">{o.unreadMessages > 9 ? '9+' : o.unreadMessages}</span>}
        <ChevronRight size={18} className="row-chevron" aria-hidden />
      </Link>

      <Sheet>
        <div className="product-line is-inset">
          <ProductThumb src={o.imageUrl} category={o.category} size={52} />
          <div className="row-body">
            <div className="row-title">{o.productName}{o.quantity > 1 && <span className="qty"> × {o.quantity}</span>}</div>
            {o.productLink && (
              <a className="link small" href={o.productLink} target="_blank" rel="noreferrer">
                {t('order.link')} <ExternalLink size={14} aria-hidden />
              </a>
            )}
          </div>
        </div>
        {o.options && <KV label={t('order.options')}>{o.options}</KV>}
      </Sheet>

      <Sheet title={t('order.progress')}>
        <StatusTimeline order={o} />
      </Sheet>

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
            <p className="receipt-note">{t('price.simulated')}</p>
          </div>
        )}
      </aside>

      {buyer ? <BuyerActions order={o} /> : <TravelerActions order={o} />}
    </Screen>
  );
}

function BuyerActions({ order: o }: { order: Order }) {
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
          onClick={() => window.confirm(t('order.cancelConfirm') + (paid ? ` ${t('order.cancelRefund')}` : '')) && cancel.mutate()}>
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
            onClick={() => window.confirm(t('order.receivedConfirm')) && confirm.mutate()}>
            {confirm.isPending ? t('order.confirming') : t('order.received')}
          </button>
        )}
        {['PAID', 'PURCHASED', 'COMPLETED', 'SETTLED', 'CANCELLED'].includes(o.status) && (
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
  const deliver = useMutation({ mutationFn: () => api.deliver(o.id), onSuccess: refresh });
  const cancel = useMutation({ mutationFn: () => api.cancelOrder(o.id), onSuccess: refresh });
  const err = deliver.error ?? cancel.error;
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
          onClick={() => window.confirm(t('order.travelerCancelConfirm')) && cancel.mutate()}>
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
          <button className="btn btn-primary btn-block btn-tall" disabled={deliver.isPending}
            onClick={() => window.confirm(t('order.handedOverConfirm')) && deliver.mutate()}>
            {deliver.isPending ? t('order.saving') : t('order.handedOver')}
          </button>
        )}
        {!['PAID', 'PURCHASED'].includes(o.status) && (
          <Link to="/t/orders" className="btn btn-quiet btn-block">{t('order.backToOrders')}</Link>
        )}
      </ActionBar>

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

function PhotoPick({ file, onFile, label, hint }: { file: File | null; onFile: (f: File | null) => void; label: string; hint: string }) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return (
    <div className="capture-pick">
      {preview
        ? <img className="capture-thumb" src={preview} alt="" />
        : <div className="capture-thumb is-empty"><Camera size={22} strokeWidth={1.5} aria-hidden /></div>}
      <div className="capture-pick-body">
        <span className="field-label">{label}</span>
        <span className="field-hint">{file ? file.name : hint}</span>
        <button type="button" className="link" onClick={() => input.current?.click()}>
          {file ? t('buy.change') : t('buy.choose')}
        </button>
      </div>
      <input ref={input} type="file" accept="image/*" aria-label={label} hidden onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </div>
  );
}
