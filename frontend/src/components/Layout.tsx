import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Home, Menu, Plane, Search, ShoppingBag, Ticket, User, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useSession } from '../session';
import { NotificationList } from './NotificationList';
import { initials } from './ui';

/**
 * Screen: sticky header + content + the role's bottom navigation.
 * Without a title the header shows the brand, the bell and the avatar, as in the Figma design. With a title it shows a back button and the title.
 * On desktop widths the header shows the brand, a few icon buttons and a ☰ menu with every page; the bottom
 * navigation is hidden, and a titled screen shows its back button and title above the content.
 * Screens without a title (home, dashboards) use the wide content column unless `wide` says otherwise.
 */
export function Screen({ title, back, children, hideNav, flush, wide = !title }: {
  title?: string; back?: boolean | string; children: ReactNode;
  hideNav?: boolean; flush?: boolean; wide?: boolean;
}) {
  return (
    <div className="screen">
      <header className="app-header">
        {back && <BackButton back={back} className="only-mobile" />}
        {title && <h1 className="header-title only-mobile">{title}</h1>}
        <div className={`header-brand ${title ? 'only-desktop' : ''}`}><Wordmark to="/" /></div>
        <div className={`header-right ${title ? 'only-desktop' : ''}`}><HeaderActions /></div>
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
  const inner = (
    <>
      <span className="logo-mark" aria-hidden>✦</span>
      <span className="brand-copy">
        <span className="brand-name">CarryPick</span>
        <small className="brand-tagline">Travel shopping</small>
      </span>
    </>
  );
  return to ? <Link to={to} className="brand" aria-label="CarryPick">{inner}</Link> : <span className="brand" aria-label="CarryPick">{inner}</span>;
}

function HeaderActions() {
  const { user, unread } = useSession();
  const { t } = useI18n();
  if (!user) return null;
  return (
    <>
      <NavLink to="/search" className="icon-btn only-desktop" aria-label={t('nav.search')}>
        <Search size={20} />
      </NavLink>
      <NotificationsButton unread={unread} />
      <MenuButton />
      <Link to="/me" className="avatar-btn" aria-label={t('me.title')}>{initials(user.name)}</Link>
    </>
  );
}

/** Kept for pages that want just the bell on the right. */
export function BellLink() {
  return <HeaderActions />;
}

/** The main destinations, shared by the bottom navigation and the desktop header. Everyone can shop and travel. */
function useNav() {
  const { user } = useSession();
  const { t } = useI18n();
  const { pathname } = useLocation();
  if (!user) return null;
  // The carrying side of Orders lives under /t, but it belongs to the Orders tab.
  const carrying = pathname.startsWith('/t/orders');
  // One navigation for everyone: shopping and traveling pages sit side by side, as in the website design.
  // Search lives in the desktop header (and the home hero); My page also sits behind the avatar.
  const offers = pathname === '/offers' || pathname.startsWith('/country/');
  return [
    { to: '/', label: t('nav.discover'), icon: Home, end: true },
    { to: '/offers', label: t('nav.offers'), icon: Ticket, end: true, active: offers || undefined },
    { to: '/search', label: t('nav.search'), icon: Search, desktopOnly: true },
    { to: '/t', label: t('nav.travel'), icon: Plane, active: carrying ? false : undefined },
    { to: '/orders', label: t('nav.orders'), icon: ShoppingBag, active: carrying || undefined },
    { to: '/me', label: t('nav.me'), icon: User, mobileOnly: true },
  ];
}

function BottomNav() {
  const items = useNav();
  if (!items) return null;
  return (
    <nav className="mobile-nav" aria-label="Main">
      {items.filter((it) => !it.desktopOnly).map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `mobile-nav-item ${it.active ?? isActive ? 'active' : ''}`}>
          <it.icon size={20} strokeWidth={1.8} aria-hidden />
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

/** Open/close state for a header popup: closes on navigation, a click outside it, or Escape. */
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

/** Bell: shows the notifications in a popup over the current page instead of opening a new page. */
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

/** Desktop ☰ button: opens a dropdown with every page. Closes on navigation, outside click or Escape. */
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
          {items.map((it) => (
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
