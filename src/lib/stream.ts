/**
 * Reads and parses an SSE (Server-Sent Events) stream from a Response body.
 * Handles streaming chunks with proper buffering to prevent line splitting.
 * @param reader - The ReadableStreamDefaultReader from response.body
 * @param onChunk - Callback invoked with each parsed data chunk
 * @param extractText - Function to extract text from parsed event JSON
 * @returns Promise that resolves when the stream ends
 */
export async function readSSEStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void,
  extractText: (parsed: Record<string, unknown>) => string | undefined
): Promise<void> {
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
        const parsed = JSON.parse(data) as Record<string, unknown>
        const text = extractText(parsed)
        if (text) onChunk(text)
      } catch {
        // skip malformed chunks
      }
    }
  }
}
