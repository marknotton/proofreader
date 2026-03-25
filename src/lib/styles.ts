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
    "Fix only the grammar, spelling, and punctuation errors in the following text. Do not change the tone, style, or wording beyond what is necessary for correctness. Return only the corrected text with no explanation.",
}

export const DEFAULT_STYLES: ProofreadStyle[] = [
  { ...FALLBACK_STYLE },
  {
    name: "Casual",
    thinking: 0,
    prompt:
      "Rewrite the following text in a casual, friendly, conversational tone. Fix any grammar or spelling errors. Return only the corrected text with no explanation. Do not be too energetic, no explanation marks.",
  },
  {
    name: "Neutral",
    thinking: 4096,
    prompt:
      "Review content that is typically a rough collection of commit messages. Categorise these messages (added, changed, fixed, removed, etc.), improve obvious spelling and grammar mistakes, and use British spellings. Include its category at the start of each message, typically in the past tense. If a message is too vague, use the context of other messages to add detail. If there are any standalone repository website addresses, place them at the end of the returned content with the group name: Commit links:. Reorder the list into their groups, but do not add category headings. I expect three code blocks: one for the summary, one for the list of commits and their URLs (if any), and lastly a continued sentence. The list of commits and the list of URLs MUST be kept in the same code block. Just before the list of messages, within its own code box, add a single sentence that summarises all the messages. This summary should be simple, not over-excited, and in the past tense. Do not reference that these are commit messages, and instead write in the context of completed work without phrases like today I did. For example, write Worked on the home page rather than Today my commit messages show that I worked on the home page. Just after the list of commits, include another code block that starts with [Continued] followed by a single sentence that can easily refer to the list of tasks. Ignore any messages about YAML file updates, additions, or development environment changes. Also dismiss messages like fixed last commit or fixed typo that do not add value to the list. Your response should always be in a code box format for easy copying, with no formatting at all, bullet points should just be hyphens, do not add category headings, and avoid Markdown formatting. Remember to add the commit links at the end. When rephrasing commits, keep it simple and avoid unnecessary words like enhanced, keeping it human and straightforward. Return only the corrected text with no explanation.",
  },
  {
    name: "Formal",
    thinking: 1024,
    prompt:
      "Rewrite the following text in a formal, polished, professional tone. Fix any grammar or spelling errors. Return only the corrected text with no explanation.",
  },
  {
    name: "Commits",
    thinking: 8192,
    prompt:
      "Review content that is typically a rough collection of commit messages. Categorise these messages (added, changed, fixed, removed, etc.), improve obvious spelling and grammar mistakes, and use British spellings. Include its category at the start of each message, typically in the past tense. If a message is too vague, use the context of other messages to add detail. If there are any standalone repository website addresses, place them at the end of the returned content with the group name: Commit links:. Reorder the list into their groups, but do not add category headings. I expect three code blocks: one for the summary, one for the list of commits and their URLs (if any), and lastly a continued sentence. The list of commits and the list of URLs MUST be kept in the same code block. Just before the list of messages, within its own code box, add a single sentence that summarises all the messages. This summary should be simple, not over-excited, and in the past tense. Do not reference that these are commit messages, and instead write in the context of completed work without phrases like today I did. For example, write Worked on the home page rather than Today my commit messages show that I worked on the home page. Just after the list of commits, include another code block that starts with [Continued] followed by a single sentence that can easily refer to the list of tasks. Ignore any messages about YAML file updates, additions, or development environment changes. Also dismiss messages like fixed last commit or fixed typo that do not add value to the list. Your response should always be in a code box format for easy copying, with no formatting at all, bullet points should just be hyphens, do not add category headings, and avoid Markdown formatting. Remember to add the commit links at the end. When rephrasing commits, keep it simple and avoid unnecessary words like enhanced, keeping it human and straightforward. Return only the corrected text with no explanation.",
  },
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
