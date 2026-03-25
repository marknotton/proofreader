// Track the last right-clicked element so we know which input to read/replace
let lastRightClickedElement = null

document.addEventListener("contextmenu", (e) => {
  lastRightClickedElement = e.target
}, true)

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "GET_TEXT") {
    const text = getTextFromContext()
    sendResponse({ text })
    return
  }

  if (message.type === "REPLACE_TEXT") {
    replaceText(message.text)
    sendResponse({ ok: true })
    return
  }
})

/**
 * Get text from the current context:
 * 1. If there's a selection anywhere, use that
 * 2. If the right-clicked element is an input/textarea/contenteditable, grab its value
 */
function getTextFromContext() {
  // Check for selected text first — works inside and outside inputs
  const selection = window.getSelection()?.toString()?.trim()
  if (selection) return selection

  // No selection — try to get value from the right-clicked element
  if (lastRightClickedElement) {
    const el = lastRightClickedElement

    // Standard input/textarea
    if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && isTextInput(el))) {
      return el.value || ""
    }

    // contenteditable elements
    if (el.isContentEditable) {
      return el.innerText || ""
    }

    // Sometimes the right-click target is a child of the editable element
    const editable = el.closest("[contenteditable='true'], [contenteditable='']")
    if (editable) {
      return editable.innerText || ""
    }
  }

  return ""
}

/**
 * Replace text in the last right-clicked element.
 * Handles input/textarea and contenteditable.
 */
function replaceText(text) {
  if (!lastRightClickedElement) return

  const el = lastRightClickedElement

  // Standard input/textarea
  if (el.tagName === "TEXTAREA" || (el.tagName === "INPUT" && isTextInput(el))) {
    // Use native input setter to trigger React/Vue/etc. change detection
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
      "value"
    )?.set
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(el, text)
    } else {
      el.value = text
    }
    el.dispatchEvent(new Event("input", { bubbles: true }))
    el.dispatchEvent(new Event("change", { bubbles: true }))
    return
  }

  // contenteditable
  if (el.isContentEditable) {
    el.innerText = text
    el.dispatchEvent(new Event("input", { bubbles: true }))
    return
  }

  const editable = el.closest("[contenteditable='true'], [contenteditable='']")
  if (editable) {
    editable.innerText = text
    editable.dispatchEvent(new Event("input", { bubbles: true }))
  }
}

/** Check if an <input> is a text-like type */
function isTextInput(el) {
  const textTypes = ["text", "search", "url", "tel", "email", ""]
  return textTypes.includes((el.type || "").toLowerCase())
}
