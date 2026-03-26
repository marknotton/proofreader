// ── Element tracking ──
// Pin the editable element at right-click time so it survives the user
// clicking elsewhere while the AI is thinking.

let pinnedElement = null

document.addEventListener("contextmenu", (e) => {
  pinnedElement = findEditable(e.target)
}, true)

// ── Message handlers ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_TEXT") {
    sendResponse({ text: getTextFromContext() })
    return true
  }

  if (message.type === "REPLACE_TEXT") {
    const result = replaceInPinnedElement(message.text)
    sendResponse(result)
    return true
  }
})

// ── Text extraction ──

function getTextFromContext() {
  // 1. Selected text — works inside and outside inputs
  const selection = window.getSelection()?.toString()?.trim()
  if (selection) return selection

  // 2. Pinned editable element's value
  if (pinnedElement && document.contains(pinnedElement)) {
    return readValue(pinnedElement)
  }

  // 3. Active element fallback
  const active = document.activeElement
  if (active) {
    const val = readValue(active)
    if (val) return val
  }

  return ""
}

// ── Replace (multi-strategy, borrowed from battle-tested extensions) ──

function replaceInPinnedElement(text) {
  if (!pinnedElement) {
    return { ok: false, error: "No element was tracked from the original right-click" }
  }

  if (!document.contains(pinnedElement)) {
    pinnedElement = null
    return { ok: false, error: "The original element is no longer on the page" }
  }

  const el = pinnedElement

  // Re-focus the element before attempting insertion
  try { el.focus() } catch {}

  // ── Strategy 1: execCommand (best compat with React/Vue/rich editors) ──
  if (tryExecCommand(el, text)) return { ok: true, method: "execCommand" }

  // ── Strategy 2: Direct value set (standard inputs / textareas) ──
  if (tryDirectValue(el, text)) return { ok: true, method: "direct" }

  // ── Strategy 3: contentEditable ──
  if (tryContentEditable(el, text)) return { ok: true, method: "contentEditable" }

  return { ok: false, error: "Could not write to the element" }
}

// ── Insertion strategies ──

function tryExecCommand(el, text) {
  try {
    el.focus()

    // Select all existing content so insertText replaces it
    if (typeof el.select === "function") {
      el.select()
    } else if (el.isContentEditable) {
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }

    const ok = document.execCommand("insertText", false, text)
    if (ok) {
      fireEvents(el)
      return true
    }
  } catch {}
  return false
}

function tryDirectValue(el, text) {
  try {
    if (typeof el.value === "undefined") return false

    // Use native setter to bypass React/Vue property interception
    const proto = el.tagName === "TEXTAREA"
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set

    if (setter) {
      setter.call(el, text)
    } else {
      el.value = text
    }

    fireEvents(el)
    return true
  } catch {}
  return false
}

function tryContentEditable(el, text) {
  try {
    if (!el.isContentEditable && el.contentEditable !== "true") return false

    const sel = window.getSelection()
    if (sel.rangeCount > 0) {
      const range = document.createRange()
      range.selectNodeContents(el)
      sel.removeAllRanges()
      sel.addRange(range)
      range.deleteContents()

      const textNode = document.createTextNode(text)
      range.insertNode(textNode)
      range.setStartAfter(textNode)
      range.setEndAfter(textNode)
      sel.removeAllRanges()
      sel.addRange(range)
    } else {
      el.innerText = text
    }

    fireEvents(el)
    return true
  } catch {}
  return false
}

/** Fire a full set of events so frameworks pick up the change */
function fireEvents(el) {
  for (const type of ["input", "change", "keyup"]) {
    el.dispatchEvent(new Event(type, { bubbles: true }))
  }
}

// ── Helpers ──

function findEditable(el) {
  if (!el) return null

  if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && isTextInput(el))) {
    return el
  }
  if (el.isContentEditable) return el

  const ce = el.closest("[contenteditable='true'], [contenteditable='']")
  if (ce) return ce

  const ta = el.closest("textarea")
  if (ta) return ta

  return el
}

function readValue(el) {
  if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && isTextInput(el))) {
    return el.value || ""
  }
  if (el.isContentEditable || el.contentEditable === "true") {
    return el.innerText || ""
  }
  return ""
}

function isTextInput(el) {
  const textTypes = ["text", "search", "url", "tel", "email", ""]
  return textTypes.includes((el.type || "").toLowerCase())
}
