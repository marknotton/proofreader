import { buildPrompt } from "./prompt"

const OPENAI_MODEL = "gpt-4o-mini"

/** Map effort index (0/1/2) to OpenAI reasoning_effort values */
const EFFORT_MAP = ["low", "medium", "high"] as const

/**
 * Calls the OpenAI Chat Completions API with streaming.
 * Uses proper system/user role separation.
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
