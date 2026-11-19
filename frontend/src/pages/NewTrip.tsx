import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import { Screen } from '../components/Layout';
import { ActionBar, Field, Loading, Notice, Sheet } from '../components/ui';
import { isoDay } from '../format';
import { useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';
import { useConfirm } from '../components/confirm';

export default function NewTrip() {
  const { config } = useSession();
  const { t, lang } = useI18n();
  const errText = useErrorText();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [countryCode, setCountry] = useState('JP');
  const [city, setCity] = useState('');
  const [departDate, setDepart] = useState(isoDay(7));
  const [returnDate, setReturn] = useState(isoDay(14));
  const [luggageNote, setLuggage] = useState('');

  // /t/trips/:id/edit edits an existing trip; /t/trips/new creates one.
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const mine = useQuery({ queryKey: ['myTrips'], queryFn: api.myTrips, enabled: editId != null });
  const existing = editId != null ? mine.data?.find((tr) => tr.id === editId) : undefined;
  useEffect(() => {
    if (!existing) return;
    setCountry(existing.countryCode); setCity(existing.city ?? ''); setDepart(existing.departDate);
    setReturn(existing.returnDate); setLuggage(existing.luggageNote ?? '');
  }, [existing]);

  const create = useMutation({
    mutationFn: () => {
      const body = { countryCode, city, departDate, returnDate, luggageNote };
      return editId != null ? api.updateTrip(editId, body) : api.createTrip(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myTrips'] });
      qc.invalidateQueries({ queryKey: ['board'] });
      qc.invalidateQueries({ queryKey: ['offers'] });
      navigate('/me', { replace: true });
    },
  });

  const confirm = useConfirm();
  const remove = useMutation({
    mutationFn: () => api.deleteTrip(editId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['myTrips'] });
      qc.invalidateQueries({ queryKey: ['board'] });
      qc.invalidateQueries({ queryKey: ['offers'] });
      qc.invalidateQueries({ queryKey: ['myOffers'] });
      navigate('/me', { replace: true });
    },
  });
  async function deleteTrip() {
    if (await confirm({ message: t('trip.deleteConfirm'), mood: 'alert', okLabel: t('trip.delete'), danger: true })) remove.mutate();
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    create.mutate();
  }

  if (editId != null && mine.isLoading) return <Screen back title={t('trip.editTitle')} hideNav><Loading /></Screen>;

  return (
    <Screen back title={editId != null ? t('trip.editTitle') : t('trip.title')} hideNav>
      <form id="trip-form" className="stack" onSubmit={submit}>
        <Sheet>
          <div className="stack">
            <Field label={t('trip.country')}>
              <select value={countryCode} onChange={(e) => setCountry(e.target.value)}>
                {config?.countries.map((c) => <option key={c.code} value={c.code}>{lang === 'ko' ? c.nameKo : c.name}</option>)}
              </select>
            </Field>
            <Field label={t('trip.city')}>
              <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={60} placeholder={t('trip.cityPh')} />
            </Field>
            <div className="two-col">
              <Field label={t('trip.depart')}>
                <input type="date" value={departDate} min={isoDay(1)} onChange={(e) => setDepart(e.target.value)} required />
              </Field>
              <Field label={t('trip.return')}>
                <input type="date" value={returnDate} min={departDate} onChange={(e) => setReturn(e.target.value)} required />
              </Field>
            </div>
            <Field label={t('trip.luggage')} hint={t('trip.luggageHint')}>
              <textarea value={luggageNote} onChange={(e) => setLuggage(e.target.value)} rows={2} maxLength={500} />
            </Field>
          </div>
        </Sheet>
        <p className="fine">{t('trip.note')}</p>
        {create.error && <Notice tone="bad">{errText(create.error)}</Notice>}
        {editId != null && (
          <div className="trip-delete">
            {remove.error && <Notice tone="bad">{errText(remove.error)}</Notice>}
            <button type="button" className="kt-text-btn is-danger" onClick={deleteTrip} disabled={remove.isPending}>
              {t('trip.delete')}
            </button>
          </div>
        )}
      </form>
      <ActionBar>
        <button form="trip-form" className="btn btn-primary btn-block" disabled={create.isPending}>
          {create.isPending ? t('order.saving') : editId != null ? t('trip.update') : t('trip.save')}
        </button>
      </ActionBar>
    </Screen>
  );
}
