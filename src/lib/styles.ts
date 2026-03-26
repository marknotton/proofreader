import { type ProviderId, PROVIDERS } from "./providers"

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
}

export const DEFAULT_THINKING = 1024

/** Default per-provider thinking values */
export const DEFAULT_THINKING_BY_PROVIDER: Record<ProviderId, number> = {
  gemini: 1024,
  openai: 1,
  claude: 1,
  grok: 0,
}

/** Get the thinking value for a specific provider from a style */
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
    thinkingByProvider: { gemini: 1024, openai: 1, claude: 1, grok: 0 },
    prompt:
      "Rewrite the following text in a neutral, clear, and balanced tone. Fix any grammar or spelling errors. Avoid being overly casual or overly formal",
  },
  {
    name: "Formal",
    icon: "briefcase",
    thinkingByProvider: { gemini: 1024, openai: 1, claude: 1, grok: 0 },
    prompt:
      "Rewrite the following text in a formal, polished, professional tone. Fix any grammar or spelling errors.",
  },
]

const STYLES_STORAGE_KEY = "proofreader_styles"

/**
 * Migrate a style from legacy `thinking` (single number) to `thinkingByProvider`.
 * Only runs if the style doesn't already have thinkingByProvider set.
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

/** Load styles from localStorage, falling back to defaults on first run */
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

/** Persist styles to localStorage. Enforces at least one style. */
export function saveStyles(styles: ProofreadStyle[]): ProofreadStyle[] {
  const safe = styles.length > 0 ? styles : [{ ...FALLBACK_STYLE }]
  localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(safe))
  return safe
}

/** Export styles as a JSON string for download */
export function exportStylesJSON(styles: ProofreadStyle[]): string {
  return JSON.stringify(styles, null, 2)
}

/** Parse an imported JSON string into styles. Throws on invalid data. */
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
 * - Styles with a matching name get overwritten
 * - New styles get appended
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
