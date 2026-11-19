import { ArrowRight } from './icons';
import { currencyDecimals, krw, money, rateUnit } from '../format';

const roundTo = (v: number, cur: string) => { const f = 10 ** currencyDecimals(cur); return Math.round(v * f) / f; };
import { useI18n, type Key } from '../i18n';

/**
 * A foreign-currency amount and its won value, drawn as a small airmail envelope:
 * striped border, a folded flap, the amounts written across the middle, the rate as a postage stamp
 * and where the rate comes from as a postmark.
 */
export function FxBox({ amount, currency, won, rate, source, sourceLabel, fromLabel = 'fx.typed', toLabel = 'fx.inWon', note, typedWon }: {
  amount: number;
  currency: string;
  won: number;
  rate: number;
  /** live: today's rate · fixed: standard fallback rate · locked: the rate fixed for this order or request */
  source: 'live' | 'fixed' | 'locked';
  /** Overrides the postmark text, e.g. a rate fixed when a request was posted. */
  sourceLabel?: Key;
  fromLabel?: Key;
  toLabel?: Key;
  note?: string;
  /** The person typed won: show won first and the local amount it comes to. */
  typedWon?: boolean;
}) {
  const { t } = useI18n();
  const unit = rateUnit(currency);
  const perUnit = rate * unit;
  const rateText = perUnit.toLocaleString('ko-KR', { maximumFractionDigits: perUnit < 1 ? 4 : 2 });
  return (
    <div className="fx-env" aria-live="polite">
      <div className="fx-env-row">
        <div className="fx-env-side">
          <span className="fx-env-label">{t(fromLabel)}</span>
          <strong className="fx-env-local">{typedWon ? krw(won) : money(amount, currency)}</strong>
        </div>
        <ArrowRight size={20} aria-hidden className="fx-env-arrow" />
        <div className="fx-env-side is-won">
          <span className="fx-env-label">{typedWon ? t('fx.inLocal', { cur: currency }) : t(toLabel)}</span>
          <strong className="fx-env-won">{typedWon ? money(roundTo(amount, currency), currency) : krw(won)}</strong>
        </div>
      </div>
      <div className="fx-env-foot">
        <span className="fx-env-stamp" aria-label={t('fx.rateLine', { n: unit, cur: currency, rate: rateText })}>
          <small>{unit} {currency}</small>
          <b>₩{rateText}</b>
        </span>
        <span className={`fx-env-postmark is-${source}`}>{t(sourceLabel ?? (source === 'live' ? 'fx.live' : source === 'fixed' ? 'fx.fixed' : 'fx.locked'))}</span>
        {note && <p className="fx-env-note">{note}</p>}
      </div>
    </div>
  );
}
