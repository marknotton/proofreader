import en from "../locales/en.json"
import fr from "../locales/fr.json"
import es from "../locales/es.json"
import it from "../locales/it.json"
import de from "../locales/de.json"
import pt from "../locales/pt.json"
import nl from "../locales/nl.json"

export type Locale = "en" | "fr" | "es" | "it" | "de" | "pt" | "nl"

export const LOCALE_KEY = "proofreader_locale"

export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
  it: "Italiano",
  de: "Deutsch",
  pt: "Português",
  nl: "Nederlands",
}

export const LOCALE_IDS = Object.keys(LOCALE_NAMES) as Locale[]

type Dict = Record<string, string>

const DICTS: Record<Locale, Dict> = { en, fr, es, it, de, pt, nl }

export function getLocale(): Locale {
  const saved = localStorage.getItem(LOCALE_KEY) as Locale | null
  return saved && saved in LOCALE_NAMES ? saved : "en"
}

export function setLocale(locale: Locale): void {
  localStorage.setItem(LOCALE_KEY, locale)
}

/**
 * Returns a translate function for the given locale.
 * Falls back to English for any missing keys.
 * Supports simple `{variable}` interpolation.
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

export type TFunction = ReturnType<typeof makeT>
