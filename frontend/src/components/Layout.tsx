import type { ReactNode } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Home, Plane, Search, ShoppingBag, User } from 'lucide-react';
import { useI18n } from '../i18n';
import { useSession } from '../session';
import { initials } from './ui';

/**
 * Screen: sticky header + content + the role's bottom navigation.
 * Without a title the header shows the brand, the bell and the avatar, as in the Figma design. With a title it shows a back button and the title.
 * On desktop widths the header always shows the brand and the main navigation, the bottom
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
        <DesktopNav />
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
      <span className="logo-mark"><Plane size={16} strokeWidth={2} /></span>
      <span className="brand-name">carrypick<b>.</b></span>
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
      <NavLink to="/notifications" className="icon-btn" aria-label={t('me.notifications')}>
        <Bell size={20} />
        {unread > 0 && <span className="dot">{unread > 9 ? '9+' : unread}</span>}
      </NavLink>
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
  return [
    { to: '/', label: t('nav.discover'), icon: Home, end: true },
    { to: '/search', label: t('nav.search'), icon: Search },
    { to: '/t', label: t('nav.travel'), icon: Plane, active: carrying ? false : undefined },
    { to: '/orders', label: t('nav.orders'), icon: ShoppingBag, active: carrying || undefined },
    { to: '/me', label: t('nav.me'), icon: User },
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
          <span>{it.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function DesktopNav() {
  const items = useNav();
  if (!items) return null;
  return (
    <nav className="desktop-nav only-desktop" aria-label="Main">
      {items.map((it) => (
        <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => `desktop-nav-item ${it.active ?? isActive ? 'active' : ''}`}>
          <it.icon size={16} strokeWidth={1.9} aria-hidden />
          {it.label}
        </NavLink>
      ))}
    </nav>
  );
}
