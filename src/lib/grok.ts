import { buildPrompt } from "./prompt"
import { readSSEStream } from "./stream"

const GROK_MODEL = "grok-3-mini-fast"

/**
 * Calls the xAI Grok API with streaming.
 * Uses proper system/user role separation (OpenAI-compatible format).
 * @param apiKey - The xAI API key
 * @param systemPrompt - The system-level instruction prompt
 * @param text - The user text to proofread
 * @param onChunk - Callback invoked with each text chunk
 * @param signal - Optional AbortSignal for cancellation
 * @param _thinkingBudget - Unused (Grok does not support thinking/reasoning)
 */
export async function proofread(
  apiKey: string,
  systemPrompt: string,
  text: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  _thinkingBudget?: number
): Promise<void> {
  const url = "https://api.x.ai/v1/chat/completions"

  const { system, user } = buildPrompt(systemPrompt, text)

  const body: Record<string, unknown> = {
    model: GROK_MODEL,
    stream: true,
    temperature: 0.2,
    max_tokens: 4096,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Grok API error (${response.status}): ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  // Extract text from Grok SSE events (OpenAI-compatible format)
  const extractText = (parsed: Record<string, unknown>): string | undefined => {
    const choices = parsed.choices as unknown[]
    if (Array.isArray(choices) && choices[0]) {
      const delta = (choices[0] as Record<string, unknown>)?.delta as Record<string, unknown>
      return delta?.content as string | undefined
    }
    return undefined
  }

  await readSSEStream(reader, onChunk, extractText)
}
