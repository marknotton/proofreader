/**
 * Demo mode — allows up to 5 free proofreading requests via a shared backend.
 * Uses Gemini through a Firebase Functions proxy so the API key stays server-side.
 *
 * Set DEMO_ENABLED to false to disable demo mode entirely before deploying.
 */

// ── Feature flag ──────────────────────────────────────────────────────────────
export const DEMO_ENABLED = true
// ─────────────────────────────────────────────────────────────────────────────

const INSTALL_ID_KEY = "proofreader_install_id"
const DEMO_USED_KEY = "proofreader_demo_used"
const DEMO_LIMIT = 5

const DEMO_ENDPOINT = "https://demo-yvf2m5f2eq-uc.a.run.app"

/** Generate a random install ID (UUID v4-like) */
function generateInstallId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16)
  })
}

/** Get or create a persistent install ID */
export function getInstallId(): string {
  let id = localStorage.getItem(INSTALL_ID_KEY)
  if (!id) {
    id = generateInstallId()
    localStorage.setItem(INSTALL_ID_KEY, id)
  }
  return id
}

/** Get the locally cached demo usage count */
export function getDemoUsed(): number {
  return parseInt(localStorage.getItem(DEMO_USED_KEY) || "0", 10)
}

/** Get the demo request limit */
export function getDemoLimit(): number {
  return DEMO_LIMIT
}

/** Check if demo requests are still available */
export function hasDemoRemaining(): boolean {
  return getDemoUsed() < DEMO_LIMIT
}

/**
 * Send a demo proofreading request through the shared backend.
 * Returns the proofread text or throws an error.
 */
export async function demoProofread(
  systemPrompt: string,
  text: string,
  signal?: AbortSignal,
): Promise<{ result: string; used: number; limit: number }> {
  const installId = getInstallId()

  const response = await fetch(DEMO_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal,
    body: JSON.stringify({ installId, systemPrompt, text }),
  })

  // Guard against non-JSON responses (e.g. HTML error pages, 404s)
  const contentType = response.headers.get("content-type") || ""
  if (!contentType.includes("application/json")) {
    throw new Error(
      response.ok
        ? "Demo server returned an unexpected response. Try again later."
        : `Demo server error (${response.status}). The demo backend may not be configured yet.`
    )
  }

  const data = await response.json()

  if (!response.ok) {
    // Update local cache if server says limit reached
    if (response.status === 429 && data.used !== undefined) {
      localStorage.setItem(DEMO_USED_KEY, String(data.used))
    }
    const msg = data.message || data.error || `Demo request failed (${response.status})`
    const detail = data.detail ? `\n\n${data.detail}` : ""
    throw new Error(`${msg}${detail}`)
  }

  // Cache the usage count locally
  if (data.used !== undefined) {
    localStorage.setItem(DEMO_USED_KEY, String(data.used))
  }

  return data
}
