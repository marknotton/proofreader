export interface ProofreadStyle {
  name: string
  prompt: string
  /** Gemini thinking budget (0 = no thinking/fastest, up to 24576 = deepest). Default: 1024 */
  thinking?: number
}

/**
 * Default styles shipped with the extension.
 * Users can delete these — if they nuke everything,
 * FALLBACK_STYLE gets added back so there's always at least one.
 */
export const DEFAULT_THINKING = 1024

const FALLBACK_STYLE: ProofreadStyle = {
  name: "Grammar Only",
  thinking: 0,
  prompt:
    "Fix only the grammar, spelling, and punctuation errors in the following text. Do not change the tone, style, or wording beyond what is necessary for correctness.",
}

export const DEFAULT_STYLES: ProofreadStyle[] = [
  { ...FALLBACK_STYLE },
  {
    name: "Casual",
    thinking: 0,
    prompt:
      "Rewrite the following text in a casual, friendly, conversational tone. Fix any grammar or spelling errors. Do not be too energetic, no exclamation marks or alike.",
  },
  {
    name: "Neutral",
    thinking: 1024,
    prompt:
      "Rewrite the following text in a neutral, clear, and balanced tone. Fix any grammar or spelling errors. Avoid being overly casual or overly formal",
  },
  {
    name: "Formal",
    thinking: 1024,
    prompt:
        "Rewrite the following text in a formal, polished, professional tone. Fix any grammar or spelling errors.",
  }
]

const STYLES_STORAGE_KEY = "proofreader_styles"

/** Load styles from localStorage, falling back to defaults on first run */
export function loadStyles(): ProofreadStyle[] {
  try {
    const raw = localStorage.getItem(STYLES_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as ProofreadStyle[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
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
    if (item.thinking !== undefined && typeof item.thinking !== "number") {
      throw new Error(`Style "${item.name}" has invalid 'thinking' value`)
    }
  }
  return parsed as ProofreadStyle[]
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
