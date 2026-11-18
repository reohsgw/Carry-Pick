import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { CircleCheck, Lock } from './icons';
import { api } from '../api';
import { useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';
import { Field, Modal, Notice } from './ui';
import { useConfirm } from './confirm';

const BANKS = [
  'KB국민은행', '신한은행', '우리은행', '하나은행', 'NH농협은행', 'IBK기업은행',
  '카카오뱅크', '토스뱅크', '케이뱅크', 'SC제일은행', '우체국', '새마을금고',
];

const newCode = () => String(Math.floor(1000 + Math.random() * 9000));

/** "My payout account" sheet for the My page: shows the masked account, or invites the user to add one. */
export function PayoutCard() {
  const { user, refreshMe } = useSession();
  const { t } = useI18n();
  const errText = useErrorText();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirm = useConfirm();
  const payout = user?.payout;

  async function remove() {
    if (!(await confirm({ message: t('po.removeConfirm'), mood: 'alert', danger: true }))) return;
    setError(null);
    try { await api.updateMe({ payoutBank: '' }); refreshMe(); } catch (err) { setError(errText(err)); }
  }

  return (
    <section id="payout" className="kt-sheet po-card">
      <h2 className="kt-label">{t('po.title')}</h2>
      {payout ? (
        <div className="po-row">
          <div className="po-account">
            <strong>{payout.bank} {payout.accountMasked}</strong>
            <span>{payout.holder} · <span className="po-ok"><CircleCheck size={13} aria-hidden /> {t('po.verified')}</span></span>
          </div>
          <div className="po-actions">
            <button type="button" className="kt-text-btn" onClick={() => setOpen(true)}>{t('po.change')}</button>
            <button type="button" className="kt-text-btn is-danger" onClick={remove}>{t('po.remove')}</button>
          </div>
        </div>
      ) : (
        <div className="po-row">
          <p className="po-none">{t('po.none')}</p>
          <button type="button" className="kt-btn is-solid" onClick={() => setOpen(true)}>{t('po.add')}</button>
        </div>
      )}
      {error && <Notice tone="bad">{error}</Notice>}
      <PayoutSetup open={open} onClose={() => setOpen(false)} />
    </section>
  );
}

/** Two steps, like a real bank check: enter the account, then type the code from a simulated 1-won deposit. */
function PayoutSetup({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, refreshMe } = useSession();
  const { t } = useI18n();
  const errText = useErrorText();
  const [bank, setBank] = useState('');
  const [account, setAccount] = useState('');
  const [holder, setHolder] = useState(user?.name?.replace(/\s*\(.*\)$/, '') ?? '');
  const [code, setCode] = useState<string | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const digits = account.replace(/[^0-9]/g, '');
  const validAccount = digits.length >= 8 && digits.length <= 16;

  function close() {
    setCode(null); setTyped(''); setError(null);
    onClose();
  }

  function send(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setTyped('');
    setCode(newCode());
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (typed !== code) { setError(t('po.wrong')); return; }
    setBusy(true);
    setError(null);
    try {
      await api.updateMe({ payoutBank: bank, payoutAccount: digits, payoutHolder: holder.trim() });
      refreshMe();
      close();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal open={open} onClose={close} title={t('po.title')}>
      {!code ? (
        <form className="stack" onSubmit={send}>
          <Field label={t('po.bank')}>
            <select value={bank} onChange={(e) => setBank(e.target.value)} required>
              <option value="" disabled>{t('po.bankPick')}</option>
              {BANKS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label={t('po.account')} hint={t('po.accountHint')}>
            <input inputMode="numeric" value={account} maxLength={20} required
              onChange={(e) => setAccount(e.target.value.replace(/[^0-9-]/g, ''))} placeholder="123-456-789012" />
          </Field>
          <Field label={t('po.holder')}>
            <input value={holder} onChange={(e) => setHolder(e.target.value)} maxLength={40} required />
          </Field>
          <button className="btn btn-primary btn-block" disabled={!bank || !validAccount || !holder.trim()}>{t('po.send')}</button>
        </form>
      ) : (
        <form className="stack" onSubmit={verify}>
          <p className="body-text">{t('po.step2')}</p>
          <div className="po-push" role="status">
            <span className="po-push-bank">{bank.slice(0, 2)}</span>
            <div>
              <strong>{t('po.push', { bank, code })}</strong>
              <small><Lock size={11} aria-hidden /> {t('po.pushNote')}</small>
            </div>
          </div>
          <Field label={t('po.code')}>
            <input className="po-code" inputMode="numeric" autoFocus maxLength={4} value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/[^0-9]/g, ''))} placeholder="0000" />
          </Field>
          {error && <Notice tone="bad">{error}</Notice>}
          <button className="btn btn-primary btn-block" disabled={typed.length !== 4 || busy}>{t('po.verify')}</button>
          <button type="button" className="link center-block" onClick={() => send()}>{t('po.resend')}</button>
        </form>
      )}
    </Modal>
  );
}

/** Shown where a traveler is about to take on work without a payout account. */
export function PayoutRequired() {
  const { t } = useI18n();
  return (
    <Notice tone="warn">
      {t('po.required')} <Link className="link" to="/me#payout">{t('po.go')}</Link>
    </Notice>
  );
}
