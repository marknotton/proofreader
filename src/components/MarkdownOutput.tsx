import { useState, useMemo } from "react"
import { Copy, Check } from "lucide-react"
import { Button } from "./ui/button"

type Block =
  | { type: "text"; content: string }
  | { type: "code"; content: string }

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = []
  const parts = text.split("```")

  for (let i = 0; i < parts.length; i++) {
    const raw = parts[i]
    if (i % 2 === 0) {
      // Text block (outside ```)
      if (raw.trim()) {
        blocks.push({ type: "text", content: raw.trim() })
      }
    } else {
      // Code block — strip optional language hint on first line
      const lines = raw.split("\n")
      const firstLine = lines[0].trim()
      // If the first line looks like a language tag (single word, no spaces), skip it
      const hasLangHint = firstLine && /^[a-zA-Z0-9_+-]+$/.test(firstLine)
      const content = hasLangHint ? lines.slice(1).join("\n").trim() : raw.trim()
      if (content) {
        blocks.push({ type: "code", content })
      }
    }
  }

  return blocks
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-green-500" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}

export default function MarkdownOutput({ text }: { text: string }) {
  const hasCodeBlocks = text.includes("```")

  const blocks = useMemo(() => {
    if (!hasCodeBlocks) return null
    return parseBlocks(text)
  }, [text, hasCodeBlocks])

  // Plain text fallback — no markdown detected
  if (!blocks) {
    return <p className="text-sm whitespace-pre-wrap">{text}</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {blocks.map((block, i) =>
        block.type === "code" ? (
          <div key={i} className="group relative rounded-md bg-muted border border-border">
            <CopyButton text={block.content} />
            <pre className="p-3 pr-10 text-sm whitespace-pre-wrap overflow-x-auto">
              <code>{block.content}</code>
            </pre>
          </div>
        ) : (
          <p key={i} className="text-sm whitespace-pre-wrap">{block.content}</p>
        )
      )}
    </div>
  )
}
