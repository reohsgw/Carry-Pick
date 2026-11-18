import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../i18n';
import { Mascot, type Mood } from './ui';

type Options = { message: string; mood?: Mood; okLabel?: string; danger?: boolean };
type Pending = Options & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(o: Options) => Promise<boolean>>(async () => false);

/** In-page replacement for window.confirm: a small square card with the whale. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const confirm = useCallback((o: Options) => new Promise<boolean>((resolve) => setPending({ ...o, resolve })), []);
  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && <ConfirmDialog {...pending} onDone={(ok) => { pending.resolve(ok); setPending(null); }} />}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

function ConfirmDialog({ message, mood = 'question', okLabel, danger, onDone }: Options & { onDone: (ok: boolean) => void }) {
  const { t } = useI18n();
  const ok = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    ok.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDone]);

  return createPortal(
    <div className="cf-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onDone(false)}>
      <div className="cf-card" role="alertdialog" aria-modal aria-labelledby="cf-msg">
        <Mascot mood={mood} className="cf-whale" size={96} />
        <p id="cf-msg" className="cf-msg">{message}</p>
        <div className="cf-actions">
          <button type="button" className="btn btn-quiet" onClick={() => onDone(false)}>{t('cf.cancel')}</button>
          <button type="button" ref={ok} className={`btn btn-primary${danger ? ' is-danger' : ''}`} onClick={() => onDone(true)}>
            {okLabel ?? t('cf.ok')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
