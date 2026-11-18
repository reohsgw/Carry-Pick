import { useSyncExternalStore } from 'react';
import type { PurchaseRequest } from './api';

/* Remembers which of my purchase requests I've opened, per status, so a request counts as "new"
   until I open it, and becomes new again when its status changes (e.g. a traveler accepts it). */

const KEY = 'carrypick.seenRequests';
const EVENT = 'carrypick:seen';

type Ref = Pick<PurchaseRequest, 'id' | 'status'>;
const tag = (r: Ref) => `${r.id}:${r.status}`;

function read(): string {
  try { return localStorage.getItem(KEY) ?? ''; } catch { return ''; }
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener('storage', cb);
  return () => { window.removeEventListener(EVENT, cb); window.removeEventListener('storage', cb); };
}

export function markRequestSeen(r: Ref) {
  const seen = new Set(read().split(',').filter(Boolean));
  for (const s of seen) if (s.startsWith(`${r.id}:`)) seen.delete(s);
  seen.add(tag(r));
  try { localStorage.setItem(KEY, [...seen].join(',')); } catch { }
  window.dispatchEvent(new Event(EVENT));
}

/** Returns a checker telling whether a request is new (not opened since its last change). */
export function useRequestIsNew(): (r: Ref) => boolean {
  const raw = useSyncExternalStore(subscribe, read, () => '');
  const seen = new Set(raw.split(',').filter(Boolean));
  return (r) => !seen.has(tag(r));
}
