# Privacy Policy — Proofreader

**Last updated: March 2026**

Proofreader is a Chrome extension that proofreads text using AI. This policy explains what data the extension accesses, what it does with it, and what it never does.

---

## What Proofreader does with your text

When you proofread text, that text is sent directly from your browser to the AI provider you have selected (Google Gemini, OpenAI, Anthropic Claude, or xAI Grok). The request goes straight from your device to their API — there is no intermediary server, no proxy, and no third party involved beyond the provider you choose.

Proofreader does not store, log, or retain any text you proofread. Once a result is returned, nothing persists beyond what is visible in the extension panel. Closing or clearing the panel discards it entirely.

---

## What is stored locally

The following data is stored on your device only, using Chrome's local extension storage:

- Your API key(s) for the AI provider(s) you use
- Your selected AI provider
- Your theme preference (light, dark, or auto)
- Any custom styles you have created (name and prompt only)
- Extension settings (context menu toggle, auto-proofread preferences, language preference)

None of this data is transmitted anywhere other than to the AI provider when making a proofread request (specifically, the API key is included in the request header as required by the provider).

---

## Content script access

Proofreader includes a content script that runs on all pages. It is used exclusively for two purposes:

1. **Reading selected text** when you trigger a proofread via the right-click context menu
2. **Replacing text in place** when you use the "Proofread and Replace" context menu option

The content script does not monitor your browsing, read page content beyond what you explicitly select, or communicate with any external service. It only activates in direct response to your actions.

---

## Permissions

The extension requests the following Chrome permissions:

| Permission | Reason |
|---|---|
| `sidePanel` | To display the extension in Chrome's side panel |
| `contextMenus` | To add proofreading options to the right-click menu |
| `activeTab` | To interact with the current tab when using the context menu |
| `storage` | To save your API keys and settings locally |
| `clipboardRead` | To detect when text is pasted into the extension panel (auto-proofread on paste feature) |
| `clipboardWrite` | To copy proofread results to your clipboard |

---

## Third-party AI providers

When you use Proofreader, your text is sent to whichever AI provider you have configured. Each provider has its own privacy policy governing how they handle API requests:

- **Google Gemini:** https://policies.google.com/privacy
- **OpenAI:** https://openai.com/policies/privacy-policy
- **Anthropic (Claude):** https://www.anthropic.com/privacy
- **xAI (Grok):** https://x.ai/privacy-policy

Proofreader has no control over how these providers handle data once it reaches them. Review their policies if this is a concern.

---

## What Proofreader never does

- Does not collect analytics or usage data
- Does not track which pages you visit
- Does not sell, share, or transmit any data to the extension developer
- Does not contain any advertising or third-party tracking scripts
- Does not send your text anywhere other than the AI provider you have chosen

---

## Open source

Proofreader is open source. The full source code is available at [github.com/marknotton/proofreader](https://github.com/marknotton/proofreader) for independent review.

---

## Contact

If you have any questions about this policy, you can reach the developer via the GitHub repository linked above.
