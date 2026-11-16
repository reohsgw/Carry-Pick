import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Camera, ChevronRight, ClipboardList, LogOut, MapPinned, Package } from '../components/icons';
import { api } from '../api';
import { Screen } from '../components/Layout';
import { Avatar, Notice, Sheet, Tag } from '../components/ui';
import { LangToggle, useErrorText, useI18n } from '../i18n';
import { useSession } from '../session';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

export default function MyPage() {
  const { user, logout, unread, config, refreshMe } = useSession();
  const { t } = useI18n();
  const errText = useErrorText();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!user) return null;

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { setError(t('me.photoType')); return; }
    if (file.size > MAX_PHOTO_BYTES) { setError(t('me.photoSize')); return; }
    setBusy(true);
    try {
      const { url } = await api.upload(file);
      await api.updateMe({ avatarUrl: url });
      refreshMe();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function removePhoto() {
    setError(null);
    setBusy(true);
    try {
      await api.updateMe({ avatarUrl: '' });
      refreshMe();
    } catch (err) {
      setError(errText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t('me.title')}>
      <div className="profile">
        <div className="profile-photo">
          <Avatar name={user.name} src={user.avatarUrl} className="is-profile" />
          <button
            type="button"
            className="profile-photo-btn"
            aria-label={user.avatarUrl ? t('me.photoChange') : t('me.photoAdd')}
            disabled={busy}
            onClick={() => fileInput.current?.click()}
          >
            <Camera size={16} aria-hidden />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            hidden
            onChange={(e) => changePhoto(e.target.files?.[0])}
          />
        </div>
        <div className="grow">
          <div className="profile-name">{user.name}</div>
          <div className="profile-email">{user.email}</div>
          <div className="profile-photo-actions">
            <button type="button" className="text-btn" disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? t('me.photoSaving') : user.avatarUrl ? t('me.photoChange') : t('me.photoAdd')}
            </button>
            {user.avatarUrl && !busy && (
              <button type="button" className="text-btn is-muted" onClick={removePhoto}>{t('me.photoRemove')}</button>
            )}
          </div>
        </div>
        {user.test && <Tag tone="action">{t('me.test')}</Tag>}
      </div>

      {error && <Notice tone="bad">{error}</Notice>}

      <Sheet title={t('lang.label')} aside={<LangToggle />} />

      <Sheet flush>
        <div className="rows">
          <Link to="/notifications" className="row menu-row">
            <Bell size={20} strokeWidth={1.75} aria-hidden />
            <span className="row-body">{t('me.notifications')}</span>
            {unread > 0 && <span className="dot is-inline">{unread}</span>}
            <ChevronRight size={18} className="row-chevron" aria-hidden />
          </Link>
          <Link to="/orders" className="row menu-row">
            <Package size={20} strokeWidth={1.75} aria-hidden />
            <span className="row-body">{t('me.orders')}</span>
            <ChevronRight size={18} className="row-chevron" aria-hidden />
          </Link>
          <Link to="/orders?tab=requests" className="row menu-row">
            <ClipboardList size={20} strokeWidth={1.75} aria-hidden />
            <span className="row-body">{t('me.requests')}</span>
            <ChevronRight size={18} className="row-chevron" aria-hidden />
          </Link>
          <Link to="/t/trips/new" className="row menu-row">
            <MapPinned size={20} strokeWidth={1.75} aria-hidden />
            <span className="row-body">{t('me.addTrip')}</span>
            <ChevronRight size={18} className="row-chevron" aria-hidden />
          </Link>
          <button className="row menu-row danger" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
            <LogOut size={20} strokeWidth={1.75} aria-hidden />
            <span className="row-body">{t('me.logout')}</span>
          </button>
        </div>
      </Sheet>

      <p className="fine center">
        {t('me.footer', { mode: config?.paymentMode === 'toss' ? t('me.modeToss') : t('me.modeMock') })}
      </p>
    </Screen>
  );
}
