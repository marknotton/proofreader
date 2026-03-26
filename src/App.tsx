import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "./components/ui/button"
import { Textarea } from "./components/ui/textarea"
import { Card, CardContent } from "./components/ui/card"
import MarkdownOutput from "./components/MarkdownOutput"
import StyleManager from "./components/StyleManager"
import {
  type ProofreadStyle,
  DEFAULT_THINKING,
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
import { Copy, Check, Loader2, Settings, X, Eraser, Zap, Brain, SlidersHorizontal, Coffee, Heart, Sun, Moon, Monitor, Info, ChevronDown, AlertTriangle } from "lucide-react"

const HIDE_DONATION_KEY = "proofreader_hide_donation"
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

  const [thinkingOverride, setThinkingOverride] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [contextMenuEnabled, setContextMenuEnabled] = useState(false)
  const [hideDonation, setHideDonation] = useState(() => localStorage.getItem(HIDE_DONATION_KEY) === "true")
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null
    const t = saved || "auto"
    applyTheme(t)
    return t
  })
  const abortRef = useRef<AbortController | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingModeRef = useRef<{ mode: "proofread" | "replace"; tabId?: number } | null>(null)

  const providerConfig = PROVIDERS[provider]
  const currentStyle = styles.find((s) => s.name === activeStyle)
  const effectiveThinking = thinkingOverride ?? currentStyle?.thinking ?? DEFAULT_THINKING

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
      const thinking = thinkingOverride ?? style.thinking ?? DEFAULT_THINKING

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
              showToast("Replaced")
            } else {
              showToast(response?.error || "Could not replace text")
            }
          } catch {
            showToast("Could not reach the page to replace text")
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
  // re-subscribes) always calls the current version
  const runProofreadRef = useRef(runProofread)
  useEffect(() => { runProofreadRef.current = runProofread }, [runProofread])

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
          showToastRef.current("No text selected")
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

  const handleSubmit = useCallback(() => {
    runProofread(input)
  }, [input, runProofread])

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
  }, [])

  // ── Thinking slider display logic ──
  const renderThinkingSlider = () => {
    const cfg = providerConfig.thinking

    if (!cfg.supported || cfg.type === "none") return null

    if (cfg.type === "effort") {
      const labels = cfg.effortLabels || ["Low", "Medium", "High"]
      // Map effectiveThinking to effort index: 0, 1, 2
      const effortIndex = thinkingOverride !== null
        ? thinkingOverride
        : (currentStyle?.thinking !== undefined
          ? Math.min(Math.round(currentStyle.thinking / 4096), labels.length - 1)
          : cfg.default)

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
          {effectiveThinking === 0 ? "Fastest" : effectiveThinking <= 1024 ? "Fast" : effectiveThinking <= 4096 ? "Balanced" : "Thorough"}
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
          <h2 className="text-lg font-semibold">Settings</h2>
          {hasAnyKey && (
            <Button variant="ghost" size="icon" onClick={() => setSettingsView("closed")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Provider selector + API key */}
        <div className="flex flex-col gap-3">
          <label className="text-sm text-muted-foreground">AI Provider</label>
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
            {providerConfig.name} API Key
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
            Get your key from{" "}
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
            Save
          </Button>
        </div>

        {/* "Why do I need my own API key?" info block */}
        <div className="border-t border-input pt-3">
          <button
            onClick={() => setShowApiInfo(!showApiInfo)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span>Why do I need my own API key?</span>
            <ChevronDown className={`h-3.5 w-3.5 ml-auto shrink-0 transition-transform ${showApiInfo ? "rotate-180" : ""}`} />
          </button>

          {showApiInfo && (
            <div className="mt-3 rounded-lg border border-input bg-card p-3 text-xs text-muted-foreground leading-relaxed flex flex-col gap-2">
              <p>
                This extension connects directly to AI providers using <strong className="text-foreground">your</strong> API key. There is no middleman server, no account to create, and no data shared with anyone other than the AI provider you choose.
              </p>
              <p>
                Proofreader is a free, open-source side project with no sponsorship or third-party funding. AI APIs charge per token, so bundling a shared key would mean either charging you a subscription or running out of budget quickly. By using your own key, you stay in full control of your usage, costs, and data.
              </p>
              <p>
                The good news: proofreading uses very few tokens. A typical request costs a fraction of a cent. As of {BUILD_PERIOD}, here's how each provider handles billing:
              </p>
              <div className="flex flex-col gap-1.5 pl-1">
                <p>
                  <strong className="text-foreground">Google (Gemini)</strong> — offers a free tier with generous rate limits. No billing details required. Proofreading will almost certainly stay within the free allowance.
                </p>
                <p>
                  <strong className="text-foreground">OpenAI (ChatGPT)</strong> — no free API tier. Requires billing details, but proofreading costs are negligible.
                </p>
                <p>
                  <strong className="text-foreground">Anthropic (Claude)</strong> — no free API tier. Requires a prepaid credit purchase. Actual proofreading costs are very low.
                </p>
                <p>
                  <strong className="text-foreground">xAI (Grok)</strong> — may offer promotional credits for new accounts. Check their site for current offers. Proofreading costs are very low.
                </p>
              </div>
              <p className="mt-1 text-muted-foreground/70">
                I make no money from the AI integration. Even where billing details are required, your actual token usage for proofreading will be extremely low. Check each provider's current pricing — the details above reflect what was available in {BUILD_PERIOD}.
              </p>
            </div>
          )}
        </div>

        {/* Theme selector */}
        <div className="border-t border-input pt-3">
          <p className="text-sm mb-2">Theme</p>
          <div className="flex rounded-md border border-input overflow-hidden">
            {([
              { value: "light" as Theme, icon: Sun, label: "Light" },
              { value: "auto" as Theme, icon: Monitor, label: "Auto" },
              { value: "dark" as Theme, icon: Moon, label: "Dark" },
            ]).map(({ value, icon: Icon, label }) => (
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
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Context menu toggle */}
        <div className="border-t border-input pt-3">
          <label className="flex items-center justify-between gap-3 cursor-pointer">
            <div>
              <p className="text-sm">
                Right-click menu
                <span className="ml-1.5 text-[10px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1.5 py-0.5 rounded">Beta</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Show Proofread options in the context menu
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

        <div className="border-t border-input pt-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSettingsView("styles")}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Manage Styles
          </Button>
        </div>

        {/* Donation box — always visible in settings */}
        <div className="border-t border-input pt-3 mt-auto">
          <div className="rounded-lg border border-input bg-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <Heart className="h-5 w-5 text-pink-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground leading-relaxed">
                <p>
                  Hi, I'm <strong className="text-foreground">Mark</strong> — a developer from the UK. I built this extension for myself and figured others might find it useful too.
                </p>
                <p className="mt-1.5">
                  If it's saved you a few minutes, a coffee would make my day.
                </p>
              </div>
            </div>
            <a
              href={BMC_URL}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#FFDD00] text-[#000] text-sm font-medium h-9 px-4 hover:bg-[#FFDD00]/90 transition-colors"
            >
              <Coffee className="h-4 w-4" />
              Buy me a coffee
            </a>
            <label className="flex items-center justify-between gap-3 cursor-pointer pt-1">
              <p className="text-xs text-muted-foreground">Hide from main page</p>
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
      </div>
    )
  }

  // ── Main view ──
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Style selector */}
      <div className="flex items-center gap-1.5 px-4 py-3 flex-wrap">
        {styles.map((style) => (
          <Button
            key={style.name}
            variant={activeStyle === style.name ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveStyle(style.name)
              setThinkingOverride(null)
            }}
          >
            {style.name}
          </Button>
        ))}
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("styles")} title="Manage styles">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("settings")} title="Settings">
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
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste or type your text here..."
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
                Proofreading...
              </>
            ) : (
              "Proofread"
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleClear} title="Clear">
            <Eraser className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex flex-col gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
              <p className="text-xs text-destructive flex-1">{error.message}</p>
              <button
                onClick={() => { setError(null); setShowRawError(false) }}
                className="text-destructive/60 hover:text-destructive shrink-0"
                title="Dismiss"
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
                  {showRawError ? "Hide" : "Show"} raw error
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
              {!output.includes("```") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={handleCopy}
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
              <div className={!output.includes("```") ? "pr-8" : ""}>
                <MarkdownOutput text={output} />
              </div>
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
