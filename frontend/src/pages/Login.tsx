import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight } from '../components/icons';
import { api } from '../api';
import { Wordmark } from '../components/Layout';
import { Field, Notice } from '../components/ui';
import { LangToggle, useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';

const DEMO_PASSWORD = 'carrypick123';

export default function Login() {
  const { login, user } = useSession();
  const { t } = useI18n();
  const errText = useErrorText();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (user) return <Navigate to="/" replace />;

  async function submit(e?: FormEvent, override?: { email: string; password: string }) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res =
        tab === 'signup' && !override
          ? await api.signup({ email, password, name })
          : await api.login(override ?? { email, password });
      login(res.token, res.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  const signup = tab === 'signup';

  return (
    <div className="auth auth--solo">

      <div className="auth-body lg-form">
        <div className="lg-lang lg-brand"><Wordmark /><LangToggle /></div>
        <div className="lg-tabs" role="tablist">
          {(['login', 'signup'] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k}
              onClick={() => { setTab(k); setError(null); }}>
              {t(`login.tab.${k}`)}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="lg-fields">
          {signup && (
            <Field label={t('login.name')}>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="name" />
            </Field>
          )}
          <Field label={t('login.email')}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" name="email" spellCheck={false} autoCapitalize="none" placeholder="you@example.com" />
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
          <p className="lg-try">
            <span>{t('login.tryAs')}</span>
            <button type="button" disabled={busy}
              onClick={() => submit(undefined, { email: 'buyer@carrypick.test', password: DEMO_PASSWORD })}>{t('login.asMinji')}</button>
            <span aria-hidden>·</span>
            <button type="button" disabled={busy}
              onClick={() => submit(undefined, { email: 'traveler@carrypick.test', password: DEMO_PASSWORD })}>{t('login.asKenji')}</button>
          </p>
        )}

        <p className="lg-fine">{t('login.trust2')}</p>
      </div>
    </div>
  );
}
