import { createPortal } from 'react-dom';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Bell, Camera, ClipboardList, Cookie, Headphones, Lamp, MapPinned, Package, Plane, SearchX, Shirt, ShoppingBag,
  Sparkles, UtensilsCrossed, type Icon as LucideIcon,
} from './icons';
import { api, assetUrl, type OrderStatus } from '../api';
import { STATUS_TONE } from '../format';
import { useErrorText, useI18n, type Key } from '../i18n';
import { productPhoto } from '../images';
import whaleFly from '../assets/whale-mascot.webp';
import whaleHappy from '../assets/whale-happy.webp';
import whaleQuestion from '../assets/whale-question.webp';
import whaleLove from '../assets/whale-love.webp';
import whaleAlert from '../assets/whale-alert.webp';
import whaleShop from '../assets/whale-shop.webp';
import whaleUnbox from '../assets/whale-unbox.webp';
import whaleSleep from '../assets/whale-sleep.webp';
import whaleStamp from '../assets/whale-stamp.webp';

/** The courier whale's moods. */
export type Mood = 'fly' | 'happy' | 'question' | 'love' | 'alert' | 'shop' | 'unbox' | 'sleep' | 'stamp';
const MOODS: Record<Mood, string> = {
  fly: whaleFly, happy: whaleHappy, question: whaleQuestion, love: whaleLove,
  alert: whaleAlert, shop: whaleShop, unbox: whaleUnbox, sleep: whaleSleep, stamp: whaleStamp,
};

/** CarryPick's courier whale. Decorative, so hidden from screen readers. */
export function Mascot({ mood = 'fly', className = '', size }: { mood?: Mood; className?: string; size?: number }) {
  return <img src={MOODS[mood]} alt="" aria-hidden className={`mascot is-${mood} ${className}`.trim()} style={size ? { width: size } : undefined} />;
}

/** Picks a fitting mood from the icon an empty state was given. */
function moodFor(icon?: LucideIcon): Mood {
  if (icon === SearchX) return 'question';
  if (icon === Package) return 'sleep';
  if (icon === ClipboardList) return 'shop';
  if (icon === Bell) return 'sleep';
  if (icon === Plane || icon === MapPinned) return 'fly';
  return 'question';
}

export function Loading({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="state is-whale" role="status">
      <Mascot className="mascot-swim" size={64} /> {label ?? t('common.loading')}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n();
  const text = useErrorText();
  return (
    <div className="notice is-bad has-whale" role="alert">
      <Mascot mood="alert" size={44} />
      <span className="grow">{text(error)}</span>
      {onRetry && <button className="link" onClick={onRetry}>{t('common.retry')}</button>}
    </div>
  );
}

export function Notice({ tone = 'info', icon: Icon, children }: { tone?: 'info' | 'warn' | 'bad' | 'good'; icon?: LucideIcon; children: ReactNode }) {
  return (
    <div className={`notice is-${tone}`} role={tone === 'bad' ? 'alert' : undefined}>
      {Icon && <Icon size={18} aria-hidden />}
      <div className="grow">{children}</div>
    </div>
  );
}

// `icon` is kept so existing call sites still type-check; the whale replaces it visually.
export function Empty({ icon, mood, title, children }: { icon?: LucideIcon; mood?: Mood; title: string; children?: ReactNode }) {
  return (
    <div className="empty has-mascot">
      <Mascot mood={mood ?? moodFor(icon)} className="mascot-float" size={130} />
      <p className="empty-title">{title}</p>
      {children}
    </div>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const { t } = useI18n();
  return <span className={`badge tone-${STATUS_TONE[status]}`}>{t(`st.${status}` as Key)}</span>;
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function Code({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`code ${className}`}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="font-display">{title}</h2>
      </div>
      {action}
    </div>
  );
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  snacks: Cookie, food: UtensilsCrossed, beauty: Sparkles, fashion: Shirt, home: Lamp, electronics: Headphones,
};

export function categoryIcon(category: string | null | undefined): LucideIcon {
  return CATEGORY_ICON[(category ?? '').toLowerCase()] ?? ShoppingBag;
}

/**
 * The photo to show for a product, falling back when a file can't be loaded (for example an upload
 * that is no longer on the server): first the category's stock photo, then nothing (an icon).
 */
function usePhoto(src: string | null | undefined, category: string | null | undefined) {
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => setFailed([]), [src]);
  const options = [productPhoto(src, category), productPhoto(null, category)]
    .filter((u, i, all): u is string => !!u && all.indexOf(u) === i && !failed.includes(u));
  const url = options[0] ?? null;
  const onError = () => { if (url) setFailed((f) => [...f, url]); };
  return { url, onError };
}

export function ProductPhoto({ src, category, iconSize = 36 }: { src?: string | null; category?: string | null; iconSize?: number }) {
  const { url, onError } = usePhoto(src, category);
  const Icon = categoryIcon(category);
  return url ? <img src={url} alt="" onError={onError} /> : <div className="placeholder"><Icon size={iconSize} strokeWidth={1.4} aria-hidden /></div>;
}

export function ProductThumb({ src, category, size = 56 }: { src?: string | null; category?: string | null; size?: number }) {
  const { url, onError } = usePhoto(src, category);
  const Icon = categoryIcon(category);
  return (
    <div className="thumb" style={{ width: size, height: size }}>
      {url ? <img src={url} alt="" onError={onError} /> : <Icon size={Math.round(size * 0.42)} strokeWidth={1.5} aria-hidden />}
    </div>
  );
}

export function Field({ label, hint, optional, error, children }: { label: string; hint?: string; optional?: boolean; error?: boolean; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <label className="field">
      <span className="field-label">
        {label}
        {optional && <span className="field-optional">{t('common.optional')}</span>}
      </span>
      {children}
      {hint && <span className={`field-hint${error ? ' is-error' : ''}`} role={error ? 'alert' : undefined}>{hint}</span>}
    </label>
  );
}

export function MoneyInput({ value, onChange, placeholder, required, id }: {
  value: number | ''; onChange: (v: number | '') => void; placeholder?: string; required?: boolean; id?: string;
}) {
  return (
    <div className="money">
      <span className="money-prefix" aria-hidden>₩</span>
      <input
        id={id}
        inputMode="numeric"
        required={required}
        placeholder={placeholder}
        value={value === '' ? '' : value.toLocaleString('ko-KR')}
        onChange={(e) => {
          const digits = e.target.value.replace(/[^0-9]/g, '');
          onChange(digits === '' ? '' : Math.min(Number(digits), 100_000_000));
        }}
      />
    </div>
  );
}

const WEIGHT_PRESETS = [100, 300, 500, 1000, 2000];

/** Estimated weight in grams, with quick presets. */
export function WeightInput({ value, onChange, required, id }: {
  value: number | ''; onChange: (v: number | '') => void; required?: boolean; id?: string;
}) {
  return (
    <div className="weight">
      <div className="money">
        <input
          id={id}
          inputMode="numeric"
          required={required}
          placeholder="300"
          value={value === '' ? '' : value.toLocaleString('ko-KR')}
          onChange={(e) => {
            const digits = e.target.value.replace(/[^0-9]/g, '');
            onChange(digits === '' ? '' : Math.min(Number(digits), 50_000));
          }}
        />
        <span className="money-prefix" aria-hidden>g</span>
      </div>
      <div className="weight-presets">
        {WEIGHT_PRESETS.map((g) => (
          <button key={g} type="button" aria-pressed={value === g} onClick={() => onChange(g)}>
            {g < 1000 ? `${g}g` : `${g / 1000}kg`}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ImagePicker({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const { t } = useI18n();
  const errText = useErrorText();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="image-picker">
      {value ? (
        <div className="image-preview">
          <img src={productPhoto(value, null) ?? ''} alt="" />
          <button type="button" className="link" onClick={() => onChange(null)}>{t('img.remove')}</button>
        </div>
      ) : (
        <button type="button" className="btn btn-quiet btn-small" onClick={() => input.current?.click()} disabled={busy}>
          <Camera size={16} aria-hidden /> {busy ? t('img.uploading') : t('img.add')}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          setErr(null);
          try {
            onChange((await api.upload(file)).url);
          } catch (ex) {
            setErr(errText(ex));
          } finally {
            setBusy(false);
            e.target.value = '';
          }
        }}
      />
      {err && <span className="field-error">{err}</span>}
    </div>
  );
}

export function Modal({ open, onClose, title, eyebrow, mood, hideClose, children }: {
  open: boolean; onClose: () => void; title: string; eyebrow?: string; mood?: Mood; hideClose?: boolean; children: ReactNode;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  // Render at the top of the page so paper-card filters/transforms on ancestors can't trap the dialog.
  return createPortal(
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal${mood ? ' is-letter' : ''}`} role="dialog" aria-modal aria-label={title}>
        {mood && <span className="letter-stamp" aria-hidden><Mascot mood={mood} size={78} /></span>}
        <div className="modal-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="font-display">{title}</h2>
          </div>
          {!hideClose && <button className="modal-close" onClick={onClose}>{t('common.close')}</button>}
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ActionBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`action-bar ${className}`}>{children}</div>;
}

export function Sheet({ title, aside, children, flush }: { title?: string; aside?: ReactNode; children?: ReactNode; flush?: boolean }) {
  return (
    <section className={`card ${flush ? 'is-flush' : ''}`}>
      {(title || aside) && (
        <div className="card-head">
          {title && <h2>{title}</h2>}
          {aside && <div className="card-aside">{aside}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function KV({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="kv">
      <span>{label}</span>
      <span className="kv-value">{children}</span>
    </div>
  );
}

export function initials(name: string): string {
  const clean = name.replace(/\s*\(.*\)\s*$/, '').trim();
  const parts = clean.split(/\s+/);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : clean.slice(0, 2)).toUpperCase();
}

export function Avatar({ name, src, className = '', size }: {
  name: string; src?: string | null; className?: string; size?: number;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const url = broken ? null : assetUrl(src);
  const style = size ? { width: size, height: size, fontSize: Math.round(size * 0.38) } : undefined;
  return (
    <span className={`avatar${url ? ' has-photo' : ''} ${className}`.trim()} style={style} aria-hidden>
      {url ? <img src={url} alt="" onError={() => setBroken(true)} /> : initials(name)}
    </span>
  );
}
