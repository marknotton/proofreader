declare const __BUILD_PERIOD__: string

export type ProviderId = "gemini" | "openai" | "claude" | "grok"

export interface ProviderConfig {
  id: ProviderId
  name: string
  /** Short label for dropdowns */
  label: string
  /** Placeholder text for API key input */
  placeholder: string
  /** URL where users can get their API key */
  keyUrl: string
  /** Human-readable label for the key URL link */
  keyUrlLabel: string
  /** Brief note about free tier / billing */
  freeTierNote: string
  /** Whether this provider has a genuinely free API tier */
  hasFreeApiTier: boolean
  /** Whether billing details are required even for free usage */
  requiresBilling: boolean
  /** Thinking/reasoning slider config */
  thinking: {
    /** Whether the provider supports a thinking/reasoning toggle */
    supported: boolean
    /** Type of control: 'budget' = numeric slider (Gemini), 'effort' = 3-stop (OpenAI/Claude), 'none' = hidden */
    type: "budget" | "effort" | "none"
    /** Labels for effort mode (low/medium/high) */
    effortLabels?: string[]
    /** Default thinking value */
    default: number
  }
  /** Default model ID to use */
  defaultModel: string
  /** API base URL (used for actual calls) */
  apiBase: string
}

/** Injected at build time by Vite — e.g. "early 2026" */
export const BUILD_PERIOD: string = typeof __BUILD_PERIOD__ !== "undefined" ? __BUILD_PERIOD__ : "early 2026"

export const PROVIDERS: Record<ProviderId, ProviderConfig> = {
  gemini: {
    id: "gemini",
    name: "Google",
    label: "Google (Gemini)",
    placeholder: "AIza...",
    keyUrl: "https://aistudio.google.com/apikey",
    keyUrlLabel: "aistudio.google.com/apikey",
    freeTierNote: "Free tier available with generous rate limits. More than enough for proofreading. No billing details required.",
    hasFreeApiTier: true,
    requiresBilling: false,
    thinking: {
      supported: true,
      type: "budget",
      default: 1024,
    },
    defaultModel: "gemini-2.5-flash",
    apiBase: "https://generativelanguage.googleapis.com",
  },
  openai: {
    id: "openai",
    name: "OpenAI",
    label: "OpenAI (ChatGPT)",
    placeholder: "sk-...",
    keyUrl: "https://platform.openai.com/api-keys",
    keyUrlLabel: "platform.openai.com/api-keys",
    freeTierNote: "No free API tier. Requires billing details, but proofreading costs are negligible — typically fractions of a cent per request.",
    hasFreeApiTier: false,
    requiresBilling: true,
    thinking: {
      supported: true,
      type: "effort",
      effortLabels: ["Low", "Medium", "High"],
      default: 1, // index into effortLabels — "Medium"
    },
    defaultModel: "gpt-4o-mini",
    apiBase: "https://api.openai.com",
  },
  claude: {
    id: "claude",
    name: "Anthropic",
    label: "Anthropic (Claude)",
    placeholder: "sk-ant-...",
    keyUrl: "https://console.anthropic.com/settings/keys",
    keyUrlLabel: "console.anthropic.com/settings/keys",
    freeTierNote: "No free API tier. Requires a prepaid credit purchase and billing details. Proofreading costs are very low.",
    hasFreeApiTier: false,
    requiresBilling: true,
    thinking: {
      supported: true,
      type: "effort",
      effortLabels: ["Low", "Medium", "High"],
      default: 1,
    },
    defaultModel: "claude-sonnet-4-20250514",
    apiBase: "https://api.anthropic.com",
  },
  grok: {
    id: "grok",
    name: "xAI",
    label: "xAI (Grok)",
    placeholder: "xai-...",
    keyUrl: "https://console.x.ai/",
    keyUrlLabel: "console.x.ai",
    freeTierNote: "May offer promotional credits for new accounts. Check their site for current offers. Proofreading costs are very low.",
    hasFreeApiTier: false,
    requiresBilling: true,
    thinking: {
      supported: false,
      type: "none",
      default: 0,
    },
    defaultModel: "grok-3-mini-fast",
    apiBase: "https://api.x.ai",
  },
}

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[]

/** localStorage key pattern for per-provider API keys */
export function providerKeyStorageKey(id: ProviderId): string {
  return `proofreader_apikey_${id}`
}

/** Get the stored API key for a provider */
export function getProviderKey(id: ProviderId): string {
  return localStorage.getItem(providerKeyStorageKey(id)) || ""
}

/** Save an API key for a provider */
export function setProviderKey(id: ProviderId, key: string): void {
  if (key.trim()) {
    localStorage.setItem(providerKeyStorageKey(id), key.trim())
  } else {
    localStorage.removeItem(providerKeyStorageKey(id))
  }
}

/** Get the stored active provider ID */
export function getActiveProvider(): ProviderId {
  const stored = localStorage.getItem("proofreader_provider") as ProviderId | null
  return stored && PROVIDERS[stored] ? stored : "gemini"
}

/** Save the active provider ID */
export function setActiveProvider(id: ProviderId): void {
  localStorage.setItem("proofreader_provider", id)
}
