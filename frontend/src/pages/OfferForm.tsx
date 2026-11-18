import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPinned, Receipt, ShoppingBag } from '../components/icons';
import { api } from '../api';
import { ReceiptStrip } from '../components/cards';
import { DetailLayout, Screen } from '../components/Layout';
import ProductPicker from '../components/ProductPicker';
import { Empty, Field, ImagePicker, Loading, Mascot, MoneyInput, Notice, Sheet, WeightInput } from '../components/ui';
import { CATEGORIES, cityCode, daysUntil, krw, maxReward, quote, shortDate } from '../format';
import { useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';
import { useConfirm } from '../components/confirm';
import { PayoutRequired } from '../components/payout';

export default function OfferForm() {
  const ask = useConfirm();
  const routeId = useParams().id;
  const editId = routeId ? Number(routeId) : null;
  const [params] = useSearchParams();
  const { config, user } = useSession();
  const needsPayout = !user?.payout;
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const trips = useQuery({ queryKey: ['myTrips'], queryFn: api.myTrips });
  const existing = useQuery({ queryKey: ['offer', editId], queryFn: () => api.offer(editId!), enabled: !!editId });

  const [tripId, setTripId] = useState<number | ''>(params.get('trip') ? Number(params.get('trip')) : '');
  const [productName, setName] = useState('');
  const [productId, setProductId] = useState<number | null>(null);
  const [store, setStore] = useState('');
  const [category, setCategory] = useState('Food');
  const [description, setDescription] = useState('');
  const [imageUrl, setImage] = useState<string | null>(null);
  const [estPrice, setPrice] = useState<number | ''>('');
  const [reward, setReward] = useState<number | ''>(5000);
  const [quantity, setQuantity] = useState(1);
  const [bought, setBought] = useState(false);
  const [receiptUrl, setReceipt] = useState<string | null>(null);
  const [weightGrams, setWeight] = useState<number | ''>('');

  useEffect(() => {
    const o = existing.data;
    if (!o) return;
    setTripId(o.trip.id); setName(o.productName); setProductId(o.product?.id ?? null); setStore(o.store ?? ''); setCategory(o.category ?? 'Other');
    setDescription(o.description ?? ''); setImage(o.imageUrl); setPrice(o.estPrice); setReward(o.reward);
    setQuantity(Math.max(o.quantity, 1));
    setBought(!!o.receiptUrl); setReceipt(o.receiptUrl);
    setWeight(o.weightGrams ?? '');
  }, [existing.data]);

  const futureTrips = (trips.data ?? []).filter((tr) => daysUntil(tr.departDate) > 0);
  useEffect(() => {
    if (tripId === '' && futureTrips.length > 0 && !editId) setTripId(futureTrips[0].id);
  }, [futureTrips, tripId, editId]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        tripId: Number(tripId), productName, store, category, description, imageUrl,
        estPrice: Number(estPrice), reward: Number(reward || 0), quantity,
        receiptUrl: bought ? receiptUrl : null, productId,
        weightGrams: weightGrams === '' ? null : weightGrams,
      };
      return editId ? api.updateOffer(editId, body) : api.createOffer(body);
    },
    onSuccess: (o) => {
      qc.invalidateQueries({ queryKey: ['myOffers'] });
      qc.invalidateQueries({ queryKey: ['offer', o.id] });
      qc.invalidateQueries({ queryKey: ['board'] });
      navigate(`/offers/${o.id}`, { replace: true, state: editId ? { edited: true } : { posted: true } });
    },
  });
  const close = useMutation({
    mutationFn: () => api.closeOffer(editId!),
    onSuccess: () => { qc.invalidateQueries(); navigate('/me', { replace: true }); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  if (trips.isLoading || (editId && existing.isLoading)) return <Screen back title={t('of.new')}><Loading /></Screen>;
  if (!editId && futureTrips.length === 0) {
    return (
      <Screen back title={t('of.new')} hideNav>
        <Empty icon={MapPinned} title={t('of.needTrip')}>
          <Link to="/t/trips/new" className="btn btn-primary">{t('t.registerTrip')}</Link>
        </Empty>
      </Screen>
    );
  }

  const q = quote(config, Number(estPrice || 0), Number(reward || 0));
  const pct = Math.round((config?.maxRewardRate ?? 0.5) * 100);
  const rewardCap = maxReward(config, Number(estPrice || 0));
  const rewardOver = !!estPrice && Number(reward || 0) > rewardCap;

  const submitButton = (
    <button form="offer-form" className="btn btn-primary btn-block" disabled={save.isPending || needsPayout || !estPrice || !weightGrams || rewardOver || tripId === '' || (bought && !receiptUrl)}>
      {save.isPending ? t('order.saving') : editId ? t('of.saveChanges') : t('of.publish')}
    </button>
  );

  return (
    <Screen back title={editId ? t('of.edit') : t('of.new')} hideNav wide>
      <div className="whale-say of-hello">
        <Mascot mood="shop" className="whale-say-whale" size={96} />
        <div className="whale-say-bubble">
          <p>{editId ? t('of.helloEdit') : t('of.hello')}</p>
        </div>
      </div>

      <DetailLayout
        as="form" id="offer-form" onSubmit={submit}
        actions={submitButton}
        aside={(
          <>
            <Sheet title={t('of.preview')}>
              <ReceiptStrip quote={q} budgetLabel={bought ? t('offer.boughtPrice') : undefined} />
            </Sheet>
            <div className="of-tip">
              <Mascot mood="question" size={56} />
              <p>{t('of.tip')}</p>
            </div>
          </>
        )}
      >
        {needsPayout && <PayoutRequired />}
        <Sheet title={t('of.secItem')}>
          <div className="stack">
            <Field label={t('of.trip')}>
              <select value={tripId} onChange={(e) => setTripId(Number(e.target.value))} required disabled={!!editId}>
                {(editId && existing.data ? [existing.data.trip] : futureTrips).map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {cityCode(tr.city, tr.countryCode)} {tr.city ?? ''}, {shortDate(tr.departDate, lang)} – {shortDate(tr.returnDate, lang)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="field">
              <label className="field-label" htmlFor="of-product">{t('of.product')}</label>
              <ProductPicker
                inputId="of-product"
                value={productName}
                productId={productId}
                country={futureTrips.find((tr) => tr.id === tripId)?.countryCode}
                category={category}
                required
                onChange={(name, p) => {
                  setName(name);
                  setProductId(p?.id ?? null);
                  if (p?.category) setCategory(p.category);
                  if (p?.weightGrams) setWeight(p.weightGrams);
                }}
              />
            </div>
            <div className="two-col">
              <Field label={t('of.category')}>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c}`)}</option>)}
                </select>
              </Field>
              <Field label={t('of.store')} optional><input value={store} onChange={(e) => setStore(e.target.value)} maxLength={80} /></Field>
            </div>
            <Field label={t('w.label')} hint={t('w.hint')}>
              <WeightInput value={weightGrams} onChange={setWeight} required />
            </Field>
            <Field label={t('req.photo')} optional><ImagePicker value={imageUrl} onChange={setImage} /></Field>
          </div>
        </Sheet>

        <Sheet title={t('of.secPrice')}>
          <div className="stack">
            <div className="ho-tiles" role="group" aria-label={t('of.boughtQ')}>
              <button type="button" className="ho-tile" aria-pressed={!bought} onClick={() => setBought(false)}>
                <span className="ho-tile-icon"><ShoppingBag size={24} aria-hidden /></span>
                <b>{t('of.notBought')}</b>
                <small>{t('of.notBoughtSub')}</small>
              </button>
              <button type="button" className="ho-tile" aria-pressed={bought} onClick={() => setBought(true)}>
                <span className="ho-tile-icon"><Receipt size={24} aria-hidden /></span>
                <b>{t('of.bought')}</b>
                <small>{t('of.boughtSub')}</small>
              </button>
            </div>
            {bought && (
              <Field label={t('buy.receipt')} hint={t('of.receiptHint')}>
                <ImagePicker value={receiptUrl} onChange={setReceipt} />
              </Field>
            )}
            <Field label={bought ? t('of.boughtPrice') : t('of.price')} hint={bought ? t('of.boughtPriceHint') : t('of.priceHint')}>
              <MoneyInput value={estPrice} onChange={setPrice} required placeholder="20,000" />
            </Field>
            <div className="two-col">
              <Field label={t('of.reward')} error={rewardOver}
                hint={estPrice ? t(rewardOver ? 'reward.over' : 'reward.cap', { amount: krw(rewardCap), pct }) : t('reward.rule', { pct })}>
                <MoneyInput value={reward} onChange={setReward} />
              </Field>
              <Field label={t('of.qty')}>
                <input type="number" min={1} max={99} value={quantity} onChange={(e) => setQuantity(Math.max(1, Math.min(99, Number(e.target.value))))} />
              </Field>
            </div>
            <Field label={t('of.notes')} optional>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={1000} />
            </Field>
          </div>
        </Sheet>

        {(save.error || close.error) && <Notice tone="bad">{errText(save.error ?? close.error)}</Notice>}
        {editId && existing.data?.status !== 'CLOSED' && (
          <button type="button" className="link danger center-block"
            onClick={async () => (await ask({ message: t('of.closeConfirm'), mood: 'alert', danger: true })) && close.mutate()}>
            {t('of.close')}
          </button>
        )}
      </DetailLayout>
    </Screen>
  );
}
