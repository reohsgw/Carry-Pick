import { ArrowRight } from './icons';
import { krw, money } from '../format';
import { useI18n, type Key } from '../i18n';

/**
 * A foreign-currency amount and its won value, drawn as a small airmail envelope:
 * striped border, a folded flap, the amounts written across the middle, the rate as a postage stamp
 * and where the rate comes from as a postmark.
 */
export function FxBox({ amount, currency, won, rate, source, sourceLabel, fromLabel = 'fx.typed', toLabel = 'fx.inWon', note }: {
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
}) {
  const { t } = useI18n();
  const rateText = rate.toLocaleString('ko-KR', { maximumFractionDigits: rate < 1 ? 4 : 2 });
  return (
    <div className="fx-env" aria-live="polite">
      <div className="fx-env-row">
        <div className="fx-env-side">
          <span className="fx-env-label">{t(fromLabel)}</span>
          <strong className="fx-env-local">{money(amount, currency)}</strong>
        </div>
        <ArrowRight size={20} aria-hidden className="fx-env-arrow" />
        <div className="fx-env-side is-won">
          <span className="fx-env-label">{t(toLabel)}</span>
          <strong className="fx-env-won">{krw(won)}</strong>
        </div>
      </div>
      <div className="fx-env-foot">
        <span className="fx-env-stamp" aria-label={t('fx.rateLine', { cur: currency, rate: rateText })}>
          <small>1 {currency}</small>
          <b>₩{rateText}</b>
        </span>
        <span className={`fx-env-postmark is-${source}`}>{t(sourceLabel ?? (source === 'live' ? 'fx.live' : source === 'fixed' ? 'fx.fixed' : 'fx.locked'))}</span>
        {note && <p className="fx-env-note">{note}</p>}
      </div>
    </div>
  );
}
