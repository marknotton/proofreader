import { buildPrompt } from "./prompt"
import { readSSEStream } from "./stream"

const CLAUDE_MODEL = "claude-sonnet-4-20250514"

/** Map effort index (0/1/2) to Claude extended thinking budget tokens */
const THINKING_BUDGETS = [1024, 4096, 10000] as const

/**
 * Calls the Anthropic Messages API with streaming (SSE).
 * Uses proper system/user role separation.
 * @param apiKey - The Anthropic API key
 * @param systemPrompt - The system-level instruction prompt
 * @param text - The user text to proofread
 * @param onChunk - Callback invoked with each text chunk
 * @param signal - Optional AbortSignal for cancellation
 * @param effortIndex - Effort level: 0 (low), 1 (medium), 2 (high)
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

  const { system, user } = buildPrompt(systemPrompt, text)

  const thinkingBudget = effortIndex !== undefined && effortIndex >= 0 && effortIndex <= 2
    ? THINKING_BUDGETS[effortIndex]
    : THINKING_BUDGETS[1]

  const body: Record<string, unknown> = {
    model: CLAUDE_MODEL,
    max_tokens: 4096 + thinkingBudget,
    stream: true,
    system,
    messages: [
      { role: "user", content: user },
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

  // Extract text from Anthropic SSE events
  const extractText = (parsed: Record<string, unknown>): string | undefined => {
    if (parsed.type === "content_block_delta" && (parsed.delta as Record<string, unknown>)?.type === "text_delta") {
      return (parsed.delta as Record<string, unknown>).text as string | undefined
    }
    return undefined
  }

  await readSSEStream(reader, onChunk, extractText)
}
