import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ArrowRight, Plane, ShoppingBag } from '../components/icons';
import { api } from '../api';
import { Wordmark } from '../components/Layout';
import { Field, Mascot, Notice } from '../components/ui';
import { LangToggle, useErrorText, useI18n } from '../i18n';
import taipei from '../assets/login-taipei.webp';
import tokyo from '../assets/login-tokyo.webp';
import newyork from '../assets/login-newyork.webp';
import bali from '../assets/login-bali.webp';
import bangkok from '../assets/login-bangkok.webp';
import hoian from '../assets/login-hoian.webp';
import paris from '../assets/login-paris.webp';
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
    <div className="auth">
      <div className="auth-photo">
        <CitySlides />
        <div className="auth-top">
          <Wordmark />
          <LangToggle />
        </div>
      </div>

      <div className="auth-body">
        <Mascot mood="happy" className="auth-whale" />
        <p className="eyebrow">{signup ? t('login.eyebrowUp') : t('login.eyebrowIn')}</p>
        <h2 className="font-display">{signup ? t('login.titleUp') : t('login.titleIn')}</h2>
        <p className="auth-copy">{signup ? t('login.copyUp') : t('login.copyIn')}</p>

        <form onSubmit={submit} className="stack">
          {signup && (
            <Field label={t('login.name')}>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} autoComplete="name" />
            </Field>
          )}
          <Field label={t('login.email')}>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
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

        <p className="auth-switch">
          {signup ? t('login.haveAccount') : t('login.newHere')}{' '}
          <button type="button" onClick={() => { setTab(signup ? 'login' : 'signup'); setError(null); }}>
            {signup ? t('login.tab.login') : t('login.createAccount')}
          </button>
        </p>

        {!signup && (
          <div className="demo">
            <div className="demo-head">
              <span>{t('login.demo')}</span>
            </div>
            <div className="demo-buttons">
              <button className="btn btn-quiet btn-small" disabled={busy}
                onClick={() => submit(undefined, { email: 'buyer@carrypick.test', password: DEMO_PASSWORD })}>
                <ShoppingBag size={16} aria-hidden /> {t('login.demoBuyer')}
              </button>
              <button className="btn btn-quiet btn-small" disabled={busy}
                onClick={() => submit(undefined, { email: 'traveler@carrypick.test', password: DEMO_PASSWORD })}>
                <Plane size={16} aria-hidden /> {t('login.demoTraveler')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const SLIDES = [
  { src: tokyo, city: 'Tokyo' },
  { src: paris, city: 'Paris' },
  { src: newyork, city: 'New York' },
  { src: bangkok, city: 'Bangkok' },
  { src: taipei, city: 'Taipei' },
  { src: hoian, city: 'Hoi An' },
  { src: bali, city: 'Bali' },
];
const SLIDE_MS = 2000;

/** The same three friends walking through a different city every few seconds, cross-fading. */
function CitySlides() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % SLIDES.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="city-slides" aria-hidden>
      {SLIDES.map((sl, n) => (
        <img
          key={sl.city}
          src={sl.src}
          alt=""
          className={n === i ? 'is-on' : ''}
          loading={n === 0 ? 'eager' : 'lazy'}
          decoding="async"
        />
      ))}
      <span className="city-tag">✈ {SLIDES[i].city}</span>
      <span className="city-dots">
        {SLIDES.map((sl, n) => <i key={sl.city} className={n === i ? 'is-on' : ''} />)}
      </span>
    </div>
  );
}
