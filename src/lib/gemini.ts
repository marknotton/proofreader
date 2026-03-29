import { buildPrompt } from "./prompt"
import { readSSEStream } from "./stream"

const GEMINI_MODEL = "gemini-2.5-flash"

/**
 * Calls the Gemini API with the given system prompt and user text.
 * Streams the response back via a callback.
 * @param apiKey - The Gemini API key
 * @param systemPrompt - The system-level instruction prompt
 * @param text - The user text to proofread
 * @param onChunk - Callback invoked with each text chunk
 * @param signal - Optional AbortSignal for cancellation
 * @param thinkingBudget - Optional thinking budget in tokens (0-8192)
 */
export async function proofread(
  apiKey: string,
  systemPrompt: string,
  text: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  thinkingBudget?: number
): Promise<void> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`

  const { system, user } = buildPrompt(systemPrompt, text)

  const maxOutputTokens = Math.min(4096, 2048 + (thinkingBudget ?? 0) / 4)

  const generationConfig: Record<string, unknown> = {
    temperature: 0.2,
    maxOutputTokens,
  }

  if (thinkingBudget !== undefined) {
    generationConfig.thinkingConfig = {
      thinkingBudget,
    }
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: system }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: user }],
        },
      ],
      generationConfig,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Gemini API error (${response.status}): ${err}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error("No response body")

  // Extract text from Gemini SSE events
  const extractText = (parsed: Record<string, unknown>): string | undefined => {
    const candidates = parsed.candidates as unknown[]
    if (Array.isArray(candidates) && candidates[0]) {
      const content = (candidates[0] as Record<string, unknown>)?.content as Record<string, unknown>
      const parts = content?.parts as unknown[]
      if (Array.isArray(parts) && parts[0]) {
        return (parts[0] as Record<string, unknown>)?.text as string | undefined
      }
    }
    return undefined
  }

  await readSSEStream(reader, onChunk, extractText)
}
