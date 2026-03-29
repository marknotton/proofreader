/**
 * Internationalization context and provider for managing translations.
 *
 * Provides a global i18n context with current locale and translation function,
 * with support for dynamic locale switching and persistence.
 *
 * @module context/I18nContext
 */
import { createContext, useContext, useState, useCallback } from "react"
import {
  type Locale,
  type TFunction,
  getLocale,
  setLocale as persistLocale,
  makeT,
} from "../lib/i18n"

/**
 * The value structure provided by the I18n context.
 *
 * @interface I18nContextValue
 * @property {Locale} locale - The current active locale
 * @property {TFunction} t - The translation function for current locale
 * @property {(locale: Locale) => void} changeLocale - Function to switch locales
 */
interface I18nContextValue {
  locale: Locale
  t: TFunction
  changeLocale: (locale: Locale) => void
}

/**
 * Context for managing internationalization state.
 *
 * @type {React.Context<I18nContextValue | null>}
 */
const I18nContext = createContext<I18nContextValue | null>(null)

/**
 * Provider component for internationalization functionality.
 *
 * Wraps the application to provide locale and translation function via context.
 * Persists locale preference to storage.
 *
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child elements
 * @returns {React.ReactElement} The provider component
 *
 * @example
 * <I18nProvider>
 *   <App />
 * </I18nProvider>
 */
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

/**
 * Hook to access i18n context from within an I18nProvider.
 *
 * @returns {I18nContextValue} The current i18n context value
 * @throws {Error} If used outside of I18nProvider
 *
 * @example
 * const { t, locale, changeLocale } = useI18n()
 */
export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used within I18nProvider")
  return ctx
}
