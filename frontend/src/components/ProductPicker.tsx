import { useEffect, useId, useRef, useState } from 'react';
import { api, type Product } from '../api';
import { useErrorText, useI18n } from '../i18n';
import { Check, Plus } from './icons';

export default function ProductPicker({ value, productId, country, category, onChange, required, placeholder, inputId }: {
  value: string;
  productId: number | null;
  country?: string;
  category?: string;
  onChange: (name: string, product: Product | null) => void;
  required?: boolean;
  placeholder?: string;
  inputId?: string;
}) {
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Product[]>([]);
  const [active, setActive] = useState(-1);
  const [picked, setPicked] = useState<Product | null>(null);
  const [adding, setAdding] = useState(false);
  const [nameKo, setNameKo] = useState('');
  const [nameLocal, setNameLocal] = useState('');
  const [aliases, setAliases] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const shown = (p: Product) => (lang === 'ko' && p.nameKo ? p.nameKo : p.name);
  const others = (p: Product) => [p.name, p.nameKo, p.nameLocal].filter((n) => n && n !== shown(p)).join(' · ');

  useEffect(() => {
    const q = value.trim();
    if (!open || !q || productId) { setHits([]); return; }
    const timer = window.setTimeout(() => {
      api.products(q, country).then((r) => { setHits(r); setActive(-1); }).catch(() => setHits([]));
    }, 200);
    return () => window.clearTimeout(timer);
  }, [value, country, open, productId]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) { setOpen(false); } };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function pick(p: Product) {
    setPicked(p);
    setOpen(false);
    setAdding(false);
    onChange(shown(p), p);
  }

  function unlink() {
    setPicked(null);
    onChange(value, null);
    setOpen(true);
  }

  async function saveNew() {
    setBusy(true);
    setError(null);
    try {
      const p = await api.createProduct({
        name: value.trim(), nameKo: nameKo.trim() || undefined, nameLocal: nameLocal.trim() || undefined,
        aliases: aliases.trim() || undefined, category, countryCode: country && country !== 'ALL' ? country : undefined,
      });
      setNameKo(''); setNameLocal(''); setAliases('');
      pick(p);
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || !hits.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => (i + 1) % hits.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => (i <= 0 ? hits.length - 1 : i - 1)); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); pick(hits[active]); }
    else if (e.key === 'Escape') { setOpen(false); }
  }

  const linked = productId ? picked : null;
  const showList = open && !productId && value.trim().length > 0;

  return (
    <div className="pp" ref={root}>
      <input
        id={inputId}
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        value={value}
        required={required}
        maxLength={120}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onKeyDown={onKey}
        onChange={(e) => { setPicked(null); setOpen(true); onChange(e.target.value, null); }}
      />

      {productId ? (
        <p className="pp-linked">
          <Check size={16} aria-hidden />
          <span>
            {t('pp.linked')}
            {linked && others(linked) && <span className="pp-others"> · {others(linked)}</span>}
          </span>
          <button type="button" className="text-btn is-muted" onClick={unlink}>{t('pp.change')}</button>
        </p>
      ) : (
        <p className="field-hint">{t('pp.hint')}</p>
      )}

      {showList && (
        <div className="pp-panel">
          <ul id={listId} role="listbox" aria-label={t('pp.suggestions')} className="pp-list">
            {hits.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={`pp-option${i === active ? ' is-active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); pick(p); }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="pp-name">{shown(p)}</span>
                {others(p) && <span className="pp-others">{others(p)}</span>}
              </li>
            ))}
          </ul>

          {!adding ? (
            <button type="button" className="pp-add" onMouseDown={(e) => e.preventDefault()} onClick={() => setAdding(true)}>
              <Plus size={16} aria-hidden /> {t('pp.addNew', { name: value.trim() })}
            </button>
          ) : (
            <div className="pp-new">
              <p className="pp-new-title">{t('pp.newTitle', { name: value.trim() })}</p>
              <label>
                <span>{t('pp.nameKo')}</span>
                <input value={nameKo} onChange={(e) => setNameKo(e.target.value)} maxLength={120} placeholder="예: 도쿄 바나나" />
              </label>
              <label>
                <span>{t('pp.nameLocal')}</span>
                <input value={nameLocal} onChange={(e) => setNameLocal(e.target.value)} maxLength={120} placeholder="例: 東京ばな奈" />
              </label>
              <label>
                <span>{t('pp.aliases')}</span>
                <input value={aliases} onChange={(e) => setAliases(e.target.value)} maxLength={500} placeholder={t('pp.aliasesPh')} />
              </label>
              {error && <p className="field-error">{error}</p>}
              <div className="pp-new-actions">
                <button type="button" className="btn btn-quiet btn-small" onClick={() => setAdding(false)}>{t('pp.cancel')}</button>
                <button type="button" className="btn btn-primary btn-small" disabled={busy || !value.trim()} onClick={saveNew}>
                  {busy ? t('pp.saving') : t('pp.save')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
