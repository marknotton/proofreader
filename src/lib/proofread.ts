import type { ProviderId } from "./providers"
import { proofread as geminiProofread } from "./gemini"
import { proofread as openaiProofread } from "./openai"
import { proofread as claudeProofread } from "./claude"
import { proofread as grokProofread } from "./grok"

/**
 * Unified proofreading dispatcher.
 * Routes to the correct provider API based on the selected provider ID.
 * @param provider - The provider ID (gemini, openai, claude, grok)
 * @param apiKey - The API key for the selected provider
 * @param systemPrompt - The task-specific instruction prompt
 * @param text - The user text to proofread
 * @param onChunk - Callback invoked with each text chunk from the stream
 * @param signal - Optional AbortSignal for cancellation
 * @param thinking - Optional thinking/effort value (provider-specific interpretation)
 * @throws Error if the provider is not recognized
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
