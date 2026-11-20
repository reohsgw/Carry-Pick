import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, type PaymentPrepare } from '../api';
import { useErrorText, useI18n } from '../i18n';
import { krw } from '../format';
import { Modal } from './ui';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      payment: (opts: { customerKey: string }) => {
        requestPayment: (req: Record<string, unknown>) => Promise<void>;
      };
    };
  }
}

const TOSS_SDK = 'https://js.tosspayments.com/v2/standard';

function loadTossSdk(): Promise<void> {
  if (window.TossPayments) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TOSS_SDK;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('sdk'));
    document.head.appendChild(s);
  });
}

export function usePayment(orderId?: number, opts?: { onCancel?: (orderId: number) => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mock, setMock] = useState<PaymentPrepare | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useI18n();
  const errorMessage = useErrorText();
  const current = useRef<number | undefined>(orderId);

  async function start(prepare: () => Promise<PaymentPrepare>, forOrder?: number) {
    current.current = forOrder ?? orderId;
    setBusy(true);
    setError(null);
    try {
      const prep = await prepare();
      if (prep.mode === 'mock') {
        setMock(prep);
        return;
      }
      if (!prep.clientKey) throw new Error(t('pay.noKey'));
      await loadTossSdk();
      const toss = window.TossPayments!(prep.clientKey);
      const origin = window.location.origin;
      await toss.payment({ customerKey: prep.customerKey }).requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: prep.amount },
        orderId: prep.tossOrderId,
        orderName: prep.orderName,
        successUrl: `${origin}/pay/success?order=${current.current}`,
        failUrl: `${origin}/pay/fail?order=${current.current}`,
      });
    } catch (e) {
      console.error('Payment window error', e);
      const code = (e as { code?: string })?.code;
      if (code === 'USER_CANCEL' || code === 'PAY_PROCESS_CANCELED') {
        setError(null);
        if (current.current != null) opts?.onCancel?.(current.current);
      }
      else if (e instanceof Error && e.message === 'sdk') setError(t('pay.sdkFail'));
      else if (e instanceof Error && !('isAxiosError' in e)) setError(code ? `${e.message} (${code})` : e.message);
      else setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function finishMock(success: boolean) {
    if (!mock) return;
    setBusy(true);
    try {
      if (success) {
        await api.confirmPayment({
          paymentKey: `mock_ok_${Date.now()}`,
          tossOrderId: mock.tossOrderId,
          amount: mock.amount,
        });
      } else {
        await api.confirmPayment({
          paymentKey: `mock_fail_${Date.now()}`,
          tossOrderId: mock.tossOrderId,
          amount: mock.amount,
        });
      }
      await qc.invalidateQueries();
      setMock(null);
      navigate(`/pay/${success ? 'success' : 'fail'}?order=${current.current}&mock=1`, { replace: true });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function cancelMock() {
    if (mock) {
      try { await api.failPayment({ tossOrderId: mock.tossOrderId, code: 'USER_CANCEL', message: 'Payment window closed' }); } catch { }
    }
    setMock(null);
    qc.invalidateQueries();
    if (current.current != null) opts?.onCancel?.(current.current);
  }

  const sheet = (
    <Modal open={!!mock} onClose={cancelMock} title={t('pay.mockTitle')}>
      {mock && (
        <div className="stack">
          <div className="mockpay-card">
            <span className="mockpay-brand">{t('pay.mockCard')}</span>
            <span className="mockpay-number">4330 0000 0000 1234</span>
          </div>
          <div className="mockpay-amount">
            <span>{mock.orderName}</span>
            <strong>{krw(mock.amount)}</strong>
          </div>
          <p className="fine">{t('pay.mockNote')}</p>
          <button className="btn btn-primary btn-block" disabled={busy} onClick={() => finishMock(true)}>
            {t('pay.approve')}
          </button>
          <button className="btn btn-quiet btn-block" disabled={busy} onClick={() => finishMock(false)}>
            {t('pay.decline')}
          </button>
        </div>
      )}
    </Modal>
  );

  return { start, busy, error, sheet };
}
