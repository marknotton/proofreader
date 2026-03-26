import { buildPrompt } from "./prompt"

const GEMINI_MODEL = "gemini-2.5-flash"

/**
 * Calls the Gemini API with the given system prompt and user text.
 * Streams the response back via a callback.
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
        const chunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text
        if (chunk) onChunk(chunk)
      } catch {
        // skip malformed chunks
      }
    }
  }
}
