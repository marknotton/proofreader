import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "./components/ui/button"
import { Textarea } from "./components/ui/textarea"
import { Card, CardContent } from "./components/ui/card"
import MarkdownOutput from "./components/MarkdownOutput"
import StyleManager from "./components/StyleManager"
import {
  type ProofreadStyle,
  getStyleThinking,
  loadStyles,
  saveStyles,
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
import { type SanitisedError, sanitiseError } from "./lib/errors"
import { getIconComponent, getStyleButtonStyles } from "./lib/style-options"
import { Copy, Check, Loader2, Settings, X, Eraser, Zap, Brain, SlidersHorizontal, Coffee, Heart, Sun, Moon, Monitor, Info, ChevronDown, AlertTriangle, Wand2, Code2 } from "lucide-react"
import { useI18n } from "./context/I18nContext"
import { LOCALE_IDS, LOCALE_NAMES, type Locale } from "./lib/i18n"

const HIDE_DONATION_KEY = "proofreader_hide_donation"
const AUTO_SHOW_KEY = "proofreader_auto_show"
const AUTO_ENABLED_KEY = "proofreader_auto_enabled"
const AUTO_PASTE_KEY = "proofreader_auto_paste"
const AUTO_TYPE_KEY = "proofreader_auto_type"
const AUTO_DELAY_KEY = "proofreader_auto_delay"
const BMC_URL = "https://buymeacoffee.com/marknotton"
const THEME_KEY = "proofreader_theme"
type Theme = "light" | "dark" | "auto"

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme)
}

/** Safely access chrome extension APIs — returns null outside extension context */
function getChromeAPI(): any | null {
  const c = (globalThis as any).chrome
  return c?.storage ? c : null
}

type SettingsView = "closed" | "settings" | "styles"

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
    opts?: { mode?: "proofread" | "replace"; tabId?: number; styleName?: string }
  ) => {
    const key = apiKey || getProviderKey(provider)
    if (!text.trim() || !key) return

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
      const thinking = thinkingOverride ?? getStyleThinking(style, provider)

      await proofread(
        provider,
        key,
        style.prompt,
        text.trim(),
        (chunk) => {
          result += chunk
          setOutput(result)
        },
        controller.signal,
        thinking
      )

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
        setError(sanitiseError(err.message, provider))
        setShowRawError(false)
      }
    } finally {
      setLoading(false)
      pendingModeRef.current = null
    }
  }, [apiKey, provider, activeStyle, styles, thinkingOverride, showToast])

  // Keep a ref to the latest runProofread so the storage listener (which never
  // re-subscribes) always calls the current version.
  // Note: this ref is updated to the wrapped version in the auto-proofread section below.
  const runProofreadRef = useRef(runProofread)

  const showToastRef = useRef(showToast)
  useEffect(() => { showToastRef.current = showToast }, [showToast])

  // ── Init ──
  useEffect(() => {
    if (!apiKey) setSettingsView("settings")
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
  }, [])

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
    return originalRunProofread(text, opts)
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

  const handleClear = useCallback(() => {
    abortRef.current?.abort()
    setInput("")
    setOutput("")
    setError(null)
    setLoading(false)
    clearAutoTimer()
    lastProofreadTextRef.current = ""
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

  // ── Style manager view ──
  if (settingsView === "styles") {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground">
        <StyleManager
          styles={styles}
          onChange={handleStylesChange}
          onBack={() => setSettingsView("closed")}
        />
      </div>
    )
  }

  // ── Settings view ──
  if (settingsView === "settings") {
    const hasAnyKey = PROVIDER_IDS.some((id) => getProviderKey(id))

    return (
      <div className="flex flex-col h-screen bg-background text-foreground p-4 gap-4 overflow-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("settings.title")}</h2>
          {hasAnyKey && (
            <Button variant="ghost" size="icon" onClick={() => setSettingsView("closed")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Provider selector + API key */}
        <div className="flex flex-col gap-3">
          <label className="text-sm text-muted-foreground">{t("settings.provider")}</label>
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
                    {p.label}{hasKey ? " \u2713" : ""}
                  </option>
                )
              })}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>

          <label className="text-sm text-muted-foreground">
            {t("settings.apiKey", { provider: providerConfig.name })}
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
            placeholder={providerConfig.placeholder}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            {t("settings.keyFrom")}{" "}
            <a
              href={providerConfig.keyUrl}
              target="_blank"
              rel="noopener"
              className="underline hover:text-foreground"
            >
              {providerConfig.keyUrlLabel}
            </a>
          </p>
          <p className="text-xs text-muted-foreground/80">
            {providerConfig.freeTierNote}
          </p>
          <Button onClick={handleSaveKey} disabled={!apiKeyInput.trim()}>
            {t("settings.save")}
          </Button>
        </div>

        {/* "Why do I need my own API key?" info block */}
        <div className="border-t border-input pt-3">
          <button
            onClick={() => setShowApiInfo(!showApiInfo)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>{t("settings.whyKey")}</span>
            <ChevronDown className={`h-3.5 w-3.5 ml-auto shrink-0 transition-transform ${showApiInfo ? "rotate-180" : ""}`} />
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

        {/* Theme selector */}
        <div className="border-t border-input pt-3">
          <p className="text-sm mb-2">{t("settings.theme")}</p>
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
                  theme === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {/* Context menu toggle */}
        <div className="border-t border-input pt-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm">
                {t("settings.contextMenu")}
                <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">Beta</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {t("settings.contextMenuDesc")}
              </p>
            </div>
            <button
              role="switch"
              aria-checked={contextMenuEnabled}
              onClick={() => handleContextMenuToggle(!contextMenuEnabled)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                contextMenuEnabled ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${
                  contextMenuEnabled ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>
        </div>

        {/* Auto-proofread settings */}
        <div className="border-t border-input pt-3 flex flex-col gap-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm">{t("settings.autoShow")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.autoShowDesc")}</p>
            </div>
            <button
              role="switch"
              aria-checked={autoShow}
              onClick={() => handleAutoShowToggle(!autoShow)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                autoShow ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${
                  autoShow ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>

          <label className={`flex items-center justify-between gap-3 ${autoShow ? "cursor-pointer" : "opacity-40 pointer-events-none"}`}>
            <div>
              <p className="text-sm">{t("settings.autoPaste")}</p>
              <p className="text-xs text-muted-foreground">{t("settings.autoPasteDesc")}</p>
            </div>
            <button
              role="switch"
              aria-checked={autoPaste}
              onClick={() => handleAutoPasteToggle(!autoPaste)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                autoPaste ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${
                  autoPaste ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>

          <label className={`flex items-center justify-between gap-3 ${autoShow ? "cursor-pointer" : "opacity-40 pointer-events-none"}`}>
            <div>
              <p className="text-sm">
                {t("settings.autoType")}
                <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">Beta</span>
              </p>
              <p className="text-xs text-muted-foreground">{t("settings.autoTypeDesc")}</p>
            </div>
            <button
              role="switch"
              aria-checked={autoType}
              onClick={() => handleAutoTypeToggle(!autoType)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                autoType ? "bg-primary" : "bg-input"
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${
                  autoType ? "translate-x-[18px]" : "translate-x-[3px]"
                }`}
              />
            </button>
          </label>

          {autoShow && autoType && (
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground shrink-0">{t("settings.autoDelay")}</label>
              <input
                type="range"
                min={1}
                max={15}
                step={1}
                value={autoDelay}
                onChange={(e) => handleAutoDelayChange(Number(e.target.value))}
                className="flex-1 h-1.5 accent-primary"
              />
              <span className="text-xs text-muted-foreground w-8 text-right">{autoDelay}s</span>
            </div>
          )}

          {autoShow && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/5 border border-destructive/20 p-2.5">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                {t("settings.autoWarning")}
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-input pt-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSettingsView("styles")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            {t("settings.manageStyles")}
          </Button>
        </div>

        {/* Donation box — always visible in settings */}
        <div className="border-t border-input pt-3 mt-auto">
          <div className="rounded-lg border border-input bg-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
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
            <label className="flex items-center justify-between gap-3 cursor-pointer pt-1">
              <p className="text-xs text-muted-foreground">{t("settings.donation.hide")}</p>
              <button
                role="switch"
                aria-checked={hideDonation}
                onClick={() => handleDonationToggle(!hideDonation)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  hideDonation ? "bg-primary" : "bg-input"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 rounded-full bg-background shadow-sm transition-transform ${
                    hideDonation ? "translate-x-[18px]" : "translate-x-[3px]"
                  }`}
                />
              </button>
            </label>
          </div>
        </div>

        {/* Language */}
        <div className="border-t border-input pt-3 flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">{t("settings.language")}</label>
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
            <a
              href="https://github.com/marknotton/proofreader/tree/main/src/locales"
              target="_blank"
              rel="noopener"
              className="underline hover:text-muted-foreground"
            >
              {t("settings.languageContribute")}
            </a>
          </p>
        </div>

        {/* About */}
        <div className="border-t border-input pt-3">
          <button
            onClick={() => setShowAbout(!showAbout)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>{t("settings.about")}</span>
            <ChevronDown className={`h-3.5 w-3.5 ml-auto shrink-0 transition-transform ${showAbout ? "rotate-180" : ""}`} />
          </button>

          {showAbout && (
            <div className="mt-3 rounded-lg border border-input bg-card p-3 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
              <p>{t("settings.about.p1")}</p>
              <p>{t("settings.about.p2")}</p>
              <a
                href="https://github.com/marknotton/proofreader"
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-2 text-xs text-foreground hover:underline mt-1"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                {t("settings.about.link")}
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Main view ──
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
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
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("styles")} title={t("manageStyles")}>
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("settings")} title={t("settings.title")}>
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Thinking slider — adapts per provider */}
      {renderThinkingSlider()}

      {/* Input */}
      <div className="flex-1 flex flex-col gap-3 px-4 pb-3 min-h-0">
        <div className="relative flex-1 min-h-[120px]">
          <Textarea
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onPaste={handlePaste}
            placeholder={t("placeholder")}
            className="h-full text-sm"
          />
          {toast && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-3 py-1.5 rounded-md shadow-lg pointer-events-none animate-fade-in z-10">
              {toast}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={loading || !input.trim()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("proofreading")}
              </>
            ) : (
              t("proofread")
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleClear} title={t("clear")}>
            <Eraser className="h-4 w-4" />
          </Button>
          {autoShow && (
            <Button
              variant={autoEnabled ? "default" : "outline"}
              size="icon"
              onClick={handleAutoEnabledToggle}
              title={autoEnabled ? t("autoOn") : t("autoOff")}
              className={`auto-btn ${timerActive ? "timer-active" : ""} ${
                autoEnabled ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
              }`}
              style={timerActive ? { "--timer-duration": `${autoDelay}s` } as React.CSSProperties : undefined}
            >
              <span className="auto-btn-timer" style={timerActive ? { transitionDuration: `${autoDelay}s` } : undefined} />
              <Wand2 className="h-4 w-4 relative z-10" />
            </Button>
          )}
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive flex-1">{error.message}</p>
              <button
                onClick={() => { setError(null); setShowRawError(false) }}
                className="text-destructive/60 hover:text-destructive shrink-0"
                title={t("error.dismiss")}
              >
                <X className="h-3.5 w-3.5" />
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
          <Card className="flex-1 min-h-[120px] overflow-auto">
            <CardContent className="relative">
              {!(currentStyle?.markdown && output.includes("```")) && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={handleCopy}
                  title={t("copy")}
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
        )}
      </div>

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
