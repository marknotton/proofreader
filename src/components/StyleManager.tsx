/**
 * StyleManager component for managing proofread styles.
 *
 * Provides a UI for creating, editing, deleting, and managing proofreading styles
 * with import/export functionality and drag-to-reorder capabilities.
 *
 * @module components/StyleManager
 */
import { useState, useRef, useCallback, type DragEvent } from "react"
import { useI18n } from "../context/I18nContext"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import { Switch } from "./ui/switch"
import {
  type ProofreadStyle,
  type SpellingLocale,
  SPELLING_LOCALES,
} from "../lib/styles"
import {
  type ProviderId,
  PROVIDERS,
  PROVIDER_IDS,
  DEFAULT_THINKING_BY_PROVIDER,
} from "../lib/providers"
import {
  STYLE_ICONS,
  STYLE_COLORS,
  getIconComponent,
  getColorValue,
} from "../lib/style-options"
import {
  Plus,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronDown,
  Save,
  X,
  AlertTriangle,
  Ban,
  GripVertical,
} from "lucide-react"

/**
 * Props for the StyleManager component.
 *
 * @interface StyleManagerProps
 * @property {ProofreadStyle[]} styles - Array of available proofread styles
 * @property {(styles: ProofreadStyle[]) => void} onChange - Callback fired when styles change
 * @property {() => void} onBack - Callback to return to previous view
 */
interface StyleManagerProps {
  styles: ProofreadStyle[]
  onChange: (styles: ProofreadStyle[]) => void
  onBack: () => void
}

/**
 * Represents the current view state of the style manager.
 */
type View =
  | { kind: "list" }
  | { kind: "edit"; index: number; style: ProofreadStyle; isNew: boolean }
  | { kind: "confirmDelete"; index: number; style: ProofreadStyle }

/**
 * Style management interface for creating, editing, and organizing proofread styles.
 *
 * Supports full CRUD operations on styles, bulk import/export with conflict handling,
 * and drag-to-reorder functionality for organizing styles.
 *
 * @component
 * @param {StyleManagerProps} props - Component props
 * @returns {React.ReactElement} The rendered style manager interface
 */
export default function StyleManager({ styles, onChange, onBack }: StyleManagerProps) {
  const { t } = useI18n()
  const [view, setView] = useState<View>({ kind: "list" })
  const [reordering, setReordering] = useState(false)
  const dragIndexRef = useRef<number>(-1)
  const dragOverIndexRef = useRef<number>(-1)

  // ── List view helpers ──

  const handleAdd = useCallback(() => {
    setView({
      kind: "edit",
      index: -1,
      style: {
        name: "",
        prompt: "",
        thinkingByProvider: { ...DEFAULT_THINKING_BY_PROVIDER },
      },
      isNew: true,
    })
  }, [])

  const handleEdit = useCallback(
    (index: number) => {
      setView({
        kind: "edit",
        index,
        style: { ...styles[index] },
        isNew: false,
      })
    },
    [styles]
  )

  const handleConfirmDelete = useCallback(() => {
    if (view.kind !== "confirmDelete") return
    const updated = styles.filter((_, i) => i !== view.index)
    onChange(updated)
    setView({ kind: "list" })
  }, [view, styles, onChange])

  // ── Edit/Add view helpers ──

  const handleSaveStyle = useCallback(
    (style: ProofreadStyle, index: number, isNew: boolean) => {
      const updated = [...styles]
      if (isNew) {
        updated.push(style)
      } else {
        updated[index] = style
      }
      onChange(updated)
      setView({ kind: "list" })
    },
    [styles, onChange]
  )

  // ── Reorder ──

  const handleDragStart = useCallback((_e: DragEvent<HTMLDivElement>, index: number) => {
    dragIndexRef.current = index
  }, [])

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    dragOverIndexRef.current = index
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
      e.preventDefault()
      const from = dragIndexRef.current
      if (from === -1 || from === dropIndex) return
      const updated = [...styles]
      const [moved] = updated.splice(from, 1)
      updated.splice(dropIndex, 0, moved)
      dragIndexRef.current = -1
      dragOverIndexRef.current = -1
      onChange(updated)
    },
    [styles, onChange]
  )

  // ── Renders ──

  // Confirm delete dialog
  if (view.kind === "confirmDelete") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold">{t("styles.deleteHeading")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("styles.deleteConfirm", { name: view.style.name })}
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirmDelete}
          >
            {t("styles.deleteButton")}
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setView({ kind: "list" })}
          >
            {t("styles.cancel")}
          </Button>
        </div>
      </div>
    )
  }

  // Edit / Add form
  if (view.kind === "edit") {
    return (
      <StyleForm
        initial={view.style}
        isNew={view.isNew}
        existingNames={styles
          .filter((_, i) => i !== view.index)
          .map((s) => s.name.toLowerCase())}
        onSave={(style) => handleSaveStyle(style, view.index, view.isNew)}
        onCancel={() => setView({ kind: "list" })}
        onDelete={!view.isNew ? () => {
          const updated = styles.filter((_, i) => i !== view.index)
          onChange(updated)
          setView({ kind: "list" })
        } : undefined}
      />
    )
  }

  // Main list view
  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold flex-1">{t("styles.title")}</h3>
        {styles.length > 1 && (
          <button
            onClick={() => setReordering(!reordering)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            {reordering ? t("styles.reorderDone") : t("styles.reorder")}
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto space-y-1.5">
        {styles.map((style, i) => {
          const IconComp = getIconComponent(style.icon)
          const colorHex = getColorValue(style.color)
          const promptSnippet = style.prompt.length > 80 ? style.prompt.slice(0, 80).trimEnd() + "…" : style.prompt
          const localeName = style.spellingLocale && style.spellingLocale !== "none"
            ? SPELLING_LOCALES.find((l) => l.key === style.spellingLocale)?.label?.replace(" English", "")
            : null
          const tags: string[] = []
          if (localeName) tags.push(localeName)
          if (style.markdown) tags.push("MD")
          return (
            <div
              key={`${style.name}-${i}`}
              draggable={reordering}
              onDragStart={reordering ? (e) => handleDragStart(e, i) : undefined}
              onDragOver={reordering ? (e) => handleDragOver(e, i) : undefined}
              onDrop={reordering ? (e) => handleDrop(e, i) : undefined}
              onClick={!reordering ? () => handleEdit(i) : undefined}
              className={`flex items-start gap-2 rounded-md border border-input px-3 py-2 transition-colors ${reordering ? "cursor-grab active:cursor-grabbing" : "cursor-pointer hover:bg-accent/50"}`}
            >
              {reordering ? (
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
              ) : (
                <>
                  {IconComp && (
                    <IconComp
                      className="h-3.5 w-3.5 shrink-0 mt-0.5"
                      style={colorHex ? { color: colorHex } : undefined}
                    />
                  )}
                  {!IconComp && colorHex && (
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: colorHex }}
                    />
                  )}
                </>
              )}
              <div className="flex-1 min-w-0">
                <span className="text-sm truncate block">{style.name}</span>
                <p className="text-[11px] text-muted-foreground/60 leading-snug truncate mt-0.5">{promptSnippet}</p>
                {tags.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {tags.map((tag) => (
                      <span key={tag} className="text-[9px] font-medium uppercase tracking-wide bg-muted text-muted-foreground px-1 py-0.5 rounded">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
              {!reordering && (
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 mt-0.5" />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-input">
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          {t("styles.addStyle")}
        </Button>
      </div>
    </div>
  )
}

// ── Style edit/add form ──

/**
 * Props for the StyleForm component.
 *
 * @interface StyleFormProps
 * @property {ProofreadStyle} initial - The initial style data to edit
 * @property {boolean} isNew - Whether this is a new style being created
 * @property {string[]} existingNames - Names of existing styles to prevent duplicates
 * @property {(style: ProofreadStyle) => void} onSave - Callback when saving a style
 * @property {() => void} onCancel - Callback when canceling the form
 */
interface StyleFormProps {
  initial: ProofreadStyle
  isNew: boolean
  existingNames: string[]
  onSave: (style: ProofreadStyle) => void
  onCancel: () => void
  onDelete?: () => void
}

/**
 * Form component for editing and creating proofread styles.
 *
 * Provides fields for name, prompt, icon selection, color selection, and per-provider
 * thinking budget configuration with markdown output support.
 *
 * @param {StyleFormProps} props - Component props
 * @returns {React.ReactElement} The rendered form
 */
function StyleForm({ initial, isNew, existingNames, onSave, onCancel, onDelete }: StyleFormProps) {
  const { t } = useI18n()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [name, setName] = useState(initial.name)
  const [prompt, setPrompt] = useState(initial.prompt)
  const [icon, setIcon] = useState<string | undefined>(initial.icon)
  const [color, setColor] = useState<string | undefined>(initial.color)
  const [thinkingByProvider, setThinkingByProvider] = useState<Partial<Record<ProviderId, number>>>(
    initial.thinkingByProvider ?? { ...DEFAULT_THINKING_BY_PROVIDER }
  )
  const [markdown, setMarkdown] = useState(initial.markdown ?? false)
  const [spellingLocale, setSpellingLocale] = useState<SpellingLocale>(initial.spellingLocale ?? "none")
  const [showIcons, setShowIcons] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateThinking = useCallback((provider: ProviderId, value: number) => {
    setThinkingByProvider((prev) => ({ ...prev, [provider]: value }))
  }, [])

  const handleSave = useCallback(() => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError(t("form.errorName"))
      return
    }
    if (!prompt.trim()) {
      setError(t("form.errorPrompt"))
      return
    }
    if (existingNames.includes(trimmedName.toLowerCase())) {
      setError(t("form.errorDuplicate"))
      return
    }
    onSave({
      name: trimmedName,
      prompt: prompt.trim(),
      thinkingByProvider,
      icon,
      color,
      markdown,
      spellingLocale,
    })
  }, [name, prompt, thinkingByProvider, icon, color, markdown, spellingLocale, existingNames, onSave])

  const geminiLabel = (v: number) =>
    v === 0 ? t("thinking.off") : v <= 1024 ? t("thinking.fast") : v <= 4096 ? t("thinking.balanced") : t("thinking.thorough")

  const effortLabels = [t("thinking.low"), t("thinking.medium"), t("thinking.high")]

  return (
    <div className="flex flex-col h-full overflow-auto">

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-input shrink-0">
        <h3 className="font-semibold flex-1">{isNew ? t("form.addTitle") : t("form.editTitle")}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel} aria-label={t("styles.cancel")}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-4 flex-1 min-h-0 overflow-auto">

        {/* Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("form.name")}</label>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(null) }}
            placeholder={t("form.namePlaceholder")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>

        {/* Appearance — icon + colour grouped */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Appearance</p>
          <div className="rounded-md border border-input overflow-hidden">

            {/* Icon row */}
            <button
              onClick={() => setShowIcons(!showIcons)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
            >
              {(() => {
                const Ic = getIconComponent(icon)
                return Ic
                  ? <Ic className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  : <Ban className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
              })()}
              <span className="flex-1 text-sm text-muted-foreground">{t("form.icon")}</span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showIcons ? "rotate-180" : ""}`} />
            </button>
            {showIcons && (
              <div className="grid grid-cols-8 gap-1 p-2 border-t border-input bg-card">
                <button
                  onClick={() => setIcon(undefined)}
                  className={`flex items-center justify-center h-8 w-8 rounded transition-colors ${!icon ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}
                  title={t("form.noIcon")}
                >
                  <Ban className="h-3.5 w-3.5" />
                </button>
                {STYLE_ICONS.map((opt) => {
                  const Ic = opt.icon
                  return (
                    <button
                      key={opt.name}
                      onClick={() => setIcon(opt.name)}
                      className={`flex items-center justify-center h-8 w-8 rounded transition-colors ${icon === opt.name ? "bg-primary text-primary-foreground" : "hover:bg-accent text-muted-foreground"}`}
                      title={opt.name}
                    >
                      <Ic className="h-3.5 w-3.5" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Colour row */}
            <button
              onClick={() => setShowColors(!showColors)}
              className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left border-t border-input"
            >
              {color ? (
                <span className="h-3.5 w-3.5 rounded-full border border-input shrink-0" style={{ backgroundColor: getColorValue(color) }} />
              ) : (
                <span className="h-3.5 w-3.5 rounded-full border-2 border-dashed border-muted-foreground/30 shrink-0" />
              )}
              <span className="flex-1 text-sm text-muted-foreground">{t("form.colour")}</span>
              <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${showColors ? "rotate-180" : ""}`} />
            </button>
            {showColors && (
              <div className="flex items-center gap-1.5 p-2 border-t border-input bg-card flex-wrap">
                <button
                  onClick={() => setColor(undefined)}
                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all ${!color ? "border-foreground scale-110" : "border-dashed border-muted-foreground/40 hover:border-muted-foreground"}`}
                  title={t("form.noColour")}
                >
                  <Ban className="h-3 w-3 text-muted-foreground/60" />
                </button>
                {STYLE_COLORS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => setColor(opt.key)}
                    className={`h-7 w-7 rounded-full border-2 transition-all ${color === opt.key ? "border-foreground scale-110" : "border-transparent hover:scale-105"}`}
                    style={{ backgroundColor: opt.value }}
                    title={opt.label}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Spelling locale */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {t("form.spellingLocale")}
          </label>
          <p className="text-xs text-muted-foreground/70 leading-relaxed">{t("form.spellingLocaleDesc")}</p>
          <div className="relative mt-0.5">
            <select
              value={spellingLocale}
              onChange={(e) => setSpellingLocale(e.target.value as SpellingLocale)}
              className="w-full appearance-none h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring pr-8"
            >
              {SPELLING_LOCALES.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {/* Smart Markdown */}
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <div>
            <p className="text-sm">
              {t("form.markdown")}
              <span className="ml-1.5 text-[9px] font-medium uppercase tracking-wide bg-primary/10 text-primary px-1 py-0.5 rounded">Beta</span>
            </p>
            <p className="text-xs text-muted-foreground/70 leading-relaxed mt-0.5">{t("form.markdownDesc")}</p>
          </div>
          <Switch checked={markdown} onCheckedChange={setMarkdown} />
        </label>

        {/* Thinking budgets */}
        <div className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("form.thinking")}</p>
          <div className="flex flex-col gap-3 p-3 rounded-md border border-input bg-card">
            <p className="text-[10px] text-muted-foreground leading-relaxed">{t("form.thinkingDesc")}</p>
            {PROVIDER_IDS.map((id) => {
              const cfg = PROVIDERS[id].thinking
              if (!cfg.supported || cfg.type === "none") return null
              const val = thinkingByProvider[id] ?? cfg.default
              if (cfg.type === "effort") {
                const labels = cfg.effortLabels || effortLabels
                return (
                  <div key={id} className="flex flex-col gap-1">
                    <span className="text-[11px] text-muted-foreground">{PROVIDERS[id].label}</span>
                    <div className="flex rounded-md border border-input overflow-hidden">
                      {labels.map((label, i) => (
                        <button
                          key={label}
                          onClick={() => updateThinking(id, i)}
                          className={`flex-1 py-1 text-[11px] font-medium transition-colors ${val === i ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground hover:bg-accent"}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              }
              return (
                <div key={id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{PROVIDERS[id].label}</span>
                    <span className="text-[10px] text-muted-foreground">{geminiLabel(val)}</span>
                  </div>
                  <input
                    type="range" min={0} max={8192} step={1024} value={val}
                    onChange={(e) => updateThinking(id, Number(e.target.value))}
                    className="w-full h-1.5 accent-primary"
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Prompt — anchored at bottom, fills remaining space */}
        <div className="flex flex-col gap-1.5 flex-1 min-h-[120px]">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t("form.prompt")}</label>
          <Textarea
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); setError(null) }}
            placeholder={t("form.promptPlaceholder")}
            className="flex-1 text-sm min-h-[120px]"
          />
        </div>

      </div>

      {/* Footer — error + save + delete */}
      <div className="px-4 pb-4 pt-2 flex flex-col gap-2 shrink-0">
        {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
        <Button onClick={handleSave}>
          <Save className="h-3.5 w-3.5" />
          {isNew ? t("form.add") : t("form.save")}
        </Button>
        {!isNew && onDelete && (
          <div className="border-t border-input pt-2 mt-1">
            {showDeleteConfirm ? (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs text-muted-foreground">{t("styles.deleteConfirm", { name })}</p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" className="flex-1" onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("styles.deleteButton")}
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                    {t("styles.cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive hover:border-destructive/50"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("styles.deleteTitle")}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
