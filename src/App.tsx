import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "./components/ui/button"
import { Textarea } from "./components/ui/textarea"
import { Card, CardContent } from "./components/ui/card"
import { Switch } from "./components/ui/switch"
import MarkdownOutput from "./components/MarkdownOutput"
import StyleManager from "./components/StyleManager"
import {
  type ProofreadStyle,
  getStyleThinking,
  loadStyles,
  saveStyles,
  SPELLING_LOCALE_PROMPTS,
} from "./lib/styles"
import {
  type ProviderId,
  PROVIDERS,
  PROVIDER_IDS,
  BUILD_PERIOD,
  getProviderKey,
  setProviderKey,
  getActiveProvider,
  setActiveProvider as persistProvider,
} from "./lib/providers"
import { proofread } from "./lib/proofread"
import { DEMO_ENABLED, getDemoUsed, getDemoLimit, hasDemoRemaining, demoProofread } from "./lib/demo"
import {
  type HistoryItem,
  loadHistory,
  addHistoryItem,
  deleteHistoryItem,
  clearHistory,
  isHistoryEnabled,
  setHistoryEnabled,
} from "./lib/history"
import { type SanitisedError, sanitiseError } from "./lib/errors"
import { humaniseText, type AntiAiConfig, DEFAULT_ANTI_AI_CONFIG, ERROR_LABELS, ERROR_TYPE_KEYS, PHRASING_TYPE_KEYS } from "./lib/humanise"
import { getIconComponent, getStyleButtonStyles } from "./lib/style-options"
import { Copy, Check, Loader2, Settings, X, Eraser, Zap, Brain, SlidersHorizontal, Coffee, Heart, Sun, Moon, Monitor, Info, ChevronDown, ChevronLeft, AlertTriangle, Wand2, Code2, Trash2, History, ChevronRight, EyeOff, Search, Fingerprint } from "lucide-react"
import { useI18n } from "./context/I18nContext"
import { LOCALE_IDS, LOCALE_NAMES, type Locale } from "./lib/i18n"

const CELEBRATE_KEY = "proofreader_celebrate"
const ANTI_AI_KEY = "proofreader_anti_ai"
const HIDE_DONATION_KEY = "proofreader_hide_donation"
const AUTO_SHOW_KEY = "proofreader_auto_show"
const AUTO_ENABLED_KEY = "proofreader_auto_enabled"
const AUTO_PASTE_KEY = "proofreader_auto_paste"
const AUTO_TYPE_KEY = "proofreader_auto_type"
const AUTO_DELAY_KEY = "proofreader_auto_delay"
const BMC_URL = "https://buymeacoffee.com/marknotton"
const THEME_KEY = "proofreader_theme"
type Theme = "light" | "dark" | "auto"
const isMac = /Mac|iPhone|iPad/.test(navigator.userAgent)
const SUBMIT_SHORTCUT = isMac ? "⌘↵" : "Ctrl+↵"

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme)
}

/** Safely access chrome extension APIs — returns null outside extension context */
function getChromeAPI(): any | null {
  const c = (globalThis as any).chrome
  return c?.storage ? c : null
}

type SettingsView = "closed" | "settings" | "styles" | "provider" | "history" | "history-detail" | "anti-ai"

export default function App() {
  const { t, locale, changeLocale } = useI18n()

  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [styles, setStyles] = useState<ProofreadStyle[]>(() => loadStyles())
  const [activeStyle, setActiveStyle] = useState(() => loadStyles()[0]?.name ?? "Grammar Only")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<SanitisedError | null>(null)
  const [showRawError, setShowRawError] = useState(false)
  const [settingsView, setSettingsView] = useState<SettingsView>("closed")

  // ── Provider state ──
  const [provider, setProvider] = useState<ProviderId>(() => getActiveProvider())
  const [apiKey, setApiKey] = useState(() => getProviderKey(getActiveProvider()))
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [showApiInfo, setShowApiInfo] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const [thinkingOverride, setThinkingOverride] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [contextMenuEnabled, setContextMenuEnabled] = useState(false)
  const [hideDonation, setHideDonation] = useState(() => localStorage.getItem(HIDE_DONATION_KEY) === "true")
  const [celebrateEnabled, setCelebrateEnabled] = useState(() => localStorage.getItem(CELEBRATE_KEY) !== "false")
  const [miniConfetti, setMiniConfetti] = useState(false)
  const [demoUsed, setDemoUsed] = useState(() => getDemoUsed())

  // ── History state ──
  const [historyEnabled, setHistoryEnabledState] = useState(() => isHistoryEnabled())
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory())
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showHistoryDisableConfirm, setShowHistoryDisableConfirm] = useState(false)
  const [historySearch, setHistorySearch] = useState("")
  const [incognito, setIncognito] = useState(false)

  // ── Anti-AI Detection state ──
  const [antiAiConfig, setAntiAiConfig] = useState<AntiAiConfig>(() => {
    const saved = localStorage.getItem(ANTI_AI_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        return {
          ...DEFAULT_ANTI_AI_CONFIG,
          ...parsed,
          errors: { ...DEFAULT_ANTI_AI_CONFIG.errors, ...(parsed.errors ?? {}) },
          thresholds: parsed.thresholds ?? DEFAULT_ANTI_AI_CONFIG.thresholds,
        }
      } catch {}
    }
    return DEFAULT_ANTI_AI_CONFIG
  })

  // ── Auto-proofread state ──
  const [autoShow, setAutoShow] = useState(() => localStorage.getItem(AUTO_SHOW_KEY) !== "false") // visible by default
  const [autoEnabled, setAutoEnabled] = useState(() => localStorage.getItem(AUTO_ENABLED_KEY) === "true") // off by default
  const [autoPaste, setAutoPaste] = useState(() => localStorage.getItem(AUTO_PASTE_KEY) !== "false") // on by default when auto is shown
  const [autoType, setAutoType] = useState(() => localStorage.getItem(AUTO_TYPE_KEY) === "true") // off by default
  const [autoDelay, setAutoDelay] = useState(() => {
    const saved = localStorage.getItem(AUTO_DELAY_KEY)
    return saved ? Math.max(1, Math.min(30, Number(saved))) : 3
  })
  const [timerActive, setTimerActive] = useState(false)

  // Refs for auto-proofread timer management
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastProofreadTextRef = useRef("")
  const isPasteRef = useRef(false)
  const isAutoRunRef = useRef(false)
  const lastAutoHistoryIdRef = useRef<string | null>(null)
  const outputRef = useRef<HTMLDivElement>(null)

  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    const th = saved || "auto"
    applyTheme(th as Theme)
    return th as Theme
  })
  const abortRef = useRef<AbortController | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tRef = useRef(t)
  useEffect(() => { tRef.current = t }, [t])
  const celebrateEnabledRef = useRef(celebrateEnabled)
  useEffect(() => { celebrateEnabledRef.current = celebrateEnabled }, [celebrateEnabled])
  const pendingModeRef = useRef<{ mode: "proofread" | "replace"; tabId?: number } | null>(null)

  const providerConfig = PROVIDERS[provider]
  const currentStyle = styles.find((s) => s.name === activeStyle)
  const effectiveThinking = thinkingOverride ?? (currentStyle ? getStyleThinking(currentStyle, provider) : providerConfig.thinking.default)

  // ── Toast ──
  const showToast = useCallback((message: string, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  // ── Core proofread — also stored in a ref so the storage listener can call it
  //    without being in its dependency array ──
  const runProofread = useCallback(async (
    text: string,
    opts?: { mode?: "proofread" | "replace"; tabId?: number; styleName?: string; isAuto?: boolean }
  ) => {
    const key = apiKey || getProviderKey(provider)
    const isDemo = DEMO_ENABLED && !key
    if (!text.trim()) return
    if (!key && !isDemo) return   // no key and demo disabled — do nothing
    if (isDemo && !hasDemoRemaining()) return

    // If a styleName was passed (e.g. from context menu), use that — the React
    // state may not have flushed yet
    const style = opts?.styleName
      ? styles.find((s) => s.name === opts.styleName) || styles.find((s) => s.name === activeStyle)
      : styles.find((s) => s.name === activeStyle)
    if (!style) return

    pendingModeRef.current = opts?.mode ? { mode: opts.mode, tabId: opts.tabId } : null

    setLoading(true)
    setOutput("")
    setError(null)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      let result = ""

      // Prepend spelling locale instruction so it takes priority over the style prompt
      const localeInstruction = style.spellingLocale
        ? SPELLING_LOCALE_PROMPTS[style.spellingLocale]
        : ""
      const effectivePrompt = localeInstruction
        ? `${localeInstruction}\n\n${style.prompt}`
        : style.prompt

      if (isDemo) {
        // Demo mode — non-streaming single response via Firebase proxy
        // Force thinking to fastest to keep demo snappy (user can still
        // interact with the slider for UX purposes — we just override here)
        setThinkingOverride(0)
        const data = await demoProofread(effectivePrompt, text.trim(), controller.signal)
        result = data.result
        setOutput(result)
        setDemoUsed(data.used)
      } else {
        // Normal streaming proofread
        const thinking = thinkingOverride ?? getStyleThinking(style, provider)

        await proofread(
          provider,
          key,
          effectivePrompt,
          text.trim(),
          (chunk) => {
            result += chunk
            setOutput(result)
          },
          controller.signal,
          thinking
        )
      }

      // Strip wrapper tokens some models add (e.g. [TEXT START]...[TEXT END])
      result = result
        .replace(/^\s*\[TEXT\s*START\]\s*/i, "")
        .replace(/\s*\[TEXT\s*END\]\s*$/i, "")

      // Inject human-like errors if Anti-AI Detection is enabled
      result = humaniseText(result, antiAiConfig)
      setOutput(result)

      // Save to history (skip in incognito mode)
      if (historyEnabled && !incognito && result.trim()) {
        // Auto-typing: replace the previous auto-saved item instead of stacking
        if (opts?.isAuto && lastAutoHistoryIdRef.current) {
          deleteHistoryItem(lastAutoHistoryIdRef.current)
          lastAutoHistoryIdRef.current = null
        }
        const updated = addHistoryItem({
          input: text.trim(),
          output: result,
          styleName: style.name,
          provider,
          thinking: thinkingOverride ?? getStyleThinking(style, provider),
          spellingLocale: style.spellingLocale,
        })
        setHistory(updated)
        lastAutoHistoryIdRef.current = opts?.isAuto ? updated[0].id : null
      }

      // Perfect result — no changes needed
      const perfectMessages = [
        tRef.current("toast.perfect1"),
        tRef.current("toast.perfect2"),
        tRef.current("toast.perfect3"),
        tRef.current("toast.perfect4"),
        tRef.current("toast.perfect5"),
      ]
      if (result.trim() === text.trim()) {
        const msg = perfectMessages[Math.floor(Math.random() * perfectMessages.length)]
        showToast(msg)
        if (celebrateEnabledRef.current) {
          setMiniConfetti(true)
          setTimeout(() => setMiniConfetti(false), 2500)
        }
      }

      // Replace mode: send result back to the content script
      if (pendingModeRef.current?.mode === "replace" && pendingModeRef.current.tabId) {
        const chrome = getChromeAPI()
        if (chrome) {
          try {
            const response = await chrome.runtime.sendMessage({
              type: "REPLACE_TEXT",
              text: result,
              tabId: pendingModeRef.current.tabId,
            })
            if (response?.ok) {
              showToast(tRef.current("toast.replaced"))
            } else {
              showToast(response?.error || tRef.current("toast.couldNotReplace"))
            }
          } catch {
            showToast(tRef.current("toast.couldNotReachPage"))
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        // Demo errors are already human-readable — skip provider-specific sanitisation
        const isDemo = !key
        if (isDemo) {
          const [message, ...rest] = err.message.split("\n\n")
          setError({ message, raw: rest.length ? rest.join("\n\n") : err.message })
        } else {
          setError(sanitiseError(err.message, provider))
        }
        setShowRawError(false)
      }
    } finally {
      setLoading(false)
      pendingModeRef.current = null
    }
  }, [apiKey, provider, activeStyle, styles, thinkingOverride, showToast, historyEnabled, incognito, antiAiConfig])

  // Keep a ref to the latest runProofread so the storage listener (which never
  // re-subscribes) always calls the current version.
  // Note: this ref is updated to the wrapped version in the auto-proofread section below.
  const runProofreadRef = useRef(runProofread)

  const showToastRef = useRef(showToast)
  useEffect(() => { showToastRef.current = showToast }, [showToast])

  // ── Init ──
  useEffect(() => {
    setApiKeyInput(apiKey)

    const chrome = getChromeAPI()
    if (chrome) {
      chrome.storage.local.get("contextMenuEnabled", (result: any) => {
        setContextMenuEnabled(result.contextMenuEnabled === true)
      })
    }
  }, [])

  // Sync style names to chrome.storage.local so the background script
  // can build context menu items for each style
  useEffect(() => {
    const chrome = getChromeAPI()
    if (chrome) {
      chrome.storage.local.set({ styleNames: styles.map((s) => s.name) })
    }
  }, [styles])

  // Fall back to first style if active one was deleted
  useEffect(() => {
    if (!styles.find((s) => s.name === activeStyle) && styles.length > 0) {
      setActiveStyle(styles[0].name)
      setThinkingOverride(null)
    }
  }, [styles, activeStyle])

  // ── Watch chrome.storage.session for context menu tasks ──
  // This effect runs ONCE (empty deps). It uses refs to call the latest
  // runProofread/showToast without re-subscribing the listener.
  useEffect(() => {
    const chrome = getChromeAPI()
    if (!chrome?.storage?.session) return

    let lastProcessedTs = 0

    const processTask = () => {
      chrome.storage.session.get("pendingTask", (result: any) => {
        const task = result?.pendingTask
        if (!task) return

        // Don't process the same task twice
        if (task.ts && task.ts <= lastProcessedTs) return
        lastProcessedTs = task.ts || Date.now()

        // Clear it immediately
        chrome.storage.session.remove("pendingTask")

        if (!task.text) {
          showToastRef.current(tRef.current("toast.noTextSelected"))
          return
        }

        setInput(task.text)
        setSettingsView("closed")

        // If the context menu specified a style, switch to it
        if (task.styleName) {
          setActiveStyle(task.styleName)
          setThinkingOverride(null)
        }

        // Small tick for state to settle, then proofread
        // Pass styleName so runProofread can use it even before React state updates
        setTimeout(() => {
          runProofreadRef.current(task.text, {
            mode: task.mode,
            tabId: task.tabId,
            styleName: task.styleName,
          })
        }, 50)
      })
    }

    // Check on mount (panel might have opened after the task was written)
    processTask()

    const listener = (changes: any, area: string) => {
      if (area === "session" && changes.pendingTask?.newValue) {
        processTask()
      }
    }

    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, []) // ← empty deps: subscribe once, use refs for callbacks

  // ── Context menu toggle ──
  const handleContextMenuToggle = useCallback((enabled: boolean) => {
    setContextMenuEnabled(enabled)
    const chrome = getChromeAPI()
    if (chrome) {
      chrome.storage.local.set({ contextMenuEnabled: enabled })
    }
  }, [])

  const handleDonationToggle = useCallback((hidden: boolean) => {
    setHideDonation(hidden)
    localStorage.setItem(HIDE_DONATION_KEY, String(hidden))
  }, [])

  const handleThemeChange = useCallback((t: Theme) => {
    setTheme(t)
    localStorage.setItem(THEME_KEY, t)
    applyTheme(t)
    // If incognito is active, stay incognito; the restore on exit will use new theme
  }, [])

  const handleIncognitoToggle = useCallback(() => {
    setIncognito((prev) => {
      const next = !prev
      document.documentElement.setAttribute("data-theme", next ? "incognito" : theme)
      return next
    })
  }, [theme])

  const handleProviderChange = useCallback((id: ProviderId) => {
    setProvider(id)
    persistProvider(id)
    const key = getProviderKey(id)
    setApiKey(key)
    setApiKeyInput(key)
    setThinkingOverride(null)
    setError(null)
    setShowRawError(false)
  }, [])

  const handleSaveKey = useCallback(() => {
    const trimmed = apiKeyInput.trim()
    if (trimmed) {
      setProviderKey(provider, trimmed)
      setApiKey(trimmed)
      setSettingsView("closed")
    }
  }, [apiKeyInput, provider])

  const handleDeleteKey = useCallback(() => {
    setProviderKey(provider, "")
    setApiKey("")
    setApiKeyInput("")
  }, [provider])

  const handleStylesChange = useCallback((updated: ProofreadStyle[]) => {
    const persisted = saveStyles(updated)
    setStyles(persisted)
  }, [])

  // ── Auto-proofread helpers ──
  /** Returns true when at least 5 characters differ from last proofread */
  const hasSignificantChanges = useCallback((current: string, previous: string): boolean => {
    if (!previous) return current.trim().length >= 5
    const a = current.trim()
    const b = previous.trim()
    if (a === b) return false
    // Quick length-based check first
    if (Math.abs(a.length - b.length) >= 5) return true
    // Character-by-character diff count
    let diffs = 0
    const maxLen = Math.max(a.length, b.length)
    for (let i = 0; i < maxLen; i++) {
      if (a[i] !== b[i]) diffs++
      if (diffs >= 5) return true
    }
    return false
  }, [])

  const clearAutoTimer = useCallback(() => {
    if (autoTimerRef.current) {
      clearTimeout(autoTimerRef.current)
      autoTimerRef.current = null
    }
    if (timerResetRef.current) {
      clearTimeout(timerResetRef.current)
      timerResetRef.current = null
    }
    setTimerActive(false)
  }, [])

  const startAutoTimer = useCallback((text: string) => {
    clearAutoTimer()
    if (!hasSignificantChanges(text, lastProofreadTextRef.current)) return

    // Small gap so CSS transition resets (remove class, wait 300ms, re-add)
    timerResetRef.current = setTimeout(() => {
      setTimerActive(true)
      autoTimerRef.current = setTimeout(() => {
        setTimerActive(false)
        lastProofreadTextRef.current = text
        isAutoRunRef.current = true
        runProofreadRef.current(text)
      }, autoDelay * 1000)
    }, 320) // just over 0.3s reverse transition
  }, [autoDelay, clearAutoTimer, hasSignificantChanges])

  // Update lastProofreadTextRef when a manual proofread completes
  const originalRunProofread = runProofread
  const wrappedRunProofread = useCallback(async (
    text: string,
    opts?: { mode?: "proofread" | "replace"; tabId?: number; styleName?: string }
  ) => {
    lastProofreadTextRef.current = text
    clearAutoTimer()
    const isAuto = isAutoRunRef.current
    isAutoRunRef.current = false
    if (!isAuto) lastAutoHistoryIdRef.current = null  // manual run breaks the auto chain
    return originalRunProofread(text, { ...opts, isAuto })
  }, [originalRunProofread, clearAutoTimer])

  // Update the ref to point to the wrapped version
  useEffect(() => { runProofreadRef.current = wrappedRunProofread }, [wrappedRunProofread])

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
    // If this was a paste event, isPasteRef will be true (set in onPaste)
    if (isPasteRef.current) {
      isPasteRef.current = false
      if (autoEnabled && autoPaste && hasSignificantChanges(value, lastProofreadTextRef.current)) {
        clearAutoTimer()
        lastProofreadTextRef.current = value
        // Small delay for state to settle
        setTimeout(() => runProofreadRef.current(value), 50)
      }
      return
    }
    // Typing-based auto-proofread
    if (autoEnabled && autoType) {
      startAutoTimer(value)
    }
  }, [autoEnabled, autoPaste, autoType, clearAutoTimer, hasSignificantChanges, startAutoTimer])

  const handlePaste = useCallback(() => {
    isPasteRef.current = true
  }, [])

  // ── Auto-proofread settings persistence ──
  const handleAutoShowToggle = useCallback((v: boolean) => {
    setAutoShow(v)
    localStorage.setItem(AUTO_SHOW_KEY, String(v))
    if (!v) {
      setAutoEnabled(false)
      localStorage.setItem(AUTO_ENABLED_KEY, "false")
      clearAutoTimer()
    }
  }, [clearAutoTimer])

  const handleAutoEnabledToggle = useCallback(() => {
    const next = !autoEnabled
    setAutoEnabled(next)
    localStorage.setItem(AUTO_ENABLED_KEY, String(next))
    if (!next) clearAutoTimer()
  }, [autoEnabled, clearAutoTimer])

  const handleAutoPasteToggle = useCallback((v: boolean) => {
    setAutoPaste(v)
    localStorage.setItem(AUTO_PASTE_KEY, String(v))
  }, [])

  const handleAutoTypeToggle = useCallback((v: boolean) => {
    setAutoType(v)
    localStorage.setItem(AUTO_TYPE_KEY, String(v))
    if (!v) clearAutoTimer()
  }, [clearAutoTimer])

  const handleAutoDelayChange = useCallback((v: number) => {
    const clamped = Math.max(1, Math.min(30, v))
    setAutoDelay(clamped)
    localStorage.setItem(AUTO_DELAY_KEY, String(clamped))
  }, [])

  // ── Anti-AI Detection persistence ──
  const handleAntiAiChange = useCallback((updater: (prev: AntiAiConfig) => AntiAiConfig) => {
    setAntiAiConfig((prev) => {
      const next = updater(prev)
      localStorage.setItem(ANTI_AI_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const handleSubmit = useCallback(() => {
    lastProofreadTextRef.current = input
    clearAutoTimer()
    runProofread(input)
  }, [input, runProofread, clearAutoTimer])

  const handleCopy = useCallback(async () => {
    if (!output) return
    await navigator.clipboard.writeText(output)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [output])

  const handleCancel = useCallback(() => {
    abortRef.current?.abort()
    setLoading(false)
    setError(null)
  }, [])

  // ── Keyboard shortcuts ──
  // Escape cancels an in-progress request
  useEffect(() => {
    if (!loading) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCancel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [loading, handleCancel])

  // Cmd+A inside the output card selects all content within it only
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && outputRef.current) {
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          if (outputRef.current.contains(range.commonAncestorContainer)) {
            e.preventDefault()
            const newRange = document.createRange()
            newRange.selectNodeContents(outputRef.current)
            selection.removeAllRanges()
            selection.addRange(newRange)
          }
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const handleClear = useCallback(() => {
    abortRef.current?.abort()
    setInput("")
    setOutput("")
    setError(null)
    setLoading(false)
    clearAutoTimer()
    lastProofreadTextRef.current = ""
    lastAutoHistoryIdRef.current = null
  }, [clearAutoTimer])

  // ── Thinking slider display logic ──
  const renderThinkingSlider = () => {
    const cfg = providerConfig.thinking

    if (!cfg.supported || cfg.type === "none") return null

    if (cfg.type === "effort") {
      const labels = [t("thinking.low"), t("thinking.medium"), t("thinking.high")]
      const effortIndex = thinkingOverride !== null
        ? thinkingOverride
        : (currentStyle ? getStyleThinking(currentStyle, provider) : cfg.default)

      return (
        <div className="flex items-center gap-2 px-4 pb-3">
          <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 flex rounded-md border border-input overflow-hidden">
            {labels.map((label, i) => (
              <button
                key={label}
                onClick={() => setThinkingOverride(i)}
                className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
                  effortIndex === i
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-accent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Brain className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>
      )
    }

    // Default: budget slider (Gemini)
    return (
      <div className="flex items-center gap-2 px-4 pb-3">
        <Zap className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          type="range"
          min={0}
          max={8192}
          step={1024}
          value={Math.min(effectiveThinking, 8192)}
          onChange={(e) => setThinkingOverride(Number(e.target.value))}
          className="flex-1 h-1.5 accent-primary"
        />
        <Brain className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-xs text-muted-foreground w-16 text-right">
          {effectiveThinking === 0 ? t("thinking.fastest") : effectiveThinking <= 1024 ? t("thinking.fast") : effectiveThinking <= 4096 ? t("thinking.balanced") : t("thinking.thorough")}
        </span>
      </div>
    )
  }

  // ── History detail view ──
  if (settingsView === "history-detail" && selectedHistoryItem) {
    const item = selectedHistoryItem
    const itemDate = new Date(item.timestamp)
    const dateStr = itemDate.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    const timeStr = itemDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })

    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-input shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("history")} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold flex-1">{dateStr} · {timeStr}</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {/* Meta row */}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 rounded-full border border-input px-2.5 py-0.5">
              <SlidersHorizontal className="h-3 w-3" />{item.styleName}
            </span>
          </div>

          {/* Original */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("history.input")}</p>
            <div className="rounded-md border border-input bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed break-words">{item.input}</div>
          </div>

          {/* Result */}
          <div className="flex flex-col gap-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("history.output")}</p>
            <div className="rounded-md border border-input bg-muted/30 p-3 text-sm whitespace-pre-wrap leading-relaxed break-words">{item.output}</div>
          </div>
        </div>

        {/* Reuse button */}
        <div className="p-4 border-t border-input shrink-0">
          <Button
            className="w-full"
            onClick={() => {
              setInput(item.input)
              setOutput(item.output)
              const matchedStyle = styles.find((s) => s.name === item.styleName)
              if (matchedStyle) {
                setActiveStyle(matchedStyle.name)
                setThinkingOverride(item.thinking)
              }
              setSettingsView("closed")
            }}
          >
            {t("history.reuse")}
          </Button>
        </div>
      </div>
    )
  }

  // ── History list view ──
  if (settingsView === "history") {
    const formatItemDate = (ts: number) => {
      const d = new Date(ts)
      return d.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " · " +
        d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    }

    const historyQuery = historySearch.toLowerCase()
    const filteredHistory = historyQuery
      ? history.filter((item) =>
          item.output.toLowerCase().includes(historyQuery) ||
          item.input.toLowerCase().includes(historyQuery) ||
          item.styleName.toLowerCase().includes(historyQuery)
        )
      : history

    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-input shrink-0">
          <h2 className="font-semibold">{t("history.title")}</h2>
          <div className="flex items-center gap-1">
            {history.length > 0 && !showClearConfirm && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-destructive"
                onClick={() => setShowClearConfirm(true)}
              >
                {t("history.clear")}
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => { setSettingsView("closed"); setHistorySearch("") }} aria-label="Close">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        {history.length > 0 && (
          <div className="px-4 py-2 border-b border-input shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={t("history.search")}
                className="w-full rounded-md border border-input bg-muted/30 pl-8 pr-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {historySearch && (
                <button
                  onClick={() => setHistorySearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Clear confirmation */}
        {showClearConfirm && (
          <div className="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2 shrink-0">
            <p className="text-sm font-medium">{t("history.clearConfirm")}</p>
            <p className="text-xs text-muted-foreground">{t("history.clearConfirmDesc", { count: String(history.length) })}</p>
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  clearHistory()
                  setHistory([])
                  setShowClearConfirm(false)
                }}
              >
                {t("history.clear")}
              </Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setShowClearConfirm(false)}>
                {t("cancel")}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-auto">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
              <History className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("history.empty")}</p>
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-6">
              <Search className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">{t("history.noResults")}</p>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-input">
              {filteredHistory.map((item) => (
                <li key={item.id} className="flex items-center gap-2 px-4 py-3 hover:bg-accent/40 transition-colors group">
                  <button
                    className="flex-1 min-w-0 text-left"
                    onClick={() => {
                      setSelectedHistoryItem(item)
                      setSettingsView("history-detail")
                    }}
                  >
                    <p className="text-sm line-clamp-2 break-words">{item.output}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatItemDate(item.timestamp)} · {item.styleName}</p>
                  </button>
                  <button
                    className="shrink-0 p-1.5 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                    title={t("history.delete")}
                    aria-label={t("history.delete")}
                    onClick={() => {
                      const updated = deleteHistoryItem(item.id)
                      setHistory(updated)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    className="shrink-0 p-1.5 rounded text-muted-foreground/40 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      setSelectedHistoryItem(item)
                      setSettingsView("history-detail")
                    }}
                    aria-label={t("history.view")}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    )
  }

  // ── Anti-AI Detection view ──
  if (settingsView === "anti-ai") {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <div className="flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("settings")} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Fingerprint className="h-4 w-4 text-muted-foreground shrink-0" />
          <h2 className="text-sm font-semibold flex-1">{t("antiAi.title")}</h2>
          <Switch
            checked={antiAiConfig.enabled}
            onCheckedChange={(v) => handleAntiAiChange((p) => ({ ...p, enabled: v }))}
          />
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col gap-4 p-3">

            <p className="text-xs text-muted-foreground leading-relaxed">{t("antiAi.desc")}</p>

            {/* Humanisation types */}
            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("antiAi.types")}</p>
              <div className={`rounded-lg border border-input bg-card flex flex-col divide-y divide-border transition-opacity ${!antiAiConfig.enabled ? "opacity-40 pointer-events-none" : ""}`}>

                {/* Phrasing types — humanisePhrasing + hedging */}
                {PHRASING_TYPE_KEYS.map((key) => {
                  const err = antiAiConfig.errors[key]
                  const meta = ERROR_LABELS[key]
                  return (
                    <div key={key} className="flex flex-col gap-2 px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">{meta.label}</p>
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{meta.desc}</p>
                        </div>
                        <Switch
                          checked={err.enabled}
                          onCheckedChange={(v) => handleAntiAiChange((p) => ({
                            ...p,
                            errors: { ...p.errors, [key]: { ...p.errors[key], enabled: v } },
                          }))}
                        />
                      </div>
                      {err.enabled && (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground shrink-0 w-10">{t("antiAi.weight")}</span>
                          <input
                            type="range" min={1} max={5} step={1}
                            value={err.weight}
                            onChange={(e) => handleAntiAiChange((p) => ({
                              ...p,
                              errors: { ...p.errors, [key]: { ...p.errors[key], weight: Number(e.target.value) } },
                            }))}
                            className="flex-1 h-1.5 accent-primary"
                          />
                          <span className="text-[11px] text-muted-foreground w-3 text-right tabular-nums">{err.weight}</span>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Include Errors toggle row */}
                <div className="flex flex-col">
                  <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{t("antiAi.includeErrors")}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{t("antiAi.includeErrorsDesc")}</p>
                    </div>
                    <Switch
                      checked={antiAiConfig.includeErrors}
                      onCheckedChange={(v) => handleAntiAiChange((p) => ({ ...p, includeErrors: v }))}
                    />
                  </div>

                  {/* Errors revealed when includeErrors is on */}
                  {antiAiConfig.includeErrors && (
                    <div className="border-t border-border flex flex-col">

                      {/* Error frequency thresholds */}
                      <div className="px-3 py-2.5 flex flex-col gap-2 border-b border-border bg-muted/20">
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{t("antiAi.frequency")}</p>
                        {antiAiConfig.thresholds.map((threshold, i) => {
                          const label = threshold.minWords === 0
                            ? `< ${threshold.maxWords} words`
                            : threshold.maxWords >= 9999
                              ? `${threshold.minWords}+ words`
                              : `${threshold.minWords}–${threshold.maxWords} words`
                          return (
                            <div key={i} className="flex items-center gap-2.5">
                              <span className="text-[11px] text-muted-foreground w-24 shrink-0">{label}</span>
                              <input
                                type="range" min={0} max={10} step={1}
                                value={threshold.count}
                                onChange={(e) => handleAntiAiChange((p) => ({
                                  ...p,
                                  thresholds: p.thresholds.map((t, j) => j === i ? { ...t, count: Number(e.target.value) } : t),
                                }))}
                                className="flex-1 h-1.5 accent-primary"
                              />
                              <span className="text-[11px] text-muted-foreground w-4 text-right tabular-nums">{threshold.count}</span>
                            </div>
                          )
                        })}
                      </div>

                      {/* Individual error types */}
                      {ERROR_TYPE_KEYS.map((key) => {
                        const err = antiAiConfig.errors[key]
                        const meta = ERROR_LABELS[key]
                        return (
                          <div key={key} className="flex flex-col gap-2 px-3 py-2.5 border-b border-border last:border-b-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium">{meta.label}</p>
                                <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{meta.desc}</p>
                              </div>
                              <Switch
                                checked={err.enabled}
                                onCheckedChange={(v) => handleAntiAiChange((p) => ({
                                  ...p,
                                  errors: { ...p.errors, [key]: { ...p.errors[key], enabled: v } },
                                }))}
                              />
                            </div>
                            {err.enabled && (
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-muted-foreground shrink-0 w-10">{t("antiAi.weight")}</span>
                                <input
                                  type="range" min={1} max={5} step={1}
                                  value={err.weight}
                                  onChange={(e) => handleAntiAiChange((p) => ({
                                    ...p,
                                    errors: { ...p.errors, [key]: { ...p.errors[key], weight: Number(e.target.value) } },
                                  }))}
                                  className="flex-1 h-1.5 accent-primary"
                                />
                                <span className="text-[11px] text-muted-foreground w-3 text-right tabular-nums">{err.weight}</span>
                              </div>
                            )}
                          </div>
                        )
                      })}

                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>
    )
  }

  // ── Style manager view ──
  if (settingsView === "styles") {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <StyleManager
          styles={styles}
          onChange={handleStylesChange}
          onBack={() => setSettingsView("settings")}
        />
      </div>
    )
  }

  // ── Provider / API key sub-panel ──
  if (settingsView === "provider") {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-input shrink-0">
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("settings")} className="shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold flex-1">{t("settings.provider")}</h2>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4">
          {/* Provider selector */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("settings.provider")}</label>
            <div className="relative">
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as ProviderId)}
                className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {PROVIDER_IDS.map((id) => {
                  const p = PROVIDERS[id]
                  const hasKey = !!getProviderKey(id)
                  return (
                    <option key={id} value={id}>
                      {p.label}{hasKey ? " ✓" : ""}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* API key */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t("settings.apiKey", { provider: providerConfig.name })}
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
                placeholder={providerConfig.placeholder}
                className="flex-1 flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              />
              <Button onClick={handleSaveKey} disabled={!apiKeyInput.trim()} className="shrink-0">
                {t("settings.save")}
              </Button>
              {getProviderKey(provider) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDeleteKey}
                  className="shrink-0 h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  title={t("settings.deleteKey")}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t("settings.keyFrom")}{" "}
              <a href={providerConfig.keyUrl} target="_blank" rel="noopener" className="underline hover:text-foreground">
                {providerConfig.keyUrlLabel}
              </a>
            </p>
            {providerConfig.freeTierNote && (
              <p className="text-xs text-muted-foreground/70">{providerConfig.freeTierNote}</p>
            )}
          </div>

          {/* Why do I need my own key */}
          <div className="border-t border-input pt-3">
            <button
              onClick={() => setShowApiInfo(!showApiInfo)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
            >
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{t("settings.whyKey")}</span>
              <ChevronDown className={`h-3 w-3 ml-auto shrink-0 transition-transform ${showApiInfo ? "rotate-180" : ""}`} />
            </button>
            {showApiInfo && (
              <div className="mt-3 rounded-lg border border-input bg-card p-3 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
                <p>{t("settings.keyP1")}</p>
                <p>{t("settings.keyP2")}</p>
                <p>{t("settings.keyP3", { period: BUILD_PERIOD })}</p>
                <div className="flex flex-col gap-1.5 pl-1">
                  <p><strong className="text-foreground">Google (Gemini)</strong> — {t("settings.provider.gemini").replace(/^Google \(Gemini\) — /, "")}</p>
                  <p><strong className="text-foreground">OpenAI (ChatGPT)</strong> — {t("settings.provider.openai").replace(/^OpenAI \(ChatGPT\) — /, "")}</p>
                  <p><strong className="text-foreground">Anthropic (Claude)</strong> — {t("settings.provider.claude").replace(/^Anthropic \(Claude\) — /, "")}</p>
                  <p><strong className="text-foreground">xAI (Grok)</strong> — {t("settings.provider.grok").replace(/^xAI \(Grok\) — /, "")}</p>
                </div>
                <p className="mt-1 text-muted-foreground/70">{t("settings.keyFooter", { period: BUILD_PERIOD })}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Settings view ──
  if (settingsView === "settings") {
    const activeProviderKey = !!getProviderKey(provider)

    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <div className="flex items-center justify-between px-4 py-3 border-b border-input shrink-0">
          <h2 className="font-semibold">{t("settings.title")}</h2>
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("closed")} aria-label="Close settings">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-5">

          {/* AI Provider */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("settings.provider")}</p>
            <button
              onClick={() => setSettingsView("provider")}
              className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              <span className="font-medium">{providerConfig.name}</span>
              <span className={`text-xs ${activeProviderKey ? "text-green-500" : "text-destructive"}`}>
                {activeProviderKey ? "Key saved ✓" : "No key set"}
              </span>
            </button>
          </div>

          {/* Appearance */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("settings.theme")}</p>
            <div className="flex rounded-md border border-input overflow-hidden">
              {([
                { value: "light" as Theme, icon: Sun, labelKey: "settings.theme.light" },
                { value: "auto" as Theme, icon: Monitor, labelKey: "settings.theme.auto" },
                { value: "dark" as Theme, icon: Moon, labelKey: "settings.theme.dark" },
              ]).map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  onClick={() => handleThemeChange(value)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors ${
                    theme === value ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-accent"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("settings.language")}</p>
            <div className="relative">
              <select
                value={locale}
                onChange={(e) => changeLocale(e.target.value as Locale)}
                className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {LOCALE_IDS.map((id) => (
                  <option key={id} value={id}>{LOCALE_NAMES[id]}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-relaxed">
              {t("settings.languageNote")}{" "}
              <a href="https://github.com/marknotton/proofreader/tree/main/src/locales" target="_blank" rel="noopener" className="underline hover:text-muted-foreground">
                {t("settings.languageContribute")}
              </a>
            </p>
          </div>

          {/* Behaviour */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Behaviour</p>

            {/* Context menu */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm">
                  {t("settings.contextMenu")}
                  <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">Beta</span>
                </p>
                <p className="text-xs text-muted-foreground">{t("settings.contextMenuDesc")}</p>
              </div>
              <Switch checked={contextMenuEnabled} onCheckedChange={handleContextMenuToggle} />
            </label>

            {/* Perfect result celebrations */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm">{t("settings.celebrate")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.celebrateDesc")}</p>
              </div>
              <Switch checked={celebrateEnabled} onCheckedChange={(v) => { setCelebrateEnabled(v); localStorage.setItem(CELEBRATE_KEY, String(v)) }} />
            </label>

            {/* History */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm">{t("history.enabled")}</p>
                <p className="text-xs text-muted-foreground">{t("history.enabledDesc")}</p>
              </div>
              <Switch
                checked={historyEnabled}
                onCheckedChange={(v) => {
                  if (!v && history.length > 0) {
                    setShowHistoryDisableConfirm(true)
                  } else {
                    setHistoryEnabledState(v)
                    setHistoryEnabled(v)
                  }
                }}
              />
            </label>
            {showHistoryDisableConfirm && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2">
                <p className="text-sm font-medium">{t("history.clearConfirm")}</p>
                <p className="text-xs text-muted-foreground">{t("history.disableWillClear", { count: String(history.length) })}</p>
                <div className="flex flex-col gap-1.5 mt-1">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1"
                      onClick={() => {
                        clearHistory()
                        setHistory([])
                        setHistoryEnabledState(false)
                        setHistoryEnabled(false)
                        setShowHistoryDisableConfirm(false)
                      }}
                    >
                      {t("history.disableAndClear")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setHistoryEnabledState(false)
                        setHistoryEnabled(false)
                        setShowHistoryDisableConfirm(false)
                      }}
                    >
                      {t("history.justDisable")}
                    </Button>
                  </div>
                  <Button size="sm" variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowHistoryDisableConfirm(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            )}

            {/* Auto-proofread */}
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm">{t("settings.autoShow")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.autoShowDesc")}</p>
              </div>
              <Switch checked={autoShow} onCheckedChange={handleAutoShowToggle} />
            </label>

            <label className={`flex items-center justify-between gap-3 ${autoShow ? "cursor-pointer" : "opacity-40 pointer-events-none"}`}>
              <div>
                <p className="text-sm">{t("settings.autoPaste")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.autoPasteDesc")}</p>
              </div>
              <Switch checked={autoPaste} onCheckedChange={handleAutoPasteToggle} />
            </label>

            <label className={`flex items-center justify-between gap-3 ${autoShow ? "cursor-pointer" : "opacity-40 pointer-events-none"}`}>
              <div>
                <p className="text-sm">{t("settings.autoType")}</p>
                <p className="text-xs text-muted-foreground">{t("settings.autoTypeDesc")}</p>
              </div>
              <Switch checked={autoType} onCheckedChange={handleAutoTypeToggle} />
            </label>

            {autoShow && autoType && (
              <div className="flex items-center gap-3 pl-1">
                <label className="text-xs text-muted-foreground shrink-0">{t("settings.autoDelay")}</label>
                <input
                  type="range" min={1} max={15} step={1} value={autoDelay}
                  onChange={(e) => handleAutoDelayChange(Number(e.target.value))}
                  className="flex-1 h-1.5 accent-primary"
                />
                <span className="text-xs text-muted-foreground w-8 text-right">{autoDelay}s</span>
              </div>
            )}

            {autoShow && autoType && (
              <div className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/20 p-2.5">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">{t("settings.autoWarning")}</p>
              </div>
            )}
          </div>

          {/* Anti-AI Detection */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("antiAi.title")}</p>
            <button
              onClick={() => setSettingsView("anti-ai")}
              className="flex items-center justify-between gap-3 rounded-md border border-input bg-card px-3 py-2.5 text-sm hover:bg-accent/50 transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Fingerprint className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs font-medium flex items-center gap-1.5">
                    {t("antiAi.enable")}
                    <span className="text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">Beta</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">{t("antiAi.enableDesc")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {antiAiConfig.enabled && (
                  <span className="text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">On</span>
                )}
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          </div>

          {/* Styles */}
          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("styles.title")}</p>
            <Button variant="outline" size="sm" onClick={() => setSettingsView("styles")}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {t("settings.manageStyles")}
            </Button>
          </div>

          {/* Support */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Support</p>
            <div className="rounded-lg border border-input bg-card p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <Heart className="h-4 w-4 text-pink-500 shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-xs text-muted-foreground leading-relaxed">
                  <p>{t("settings.donation.intro", { name: "Mark" })}</p>
                  <p className="mt-1.5">{t("settings.donation.ask")}</p>
                </div>
              </div>
              <a
                href={BMC_URL}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FFDD00] text-[#000] text-sm font-medium h-9 px-4 hover:bg-[#FFDD00]/90 transition-colors"
              >
                <Coffee className="h-4 w-4" />
                {t("settings.donation.button")}
              </a>
              <label className="flex items-center justify-between gap-3 cursor-pointer">
                <p className="text-xs text-muted-foreground">{t("settings.donation.hide")}</p>
                <Switch checked={hideDonation} onCheckedChange={handleDonationToggle} />
              </label>
            </div>
          </div>

          {/* About */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setShowAbout(!showAbout)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors w-full text-left"
            >
              {t("settings.about")}
              <ChevronDown className={`h-3 w-3 ml-auto shrink-0 transition-transform ${showAbout ? "rotate-180" : ""}`} />
            </button>
            {showAbout && (
              <div className="rounded-lg border border-input bg-card p-3 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
                <p>{t("settings.about.p1")}</p>
                <p>{t("settings.about.p2")}</p>
                <a
                  href="https://github.com/marknotton/proofreader"
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-2 text-xs text-foreground hover:underline mt-1"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  {t("settings.about.link")}
                </a>
              </div>
            )}
          </div>

        </div>
      </div>
    )
  }

  // ── Mini confetti for perfect results ──
  const confettiColors = ["#4A9EF5", "#f472b6", "#fbbf24", "#34d399", "#a78bfa", "#fb923c"]
  const confettiPieces = miniConfetti ? Array.from({ length: 40 }, (_, i) => {
    const color = confettiColors[i % confettiColors.length]
    const left = 30 + Math.random() * 40
    const rad = Math.random() * Math.PI * 2
    const dist = 60 + Math.random() * 120
    const tx = Math.cos(rad) * dist
    const ty = Math.sin(rad) * dist - 40
    const delay = Math.random() * 0.15
    const size = 4 + Math.random() * 4
    const rotation = (Math.random() - 0.5) * 720
    return (
      <span
        key={i}
        className="absolute rounded-sm pointer-events-none"
        style={{
          left: `${left}%`,
          top: "50%",
          width: size,
          height: size * 0.6,
          backgroundColor: color,
          opacity: 0,
          animation: `confetti-burst 1.8s ${delay}s ease-out forwards`,
          "--tx": `${tx}px`,
          "--ty": `${ty}px`,
          "--angle": `${rotation}deg`,
        } as React.CSSProperties}
      />
    )
  }) : null

  // ── Main view ──
  return (
    <div className="relative flex flex-col h-screen bg-background text-foreground">
      {/* Mini confetti overlay */}
      {confettiPieces && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiPieces}
        </div>
      )}
      {/* Style selector */}
      <div className="flex items-center gap-1.5 px-4 py-3 flex-wrap">
        {styles.map((style) => {
          const isActive = activeStyle === style.name
          const IconComp = getIconComponent(style.icon)
          const colorStyles = getStyleButtonStyles(style.color, isActive)

          return (
            <Button
              key={style.name}
              variant={colorStyles ? "outline" : isActive ? "default" : "outline"}
              size="sm"
              style={colorStyles}
              onClick={() => {
                setActiveStyle(style.name)
                setThinkingOverride(null)
              }}
            >
              {IconComp && <IconComp className="h-3.5 w-3.5" />}
              {style.name}
            </Button>
          )
        })}
        <div className={`ml-auto flex items-center gap-0.5 rounded-lg border px-0.5 py-0.5 transition-colors ${incognito ? "border-primary/40 bg-primary/5" : "border-input/60 bg-muted/20"}`}>
          {historyEnabled && (
            <Button variant="ghost" size="icon" onClick={() => setSettingsView("history")} title={t("history.title")} aria-label={t("history.title")} className="h-7 w-7">
              <History className="h-3.5 w-3.5" />
            </Button>
          )}
          {historyEnabled && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleIncognitoToggle}
              title={t(incognito ? "incognito.disable" : "incognito.enable")}
              aria-label={t(incognito ? "incognito.disable" : "incognito.enable")}
              aria-pressed={incognito}
              className={`h-7 w-7 transition-colors ${incognito ? "text-primary hover:text-primary" : ""}`}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("settings")} title={t("settings.title")} aria-label={t("settings.title")} className="h-7 w-7">
            <Settings className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* API key prompt + demo counter — shown when no key is configured */}
      {!apiKey && (
        <div className="mx-4 mb-2 rounded-xl border border-primary/30 bg-primary/10 p-4">
          <div className="flex items-start gap-3">
            <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              {DEMO_ENABLED && hasDemoRemaining() ? (
                <>
                  <p className="font-medium mb-1">{t("demo.title", { limit: String(getDemoLimit()) })}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {t("demo.description", { limit: String(getDemoLimit()) })}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5" />
                    <span>{t("demo.remaining", { used: String(demoUsed), limit: String(getDemoLimit()) })}</span>
                  </div>
                  <button
                    onClick={() => setSettingsView("provider")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-transparent px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer"
                  >
                    {t("demo.addKey")}
                  </button>
                </>
              ) : (
                <>
                  <p className="font-medium mb-1">
                    {demoUsed >= getDemoLimit() ? t("demo.limitReached") : t("demo.connectProvider")}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {demoUsed >= getDemoLimit()
                      ? t("demo.limitReachedDesc")
                      : t("demo.connectProviderDesc")}
                  </p>
                  <button
                    onClick={() => setSettingsView("provider")}
                    className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                  >
                    {t("demo.addKey")}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Incognito mode strip */}
      {incognito && (
        <div className="mx-4 mb-2 flex items-center gap-2 rounded-md border border-primary/20 bg-primary/8 px-3 py-1.5 text-xs text-primary">
          <EyeOff className="h-3 w-3 shrink-0" />
          <span>{t("incognito.active")}</span>
          <button onClick={handleIncognitoToggle} className="ml-auto text-primary/60 hover:text-primary transition-colors">{t("incognito.disable")}</button>
        </div>
      )}

      {/* Thinking slider — adapts per provider */}
      {renderThinkingSlider()}

      {/* Input */}
      <div className={`flex-1 flex flex-col gap-3 px-4 pb-3 min-h-0 ${!apiKey && !(DEMO_ENABLED && hasDemoRemaining()) ? "opacity-50 pointer-events-none" : ""}`}>
        <div className="relative flex-1 min-h-[120px]">
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                e.preventDefault()
                if (!loading && input.trim()) handleSubmit()
              }
            }}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="h-full text-sm"
          />
        </div>

        <div className="flex gap-2">
          {loading ? (
            <Button
              onClick={handleCancel}
              aria-label={t("cancel")}
              title={`${t("cancel")} (Esc)`}
              className="flex-1 group"
            >
              <span className="flex items-center gap-2 group-hover:hidden">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("proofreading")}
              </span>
              <span className="hidden items-center gap-2 group-hover:flex">
                <X className="h-4 w-4" />
                {t("cancel")}
              </span>
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!input.trim()}
              title={`${t("proofread")} (${SUBMIT_SHORTCUT})`}
              className="flex-1"
            >
              {t("proofread")}
            </Button>
          )}
          {autoShow && (
            <Button
              variant={autoEnabled ? "default" : "outline"}
              size="icon"
              onClick={handleAutoEnabledToggle}
              title={autoEnabled ? t("autoOn") : t("autoOff")}
              aria-label={autoEnabled ? t("autoOn") : t("autoOff")}
              aria-pressed={autoEnabled}
              className={`auto-btn ${timerActive ? "timer-active" : ""} ${
                autoEnabled ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
              }`}
              style={timerActive ? { "--timer-duration": `${autoDelay}s` } as React.CSSProperties : undefined}
            >
              <span className="auto-btn-timer" style={timerActive ? { transitionDuration: `${autoDelay}s` } : undefined} />
              <Wand2 className="h-4 w-4 relative z-10" />
            </Button>
          )}
          <Button variant="outline" size="icon" onClick={handleClear} title={t("clear")} aria-label={t("clear")}>
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-destructive flex-1">{error.message}</p>
              <button
                onClick={() => { setError(null); setShowRawError(false) }}
                className="text-destructive/60 hover:text-destructive shrink-0"
                title={t("error.dismiss")}
                aria-label={t("error.dismiss")}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            {error.raw !== error.message && (
              <>
                <button
                  onClick={() => setShowRawError(!showRawError)}
                  className="text-[10px] text-muted-foreground hover:text-foreground transition-colors self-start"
                >
                  {showRawError ? t("error.hideRaw") : t("error.showRaw")}
                </button>
                {showRawError && (
                  <pre className="text-[10px] text-muted-foreground bg-background/50 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all max-h-32">
                    {error.raw}
                  </pre>
                )}
              </>
            )}
          </div>
        )}

        {output && (
          <div aria-live="polite" aria-label="Proofread output" className="contents">
            <Card className="flex-1 min-h-[120px] overflow-auto">
              <CardContent className="relative" ref={outputRef}>
                {!(currentStyle?.markdown && output.includes("```")) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7"
                    onClick={handleCopy}
                    title={t("copy")}
                    aria-label={t("copy")}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                )}
                <div className={!(currentStyle?.markdown && output.includes("```")) ? "pr-8" : ""}>
                  <MarkdownOutput text={output} markdown={currentStyle?.markdown} />
                </div>
                {currentStyle?.markdown && output.includes("```") && (
                  <div className="flex justify-end mt-2">
                    <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground/50">
                      <Code2 className="h-3 w-3" />
                      {t("smartMarkdown")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            <Button variant="outline" onClick={handleCopy} className="w-full">
              {copied ? (
                <><Check className="h-4 w-4 text-green-500" /> {t("copy")}</>
              ) : (
                <><Copy className="h-4 w-4" /> {t("copy")}</>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-toast-up">
          <div className="bg-[#FBBA00] text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg shadow-xl whitespace-nowrap">
            {toast}
          </div>
        </div>
      )}

      {/* Subtle donation footer */}
      {!hideDonation && (
        <a
          href={BMC_URL}
          target="_blank"
          rel="noopener"
          className="flex items-center justify-center gap-1.5 py-2 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          <Coffee className="h-3 w-3" />
          Buy me a coffee
        </a>
      )}
    </div>
  )
}
