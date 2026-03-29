import en from "../locales/en.json"
import fr from "../locales/fr.json"
import es from "../locales/es.json"
import it from "../locales/it.json"
import de from "../locales/de.json"
import pt from "../locales/pt.json"
import nl from "../locales/nl.json"

/**
 * Supported locale language codes.
 */
export type Locale = "en" | "fr" | "es" | "it" | "de" | "pt" | "nl"

/**
 * localStorage key for the current locale setting.
 */
export const LOCALE_KEY = "proofreader_locale"

/**
 * Human-readable names for each locale.
 */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
  pt: "Português",
  nl: "Nederlands",
}

/**
 * Array of all supported locale IDs.
 */
export const LOCALE_IDS = Object.keys(LOCALE_NAMES) as Locale[]

type Dict = Record<string, string>

const DICTS: Record<Locale, Dict> = { en, fr, es, it, de, pt, nl }

/**
 * Get the current locale from localStorage.
 * @returns The current locale, or "en" if none is set or invalid
 */
export function getLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY) as Locale | null
  return saved && saved in LOCALE_NAMES ? saved : "en"
}

/**
 * Set the current locale in localStorage.
 * @param locale - The locale to set
 */
export function setLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale)
}

/**
 * Create a translation function for the given locale.
 * Falls back to English for any missing keys.
 * Supports simple `{variable}` interpolation.
 * @param locale - The locale to create a translator for
 * @returns A translate function that accepts a key and optional variables
 */
export function makeT(locale: Locale) {
  const dict = DICTS[locale] ?? DICTS.en
  const fallback = DICTS.en

  return function t(key: string, vars?: Record<string, string | number>): string {
    let str: string = dict[key] ?? fallback[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v))
      }
    }
    return str
  }
}

/**
 * Type of the translate function returned by makeT.
 */
export type TFunction = ReturnType<typeof makeT>
