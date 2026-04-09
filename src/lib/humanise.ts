// ─────────────────────────────────────────────────────────────────────────────
// humanise.ts
// Post-processes proofread output by injecting subtle, human-like patterns.
// Runs client-side after the AI response is received — the AI itself is not
// instructed to make mistakes (it would resist and results would be inconsistent).
// ─────────────────────────────────────────────────────────────────────────────

export interface AntiAiErrorType {
  enabled: boolean
  weight: number  // 1–5 relative probability when selecting which error to apply
}

export interface AntiAiThreshold {
  minWords: number
  maxWords: number  // use 99999 instead of Infinity — JSON serialisation safe
  count: number     // how many errors to inject at this word-count range
}

export interface AntiAiConfig {
  enabled: boolean
  includeErrors: boolean  // master gate for the error-injection types
  thresholds: AntiAiThreshold[]
  errors: {
    doubleSpace:       AntiAiErrorType
    aAn:               AntiAiErrorType
    lowercaseStart:    AntiAiErrorType
    doublePeriod:      AntiAiErrorType
    thenThan:          AntiAiErrorType
    missingHyphen:     AntiAiErrorType
    repeatedWord:      AntiAiErrorType
    looseLose:         AntiAiErrorType
    humanisePhrasing:  AntiAiErrorType
    hedging:           AntiAiErrorType
  }
}

// Keys treated as "mistakes" — gated by includeErrors
export const ERROR_TYPE_KEYS: Array<keyof AntiAiConfig["errors"]> = [
  "doubleSpace", "aAn", "lowercaseStart", "doublePeriod",
  "thenThan", "missingHyphen", "repeatedWord", "looseLose",
]

// Keys treated as stylistic humanisation — always available
export const PHRASING_TYPE_KEYS: Array<keyof AntiAiConfig["errors"]> = [
  "humanisePhrasing", "hedging",
]

export const DEFAULT_ANTI_AI_CONFIG: AntiAiConfig = {
  enabled: false,
  includeErrors: false,
  thresholds: [
    { minWords: 0,   maxWords: 25,    count: 0 },
    { minWords: 25,  maxWords: 75,    count: 1 },
    { minWords: 75,  maxWords: 150,   count: 2 },
    { minWords: 150, maxWords: 300,   count: 3 },
    { minWords: 300, maxWords: 500,   count: 5 },
    { minWords: 500, maxWords: 99999, count: 7 },
  ],
  errors: {
    doubleSpace:      { enabled: false, weight: 3 },
    aAn:              { enabled: false, weight: 3 },
    lowercaseStart:   { enabled: false, weight: 2 },
    doublePeriod:     { enabled: false, weight: 2 },
    thenThan:         { enabled: false, weight: 2 },
    missingHyphen:    { enabled: false, weight: 2 },
    repeatedWord:     { enabled: false, weight: 3 },
    looseLose:        { enabled: false, weight: 1 },
    humanisePhrasing: { enabled: true,  weight: 4 },
    hedging:          { enabled: true,  weight: 3 },
  },
}

export const ERROR_LABELS: Record<keyof AntiAiConfig["errors"], { label: string; desc: string }> = {
  doubleSpace:      { label: "Double space",              desc: "Extra space between two words" },
  aAn:              { label: "a / an confusion",          desc: 'Flip correct usage — "a apple", "an book"' },
  lowercaseStart:   { label: "Lowercase sentence start",  desc: "Drop the capital letter after a full stop" },
  doublePeriod:     { label: "Double full stop",          desc: "Replace one sentence-ending full stop with two" },
  thenThan:         { label: "then / than swap",          desc: '"better then expected" — very common human slip' },
  missingHyphen:    { label: "Missing hyphen",            desc: "Remove a hyphen from a compound adjective" },
  repeatedWord:     { label: "Repeated word",             desc: '"the the", "in in" — fast typing slip' },
  looseLose:        { label: "loose / lose",              desc: '"don\'t loose sight" — extremely common' },
  humanisePhrasing: { label: "Humanise phrasing",         desc: "Swap formal AI-isms for casual human equivalents (furthermore → also, utilize → use)" },
  hedging:          { label: "Hedging",                   desc: 'Add uncertainty words to soften direct assertions ("is probably", "are generally")' },
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getErrorCount(wordCount: number, thresholds: AntiAiThreshold[]): number {
  for (const t of thresholds) {
    if (wordCount >= t.minWords && wordCount < t.maxWords) return t.count
  }
  return thresholds[thresholds.length - 1]?.count ?? 0
}

function weightedSample(pool: Array<{ key: string; weight: number }>, n: number): string[] {
  const remaining = [...pool]
  const result: string[] = []
  while (result.length < n && remaining.length > 0) {
    const total = remaining.reduce((s, e) => s + e.weight, 0)
    let r = Math.random() * total
    let i = 0
    while (i < remaining.length - 1 && r > remaining[i].weight) {
      r -= remaining[i].weight
      i++
    }
    result.push(remaining[i].key)
    remaining.splice(i, 1)
  }
  return result
}

// ── Error applicators ─────────────────────────────────────────────────────────
// Each returns modified text, or the original if no candidate found.

function applyDoubleSpace(text: string): string {
  const matches: number[] = []
  const re = /\w \w/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) matches.push(m.index)
  if (!matches.length) return text
  const idx = matches[Math.floor(Math.random() * matches.length)]
  return text.slice(0, idx + 1) + "  " + text.slice(idx + 2)
}

function applyAAn(text: string): string {
  type C = { index: number; len: number; replacement: string }
  const candidates: C[] = []
  let m: RegExpExecArray | null

  // "an " before vowel-starting word → corrupt to "a " (wrong)
  const reAn = /\ban (?=[aeiouAEIOU]\w)/g
  while ((m = reAn.exec(text)) !== null)
    candidates.push({ index: m.index, len: 3, replacement: "a " })

  // "a " before consonant-starting word → corrupt to "an " (wrong)
  const reA = /\ba (?=[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ]\w)/g
  while ((m = reA.exec(text)) !== null)
    candidates.push({ index: m.index, len: 2, replacement: "an " })

  if (!candidates.length) return text
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return text.slice(0, pick.index) + pick.replacement + text.slice(pick.index + pick.len)
}

function applyLowercaseStart(text: string): string {
  const re = /[.!?]\s+([A-Z])(?=[a-z])/g
  const matches: Array<{ charIndex: number; char: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const charIndex = m.index + m[0].length - 1
    matches.push({ charIndex, char: m[1] })
  }
  if (!matches.length) return text
  const pick = matches[Math.floor(Math.random() * matches.length)]
  return text.slice(0, pick.charIndex) + pick.char.toLowerCase() + text.slice(pick.charIndex + 1)
}

function applyDoublePeriod(text: string): string {
  const re = /(?<!\.)\.(?![.\d])\s/g
  const matches: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) matches.push(m.index)
  if (!matches.length) return text
  const idx = matches[Math.floor(Math.random() * matches.length)]
  return text.slice(0, idx) + ".." + text.slice(idx + 1)
}

function applyThenThan(text: string): string {
  const re = /\b(than|then)\b/g
  const matches: Array<{ index: number; word: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) matches.push({ index: m.index, word: m[1] })
  if (!matches.length) return text
  const pick = matches[Math.floor(Math.random() * matches.length)]
  const replacement = pick.word === "than" ? "then" : "than"
  return text.slice(0, pick.index) + replacement + text.slice(pick.index + pick.word.length)
}

function applyMissingHyphen(text: string): string {
  const compounds = [
    "well-known", "well-established", "long-term", "short-term", "high-quality",
    "full-time", "part-time", "hard-working", "fast-paced", "well-written",
    "well-designed", "best-known", "low-cost", "open-source", "real-time",
    "user-friendly", "built-in", "up-to-date", "state-of-the-art", "right-click",
  ]
  const present = compounds.filter((c) => text.includes(c))
  if (!present.length) return text
  const pick = present[Math.floor(Math.random() * present.length)]
  const idx = text.indexOf(pick)
  const hyphenIdx = pick.indexOf("-")
  const dehyphenated = pick.slice(0, hyphenIdx) + " " + pick.slice(hyphenIdx + 1)
  return text.slice(0, idx) + dehyphenated + text.slice(idx + pick.length)
}

function applyRepeatedWord(text: string): string {
  const smallWords = ["the", "a", "in", "to", "and", "of", "for", "is", "it", "on", "at", "or", "but", "be", "as"]
  const matches: Array<{ index: number; word: string }> = []
  for (const word of smallWords) {
    const re = new RegExp(` (${word}) `, "gi")
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      matches.push({ index: m.index + 1, word: m[1] })
    }
  }
  if (!matches.length) return text
  const pick = matches[Math.floor(Math.random() * matches.length)]
  return text.slice(0, pick.index) + pick.word + " " + text.slice(pick.index)
}

function applyLooseLose(text: string): string {
  const map: Record<string, string> = { lose: "loose", losing: "loosing", loser: "looser" }
  const re = /\b(lose|losing|loser)\b/g
  const matches: Array<{ index: number; word: string }> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) matches.push({ index: m.index, word: m[1] })
  if (!matches.length) return text
  const pick = matches[Math.floor(Math.random() * matches.length)]
  return text.slice(0, pick.index) + (map[pick.word] ?? pick.word) + text.slice(pick.index + pick.word.length)
}

function applyHumanisePhrasing(text: string): string {
  type Swap = { from: string; to: string | string[] }
  const swaps: Swap[] = [
    { from: "in order to",              to: "to" },
    { from: "furthermore",              to: ["also", "on top of that"] },
    { from: "moreover",                 to: ["also", "what's more"] },
    { from: "additionally",             to: ["also", "and"] },
    { from: "therefore",                to: "so" },
    { from: "thus",                     to: "so" },
    { from: "consequently",             to: "as a result" },
    { from: "nevertheless",             to: "still" },
    { from: "notwithstanding",          to: "despite that" },
    { from: "utilize",                  to: "use" },
    { from: "utilise",                  to: "use" },
    { from: "demonstrate",              to: "show" },
    { from: "facilitate",               to: "help" },
    { from: "leverage",                 to: "use" },
    { from: "leveraging",               to: "using" },
    { from: "optimal",                  to: "best" },
    { from: "prior to",                 to: "before" },
    { from: "subsequent to",            to: "after" },
    { from: "commence",                 to: "start" },
    { from: "terminate",                to: "end" },
    { from: "assist",                   to: "help" },
    { from: "purchase",                 to: "buy" },
    { from: "obtain",                   to: "get" },
    { from: "delve into",               to: ["explore", "dig into", "look at"] },
    { from: "in conclusion",            to: ["to wrap up", "overall"] },
    { from: "in summary",               to: "to sum up" },
    { from: "it is worth noting that",  to: "worth mentioning," },
    { from: "it is important to note that", to: "keep in mind," },
    { from: "as a consequence",         to: "as a result" },
    { from: "endeavour",                to: "try" },
    { from: "endeavor",                 to: "try" },
  ]

  type Candidate = { index: number; matchedText: string; replacement: string }
  const candidates: Candidate[] = []

  for (const { from, to } of swaps) {
    const escaped = from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")
    const re = new RegExp(`\\b${escaped}\\b`, "gi")
    let m: RegExpExecArray | null
    while ((m = re.exec(text)) !== null) {
      const replacement = Array.isArray(to) ? to[Math.floor(Math.random() * to.length)] : to
      candidates.push({ index: m.index, matchedText: m[0], replacement })
    }
  }

  if (!candidates.length) return text
  const pick = candidates[Math.floor(Math.random() * candidates.length)]

  // Preserve initial capitalisation
  let rep = pick.replacement
  if (/[A-Z]/.test(pick.matchedText[0])) {
    rep = rep[0].toUpperCase() + rep.slice(1)
  }

  return text.slice(0, pick.index) + rep + text.slice(pick.index + pick.matchedText.length)
}

function applyHedging(text: string): string {
  // Insert hedging words after modal/linking verbs before a lowercase word —
  // softens definitive AI-style assertions into more human, uncertain phrasing
  const hedgeWords = ["probably", "arguably", "generally", "typically", "usually", "perhaps"]
  const hedge = hedgeWords[Math.floor(Math.random() * hedgeWords.length)]

  // Words we don't want to hedge before (already hedged, negations, articles, etc.)
  const skip = new Set([
    "not", "no", "also", "just", "still", "already", "even", "very", "quite",
    "rather", "probably", "arguably", "generally", "typically", "usually",
    "perhaps", "the", "a", "an", "always", "never", "only",
  ])

  // Match "is/are/was/were/will/can/..." followed by a space then a lowercase word
  const re = /\b(?:is|are|was|were|will|can|could|should|would|may|might)\s+(?=[a-z])/g
  const candidates: number[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const pos = m.index + m[0].length
    const wordMatch = /^([a-z]+)/.exec(text.slice(pos))
    if (wordMatch && !skip.has(wordMatch[1])) {
      candidates.push(pos)
    }
  }

  if (!candidates.length) return text
  const pos = candidates[Math.floor(Math.random() * candidates.length)]
  return text.slice(0, pos) + hedge + " " + text.slice(pos)
}

const APPLICATORS: Record<keyof AntiAiConfig["errors"], (text: string) => string> = {
  doubleSpace:      applyDoubleSpace,
  aAn:              applyAAn,
  lowercaseStart:   applyLowercaseStart,
  doublePeriod:     applyDoublePeriod,
  thenThan:         applyThenThan,
  missingHyphen:    applyMissingHyphen,
  repeatedWord:     applyRepeatedWord,
  looseLose:        applyLooseLose,
  humanisePhrasing: applyHumanisePhrasing,
  hedging:          applyHedging,
}

// ── Main export ───────────────────────────────────────────────────────────────

export function humaniseText(text: string, config: AntiAiConfig): string {
  if (!config.enabled) return text

  const words = countWords(text)
  const count = getErrorCount(words, config.thresholds)
  if (count === 0) return text

  const pool = (Object.keys(config.errors) as Array<keyof AntiAiConfig["errors"]>)
    .filter((k) => {
      if (!config.errors[k].enabled) return false
      // Error types are excluded entirely when includeErrors is off
      if (ERROR_TYPE_KEYS.includes(k) && !config.includeErrors) return false
      return true
    })
    .map((k) => ({ key: k as string, weight: config.errors[k].weight }))

  if (!pool.length) return text

  const selected = weightedSample(pool, Math.min(count, pool.length))
  let result = text
  for (const type of selected) {
    const fn = APPLICATORS[type as keyof AntiAiConfig["errors"]]
    if (fn) result = fn(result)
  }
  return result
}
