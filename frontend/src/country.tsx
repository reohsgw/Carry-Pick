import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

const COUNTRY_KEY = 'carrypick.country';

function savedCountry(): string {
  try { return localStorage.getItem(COUNTRY_KEY) ?? 'JP'; } catch { return 'JP'; }
}

const CountryContext = createContext<{ country: string; setCountry: (code: string) => void }>({
  country: 'JP',
  setCountry: () => {},
});

export function CountryProvider({ children }: { children: ReactNode }) {
  const [country, setState] = useState(savedCountry);
  const setCountry = useCallback((code: string) => {
    setState(code);
    try { localStorage.setItem(COUNTRY_KEY, code); } catch { }
  }, []);
  return <CountryContext.Provider value={{ country, setCountry }}>{children}</CountryContext.Provider>;
}

export function useCountry() {
  return useContext(CountryContext);
}
