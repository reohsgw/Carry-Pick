import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ReceiptStrip } from '../components/cards';
import { DetailLayout, Screen } from '../components/Layout';
import ProductPicker from '../components/ProductPicker';
import { CurrencyInput, Field, ImagePicker, Mascot, MoneyInput, Notice, Sheet, WeightInput } from '../components/ui';
import { currencyDecimals, currencyOf, currencySymbol, isoDay, krw, maxReward, money, quote } from '../format';
import { ArrowRight } from '../components/icons';
import { useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';
import { markRequestSeen } from '../seen';

export default function NewRequest() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [countryCode, setCountry] = useState(() => {
    const c = params.get('country');
    return c && c !== 'ALL' ? c : 'JP';
  });
  const [productName, setName] = useState(params.get('q') ?? '');
  const [productId, setProductId] = useState<number | null>(() => Number(params.get('productId')) || null);
  const [productLink, setLink] = useState('');
  const [imageUrl, setImage] = useState<string | null>(() => params.get('img'));
  const [options, setOptions] = useState('');
  const [note, setNote] = useState('');
  // The budget is entered in the currency of the country the item is bought in; won is shown alongside.
  const [budgetLocal, setBudgetLocal] = useState<number | ''>('');
  const rates = useQuery({ queryKey: ['fx'], queryFn: api.fx, staleTime: 60 * 60 * 1000 });
  const currency = currencyOf(config, countryCode);
  const decimals = currencyDecimals(currency);
  const rate = currency === 'KRW' ? 1 : rates.data?.krwPerUnit[currency];
  const toLocal = (won: number, r: number) => {
    const f = 10 ** decimals;
    return Math.max(1 / f, Math.round((won / r) * f) / f);
  };
  // A budget suggested in won (from the ranking) is shown in the local currency once rates arrive.
  const suggestedWon = useRef(Number(params.get('budget')) || 0);
  useEffect(() => {
    if (suggestedWon.current && rate) { setBudgetLocal(toLocal(suggestedWon.current, rate)); suggestedWon.current = 0; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rate]);
  // Changing the country keeps the same won value, now in the new currency.
  const lastCountry = useRef(countryCode);
  const lastRate = useRef<number | undefined>(rate);
  useEffect(() => {
    if (lastCountry.current !== countryCode && budgetLocal !== '' && lastRate.current && rate) {
      setBudgetLocal(toLocal(Number(budgetLocal) * lastRate.current, rate));
    }
    lastCountry.current = countryCode;
    lastRate.current = rate;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode, rate]);
  const maxBudget: number | '' = budgetLocal === '' || !rate ? '' : Math.round(Number(budgetLocal) * rate);
  const [reward, setReward] = useState<number | ''>(5000);
  const [deadline, setDeadline] = useState(isoDay(30));
  const [weightGrams, setWeight] = useState<number | ''>(() => Number(params.get('weight')) || '');
  const fromRanking = params.get('from') === 'ranking';

  const create = useMutation({
    mutationFn: () =>
      api.createRequest({
        countryCode, productName, productLink, imageUrl, options, note,
        ...(currency === 'KRW'
          ? { maxBudget: Number(maxBudget) }
          : { budgetLocal: Number(budgetLocal), budgetCurrency: currency }),
        reward: Number(reward || 0), deadline, productId,
        weightGrams: weightGrams === '' ? null : weightGrams,
      }),
    onSuccess: (r) => {
      markRequestSeen(r);
      qc.invalidateQueries({ queryKey: ['myRequests'] });
      navigate('/orders?tab=requests', { replace: true });
    },
  });

  const q = quote(config, Number(maxBudget || 0), Number(reward || 0));
  const rewardCap = maxReward(config, Number(maxBudget || 0));
  const rewardOver = !!maxBudget && Number(reward || 0) > rewardCap;

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <Screen back title={t('req.title')} hideNav wide>
      <div className="whale-say of-hello">
        <Mascot mood="question" className="whale-say-whale" size={96} />
        <div className="whale-say-bubble">
          <p>{t('req.hello')}</p>
        </div>
      </div>

      {fromRanking && <Notice tone="info">{t('req.soldOut', { name: productName })}</Notice>}

      <DetailLayout
        actions={(
          <>
          <button form="request-form" className="btn btn-primary btn-block" disabled={create.isPending || !maxBudget || !weightGrams || rewardOver}>
            {create.isPending ? t('req.posting') : t('req.submit')}
          </button>
          </>
        )}
        as="form" id="request-form" onSubmit={submit}
        aside={(
          <>
            <Sheet title={t('req.youPay')}>
              <ReceiptStrip quote={q} budgetLabel={t('price.itemBudget')} note={t('req.youPayNote')} />
            </Sheet>
            <div className="of-tip">
              <Mascot mood="shop" size={56} />
              <p>{t('req.tip')}</p>
            </div>
          </>
        )}
      >
        <Sheet title={t('req.secItem')}>
          <div className="stack">
            <Field label={t('req.country')}>
              <select value={countryCode} onChange={(e) => setCountry(e.target.value)}>
                {config?.countries.map((c) => <option key={c.code} value={c.code}>{lang === 'ko' ? c.nameKo : c.name}</option>)}
              </select>
            </Field>
            <div className="field">
              <label className="field-label" htmlFor="req-product">{t('req.product')}</label>
              <ProductPicker
                inputId="req-product"
                value={productName}
                productId={productId}
                country={countryCode}
                required
                placeholder={t('req.productPh')}
                onChange={(name, p) => {
                  setName(name);
                  setProductId(p?.id ?? null);
                  if (p?.weightGrams) setWeight(p.weightGrams);
                }}
              />
            </div>
            <Field label={t('w.label')} hint={t('w.hint')}>
              <WeightInput value={weightGrams} onChange={setWeight} required />
            </Field>
            <Field label={t('req.photo')} optional><ImagePicker value={imageUrl} onChange={setImage} /></Field>
            <Field label={t('req.link')} optional>
              <input type="url" value={productLink} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
            </Field>
            <Field label={t('req.options')} optional hint={t('req.optionsHint')}>
              <input value={options} onChange={(e) => setOptions(e.target.value)} maxLength={200} />
            </Field>
          </div>
        </Sheet>

        <Sheet title={t('req.secPrice')}>
          <div className="stack">
            <Field label={currency === 'KRW' ? t('req.budget') : t('req.budgetIn', { cur: currency })} hint={t('req.budgetHint')}>
              {currency === 'KRW'
                ? <MoneyInput value={budgetLocal} onChange={setBudgetLocal} required placeholder="50,000" />
                : <CurrencyInput value={budgetLocal} onChange={setBudgetLocal} symbol={currencySymbol(currency)} decimals={decimals} required
                    placeholder={decimals > 0 ? '30.00' : (rate ? toLocal(50000, rate) : 5000).toLocaleString('en-US', { maximumFractionDigits: 0 })} />}
            </Field>
            {currency !== 'KRW' && !rate && !rates.isLoading && <Notice tone="bad">{t('fx.unavailable')}</Notice>}
            {currency !== 'KRW' && rate && budgetLocal !== '' && maxBudget !== '' && (
              <div className="fx-box" aria-live="polite">
                <div className="fx-box-row">
                  <div className="fx-box-side">
                    <span className="fx-box-label">{t('fx.typed')}</span>
                    <strong className="fx-box-local">{money(Number(budgetLocal), currency)}</strong>
                  </div>
                  <ArrowRight size={20} aria-hidden className="fx-box-arrow" />
                  <div className="fx-box-side is-won">
                    <span className="fx-box-label">{t('fx.inWon')}</span>
                    <strong className="fx-box-won">{krw(maxBudget)}</strong>
                  </div>
                </div>
                <p className="fx-box-rate">
                  {t('fx.rateLine', { cur: currency, rate: rate.toLocaleString('ko-KR', { maximumFractionDigits: rate < 1 ? 4 : 2 }) })}
                  <span className={`fx-box-source${rates.data?.live ? ' is-live' : ''}`}>{t(rates.data?.live ? 'fx.live' : 'fx.fixed')}</span>
                </p>
                <p className="fx-box-note">{t('fx.note')}</p>
              </div>
            )}
            <Field label={t('req.reward')} error={rewardOver}
              hint={maxBudget ? t(rewardOver ? 'reward.over' : 'reward.cap', { amount: krw(rewardCap), pct: Math.round((config?.maxRewardRate ?? 0.5) * 100) }) : t('reward.rule', { pct: Math.round((config?.maxRewardRate ?? 0.5) * 100) })}>
              <MoneyInput value={reward} onChange={setReward} placeholder="5,000" />
            </Field>
            <Field label={t('req.deadline')} hint={t('req.deadlineHint')}>
              <input type="date" value={deadline} min={isoDay(1)} onChange={(e) => setDeadline(e.target.value)} required />
            </Field>
            <Field label={t('req.note')} optional>
              <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={1000} />
            </Field>
          </div>
        </Sheet>

        {create.error && <Notice tone="bad">{errText(create.error)}</Notice>}
      </DetailLayout>

    </Screen>
  );
}
