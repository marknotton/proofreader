import type { ProviderId } from "./providers"
import { proofread as geminiProofread } from "./gemini"
import { proofread as openaiProofread } from "./openai"
import { proofread as claudeProofread } from "./claude"
import { proofread as grokProofread } from "./grok"

/**
 * Unified proofreading dispatcher.
 * Routes to the correct provider API based on the selected provider ID.
 */
export async function proofread(
  provider: ProviderId,
  apiKey: string,
  systemPrompt: string,
  text: string,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
  thinking?: number
): Promise<void> {
  switch (provider) {
    case "gemini":
      return geminiProofread(apiKey, systemPrompt, text, onChunk, signal, thinking)
    case "openai":
      return openaiProofread(apiKey, systemPrompt, text, onChunk, signal, thinking)
    case "claude":
      return claudeProofread(apiKey, systemPrompt, text, onChunk, signal, thinking)
    case "grok":
      return grokProofread(apiKey, systemPrompt, text, onChunk, signal, thinking)
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
