import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { api, type User } from '../api';
import { useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';
import { ArrowRight, X } from './icons';
import { Field, Mascot, Notice } from './ui';
import { useConfirm } from './confirm';

const DEMO_PASSWORD = 'carrypick123';

type Options = { then?: (user: User) => void; onCancel?: () => void };
type Prompt = (o?: Options) => void;

const AuthContext = createContext<Prompt>(() => {});

export const useAuthPrompt = () => useContext(AuthContext);

export function useRequireLogin() {
  const { user } = useSession();
  const prompt = useAuthPrompt();
  return useCallback(
    (fn: (user: User) => void) => (user ? fn(user) : prompt({ then: fn })),
    [user, prompt],
  );
}

export function AuthPromptProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Options | null>(null);
  const prompt = useCallback<Prompt>((o) => setPending(o ?? {}), []);
  return (
    <AuthContext.Provider value={prompt}>
      {children}
      {pending && (
        <AuthDialog
          onCancel={() => { setPending(null); pending.onCancel?.(); }}
          onDone={(user) => { setPending(null); pending.then?.(user); }}
        />
      )}
    </AuthContext.Provider>
  );
}

function AuthDialog({ onCancel, onDone }: { onCancel: () => void; onDone: (user: User) => void }) {
  const { login } = useSession();
  const ask = useConfirm();
  const { t } = useI18n();
  const errText = useErrorText();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLInputElement>(null);
  const signup = tab === 'signup';

  useEffect(() => {
    first.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [onCancel, tab]);

  async function submit(e?: FormEvent, demo?: string) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = signup && !demo
        ? await api.signup({ email, password, name })
        : await api.login(demo ? { email: demo, password: DEMO_PASSWORD } : { email, password });
      login(res.token, res.user);
      onDone(res.user);
    } catch (err) {
      setError(errText(err));
      setBusy(false);
    }
  }

  return createPortal(
    <div className="cf-backdrop au-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="au-card" role="dialog" aria-modal aria-labelledby="au-title">
        <button type="button" className="au-close" onClick={onCancel} aria-label={t('common.close')}><X size={20} /></button>
        <Mascot mood="love" size={72} className="au-whale" />
        <h2 id="au-title" className="au-title">{t(signup ? 'login.tab.signup' : 'login.tab.login')}</h2>
        <p className="au-sub">{t(signup ? 'auth.subSignup' : 'auth.sub')}</p>

        <form onSubmit={submit} className="au-fields">
          {signup && (
            <Field label={t('login.name')}>
              <input ref={first} value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="name" />
            </Field>
          )}
          <Field label={t('login.email')}>
            <input ref={signup ? undefined : first} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              autoComplete="email" name="email" spellCheck={false} autoCapitalize="none" placeholder={t('auth.emailPlaceholder')} />
          </Field>
          <Field label={t('login.password')}>
            <input
              type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              minLength={signup ? 8 : 1} placeholder={signup ? t('login.passwordHint') : ''}
              autoComplete={signup ? 'new-password' : 'current-password'}
            />
          </Field>
          {error && <Notice tone="bad">{error}</Notice>}
          <button className="btn btn-primary btn-block btn-tall" disabled={busy}>
            {busy ? t('login.wait') : t(`login.submit.${tab}`)}
            {!busy && <ArrowRight size={16} />}
          </button>
        </form>

        {!signup && (
          <>
            <div className="au-or" role="separator"><span>{t('auth.or')}</span></div>
            <div className="au-demo">
              <button type="button" className="btn btn-quiet btn-block" disabled={busy}
                onClick={() => submit(undefined, 'buyer@carrypick.test')}><BoldRole text={t('auth.asMinji')} role={t('auth.roleBuyer')} /></button>
              <button type="button" className="btn btn-quiet btn-block" disabled={busy}
                onClick={() => submit(undefined, 'traveler@carrypick.test')}><BoldRole text={t('auth.asKenji')} role={t('auth.roleTraveler')} /></button>
            </div>
          </>
        )}

        <p className="au-switch">
          <span>{t(signup ? 'auth.haveAccount' : 'auth.noAccount')}</span>
          <button type="button" onClick={async () => {
            setError(null);
            if (signup) { setTab('login'); return; }
            if (await ask({ title: t('auth.demoTitle'), message: t('auth.demoBody'), mood: 'info', okLabel: t('auth.demoOk'), redTitle: true })) {
              submit(undefined, 'traveler@carrypick.test');
            }
          }}>
            {t(signup ? 'login.tab.login' : 'login.tab.signup')}
          </button>
        </p>
      </div>
    </div>,
    document.body,
  );
}

function BoldRole({ text, role }: { text: string; role: string }) {
  const [before, after = ''] = text.split('{role}');
  return <span>{before}<b>{role}</b>{after}</span>;
}
