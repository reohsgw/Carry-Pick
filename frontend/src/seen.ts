import { useSyncExternalStore } from 'react';
import type { Order, PurchaseRequest } from './api';

const EVENT = 'carrypick:seen';
type Ref = { id: number; status: string };
const tag = (r: Ref) => `${r.id}:${r.status}`;

function read(key: string): string {
  try { return localStorage.getItem(key) ?? ''; } catch { return ''; }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

function mark(key: string, r: Ref) {
  const seen = new Set(read(key).split(',').filter(Boolean));
  for (const s of seen) if (s.startsWith(`${r.id}:`)) seen.delete(s);
  seen.add(tag(r));
  try { localStorage.setItem(key, [...seen].join(',')); } catch { }
  window.dispatchEvent(new Event(EVENT));
}

function useSeen(key: string) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => '');
  const seen = new Set(raw.split(',').filter(Boolean));
  return {
    seenNow: (r: Ref) => seen.has(tag(r)),
    seenEver: (r: Ref) => [...seen].some((s) => s.startsWith(`${r.id}:`)),
  };
}

const REQUESTS = 'carrypick.seenRequests';
const ORDERS = 'carrypick.seenOrders';

export const markRequestSeen = (r: Pick<PurchaseRequest, 'id' | 'status'>) => mark(REQUESTS, r);
export const markOrderSeen = (o: Pick<Order, 'id' | 'status'>) => mark(ORDERS, o);

export function useRequestIsNew(): (r: Pick<PurchaseRequest, 'id' | 'status'>) => boolean {
  const { seenNow } = useSeen(REQUESTS);
  return (r) => !seenNow(r);
}

const FINISHED = new Set(['COMPLETED', 'SETTLED', 'CANCELLED']);

export function useOrderHasNews(): (o: Pick<Order, 'id' | 'status' | 'unreadMessages'>) => boolean {
  const { seenNow, seenEver } = useSeen(ORDERS);
  return (o) => o.unreadMessages > 0
    || (!seenNow(o) && (seenEver(o) || !FINISHED.has(o.status)));
}
