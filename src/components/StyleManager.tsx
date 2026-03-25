import { useState, useRef, useCallback } from "react"
import { Button } from "./ui/button"
import { Textarea } from "./ui/textarea"
import {
  type ProofreadStyle,
  DEFAULT_THINKING,
  exportStylesJSON,
  parseImportedStyles,
  mergeStyles,
} from "../lib/styles"
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  Upload,
  ChevronLeft,
  Save,
  X,
  AlertTriangle,
} from "lucide-react"

interface StyleManagerProps {
  styles: ProofreadStyle[]
  onChange: (styles: ProofreadStyle[]) => void
  onBack: () => void
}

type View =
  | { kind: "list" }
  | { kind: "edit"; index: number; style: ProofreadStyle; isNew: boolean }
  | { kind: "confirmDelete"; index: number; style: ProofreadStyle }
  | { kind: "confirmImport"; incoming: ProofreadStyle[]; matchCount: number; newCount: number }

export default function StyleManager({ styles, onChange, onBack }: StyleManagerProps) {
  const [view, setView] = useState<View>({ kind: "list" })
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── List view helpers ──

  const handleAdd = useCallback(() => {
    setView({
      kind: "edit",
      index: -1,
      style: { name: "", prompt: "", thinking: DEFAULT_THINKING },
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

  const handleRequestDelete = useCallback(
    (index: number) => {
      setView({ kind: "confirmDelete", index, style: styles[index] })
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

  // ── Export ──

  const handleExport = useCallback(() => {
    const json = exportStylesJSON(styles)
    const blob = new Blob([json], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "proofreader-styles.json"
    a.click()
    URL.revokeObjectURL(url)
  }, [styles])

  // ── Import ──

  const handleImportClick = useCallback(() => {
    setImportError(null)
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      // Reset the input so re-uploading the same file works
      e.target.value = ""

      const reader = new FileReader()
      reader.onload = () => {
        try {
          const incoming = parseImportedStyles(reader.result as string)
          if (incoming.length === 0) {
            setImportError("The file contained no styles.")
            return
          }

          // Count how many will overwrite vs append
          let matchCount = 0
          let newCount = 0
          for (const s of incoming) {
            const exists = styles.some(
              (e) => e.name.toLowerCase() === s.name.toLowerCase()
            )
            if (exists) matchCount++
            else newCount++
          }

          setView({ kind: "confirmImport", incoming, matchCount, newCount })
        } catch (err) {
          setImportError(err instanceof Error ? err.message : "Invalid JSON file")
        }
      }
      reader.readAsText(file)
    },
    [styles]
  )

  const handleConfirmImport = useCallback(() => {
    if (view.kind !== "confirmImport") return
    const merged = mergeStyles(styles, view.incoming)
    onChange(merged)
    setView({ kind: "list" })
  }, [view, styles, onChange])

  // ── Renders ──

  // Confirm delete dialog
  if (view.kind === "confirmDelete") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="font-semibold">Delete style</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong>{view.style.name}</strong>? This can't be undone.
        </p>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={handleConfirmDelete}
          >
            Delete
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setView({ kind: "list" })}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  // Confirm import dialog
  if (view.kind === "confirmImport") {
    return (
      <div className="flex flex-col gap-4 p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold">Import styles</h3>
        </div>
        <div className="text-sm text-muted-foreground space-y-1">
          <p>
            This will import <strong>{view.incoming.length}</strong> style{view.incoming.length !== 1 ? "s" : ""}:
          </p>
          {view.newCount > 0 && (
            <p>
              &bull; <strong>{view.newCount}</strong> new style{view.newCount !== 1 ? "s" : ""} will be added
            </p>
          )}
          {view.matchCount > 0 && (
            <p>
              &bull; <strong>{view.matchCount}</strong> existing style{view.matchCount !== 1 ? "s" : ""} will be overwritten
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={handleConfirmImport}>
            Import
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setView({ kind: "list" })}
          >
            Cancel
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
        <h3 className="font-semibold flex-1">Manage Styles</h3>
      </div>

      <div className="flex-1 overflow-auto space-y-1.5">
        {styles.map((style, i) => (
          <div
            key={`${style.name}-${i}`}
            className="flex items-center gap-2 rounded-md border border-input px-3 py-2"
          >
            <span className="flex-1 text-sm truncate">{style.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0"
              onClick={() => handleEdit(i)}
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
              onClick={() => handleRequestDelete(i)}
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-input">
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-3.5 w-3.5" />
          Add Style
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={handleExport}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={handleImportClick}>
            <Upload className="h-3.5 w-3.5" />
            Import
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {importError && (
          <p className="text-xs text-destructive">{importError}</p>
        )}
      </div>
    </div>
  )
}

// ── Style edit/add form ──

interface StyleFormProps {
  initial: ProofreadStyle
  isNew: boolean
  existingNames: string[]
  onSave: (style: ProofreadStyle) => void
  onCancel: () => void
}

function StyleForm({ initial, isNew, existingNames, onSave, onCancel }: StyleFormProps) {
  const [name, setName] = useState(initial.name)
  const [prompt, setPrompt] = useState(initial.prompt)
  const [thinking, setThinking] = useState(initial.thinking ?? DEFAULT_THINKING)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback(() => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError("Name is required")
      return
    }
    if (!prompt.trim()) {
      setError("Prompt is required")
      return
    }
    if (existingNames.includes(trimmedName.toLowerCase())) {
      setError("A style with this name already exists")
      return
    }
    onSave({ name: trimmedName, prompt: prompt.trim(), thinking })
  }, [name, prompt, thinking, existingNames, onSave])

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{isNew ? "Add Style" : "Edit Style"}</h3>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError(null)
          }}
          placeholder="e.g. Technical Docs"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5 flex-1 min-h-0">
        <label className="text-xs text-muted-foreground">Prompt</label>
        <Textarea
          value={prompt}
          onChange={(e) => {
            setPrompt(e.target.value)
            setError(null)
          }}
          placeholder="Instructions for how the AI should process the text..."
          className="flex-1 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">
          Thinking budget: {thinking === 0 ? "Fastest" : thinking <= 1024 ? "Fast" : thinking <= 4096 ? "Balanced" : "Thorough"} ({thinking})
        </label>
        <input
          type="range"
          min={0}
          max={8192}
          step={1024}
          value={thinking}
          onChange={(e) => setThinking(Number(e.target.value))}
          className="w-full h-1.5 accent-primary"
        />
      </div>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <Button onClick={handleSave}>
        <Save className="h-3.5 w-3.5" />
        {isNew ? "Add Style" : "Save Changes"}
      </Button>
    </div>
  )
}
