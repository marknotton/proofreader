import { type ProviderId, PROVIDERS, DEFAULT_THINKING_BY_PROVIDER } from "./providers"

/**
 * Spelling locale variant appended to the style prompt.
 * Tells the AI which regional spelling conventions to follow.
 */
export const SPELLING_LOCALES = [
  { key: "none",  label: "None (don't enforce spelling)" },
  { key: "en-GB", label: "British English" },
  { key: "en-US", label: "American English" },
  { key: "en-AU", label: "Australian English" },
  { key: "en-CA", label: "Canadian English" },
  { key: "en-NZ", label: "New Zealand English" },
  { key: "en-IE", label: "Irish English" },
  { key: "en-ZA", label: "South African English" },
] as const

export type SpellingLocale = (typeof SPELLING_LOCALES)[number]["key"]

/** Instruction prepended to the prompt for each spelling locale. */
export const SPELLING_LOCALE_PROMPTS: Record<SpellingLocale, string> = {
  "none":  "",
  "en-GB": `MANDATORY LANGUAGE RULE — apply this before everything else, without exception:
Convert ALL spelling and vocabulary to British English in the output. Do not preserve any American or non-British forms — actively replace them even if they appear correct in the input.
Spelling: colour, flavour, honour, labour, neighbour, behaviour | realise, recognise, organise, analyse, authorise, apologise | centre, metre, theatre, litre | programme, catalogue, dialogue | travelled, cancelled, modelled | defence, offence, licence (noun), practise (verb) | cheque, tyre, mould, plough, kerb, grey.
Vocabulary: mum (not mom), autumn (not fall), flat (not apartment), holiday (not vacation), post (not mail), shop (not store), biscuit (not cookie), crisps (not chips), chips (not fries), whilst (not while), amongst (not among), different to (not different than), at the weekend (not on the weekend).`,

  "en-US": `MANDATORY LANGUAGE RULE — apply this before everything else, without exception:
Convert ALL spelling and vocabulary to American English in the output. Do not preserve any British or non-American forms — actively replace them even if they appear correct in the input.
Spelling: color, flavor, honor, labor, neighbor, behavior | realize, recognize, organize, analyze, authorize, apologize | center, meter, theater, liter | program, catalog, dialog | traveled, canceled, modeled | defense, offense, license (noun), practice (verb) | check, tire, mold, plow, curb, gray.
Vocabulary: mom (not mum), fall (not autumn), apartment (not flat), vacation (not holiday), mail (not post), store (not shop), cookie (not biscuit), chips (not crisps), fries (not chips), while (not whilst), among (not amongst), different from (not different to), on the weekend (not at the weekend).`,

  "en-AU": `MANDATORY LANGUAGE RULE — apply this before everything else, without exception:
Convert ALL spelling and vocabulary to Australian English in the output. Do not preserve any non-Australian forms — actively replace them even if they appear correct in the input.
Spelling follows British conventions: colour, flavour, realise, organise, centre, programme, travelled, defence, grey. Vocabulary: mum (not mom), autumn (not fall), holiday (not vacation), post (not mail), whilst (not while).`,

  "en-CA": `MANDATORY LANGUAGE RULE — apply this before everything else, without exception:
Convert ALL spelling and vocabulary to Canadian English in the output. Do not preserve non-Canadian forms — actively replace them.
Canadian spelling: British -our words (colour, behaviour, favour) and -re words (centre, theatre) but American -ize verbs (realize, organize, recognize). Also: travelled, defence, cheque, grey, programme.
Vocabulary: mom (Canadian usage), fall or autumn (both acceptable), apartment, vacation.`,

  "en-NZ": `MANDATORY LANGUAGE RULE — apply this before everything else, without exception:
Convert ALL spelling and vocabulary to New Zealand English in the output. Do not preserve any non-NZ forms — actively replace them.
Follows British conventions: colour, realise, centre, programme, travelled, defence, grey, whilst, mum (not mom), autumn (not fall), holiday (not vacation).`,

  "en-IE": `MANDATORY LANGUAGE RULE — apply this before everything else, without exception:
Convert ALL spelling and vocabulary to Irish English in the output. Do not preserve any non-Irish forms — actively replace them.
Follows British conventions: colour, realise, centre, programme, travelled, defence, grey, whilst, mum (not mom), autumn (not fall), holiday (not vacation).`,

  "en-ZA": `MANDATORY LANGUAGE RULE — apply this before everything else, without exception:
Convert ALL spelling and vocabulary to South African English in the output. Do not preserve any non-South African forms — actively replace them.
Follows British conventions: colour, realise, centre, programme, travelled, defence, grey, whilst, mum (not mom), autumn (not fall), holiday (not vacation).`,
}

/**
 * A proofreading style configuration with prompt and formatting options.
 */
export interface ProofreadStyle {
  name: string
  prompt: string
  /** @deprecated Legacy single thinking value — migrated to thinkingByProvider on load */
  thinking?: number
  /** Per-provider thinking budgets. Gemini: 0–8192, OpenAI/Claude: 0/1/2 effort index, Grok: unused */
  thinkingByProvider?: Partial<Record<ProviderId, number>>
  /** Lucide icon name (from the curated library) */
  icon?: string
  /** Colour key from the palette */
  color?: string
  /** When true, detect and render markdown code blocks with copy buttons */
  markdown?: boolean
  /** Regional spelling convention appended to the prompt */
  spellingLocale?: SpellingLocale
}

/**
 * Default thinking value in tokens (used as fallback for Gemini).
 */
export const DEFAULT_THINKING = 1024

/**
 * Get the thinking value for a specific provider from a style.
 * @param style - The proofreading style
 * @param provider - The provider ID
 * @returns The thinking value appropriate for the provider
 */
export function getStyleThinking(style: ProofreadStyle, provider: ProviderId): number {
  // Prefer per-provider value
  if (style.thinkingByProvider?.[provider] !== undefined) {
    return style.thinkingByProvider[provider]!
  }
  // Legacy fallback: use old `thinking` for gemini, provider defaults for others
  if (provider === "gemini" && style.thinking !== undefined) {
    return style.thinking
  }
  return PROVIDERS[provider].thinking.default
}

const FALLBACK_STYLE: ProofreadStyle = {
  name: "Grammar Only",
  icon: "check",
  thinkingByProvider: { gemini: 0, openai: 0, claude: 0, grok: 0 },
  prompt:
    "Fix only the grammar, spelling, and punctuation errors in the following text. Do not change the tone, style, or wording beyond what is necessary for correctness.",
}

export const DEFAULT_STYLES: ProofreadStyle[] = [
  { ...FALLBACK_STYLE },
  {
    name: "Casual",
    icon: "coffee",
    thinkingByProvider: { gemini: 0, openai: 0, claude: 0, grok: 0 },
    prompt:
      "Rewrite the following text in a casual, friendly, conversational tone. Fix any grammar or spelling errors. Do not be too energetic, no exclamation marks or alike.",
  },
  {
    name: "Neutral",
    icon: "scale",
    thinkingByProvider: { gemini: 0, openai: 0, claude: 0, grok: 0 },
    prompt:
      "Rewrite the following text in a neutral, clear, and balanced tone. Fix any grammar or spelling errors. Avoid being overly casual or overly formal",
  },
  {
    name: "Formal",
    icon: "briefcase",
    thinkingByProvider: { gemini: 0, openai: 0, claude: 0, grok: 0 },
    prompt:
      "Rewrite the following text in a formal, polished, professional tone. Fix any grammar or spelling errors.",
  },
]

const STYLES_STORAGE_KEY = "proofreader_styles"

/**
 * Migrate a style from legacy `thinking` (single number) to `thinkingByProvider`.
 * Only runs if the style doesn't already have thinkingByProvider set.
 * @param style - The style to migrate
 * @returns The migrated style with thinkingByProvider populated
 */
function migrateStyle(style: ProofreadStyle): ProofreadStyle {
  if (style.thinkingByProvider) return style
  const geminiVal = style.thinking ?? DEFAULT_THINKING
  return {
    ...style,
    thinkingByProvider: {
      gemini: geminiVal,
      openai: DEFAULT_THINKING_BY_PROVIDER.openai,
      claude: DEFAULT_THINKING_BY_PROVIDER.claude,
      grok: 0,
    },
  }
}

/**
 * Load styles from localStorage, falling back to defaults on first run.
 * @returns Array of proofreading styles, with legacy styles migrated
 */
export function loadStyles(): ProofreadStyle[] {
  try {
    const raw = localStorage.getItem(STYLES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ProofreadStyle[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(migrateStyle)
      }
    }
  } catch {
    // corrupted data — reset to defaults
  }
  return [...DEFAULT_STYLES]
}

/**
 * Persist styles to localStorage. Enforces at least one style.
 * @param styles - The styles to save
 * @returns The saved styles (ensures at least one style exists)
 */
export function saveStyles(styles: ProofreadStyle[]): ProofreadStyle[] {
  const safe = styles.length > 0 ? styles : [{ ...FALLBACK_STYLE }]
  localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(safe))
  return safe
}

/**
 * Export styles as a JSON string for download.
 * @param styles - The styles to export
 * @returns JSON string representation of the styles
 */
export function exportStylesJSON(styles: ProofreadStyle[]): string {
  return JSON.stringify(styles, null, 2)
}

/**
 * Parse an imported JSON string into styles. Throws on invalid data.
 * @param json - JSON string containing an array of styles
 * @returns Parsed styles with legacy migration applied
 * @throws Error if JSON is invalid or doesn't contain valid styles
 */
export function parseImportedStyles(json: string): ProofreadStyle[] {
  const parsed = JSON.parse(json)
  if (!Array.isArray(parsed)) throw new Error("Expected an array of styles")
  for (const item of parsed) {
    if (typeof item.name !== "string" || !item.name.trim()) {
      throw new Error("Each style must have a non-empty 'name'")
    }
    if (typeof item.prompt !== "string" || !item.prompt.trim()) {
      throw new Error(`Style "${item.name}" must have a non-empty 'prompt'`)
    }
  }
  return (parsed as ProofreadStyle[]).map(migrateStyle)
}

/**
 * Merge imported styles into existing ones.
 * Styles with a matching name get overwritten, new styles get appended.
 * @param existing - The existing styles
 * @param incoming - The styles being imported
 * @returns Merged styles array
 */
export function mergeStyles(
  existing: ProofreadStyle[],
  incoming: ProofreadStyle[]
): ProofreadStyle[] {
  const merged = [...existing]
  for (const style of incoming) {
    const idx = merged.findIndex(
      (s) => s.name.toLowerCase() === style.name.toLowerCase()
    )
    if (idx >= 0) {
      merged[idx] = style
    } else {
      merged.push(style)
    }
  }
  return merged
}
