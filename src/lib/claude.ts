import { buildPrompt } from "./prompt"

const CLAUDE_MODEL = "claude-sonnet-4-20250514"

/** Map effort index (0/1/2) to Claude extended thinking budget tokens */
const THINKING_BUDGETS = [1024, 4096, 10000] as const

/**
 * Calls the Anthropic Messages API with streaming (SSE).
 * Uses extended thinking when effort > 0.
 */
export async function proofread(
  apiKey: string,
  systemPrompt: string,
  text: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  effortIndex?: number
): Promise<void> {
  const url = "https://api.anthropic.com/v1/messages"

  const thinkingBudget = effortIndex !== undefined && effortIndex >= 0 && effortIndex <= 2
    ? THINKING_BUDGETS[effortIndex]
    : THINKING_BUDGETS[1]

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 2048 + thinkingBudget,
    stream: true,
    messages: [
      {
        role: "user",
        content: buildPrompt(systemPrompt, text),
      },
    ],
  }

  // Enable extended thinking for all effort levels
  if (thinkingBudget > 0) {
    body.thinking = {
      type: "enabled",
      budget_tokens: thinkingBudget,
    }
    // Temperature must be 1 when using extended thinking
    body.temperature = 1
  } else {
    body.temperature = 0.2
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    signal,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error (${response.status}): ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  const decoder = new TextDecoder()
  let buffer = ""

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue
      const data = line.slice(6).trim()
      if (data === "[DONE]") return

      try {
        const parsed = JSON.parse(data)

        // Anthropic SSE events: content_block_delta with type "text_delta"
        if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
          onChunk(parsed.delta.text)
        }
      } catch {
        // skip malformed chunks
      }
    }
  }
}
