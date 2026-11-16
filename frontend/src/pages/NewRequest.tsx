import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { ReceiptStrip } from '../components/cards';
import { DetailLayout, Screen } from '../components/Layout';
import ProductPicker from '../components/ProductPicker';
import { Field, ImagePicker, MoneyInput, Notice, Sheet } from '../components/ui';
import { isoDay, quote } from '../format';
import { useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';

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
  const [productId, setProductId] = useState<number | null>(null);
  const [productLink, setLink] = useState('');
  const [imageUrl, setImage] = useState<string | null>(null);
  const [options, setOptions] = useState('');
  const [note, setNote] = useState('');
  const [maxBudget, setBudget] = useState<number | ''>('');
  const [reward, setReward] = useState<number | ''>(5000);
  const [deadline, setDeadline] = useState(isoDay(30));

  const create = useMutation({
    mutationFn: () =>
      api.createRequest({
        countryCode, productName, productLink, imageUrl, options, note,
        maxBudget: Number(maxBudget), reward: Number(reward || 0), deadline, productId,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myRequests'] });
      navigate('/orders?tab=requests', { replace: true });
    },
  });

  const q = quote(config, Number(maxBudget || 0), Number(reward || 0));

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  return (
    <Screen back title={t('req.title')} hideNav wide>
      <DetailLayout
        actions={(
          <>
          <button form="request-form" className="btn btn-primary btn-block" disabled={create.isPending || !maxBudget}>
            {create.isPending ? t('req.posting') : t('req.submit')}
          </button>
          </>
        )}
        as="form" id="request-form" onSubmit={submit}
        aside={(
            <Sheet title={t('req.youPay')}>
              <ReceiptStrip quote={q} budgetLabel={t('price.itemBudget')} note={t('req.youPayNote')} />
            </Sheet>
        )}
      >
        <Sheet>
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
                onChange={(name, p) => { setName(name); setProductId(p?.id ?? null); }}
              />
            </div>
            <Field label={t('req.photo')} optional><ImagePicker value={imageUrl} onChange={setImage} /></Field>
            <Field label={t('req.link')} optional>
              <input type="url" value={productLink} onChange={(e) => setLink(e.target.value)} placeholder="https://" />
            </Field>
            <Field label={t('req.options')} optional hint={t('req.optionsHint')}>
              <input value={options} onChange={(e) => setOptions(e.target.value)} maxLength={200} />
            </Field>
          </div>
        </Sheet>

        <Sheet>
          <div className="stack">
            <Field label={t('req.budget')} hint={t('req.budgetHint')}>
              <MoneyInput value={maxBudget} onChange={setBudget} required placeholder="50,000" />
            </Field>
            <Field label={t('req.reward')}>
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
