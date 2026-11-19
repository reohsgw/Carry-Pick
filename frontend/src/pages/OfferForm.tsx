import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MapPinned, Receipt, ShoppingBag } from '../components/icons';
import { FxBox } from '../components/FxBox';
import { api, assetUrl, type ReceiptScan } from '../api';
import { ReceiptStrip } from '../components/cards';
import { ReceiptCapture } from '../components/receipt';
import { DetailLayout, Screen } from '../components/Layout';
import ProductPicker from '../components/ProductPicker';
import { DualMoneyInput, Empty, Field, ImagePicker, Loading, MoneyInput, Notice, Sheet, useDualAmount, WeightInput } from '../components/ui';
import { CATEGORIES, cityCode, currencyDecimals, currencyOf, currencySymbol, daysUntil, krw, maxReward, money, quote, shortDate } from '../format';
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
  // Price per item in the trip country's currency (e.g. ¥1,500); its won value follows today's rate.
  const [reward, setReward] = useState<number | ''>(5000);
  const [quantity, setQuantity] = useState(1);
  const [bought, setBought] = useState(false);
  const [receiptUrl, setReceipt] = useState<string | null>(null);
  // AI receipt check for "already bought": the photo, the AI result, and the receipt already saved on the offer.
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptScan, setReceiptScan] = useState<ReceiptScan | null>(null);
  const [savedReceipt, setSavedReceipt] = useState<string | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUploadErr, setReceiptUploadErr] = useState<unknown>(null);
  const [weightGrams, setWeight] = useState<number | ''>('');

  useEffect(() => {
    const o = existing.data;
    if (!o) return;
    setTripId(o.trip.id); setName(o.productName); setProductId(o.product?.id ?? null); setStore(o.store ?? ''); setCategory(o.category ?? 'Other');
    setDescription(o.description ?? ''); setImage(o.imageUrl); setReward(o.reward);
    if (o.priceLocal != null) price.setLocal(Number(o.priceLocal)); else price.setWon(o.estPrice);
    setQuantity(Math.max(o.quantity, 1));
    setBought(!!o.receiptUrl); setReceipt(o.receiptUrl); setSavedReceipt(o.receiptUrl);
    setWeight(o.weightGrams ?? '');
  }, [existing.data]);

  // Products can be posted until the day before the traveler returns.
  const futureTrips = (trips.data ?? []).filter((tr) => daysUntil(tr.returnDate) > 0);

  const rates = useQuery({ queryKey: ['fx'], queryFn: api.fx, staleTime: 60 * 60 * 1000 });
  const tripCountry = (trips.data ?? []).find((tr) => tr.id === tripId)?.countryCode ?? existing.data?.countryCode ?? 'KRW';
  const currency = currencyOf(config, tripCountry);
  const decimals = currencyDecimals(currency);
  const rate = currency === 'KRW' ? 1 : rates.data?.krwPerUnit[currency];
  const local = currency !== 'KRW' && !!rate;
  const roundLocal = (v: number) => { const f = 10 ** decimals; return Math.round(v * f) / f; };
  // Price per item, typed in the trip country's currency or in won (switch on the box).
  const price = useDualAmount(local ? rate : null, decimals);
  // Won price of one item (used for the price summary and the reward cap).
  const estPrice: number | '' = local ? price.won : price.amount;
  useEffect(() => {
    if (tripId === '' && futureTrips.length > 0 && !editId) setTripId(futureTrips[0].id);
  }, [futureTrips, tripId, editId]);

  const save = useMutation({
    mutationFn: () => {
      const body = {
        tripId: Number(tripId), productName, store, category, description, imageUrl,
        // Typed in won → sent in won (the server stores the local price too); typed in ¥ → sent in ¥.
        ...(local && price.mode === 'local' ? { priceLocal: Number(price.amount), priceCurrency: currency } : { estPrice: Number(estPrice) }),
        reward: Number(reward || 0), quantity,
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
  const remove = useMutation({
    mutationFn: () => api.deleteOffer(editId!),
    onSuccess: () => { qc.invalidateQueries(); navigate('/me', { replace: true }); },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    save.mutate();
  }

  // The receipt total covers every unit, so the per-item price follows the quantity. Read in the receipt's own
  // currency when it matches the trip country (¥ receipt for a Japan trip), otherwise in won.
  const receiptTotal = receiptScan && !receiptScan.mock
    ? (local ? (receiptScan.currency === currency ? receiptScan.total : null) : receiptScan.totalKrw)
    : null;
  useEffect(() => {
    if (bought && receiptTotal != null) {
      if (local) price.setLocal(roundLocal(receiptTotal / Math.max(quantity, 1)));
      else price.setAmount(Math.round(receiptTotal / Math.max(quantity, 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantity, receiptTotal, bought]);

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

  // "Already bought" needs an AI-checked receipt. A receipt saved earlier on this offer still counts.
  const receiptChecked = !!receiptScan || (!!receiptUrl && !receiptFile && receiptUrl === savedReceipt);
  const receiptReady = !bought || (!!receiptUrl && receiptChecked && !receiptUploading);
  const enteredTotal = Number(price.local || 0) * quantity;
  const scanTotal = receiptTotal;
  const receiptMismatch = bought && scanTotal != null && price.amount !== ''
    && Math.abs(enteredTotal - scanTotal) > Math.max(local ? 1 : 1000, scanTotal * 0.05);
  const showAmount = (v: number) => (local ? money(v, currency) : krw(v));
  const scanCurrencyOff = bought && local && !!receiptScan && !receiptScan.mock && !!receiptScan.currency && receiptScan.currency !== currency;

  async function pickReceipt(file: File | null) {
    setReceiptFile(file);
    setReceiptScan(null);
    setReceiptUploadErr(null);
    if (!file) { setReceipt(null); return; }
    setReceiptUploading(true);
    try {
      setReceipt((await api.upload(file)).url);
    } catch (e) {
      setReceipt(null);
      setReceiptUploadErr(e);
    } finally {
      setReceiptUploading(false);
    }
  }

  function onReceiptScan(scan: ReceiptScan | null) {
    setReceiptScan(scan);
  }

  const submitButton = (
    <button form="offer-form" className="btn btn-primary btn-block" disabled={save.isPending || needsPayout || !estPrice || (currency !== 'KRW' && !rate) || !weightGrams || rewardOver || tripId === '' || !receiptReady}>
      {save.isPending ? t('order.saving') : editId ? t('of.saveChanges') : t('of.publish')}
    </button>
  );

  return (
    <Screen back title={editId ? t('of.edit') : t('of.new')} hideNav wide>
      <div className="whale-say of-hello">
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
              <div className="stack">
                {savedReceipt && !receiptFile && receiptUrl === savedReceipt && (
                  <Field label={t('of.currentReceipt')}>
                    <img className="receipt-small" src={assetUrl(savedReceipt) ?? ''} alt={t('of.currentReceipt')} />
                  </Field>
                )}
                <ReceiptCapture file={receiptFile} onFile={pickReceipt} onAmount={() => {}} onScan={onReceiptScan} autoScan />
                <p className="field-hint">{t('of.receiptHint')}</p>
                {receiptUploadErr != null && <Notice tone="bad">{errText(receiptUploadErr)}</Notice>}
                {receiptFile && !receiptScan && !receiptUploading && <Notice tone="warn">{t('of.scanRequired')}</Notice>}
                {receiptScan && !receiptMismatch && <Notice tone="good">{t('of.scanOk')}</Notice>}
                {receiptMismatch && (
                  <Notice tone="bad">{t('of.scanMismatch', { amount: showAmount(scanTotal ?? 0), entered: showAmount(enteredTotal) })}</Notice>
                )}
                {scanCurrencyOff && <Notice tone="warn">{t('buy.currencyMismatch', { found: receiptScan?.currency ?? '', cur: currency })}</Notice>}
              </div>
            )}
            <Field
              label={bought ? t('of.boughtPrice') : t('of.price')}
              hint={local ? t(bought ? 'of.boughtPriceHintLocal' : 'of.priceHintLocal') : bought ? t('of.boughtPriceHint') : t('of.priceHint')}>
              {local
                ? <DualMoneyInput dual={price} currency={currency} symbol={currencySymbol(currency)} decimals={decimals} required
                    placeholder="5,000" wonPlaceholder="20,000" />
                : <MoneyInput value={price.amount} onChange={price.setAmount} required placeholder="20,000" />}
            </Field>
            {currency !== 'KRW' && !rate && !rates.isLoading && <Notice tone="bad">{t('fx.unavailable')}</Notice>}
            {local && price.local !== '' && estPrice !== '' && (
              <FxBox amount={Number(price.local)} currency={currency} won={estPrice} rate={rate ?? 0} typedWon={price.mode === 'won'}
                source={rates.data?.live ? 'live' : 'fixed'} note={t('fx.offerNote')} />
            )}
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

        {(save.error || close.error || remove.error) && <Notice tone="bad">{errText(save.error ?? close.error ?? remove.error)}</Notice>}
        {editId && (
          <div className="offer-danger-actions">
            {existing.data?.status !== 'CLOSED' && (
              <button type="button" className="link danger"
                onClick={async () => (await ask({ message: t('of.closeConfirm'), mood: 'alert', danger: true })) && close.mutate()}>
                {t('of.close')}
              </button>
            )}
            <button type="button" className="link danger" disabled={remove.isPending}
              onClick={async () => (await ask({ message: t('of.deleteConfirm'), mood: 'alert', okLabel: t('of.delete'), danger: true })) && remove.mutate()}>
              {t('of.delete')}
            </button>
          </div>
        )}
      </DetailLayout>
    </Screen>
  );
}
