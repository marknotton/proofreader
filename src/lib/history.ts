import type { ProviderId } from "./providers"
import type { SpellingLocale } from "./styles"

export interface HistoryItem {
  id: string
  input: string
  output: string
  styleName: string
  provider: ProviderId
  /** Effective thinking value used (provider-specific) */
  thinking: number
  spellingLocale?: SpellingLocale
  timestamp: number
}

const HISTORY_KEY = "proofreader_history"
const HISTORY_ENABLED_KEY = "proofreader_history_enabled"
export const HISTORY_LIMIT = 100

export function isHistoryEnabled(): boolean {
  return localStorage.getItem(HISTORY_ENABLED_KEY) !== "false"
}

export function setHistoryEnabled(enabled: boolean): void {
  localStorage.setItem(HISTORY_ENABLED_KEY, String(enabled))
}

export function loadHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed as HistoryItem[]
    }
  } catch {
    // corrupted — reset
  }
  return []
}

function saveHistory(items: HistoryItem[]): void {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items))
}

/** Add a new item, enforcing the limit. Returns the updated list. */
export function addHistoryItem(
  item: Omit<HistoryItem, "id" | "timestamp">
): HistoryItem[] {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const entry: HistoryItem = { ...item, id, timestamp: Date.now() }
  const existing = loadHistory()
  const updated = [entry, ...existing].slice(0, HISTORY_LIMIT)
  saveHistory(updated)
  return updated
}

/** Delete a single item by ID. Returns the updated list. */
export function deleteHistoryItem(id: string): HistoryItem[] {
  const updated = loadHistory().filter((item) => item.id !== id)
  saveHistory(updated)
  return updated
}

/** Wipe all history. */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY)
}
