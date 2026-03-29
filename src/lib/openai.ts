import { buildPrompt } from "./prompt"
import { readSSEStream } from "./stream"

const OPENAI_MODEL = "gpt-4o-mini"

/** Map effort index (0/1/2) to OpenAI reasoning_effort values */
const EFFORT_MAP = ["low", "medium", "high"] as const

/**
 * Calls the OpenAI Chat Completions API with streaming.
 * Uses proper system/user role separation.
 * @param apiKey - The OpenAI API key
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
  const url = "https://api.openai.com/v1/chat/completions"

  const { system, user } = buildPrompt(systemPrompt, text)

  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    stream: true,
    temperature: 0.2,
    max_tokens: 4096,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  }

  // Only attach reasoning_effort if the model supports it
  if (effortIndex !== undefined && effortIndex >= 0 && effortIndex <= 2) {
    body.reasoning_effort = EFFORT_MAP[effortIndex]
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
    throw new Error(`OpenAI API error (${response.status}): ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  // Extract text from OpenAI SSE events
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
