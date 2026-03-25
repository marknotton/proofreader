# Proofreader

A lightweight Chrome sidebar extension for proofreading and rewriting text, powered by Google's Gemini API.

Built as a personal tool for quick text cleanup — grammar fixes, tone adjustments, and commit message formatting — without leaving the browser.

## Why

Most AI writing tools are either bloated web apps or overpriced subscriptions for something that should be simple. This extension runs entirely in Chrome's sidebar panel, calls Gemini's free tier directly, and does one thing well: takes rough text in, gives polished text back.

No accounts. No servers. No middlemen. Your API key stays in your browser.

## How it works

Paste or type text into the sidebar, pick a style, and hit Proofread. The response streams back in real time. If the output contains code blocks, each one gets its own copy button.

A thinking slider lets you trade speed for quality per request. Grammar fixes run with zero thinking (near-instant). Commit summaries get a bigger budget for restructuring and categorisation.

## Styles

Styles are defined as a simple array in `src/lib/styles.ts`. Each one has a name, a prompt, and an optional thinking budget. Add, remove, or reorder them to suit your workflow.

The defaults:

- **Grammar Only** — Fixes spelling, grammar, and punctuation. Doesn't touch tone or wording. Fastest.
- **Casual** — Rewrites in a friendly, conversational tone without being over the top.
- **Neutral** — Restructures commit messages into categorised summaries with grouped output.
- **Formal** — Polished, professional rewrite.
- **Commits** — Parses rough commit messages into categorised, formatted summaries with commit links.

## Setup

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/apikey)
2. Install dependencies and build:
   ```
   npm install
   npm run build
   ```
3. In Chrome, go to `chrome://extensions`, enable Developer Mode
4. Click "Load unpacked" and select the `extension/` folder
5. Click the extension icon — the sidebar opens and prompts for your API key on first launch

## Stack

Vite, React, TypeScript, Tailwind CSS, shadcn/ui components, and the Gemini REST API. No backend, no build server, no external dependencies at runtime.

## Author

Mark Notton