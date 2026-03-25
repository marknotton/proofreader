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
import { proofread } from "./lib/gemini"
import { Copy, Check, Loader2, Settings, X, Eraser, Zap, Brain, SlidersHorizontal } from "lucide-react"

const API_KEY_STORAGE = "proofreader_api_key"

type SettingsView = "closed" | "api-key" | "styles"

export default function App() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [styles, setStyles] = useState<ProofreadStyle[]>(() => loadStyles())
  const [activeStyle, setActiveStyle] = useState(() => loadStyles()[0]?.name ?? "Grammar Only")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [settingsView, setSettingsView] = useState<SettingsView>("closed")
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || "")
  const [apiKeyInput, setApiKeyInput] = useState("")
  const [thinkingOverride, setThinkingOverride] = useState<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Pending context menu action — stored in a ref so the proofread callback can read it
  const pendingModeRef = useRef<{ mode: "proofread" | "replace"; tabId?: number } | null>(null)

  // Resolve the effective thinking budget: manual override > style default > global default
  const currentStyle = styles.find((s) => s.name === activeStyle)
  const effectiveThinking = thinkingOverride ?? currentStyle?.thinking ?? DEFAULT_THINKING

  // ── Toast helper ──
  const showToast = useCallback((message: string, duration = 3000) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast(message)
    toastTimerRef.current = setTimeout(() => setToast(null), duration)
  }, [])

  // ── Core proofread logic (extracted so context menu can call it too) ──
  const runProofread = useCallback(async (
    text: string,
    opts?: { mode?: "proofread" | "replace"; tabId?: number }
  ) => {
    const key = apiKey || localStorage.getItem(API_KEY_STORAGE) || ""
    if (!text.trim() || !key) return

    const style = styles.find((s) => s.name === activeStyle)
    if (!style) return

    // Store the mode so the completion handler knows what to do
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

      // If this was a "replace" action, send the result back to the content script
      if (pendingModeRef.current?.mode === "replace" && pendingModeRef.current.tabId) {
        try {
          const chrome = (globalThis as any).chrome
          chrome.runtime.sendMessage({
            type: "REPLACE_TEXT",
            text: result,
            tabId: pendingModeRef.current.tabId,
          })
          showToast("Replaced")
        } catch {
          showToast("Could not replace text in page")
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name !== "AbortError") {
        setError(err.message)
      }
    } finally {
      setLoading(false)
      pendingModeRef.current = null
    }
  }, [apiKey, activeStyle, styles, thinkingOverride, showToast])

  // ── Init ──
  useEffect(() => {
    if (!apiKey) setSettingsView("api-key")
    setApiKeyInput(apiKey)
  }, [])

  // If the active style was deleted, fall back to the first available
  useEffect(() => {
    if (!styles.find((s) => s.name === activeStyle) && styles.length > 0) {
      setActiveStyle(styles[0].name)
      setThinkingOverride(null)
    }
  }, [styles, activeStyle])

  // ── Listen for context menu messages from background.js ──
  useEffect(() => {
    const chrome = (globalThis as unknown as { chrome?: any }).chrome
    if (!chrome?.runtime?.onMessage) return

    const listener = (message: any) => {
      if (message.type === "CONTEXT_MENU_EMPTY") {
        showToast("No text selected")
        return
      }

      if (message.type === "CONTEXT_MENU_TEXT") {
        const { text, mode, tabId } = message
        setInput(text)
        setSettingsView("closed")

        // Auto-submit after a tick so state has settled
        setTimeout(() => {
          runProofread(text, { mode, tabId })
        }, 50)
      }
    }

    chrome.runtime.onMessage.addListener(listener)
    return () => chrome.runtime.onMessage.removeListener(listener)
  }, [runProofread, showToast])

  const handleSaveKey = useCallback(() => {
    const trimmed = apiKeyInput.trim()
    if (trimmed) {
      localStorage.setItem(API_KEY_STORAGE, trimmed)
      setApiKey(trimmed)
      setSettingsView("closed")
    }
  }, [apiKeyInput])

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

  // Style manager view
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

  // API key settings panel
  if (settingsView === "api-key") {
    return (
      <div className="flex flex-col h-screen bg-background text-foreground p-4 gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Settings</h2>
          {apiKey && (
            <Button variant="ghost" size="icon" onClick={() => setSettingsView("closed")}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <label className="text-sm text-muted-foreground">
            Google AI Studio API Key
          </label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
            placeholder="AIza..."
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <p className="text-xs text-muted-foreground">
            Get a free key from{" "}
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener"
              className="underline hover:text-foreground"
            >
              aistudio.google.com/apikey
            </a>
          </p>
          <Button onClick={handleSaveKey} disabled={!apiKeyInput.trim()}>
            Save
          </Button>
        </div>

        {/* Link to style manager */}
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
      </div>
    )
  }

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
          <Button variant="ghost" size="icon" onClick={() => setSettingsView("api-key")} title="Settings">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Thinking slider */}
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

      {/* Input */}
      <div className="flex-1 flex flex-col gap-3 px-4 pb-3 min-h-0">
        <div className="relative flex-1 min-h-[120px]">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste or type your text here..."
            className="h-full text-sm"
          />

          {/* Toast — positioned relative to the textarea */}
          {toast && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-foreground text-background text-xs px-3 py-1.5 rounded-md shadow-lg pointer-events-none animate-fade-in z-10">
              {toast}
            </div>
          )}
        </div>

        {/* Actions */}
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

        {/* Error */}
        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        {/* Output */}
        {output && (
          <Card className="flex-1 min-h-[120px] overflow-auto">
            <CardContent className="relative">
              {/* Global copy button — only shown when there are no code blocks */}
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
    </div>
  )
}
