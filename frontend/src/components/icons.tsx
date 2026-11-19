import type { ComponentType, CSSProperties } from 'react';
import * as Carbon from '@carbon/icons-react';

export interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
  strokeWidth?: number;
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
}
export type Icon = ComponentType<IconProps>;

type CarbonIcon = ComponentType<{ size?: number | string; className?: string; style?: CSSProperties; 'aria-hidden'?: boolean | 'true' | 'false'; 'aria-label'?: string }>;

function carbon(C: CarbonIcon, name: string): Icon {
  function CarbonGlyph({ strokeWidth: _ignored, size = 24, ...rest }: IconProps) {
    return <C size={size} {...rest} />;
  }
  CarbonGlyph.displayName = name;
  return CarbonGlyph;
}

export const AlertCircle = carbon(Carbon.WarningAlt, 'AlertCircle');
export const Flag = carbon(Carbon.Flag, 'Flag');
export const Handshake = carbon(Carbon.Partnership, 'Handshake');
export const Truck = carbon(Carbon.DeliveryTruck, 'Truck');
export const Idea = carbon(Carbon.Idea, 'Idea');
export const ArrowRight = carbon(Carbon.ArrowRight, 'ArrowRight');
export const InfoIcon = carbon(Carbon.Information, 'InfoIcon');
export const SwapVertical = carbon(Carbon.ArrowsVertical, 'SwapVertical');
export const Bell = carbon(Carbon.Notification, 'Bell');
export const Calendar = carbon(Carbon.Calendar, 'Calendar');
export const Camera = carbon(Carbon.Camera, 'Camera');
export const Check = carbon(Carbon.Checkmark, 'Check');
export const ChevronDown = carbon(Carbon.ChevronDown, 'ChevronDown');
export const ChevronLeft = carbon(Carbon.ChevronLeft, 'ChevronLeft');
export const ChevronRight = carbon(Carbon.ChevronRight, 'ChevronRight');
export const CircleAlert = carbon(Carbon.WarningAlt, 'CircleAlert');
export const CircleCheck = carbon(Carbon.CheckmarkOutline, 'CircleCheck');
export const ClipboardList = carbon(Carbon.Task, 'ClipboardList');
export const Cookie = carbon(Carbon.Cookie, 'Cookie');
export const ExternalLink = carbon(Carbon.Launch, 'ExternalLink');
export const FileText = carbon(Carbon.Document, 'FileText');
export const Headphones = carbon(Carbon.Headphones, 'Headphones');
export const Home = carbon(Carbon.Home, 'Home');
export const Lamp = carbon(Carbon.Light, 'Lamp');
export const Lock = carbon(Carbon.Locked, 'Lock');
export const LogOut = carbon(Carbon.Logout, 'LogOut');
export const MapPinned = carbon(Carbon.Location, 'MapPinned');
export const Menu = carbon(Carbon.Menu, 'Menu');
export const MessageCircle = carbon(Carbon.Chat, 'MessageCircle');
export const Minus = carbon(Carbon.Subtract, 'Minus');
export const Package = carbon(Carbon.Package, 'Package');
export const Plane = carbon(Carbon.Plane, 'Plane');
export const Plus = carbon(Carbon.Add, 'Plus');
export const ScanLine = carbon(Carbon.Scan, 'ScanLine');
export const Search = carbon(Carbon.Search, 'Search');
export const SearchX = carbon(Carbon.Search, 'SearchX');
export const SendHorizontal = carbon(Carbon.Send, 'SendHorizontal');
export const ShieldAlert = carbon(Carbon.ShieldAlert, 'ShieldAlert');
export const ShieldCheck = carbon(Carbon.Security, 'ShieldCheck');
export const Shirt = carbon(Carbon.Tag, 'Shirt');
export const ShoppingBag = carbon(Carbon.ShoppingBag, 'ShoppingBag');
export const Receipt = carbon(Carbon.Receipt, 'Receipt');
export const Sparkles = carbon(Carbon.Gem, 'Sparkles');

/** Beauty: a pump bottle with a leaf (Carbon has no cosmetics icon). Drawn on Carbon's 32px grid. */
export function Beauty({ size = 24, className, style, strokeWidth: _s, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style} focusable="false" {...rest}>
      <path d="M12 4h7l3 2" />
      <path d="M16 4v3" />
      <rect x="13" y="7" width="6" height="4" rx="1" />
      <rect x="9" y="11" width="14" height="18" rx="3" />
      <path d="M16 25c-2.6-1-2.6-5 0-7.5c2.6 2.5 2.6 6.5 0 7.5z" />
      <path d="M16 25v-4.5" />
    </svg>
  );
}
export const Ticket = carbon(Carbon.Ticket, 'Ticket');
export const User = carbon(Carbon.User, 'User');
export const UtensilsCrossed = carbon(Carbon.Restaurant, 'UtensilsCrossed');
export const X = carbon(Carbon.Close, 'X');

// Notification types
export const NotifBooked = carbon(Carbon.Calendar, 'NotifBooked');
export const NotifAccepted = carbon(Carbon.TaskApproved, 'NotifAccepted');
export const NotifPaid = carbon(Carbon.Purchase, 'NotifPaid');
export const NotifPurchased = carbon(Carbon.Receipt, 'NotifPurchased');
export const NotifOverBudget = carbon(Carbon.WarningAlt, 'NotifOverBudget');
export const NotifDelivered = carbon(Carbon.DeliveryParcel, 'NotifDelivered');
export const NotifRejected = carbon(Carbon.ThumbsDown, 'NotifRejected');
export const NotifSettled = carbon(Carbon.Wallet, 'NotifSettled');
export const NotifCancelled = carbon(Carbon.CloseOutline, 'NotifCancelled');
export const NotifExtraPaid = carbon(Carbon.Money, 'NotifExtraPaid');
export const NotifMessage = carbon(Carbon.Chat, 'NotifMessage');
