import { buildPrompt } from "./prompt"

const GROK_MODEL = "grok-3-mini-fast"

/**
 * Calls the xAI Grok API with streaming.
 * Grok uses the OpenAI-compatible chat completions format.
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

  const body: Record<string, unknown> = {
    model: GROK_MODEL,
    stream: true,
    temperature: 0.2,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildPrompt(systemPrompt, text),
      },
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
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) onChunk(delta)
      } catch {
        // skip malformed chunks
      }
    }
  }
}
