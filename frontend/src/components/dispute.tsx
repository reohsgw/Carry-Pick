import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Flag, Handshake, Truck } from './icons';
import { api, assetUrl, type Order } from '../api';
import { dateTime } from '../format';
import { useErrorText, useI18n, type Key } from '../i18n';
import { firstName } from './cards';
import { useConfirm } from './confirm';
import { PhotoPick } from './PhotoPick';
import { Field, Mascot, Modal, Notice, Sheet } from './ui';

/** Statuses where either side may report a problem (mirrors the server). */
const REPORTABLE = ['PAID', 'AWAITING_APPROVAL', 'PURCHASED', 'DELIVERED'];
const REASONS = {
  BUYER: ['NOT_RECEIVED', 'WRONG_OR_DAMAGED', 'OTHER'],
  TRAVELER: ['NOT_CONFIRMING', 'NO_CONTACT', 'OTHER'],
} as const;

/** Traveler marks the item handed over; a photo of the hand-over or the shipping receipt is required. */
export function HandoverModal({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const errText = useErrorText();
  const qc = useQueryClient();
  const [method, setMethod] = useState<'IN_PERSON' | 'SHIPPING'>('IN_PERSON');
  const [proof, setProof] = useState<File | null>(null);
  const deliver = useMutation({
    mutationFn: () => api.deliver(order.id, method, proof!),
    onSuccess: () => { onClose(); qc.invalidateQueries(); },
  });
  const shipping = method === 'SHIPPING';
  return (
    <Modal open={open} onClose={onClose} title={order.productName} eyebrow={t('ho.to', { name: firstName(order.buyer.name) })} mood="stamp">
      <form className="stack" onSubmit={(e) => { e.preventDefault(); deliver.mutate(); }}>
        <div>
          <p className="field-label">{t('ho.how')}</p>
          <div className="ho-tiles" role="group" aria-label={t('ho.how')}>
            <button type="button" className="ho-tile" aria-pressed={!shipping} onClick={() => { setMethod('IN_PERSON'); setProof(null); }}>
              <span className="ho-tile-icon"><Handshake size={26} aria-hidden /></span>
              <b>{t('ho.inPerson')}</b>
              <small>{t('ho.inPersonSub')}</small>
            </button>
            <button type="button" className="ho-tile" aria-pressed={shipping} onClick={() => { setMethod('SHIPPING'); setProof(null); }}>
              <span className="ho-tile-icon"><Truck size={26} aria-hidden /></span>
              <b>{t('ho.shipping')}</b>
              <small>{t('ho.shippingSub')}</small>
            </button>
          </div>
        </div>
        <PhotoPick
          big file={proof} onFile={setProof} allowPdf={shipping}
          label={shipping ? t('ho.receipt') : t('ho.photo')}
          hint={shipping ? t('ho.receiptHint') : t('ho.photoHint')}
        />
        <p className="letter-ps">{t('ho.why')}</p>
        {deliver.error && <Notice tone="bad">{errText(deliver.error)}</Notice>}
        <button className="btn btn-primary btn-block btn-tall" disabled={!proof || deliver.isPending}>
          {deliver.isPending ? t('order.saving') : t('ho.submit')}
        </button>
      </form>
    </Modal>
  );
}

/** The hand-over photo or shipping receipt, visible to both sides. */
export function HandoverProof({ order }: { order: Order }) {
  const { t } = useI18n();
  if (!order.handoverPhotoUrl) return null;
  const url = assetUrl(order.handoverPhotoUrl) ?? '#';
  const pdf = order.handoverPhotoUrl.endsWith('.pdf');
  return (
    <Sheet title={t('ho.proof')} aside={<span className="fine">{order.handoverMethod === 'SHIPPING' ? t('ho.proofShipping') : t('ho.proofInPerson')}</span>}>
      <a href={url} target="_blank" rel="noreferrer" className="receipt-photo">
        {pdf ? <span className="link"><FileText size={18} aria-hidden /> {t('order.receiptPdf')}</span> : <img src={url} alt={t('ho.proof')} />}
      </a>
    </Sheet>
  );
}

/** "Confirmed automatically on …" while the order waits for the buyer. */
export function AutoConfirmNote({ order }: { order: Order }) {
  const { t, lang } = useI18n();
  if (order.status !== 'DELIVERED' || !order.autoConfirmAt) return null;
  const buyer = order.myRole === 'BUYER';
  return <p className="ac-note">{t(buyer ? 'ac.left' : 'ac.leftTraveler', { date: dateTime(order.autoConfirmAt, lang) })}</p>;
}

/** "Report a problem" link plus its form. */
export function ReportProblem({ order }: { order: Order }) {
  const { t } = useI18n();
  const errText = useErrorText();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const report = useMutation({
    mutationFn: () => api.report(order.id, reason, note, photo),
    onSuccess: () => { setOpen(false); qc.invalidateQueries(); },
  });
  if (!REPORTABLE.includes(order.status)) return null;
  const reasons = REASONS[order.myRole];
  return (
    <>
      <button type="button" className="link report-link center-block" onClick={() => setOpen(true)}>
        <Flag size={14} aria-hidden /> {t('rp.open')}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={t('rp.title')} eyebrow={order.productName}>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); report.mutate(); }}>
          <fieldset className="rp-reasons">
            <legend className="field-label">{t('rp.reason')}</legend>
            {reasons.map((r) => (
              <label key={r} className="rp-reason">
                <input type="radio" name="rp-reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                <span>{t(`rp.${r}` as Key)}</span>
              </label>
            ))}
          </fieldset>
          <Field label={t('rp.note')} optional>
            <textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <PhotoPick file={photo} onFile={setPhoto} label={t('rp.photo')} />
          <Notice tone="warn">{t('rp.pauses')}</Notice>
          {report.error && <Notice tone="bad">{errText(report.error)}</Notice>}
          <button className="btn btn-primary btn-block btn-tall is-danger" disabled={!reason || report.isPending}>
            {report.isPending ? t('order.saving') : t('rp.send')}
          </button>
        </form>
      </Modal>
    </>
  );
}

/** Open report: what was reported, and the ways to end it. */
export function DisputePanel({ order }: { order: Order }) {
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const ask = useConfirm();
  const qc = useQueryClient();
  const resolve = useMutation({
    mutationFn: (action: 'RECEIVED' | 'REFUND' | 'WITHDRAW') => api.resolve(order.id, action),
    onSuccess: () => qc.invalidateQueries(),
  });
  const d = order.dispute;
  if (order.status !== 'DISPUTED' || !d) return null;
  const buyer = order.myRole === 'BUYER';
  const reporter = d.byRole === 'BUYER' ? order.buyer : order.traveler;
  return (
    <section className="dp-card" aria-live="polite">
      <div className="dp-head">
        <Mascot mood="alert" size={64} className="dp-whale" />
        <div>
          <h2>{d.mine ? t('rp.byYou') : t('rp.byOther', { name: firstName(reporter.name) })}</h2>
          <p className="fine">{dateTime(d.at, lang)}</p>
        </div>
      </div>
      <p className="dp-reason">{t(`rp.${d.reason}` as Key)}</p>
      {d.note && <p className="dp-note">“{d.note}”</p>}
      {d.photoUrl && (
        <a href={assetUrl(d.photoUrl) ?? '#'} target="_blank" rel="noreferrer" className="dp-photo">
          <img src={assetUrl(d.photoUrl) ?? ''} alt={t('rp.photo')} />
        </a>
      )}
      <p className="dp-review">{t('rp.review')}</p>
      {resolve.error && <Notice tone="bad">{errText(resolve.error)}</Notice>}
      <div className="dp-actions">
        {buyer && order.actualPrice != null && (
          <button type="button" className="btn btn-primary" disabled={resolve.isPending}
            onClick={async () => (await ask({ message: t('rp.receivedConfirm'), mood: 'unbox' })) && resolve.mutate('RECEIVED')}>
            {t('rp.received')}
          </button>
        )}
        {!buyer && (
          <button type="button" className="btn btn-primary is-danger" disabled={resolve.isPending}
            onClick={async () => (await ask({ message: t('rp.refundConfirm'), mood: 'alert', danger: true })) && resolve.mutate('REFUND')}>
            {t('rp.refund')}
          </button>
        )}
        {d.mine && (
          <button type="button" className="btn btn-quiet" disabled={resolve.isPending}
            onClick={async () => (await ask({ message: t('rp.withdrawConfirm'), mood: 'question' })) && resolve.mutate('WITHDRAW')}>
            {t('rp.withdraw')}
          </button>
        )}
      </div>
    </section>
  );
}
