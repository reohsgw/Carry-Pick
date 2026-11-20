import { useEffect } from 'react';

/**
 * Connected text (titles, buttons, tabs, nav labels) never breaks onto a second line.
 * Whenever one of these wraps, its font is shrunk until it fits on one line at the current width.
 * Big titles may shrink to half size, smaller labels to 65% (never below 9px); past that the text ends in "…".
 * Body paragraphs are not touched and wrap normally. Layout is never widened to fit the text.
 */
export const FIT_SELECTOR = [
  'h1', 'h2', 'h3', 'h4', '.eyebrow', '.btn', '[role="tab"]', '.chip',
  '.mobile-nav-item > span', '.nav-dropdown-item', '.filter-toggle', '.lf-chips button',
  // Short values in cards: prices, dates, counts, names.
  '.meta-label', '.meta-value', '.kt-btn', '.receipt-strip .receipt-note', '.empty-title', '.cf-title', '.kt-won', '.top10-won', '.top10-price', '.kt-item-line strong', '.od-pass-route strong', '.od-pass-route span', '.od-price-stub strong', '.od-pass-fields div:not(.is-wide) dd', '.od-pass-who p', '.meta-sub', '.od-fact-sub', '.person p', '.person small', '.route-chip',
].join(',');

/** Number of rendered text lines inside el (icons, badges and emoji at other heights don't count). */
function lineCount(el: HTMLElement) {
  const rects: DOMRect[] = [];
  // Text cut off by the element's own overflow/line clamp isn't visible, so it doesn't count.
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

/** Elements laid out as several blocks (title + subtitle cards) or with explicit line breaks are left alone. */
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

/** Buttons, tabs and chips never wrap by design, so for them overflowing sideways counts too. */
const NOWRAP_CONTROLS = '.btn, [role="tab"], .chip, .lf-chips button';
/** Width available for content inside el (its box minus padding). */
function innerWidth(el: HTMLElement) {
  const cs = getComputedStyle(el);
  return el.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
}

/**
 * Width of el's content laid out on one line. Measured from the content itself rather than scrollWidth,
 * which misses overflow on the left side of centered buttons.
 */
function contentWidth(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.getBoundingClientRect().width;
}

function needsFit(el: HTMLElement) {
  if (lineCount(el) > 1) return true;
  return el.matches(NOWRAP_CONTROLS) && el.clientWidth > 0 && contentWidth(el) > innerWidth(el) + 1;
}

function fit(el: HTMLElement) {
  const base = parseFloat(getComputedStyle(el).fontSize) || 16;
  const big = el.tagName === 'H1' || el.tagName === 'H2';
  const min = Math.min(base, big ? Math.max(16, base * 0.5) : Math.max(9, base * 0.65));
  const avail = el.clientWidth;
  if (!avail) return;

  // Measure the one-line width, then scale the font to the space inside the element.
  const clamped = getComputedStyle(el).display === '-webkit-box';
  if (clamped) set(el, 'display', 'block');
  set(el, 'white-space', 'nowrap');
  const textWidth = Math.max(el.scrollWidth - (avail - innerWidth(el)), contentWidth(el));
  el.style.removeProperty('white-space');
  const space = innerWidth(el);
  let size = Math.max(min, Math.min(base, (base * space) / Math.max(textWidth, 1) * 0.97));
  el.dataset.fit = '1';
  set(el, 'font-size', `${size}px`);
  for (let i = 0; i < 8 && size > min && needsFit(el); i++) {
    size = Math.max(min, size * 0.93);
    set(el, 'font-size', `${size}px`);
  }
  if (needsFit(el)) {
    // Smallest readable size still doesn't fit: one line with an ellipsis, held to the width it had.
    set(el, 'width', `${avail}px`);
    set(el, 'max-width', '100%');
    el.classList.add('fit-clip');
  }
}

function fitAll() {
  const els = Array.from(document.querySelectorAll<HTMLElement>(FIT_SELECTOR));
  for (const el of els) {
    if (!el.dataset.fit) continue;
    for (const prop of FIT_PROPS) el.style.removeProperty(prop);
    el.classList.remove('fit-clip');
    delete el.dataset.fit;
  }
  for (const el of els) {
    if (!el.textContent?.trim() || el.closest('[data-fit-skip]')) continue;
    if (needsFit(el) && !isMultiPart(el)) fit(el);
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
    // Re-fit when pages render new text. Attribute changes (including our own styles) are ignored.
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.fonts?.ready.then(schedule).catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', schedule);
      mo.disconnect();
    };
  }, []);
  return null;
}
