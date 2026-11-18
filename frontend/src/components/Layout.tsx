import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Home, Menu, ClipboardList, Search, ShoppingBag, Ticket, User, X } from './icons';
import { useI18n } from '../i18n';
import { assetUrl } from '../api';
import { useSession } from '../session';
import { NotificationList } from './NotificationList';
import { ActionBar, initials } from './ui';
import HeroLogo from './HeroLogo';
import CountryPicker from './CountryPicker';

export function Screen({ title, back, children, hideNav, flush, wide = !title, headerExtra }: {
  title?: string; back?: boolean | string; children: ReactNode;
  hideNav?: boolean; flush?: boolean; wide?: boolean;
  headerExtra?: ReactNode;
}) {
  return (
    <div className="screen">
      <header className="app-header">
        {back && <BackButton back={back} className="only-mobile" />}
        {title && <h1 className="header-title only-mobile">{title}</h1>}
        <div className={`header-brand ${title ? 'only-desktop' : ''}`}><Wordmark to="/" /></div>
        <div className={`header-right ${title ? 'only-desktop' : ''}`}>{headerExtra}<HeaderActions /></div>
      </header>
      <main className={`content ${wide ? 'is-wide' : ''} ${flush ? 'is-flush' : ''} ${hideNav ? 'has-actionbar' : ''}`}>
        {title && (
          <div className="page-bar only-desktop">
            {back && <BackButton back={back} />}
            <h1 className="page-bar-title">{title}</h1>
          </div>
        )}
        {children}
      </main>
      {!hideNav && <BottomNav />}
    </div>
  );
}

function BackButton({ back, className = '' }: { back: true | string; className?: string }) {
  const navigate = useNavigate();
  const { t } = useI18n();
  return (
    <button
      className={`icon-btn ${className}`}
      aria-label={t('common.back')}
      onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
    >
      <ChevronLeft size={22} />
    </button>
  );
}

export function Wordmark({ to }: { to?: string }) {
  const inner = <HeroLogo still className="brand-logo" />;
  return to
    ? <Link to={to} className="brand brand--logo" aria-label="CarryPick">{inner}</Link>
    : <span className="brand brand--logo" aria-label="CarryPick">{inner}</span>;
}

function HeaderActions() {
  const { user, unread } = useSession();
  const { t } = useI18n();
  const [photoBroken, setPhotoBroken] = useState(false);
  useEffect(() => setPhotoBroken(false), [user?.avatarUrl]);
  if (!user) return null;
  const photo = photoBroken ? null : assetUrl(user.avatarUrl);
  return (
    <>
      <CountryPicker />
      <NavLink to="/" end className="icon-btn only-desktop" aria-label={t('nav.home')}>
        <Home size={20} />
      </NavLink>
      <NavLink to="/search"className="icon-btn only-desktop" aria-label={t('nav.search')}>
        <Search size={20} />
      </NavLink>
      <NotificationsButton unread={unread} />
      <MenuButton />
      <Link to="/me" className={`avatar-btn${photo ? ' has-photo' : ''}`} aria-label={t('me.title')}>
        {photo ? <img src={photo} alt="" onError={() => setPhotoBroken(true)} /> : initials(user.name)}
      </Link>
    </>
  );
}

export function BellLink() {
  return <HeaderActions />;
}

function useNav() {
  const { user } = useSession();
  const { t } = useI18n();
  const { pathname } = useLocation();
  if (!user) return null;
  const orders = pathname.startsWith('/orders') || pathname.startsWith('/t/orders') || pathname.startsWith('/my-requests');
  const offers = pathname === '/offers' || pathname.startsWith('/country/');
  const requests = pathname.startsWith('/t/requests');
  const me = pathname === '/me' || pathname.startsWith('/t/trips') || pathname.startsWith('/t/offers');
  return [
    { to: '/', label: t('nav.discover'), icon: Home, end: true },
    { to: '/offers', label: t('nav.offers'), short: t('nav.offersShort'), icon: Ticket, end: true, active: offers || undefined },
    { to: '/t/requests', label: t('nav.requests'), short: t('nav.requestsShort'), icon: ClipboardList, active: requests || undefined },
    { to: '/orders', label: t('nav.orders'), icon: ShoppingBag, active: orders || undefined },
    { to: '/me', label: t('nav.me'), icon: User, active: me || undefined },
  ];
}

function BottomNav() {
  const items = useNav();
  if (!items) return null;
  return (
    <nav className="mobile-nav" aria-label="Main">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `mobile-nav-item ${it.active ?? isActive ? 'active' : ''}`}>
          <it.icon size={20} strokeWidth={1.8} aria-hidden />
          <span>{'short' in it && it.short ? it.short : it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function usePopover() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return { open, setOpen, ref };
}

function NotificationsButton({ unread }: { unread: number }) {
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();
  return (
    <div className="header-pop" ref={ref}>
      <button
        type="button" className={`icon-btn ${open ? 'is-open' : ''}`}
        aria-label={t('me.notifications')} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}
      >
        <Bell size={20} />
        {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="notif-pop" role="dialog" aria-label={t('n.title')}>
          <div className="notif-pop-head">
            <h2>{t('n.title')}</h2>
            <button type="button" className="icon-btn" aria-label={t('common.close')} onClick={() => setOpen(false)}><X size={18} /></button>
          </div>
          <div className="notif-pop-body"><NotificationList /></div>
        </div>
      )}
    </div>
  );
}

function MenuButton() {
  const items = useNav();
  const { t } = useI18n();
  const { open, setOpen, ref } = usePopover();

  if (!items) return null;
  return (
    <div className="header-pop nav-menu only-desktop" ref={ref}>
      <button
        type="button" className={`icon-btn ${open ? 'is-open' : ''}`}
        aria-label={t('nav.menu')} aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={20} /> : <Menu size={20} />}
      </button>
      {open && (
        <nav className="nav-dropdown" aria-label="Main">
          {items.filter((it) => it.to !== '/').map((it) => (
            <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `nav-dropdown-item ${it.active ?? isActive ? 'active' : ''}`}>
              <it.icon size={18} strokeWidth={1.9} aria-hidden />
              {it.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export function DetailLayout({ aside, actions, children, as = 'div', ...rest }: {
  aside: ReactNode; actions?: ReactNode; children: ReactNode; as?: 'div' | 'form';
} & React.FormHTMLAttributes<HTMLFormElement>) {
  const Tag = as;
  return (
    <>
      <Tag className="detail-layout" {...(rest as object)}>
        <div className="detail-main">{children}</div>
        <aside className="detail-aside">
          {aside}
          {actions && <div className="detail-actions only-desktop">{actions}</div>}
        </aside>
      </Tag>
      {actions && <ActionBar className="only-mobile">{actions}</ActionBar>}
    </>
  );
}
