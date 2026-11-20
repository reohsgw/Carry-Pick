import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ReceiptStrip } from '../components/cards';
import { DetailLayout, Screen } from '../components/Layout';
import ProductPicker from '../components/ProductPicker';
import { DualMoneyInput, Field, Loading, Mascot, ImagePicker, MoneyInput, Notice, Sheet, useDualAmount, WeightInput } from '../components/ui';
import { currencyDecimals, currencyOf, currencySymbol, isoDay, krw, maxReward, quote } from '../format';
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
  const routeId = useParams().id;
  const editId = routeId ? Number(routeId) : null;
  const existing = useQuery({ queryKey: ['request', editId], queryFn: () => api.request(editId!), enabled: !!editId });

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
  const rates = useQuery({ queryKey: ['fx'], queryFn: api.fx, staleTime: 60 * 60 * 1000 });
  const currency = currencyOf(config, countryCode);
  const decimals = currencyDecimals(currency);
  const rate = currency === 'KRW' ? 1 : rates.data?.krwPerUnit[currency];
  const foreign = currency !== 'KRW';
  const budget = useDualAmount(foreign ? rate : null, decimals);
  const suggestedWon = useRef(Number(params.get('budget')) || 0);
  useEffect(() => {
    if (suggestedWon.current && rate) { budget.setWon(suggestedWon.current); suggestedWon.current = 0; }
  }, [rate]);
  const lastCountry = useRef(countryCode);
  const lastRate = useRef<number | undefined>(rate);
  useEffect(() => {
    if (lastCountry.current !== countryCode && budget.amount !== '' && lastRate.current && rate && budget.mode === 'local') {
      const f = 10 ** decimals;
      budget.setAmount(Math.max(1 / f, Math.round((Number(budget.amount) * lastRate.current / rate) * f) / f));
    }
    lastCountry.current = countryCode;
    lastRate.current = rate;
  }, [countryCode, rate]);
  const loaded = useRef(false);
  useEffect(() => {
    const r = existing.data;
    if (!r || loaded.current) return;
    loaded.current = true;
    lastCountry.current = r.countryCode;
    setCountry(r.countryCode);
    setName(r.productName);
    setProductId(r.product?.id ?? null);
    setLink(r.productLink ?? '');
    setImage(r.imageUrl);
    setOptions(r.options ?? '');
    setNote(r.note ?? '');
    if (r.budgetLocal != null) budget.setLocal(Number(r.budgetLocal)); else budget.setWon(r.maxBudget);
    setReward(r.reward);
    setDeadline(r.deadline);
    setWeight(r.weightGrams ?? '');
  }, [existing.data]);
  const maxBudget: number | '' = foreign ? budget.won : budget.amount;
  const [reward, setReward] = useState<number | ''>(5000);
  const [deadline, setDeadline] = useState(isoDay(30));
  const [weightGrams, setWeight] = useState<number | ''>(() => Number(params.get('weight')) || '');
  const fromRanking = params.get('from') === 'ranking';

  const budgetBody = () => {
    const r = existing.data;
    if (r && countryCode === r.countryCode) {
      const same = r.budgetLocal != null
        ? (budget.mode === 'local' ? Number(budget.amount) === Number(r.budgetLocal) : Number(budget.won) === Math.round(Number(r.budgetLocal) * (rate ?? 0)))
        : Number(maxBudget) === r.maxBudget;
      if (same) return r.budgetLocal != null ? { budgetLocal: Number(r.budgetLocal), budgetCurrency: r.budgetCurrency ?? currency } : { maxBudget: r.maxBudget };
    }
    return !foreign || budget.mode === 'won'
      ? { maxBudget: Number(maxBudget) }
      : { budgetLocal: Number(budget.amount), budgetCurrency: currency };
  };
  const create = useMutation({
    mutationFn: () => {
      const body = {
        countryCode, productName, productLink, imageUrl, options, note,
        ...budgetBody(),
        reward: Number(reward || 0), deadline, productId,
        weightGrams: weightGrams === '' ? null : weightGrams,
      };
      return editId ? api.updateRequest(editId, body) : api.createRequest(body);
    },
    onSuccess: (r) => {
      markRequestSeen(r);
      qc.invalidateQueries();
      navigate(editId ? `/my-requests/${r.id}` : '/orders?tab=requests', { replace: true });
    },
  });

  const q = quote(config, Number(maxBudget || 0), Number(reward || 0));
  const rewardCap = maxReward(config, Number(maxBudget || 0));
  const rewardOver = !!maxBudget && Number(reward || 0) > rewardCap;

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  if (editId && existing.isLoading) return <Screen back title={t('req.edit')} hideNav><Loading /></Screen>;

  return (
    <Screen back title={editId ? t('req.edit') : t('req.title')} hideNav wide>
      <div className="live-say req-say">
        <Mascot mood="question" className="live-say-whale" size={76} />
        <p className="live-say-bubble">{editId ? t('req.editNote') : t('req.hello')}</p>
      </div>

      {fromRanking && <Notice tone="info">{t('req.soldOut', { name: productName })}</Notice>}

      <DetailLayout
        actions={(
          <>
          <button form="request-form" className="btn btn-primary btn-block" disabled={create.isPending || !maxBudget || !weightGrams || rewardOver}>
            {create.isPending ? t('req.posting') : editId ? t('of.saveChanges') : t('req.submit')}
          </button>
          </>
        )}
        as="form" id="request-form" onSubmit={submit}
        aside={(
          <>
            <Sheet title={t('req.youPay')}>
              <ReceiptStrip quote={q} budgetLabel={t('price.itemBudget')} note={t('req.youPayNote')} />
            </Sheet>
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
            <Field label={t('req.budget')} info={t('req.budgetHint')}>
              {!foreign
                ? <MoneyInput value={budget.amount} onChange={budget.setAmount} required placeholder="50,000" />
                : <DualMoneyInput dual={budget} currency={currency} symbol={currencySymbol(currency)} decimals={decimals} required
                    rate={rate} rateNote={t(rates.data?.live ? 'fx.live' : 'fx.fixed')} placeholder="5,000" wonPlaceholder="50,000" />}
            </Field>
            {foreign && !rate && !rates.isLoading && <Notice tone="bad">{t('fx.unavailable')}</Notice>}
            <Field label={t('req.reward')} error={rewardOver}
              hint={rewardOver ? t('reward.over', { amount: krw(rewardCap), pct: Math.round((config?.maxRewardRate ?? 0.5) * 100) }) : undefined}>
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
