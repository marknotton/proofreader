// Register context menu items and open side panel on action click
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })

  chrome.contextMenus.create({
    id: "proofread",
    title: "Proofread",
    contexts: ["selection", "editable"],
  })

  chrome.contextMenus.create({
    id: "proofread-replace",
    title: "Proofread and Replace",
    contexts: ["selection", "editable"],
  })
})

// When a context menu item is clicked:
// IMPORTANT: sidePanel.open() must be called synchronously (no awaits before it)
// or Chrome won't consider it a user gesture.
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return

  const tabId = tab.id
  const mode = info.menuItemId === "proofread-replace" ? "replace" : "proofread"

  // Open the panel FIRST — must be the first async call to stay in user gesture context
  chrome.sidePanel.open({ tabId }).then(() => {
    // Now grab text from the content script
    chrome.tabs.sendMessage(tabId, { type: "GET_TEXT" })
      .then((response) => response?.text || "")
      .catch(() => info.selectionText || "")
      .then((text) => {
        if (!text.trim()) {
          chrome.runtime.sendMessage({ type: "CONTEXT_MENU_EMPTY" }).catch(() => {})
          return
        }

        // Small delay to make sure the panel is ready to receive messages
        setTimeout(() => {
          chrome.runtime.sendMessage({
            type: "CONTEXT_MENU_TEXT",
            text,
            mode,
            tabId,
          }).catch(() => {})
        }, 300)
      })
  })
})

// Relay "replace" results back from the side panel to the content script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REPLACE_TEXT" && message.tabId) {
    chrome.tabs.sendMessage(message.tabId, {
      type: "REPLACE_TEXT",
      text: message.text,
    }).then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }))
    return true // async response
  }
})
