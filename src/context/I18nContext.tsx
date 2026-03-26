import { createContext, useContext, useState, useCallback } from "react"
import {
  type Locale,
  type TFunction,
  getLocale,
  setLocale as persistLocale,
  makeT,
} from "../lib/i18n"

interface I18nContextValue {
  locale: Locale
  t: TFunction
  changeLocale: (locale: Locale) => void
}

const I18nContext = createContext<I18nContextValue | null>(null)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale)
  const [t, setT] = useState<TFunction>(() => makeT(locale))

  const changeLocale = useCallback((newLocale: Locale) => {
    persistLocale(newLocale)
    setLocaleState(newLocale)
    setT(() => makeT(newLocale))
  }, [])

  return (
    <I18nContext.Provider value={{ locale, t, changeLocale }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
