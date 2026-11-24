import { useEffect } from 'react';

export const FIT_SELECTOR = [
  'h1', 'h2', 'h3', 'h4', '.eyebrow', '.btn', '[role="tab"]', '.chip',
  '.mobile-nav-item > span', '.nav-dropdown-item', '.filter-toggle', '.lf-chips button',
  '.meta-label', '.meta-value', '.kt-btn', '.empty-title', '.cf-title', '.kt-won', '.top10-won', '.top10-price', '.kt-item-line strong', '.od-pass-route strong', '.od-pass-route span', '.od-price-stub strong', '.od-pass-fields div:not(.is-wide) dd', '.od-pass-who p', '.meta-sub', '.od-fact-sub', '.person p', '.person small', '.route-chip', '.request-meta span', '.row-meta span', '.request-left', '.request-by', '.chat-link .grow > b', '.chat-link .grow > small', '.od-next', '.ob-btn', '.top10-name', '.kt-shortcut > span', '.kt-profile-text p', '.country-picker-langs .country-picker-name',
].join(',');

const SOFT_SELECTOR = 'p, span, small, b, strong, em, a, label, dt, dd, li, td, th, button, figcaption, legend';
const SOFT_SKIP = 'input, textarea, select, option, [contenteditable], svg, .sr-only, .visually-hidden, [aria-hidden="true"], .chat-bubble, .msg, [data-fit-skip]';

const GROUPS = [
  '.offer-title', '.top10-name', '.request-card .request-head h3', '.kt-item-body h3', '.ob-title-row h3', '.row-title',
];
const GROUP_FLOOR = 0.85;
const SOFT_GROUPS = ['.hero-body-line'];
const SOFT_GROUP_FLOOR = 0.6;

function lineCount(el: HTMLElement) {
  const rects: DOMRect[] = [];
  const clipBottom = getComputedStyle(el).overflowY !== 'visible' ? el.getBoundingClientRect().bottom : Infinity;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent?.trim()) continue;
    range.selectNodeContents(n);
    for (const r of Array.from(range.getClientRects())) if (r.width > 1 && (r.top + r.bottom) / 2 < clipBottom) rects.push(r);
  }
  rects.sort((a, b) => a.top - b.top);
  let lines = 0;
  let bottom = -Infinity;
  for (const r of rects) {
    if ((r.top + r.bottom) / 2 > bottom) { lines++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom);
  }
  return lines;
}

function isMultiPart(el: HTMLElement) {
  if (el.querySelector('br, p, ul, ol, input, select, textarea')) return true;
  for (const c of Array.from(el.children)) {
    if (!c.textContent?.trim()) continue;
    const d = getComputedStyle(c).display;
    if (d === 'block' || d === 'flex' || d === 'grid' || d === 'list-item') {
      return true;
    }
  }
  return false;
}

const set = (el: HTMLElement, prop: string, value: string) => el.style.setProperty(prop, value, 'important');
const FIT_PROPS = ['font-size', 'width', 'max-width', 'white-space', 'display'];

const NOWRAP_CONTROLS = '.btn, [role="tab"], .chip, .lf-chips button, .ob-btn';
function innerWidth(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
}

function contentWidth(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect().width;
}

function hiddenLines(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return cs.overflowY !== 'visible' && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 2
    && el.scrollHeight >= (parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2) * 1.5;
}

function needsFit(el: HTMLElement) {
  if (lineCount(el) > 1 || hiddenLines(el)) return true;
  return el.matches(NOWRAP_CONTROLS) && el.clientWidth > 0 && contentWidth(el) > innerWidth(el) + 1;
}

function ownsText(el: HTMLElement) {
  for (const n of Array.from(el.childNodes)) if (n.nodeType === 3 && n.textContent?.trim()) return true;
  return false;
}

function fit(el: HTMLElement, soft = false) {
  const base = parseFloat(getComputedStyle(el).fontSize) || 16;
  el.dataset.fitBase = String(base);
  const big = el.tagName === 'H1' || el.tagName === 'H2';
  const min = Math.min(base, soft ? Math.max(10, base * 0.72) : big ? Math.max(16, base * 0.5) : Math.max(9, base * 0.65));
  if (getComputedStyle(el).display === 'inline') {
    if (!soft) return;
    set(el, 'display', 'inline-block');
    set(el, 'max-width', '100%');
  }
  const avail = el.clientWidth;
  if (!avail) { if (soft) for (const prop of FIT_PROPS) el.style.removeProperty(prop); return; }

  const clamped = getComputedStyle(el).display === '-webkit-box';
  if (clamped) set(el, 'display', 'block');
  const pad = avail - innerWidth(el);
  set(el, 'white-space', 'nowrap');
  const textWidth = Math.max(el.scrollWidth - pad, contentWidth(el));
  el.style.removeProperty('white-space');
  const space = innerWidth(el);
  const ideal = (base * space) / Math.max(textWidth, 1) * 0.97;
  if (soft && ideal < min * 0.9) {
    for (const prop of FIT_PROPS) el.style.removeProperty(prop);
    return;
  }
  let size = Math.max(min, Math.min(base, ideal));
  el.dataset.fit = '1';
  set(el, 'font-size', `${size}px`);
  for (let i = 0; i < 8 && size > min && needsFit(el); i++) {
    size = Math.max(min, size * 0.93);
    set(el, 'font-size', `${size}px`);
  }
  if (needsFit(el) && soft) {
    for (const prop of FIT_PROPS) el.style.removeProperty(prop);
    delete el.dataset.fit;
    return;
  }
  if (needsFit(el)) {
    set(el, 'width', `${avail}px`);
    set(el, 'max-width', '100%');
    el.classList.add('fit-clip');
  }
}

function fitAll() {
  const els = Array.from(document.querySelectorAll<HTMLElement>(FIT_SELECTOR));
  for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-fit], [data-fit-base]'))) {
    for (const prop of FIT_PROPS) el.style.removeProperty(prop);
    el.classList.remove('fit-clip');
    delete el.dataset.fit;
    delete el.dataset.fitBase;
  }
  const hard = new Set(els);
  for (const el of els) {
    if (!el.textContent?.trim() || el.closest('[data-fit-skip]')) continue;
    if (needsFit(el) && !isMultiPart(el)) fit(el);
  }
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(SOFT_SELECTOR))) {
    if (hard.has(el) || el.closest(SOFT_SKIP) || !ownsText(el)) continue;
    if (el.closest('[data-fit]') && el.closest('[data-fit]') !== el) continue;
    if (getComputedStyle(el).display === 'inline' && el.parentElement && ownsText(el.parentElement)) continue;
    if (needsFit(el) && !isMultiPart(el)) fit(el, true);
  }
  for (const sel of GROUPS) fitGroup(sel);
  for (const sel of SOFT_GROUPS) fitGroup(sel, true);
}

function fitGroup(sel: string, soft = false) {
  const els = Array.from(document.querySelectorAll<HTMLElement>(sel)).filter((el) => el.clientWidth > 0 && el.textContent?.trim());
  if (els.length < 2) return;
  const sizes = els.map((el) => {
    const base = Number(el.dataset.fitBase) || parseFloat(getComputedStyle(el).fontSize) || 16;
    const now = parseFloat(getComputedStyle(el).fontSize) || base;
    return { el, base, now };
  });
  const base = Math.max(...sizes.map((x) => x.base));
  const floor = soft ? SOFT_GROUP_FLOOR : GROUP_FLOOR;
  if (soft) {
    for (const x of sizes) {
      if (!needsFit(x.el)) continue;
      const avail = innerWidth(x.el);
      set(x.el, 'white-space', 'nowrap');
      const need = contentWidth(x.el);
      x.el.style.removeProperty('white-space');
      x.now = Math.min(x.now, (x.now * avail) / Math.max(need, 1) * 0.98);
    }
  }
  const tightest = Math.min(...sizes.map((x) => x.now));
  if (soft && tightest < base * floor) {
    for (const { el } of sizes) {
      for (const prop of FIT_PROPS) el.style.removeProperty(prop);
      el.classList.remove('fit-clip');
      delete el.dataset.fit;
    }
    return;
  }
  const size = Math.max(base * floor, tightest);
  for (const { el } of sizes) {
    const avail = el.clientWidth;
    el.classList.remove('fit-clip');
    el.style.removeProperty('width');
    el.style.removeProperty('max-width');
    if (getComputedStyle(el).display === '-webkit-box') set(el, 'display', 'block');
    set(el, 'font-size', `${size}px`);
    el.dataset.fit = '1';
    if (!el.dataset.fitBase) el.dataset.fitBase = String(base);
    if (needsFit(el) && !soft) {
      set(el, 'width', `${avail}px`);
      set(el, 'max-width', '100%');
      el.classList.add('fit-clip');
    }
  }
}

export default function FitText() {
  useEffect(() => {
    let frame = 0;
    let busy = false;
    const schedule = () => {
      if (busy) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        busy = true;
        try { fitAll(); } finally { busy = false; }
      });
    };
    schedule();
    window.addEventListener('resize', schedule);
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready.then(schedule).catch(() => {});
    document.fonts?.addEventListener?.('loadingdone', schedule);
    let lastWidth = 0;
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver((entries) => {
      const w = Math.round(entries[0]?.contentRect.width ?? 0);
      if (w !== lastWidth) { lastWidth = w; schedule(); }
    }) : null;
    ro?.observe(document.body);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      mo.disconnect();
      ro?.disconnect();
      document.fonts?.removeEventListener?.('loadingdone', schedule);
    };
  }, []);
  return null;
}
