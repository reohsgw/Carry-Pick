import { useLayoutEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

/** Opens every new page at the top. Back/forward (POP) keeps the browser's scroll position. */
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  useLayoutEffect(() => {
    if (navType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname, navType]);
  return null;
}
