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

## Demo mode

Proofreader includes 5 sample requests so new users can see how the extension works without adding their own API key. These use a shared public API key and are slower than using your own. Here's how it works:

- Your text is sent to a shared backend hosted on Google Cloud Functions, which forwards it to the Google Gemini API for proofreading.
- A random, anonymous install ID (generated locally on your device) is sent with each request. This ID is used solely to count usage and enforce the 5-request limit — it is not linked to your identity.
- Your IP address is logged as a secondary abuse-prevention measure. It is stored alongside the install ID in Google Cloud Firestore and is not used for any other purpose.
- Demo requests are processed by Google Gemini. The same provider privacy considerations described above apply.
- No text is stored or logged by the shared backend. Once the AI response is returned to your browser, nothing persists server-side.
- After your 5 demo requests are used, no further data is sent to the shared backend. Adding your own API key switches to direct API calls as described above.

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
