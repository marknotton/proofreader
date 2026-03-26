import type { ProviderId } from "./providers"
import { PROVIDERS } from "./providers"

export interface SanitisedError {
  /** Human-friendly summary */
  message: string
  /** The original raw error string */
  raw: string
}

/**
 * Attempts to extract a clean, human-readable error from the raw API error string.
 * Falls back to the raw string if parsing fails.
 */
export function sanitiseError(raw: string, provider: ProviderId): SanitisedError {
  const label = PROVIDERS[provider].label

  try {
    // All provider errors follow "<Provider> API error (STATUS): <json>"
    const statusMatch = raw.match(/API error \((\d+)\)/)
    const status = statusMatch ? Number(statusMatch[1]) : null
    const jsonStart = raw.indexOf("{")

    if (jsonStart >= 0) {
      const parsed = JSON.parse(raw.slice(jsonStart))

      // Try to extract the message from various response shapes
      const msg: string | undefined =
        parsed?.error?.message ||    // OpenAI, Gemini
        parsed?.error?.status ||     // Gemini fallback
        parsed?.message              // generic

      if (msg) {
        return {
          message: friendlyMessage(msg, status, provider, label),
          raw,
        }
      }
    }

    // No JSON found — just clean up the prefix
    const cleaned = raw.replace(/^\w+ API error \(\d+\):\s*/, "").trim()
    return {
      message: friendlyMessage(cleaned, status, provider, label),
      raw,
    }
  } catch {
    // JSON parse failed — return raw with a best-effort cleanup
    return { message: raw, raw }
  }
}

function friendlyMessage(
  msg: string,
  status: number | null,
  _provider: ProviderId,
  label: string
): string {
  const lower = msg.toLowerCase()

  // Auth / key issues
  if (
    status === 401 ||
    status === 403 ||
    lower.includes("invalid") && (lower.includes("key") || lower.includes("api")) ||
    lower.includes("authentication") ||
    lower.includes("unauthorized") ||
    lower.includes("incorrect api key")
  ) {
    return `Invalid API key. Double-check your ${label} key in settings.`
  }

  // Quota / billing
  if (
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("insufficient")
  ) {
    if (lower.includes("quota") || lower.includes("insufficient")) {
      return `Quota exceeded. Check your ${label} plan and billing details.`
    }
    return `Rate limited by ${label}. Wait a moment and try again.`
  }

  // Model not found
  if (status === 404 || lower.includes("model") && lower.includes("not found")) {
    return `Model not available. The selected ${label} model may have been retired or renamed.`
  }

  // Server errors
  if (status && status >= 500) {
    return `${label} is experiencing issues. Try again in a moment.`
  }

  // Fallback — return the extracted message as-is, it's already cleaner than the raw blob
  return msg
}
