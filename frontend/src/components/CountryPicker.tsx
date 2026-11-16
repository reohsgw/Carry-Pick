import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from './icons';
import { useCountry } from '../country';
import { ALL_COUNTRIES } from '../format';
import { useI18n } from '../i18n';
import { useSession } from '../session';

export default function CountryPicker() {
  const { config } = useSession();
  const { lang, t } = useI18n();
  const { country, setCountry } = useCountry();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const all = { code: ALL_COUNTRIES, name: 'All countries', nameKo: '전체 국가', flag: '🌐' };
  const countries = config?.countries?.length ? [all, ...config.countries] : [];
  const current = countries.find((c) => c.code === country);
  const label = (c: { name: string; nameKo: string }) => (lang === 'ko' ? c.nameKo : c.name);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (!countries.length) return null;

  return (
    <div className="country-picker" ref={root}>
      <button
        type="button"
        className="country-picker-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('home.destEyebrow')}: ${current ? label(current) : country}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="country-picker-flag" aria-hidden>{current?.flag ?? '🌐'}</span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open && (
        <ul className="country-picker-menu" role="listbox" aria-label={t('home.destEyebrow')}>
          {countries.map((c) => (
            <li key={c.code} role="option" aria-selected={c.code === country}>
              <button
                type="button"
                onClick={() => { setCountry(c.code); setOpen(false); }}
              >
                <span className="country-picker-flag" aria-hidden>{c.flag}</span>
                <span className="country-picker-name">{label(c)}</span>
                {c.code === country && <Check size={16} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
