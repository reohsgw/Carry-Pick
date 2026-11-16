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
export const ArrowRight = carbon(Carbon.ArrowRight, 'ArrowRight');
export const Bell = carbon(Carbon.Notification, 'Bell');
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
export const Sparkles = carbon(Carbon.Gem, 'Sparkles');
export const Ticket = carbon(Carbon.Ticket, 'Ticket');
export const User = carbon(Carbon.User, 'User');
export const UtensilsCrossed = carbon(Carbon.Restaurant, 'UtensilsCrossed');
export const X = carbon(Carbon.Close, 'X');
