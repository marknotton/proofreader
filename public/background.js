// ── Context menu lifecycle ──

function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Read style names from storage (synced by the panel)
    chrome.storage.local.get("styleNames", (result) => {
      const names = result.styleNames
      const styles = Array.isArray(names) && names.length > 0
        ? names
        : ["Grammar Only"]

      // Top-level parent
      chrome.contextMenus.create({
        id: "proofreader-root",
        title: "Proofreader",
        contexts: ["selection", "editable"],
      })

      // ── "Proofread" group ──
      chrome.contextMenus.create({
        id: "proofread-header",
        parentId: "proofreader-root",
        title: "Proofread",
        enabled: false,
        contexts: ["selection", "editable"],
      })

      styles.forEach((name) => {
        chrome.contextMenus.create({
          id: `proofread__${name}`,
          parentId: "proofreader-root",
          title: name,
          contexts: ["selection", "editable"],
        })
      })

      // ── Separator + "Proofread and Replace" group (editable only) ──
      chrome.contextMenus.create({
        id: "separator",
        parentId: "proofreader-root",
        type: "separator",
        contexts: ["editable"],
      })

      chrome.contextMenus.create({
        id: "replace-header",
        parentId: "proofreader-root",
        title: "Proofread and Replace",
        enabled: false,
        contexts: ["editable"],
      })

      styles.forEach((name) => {
        chrome.contextMenus.create({
          id: `replace__${name}`,
          parentId: "proofreader-root",
          title: name,
          contexts: ["editable"],
        })
      })
    })
  })
}

function removeContextMenus() {
  chrome.contextMenus.removeAll()
}

function syncContextMenus() {
  chrome.storage.local.get("contextMenuEnabled", (result) => {
    if (result.contextMenuEnabled === true) {
      createContextMenus()
    } else {
      removeContextMenus()
    }
  })
}

chrome.runtime.onInstalled.addListener((details) => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  syncContextMenus()

  // Open the welcome/onboarding page on first install
  if (details.reason === "install") {
    chrome.tabs.create({ url: chrome.runtime.getURL("welcome.html") })
  }
})

chrome.runtime.onStartup.addListener(() => {
  syncContextMenus()
})

// Rebuild menus when settings or styles change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return
  if ("contextMenuEnabled" in changes || "styleNames" in changes) {
    syncContextMenus()
  }
})

// ── Context menu click ──

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) return

  const id = String(info.menuItemId)
  let mode = ""
  let styleName = ""

  if (id.startsWith("proofread__")) {
    mode = "proofread"
    styleName = id.slice("proofread__".length)
  } else if (id.startsWith("replace__")) {
    mode = "replace"
    styleName = id.slice("replace__".length)
  } else {
    return // header or separator clicked
  }

  const tabId = tab.id

  // MUST be the very first async call — Chrome enforces user gesture for sidePanel.open
  chrome.sidePanel.open({ tabId }).then(() => {
    chrome.tabs.sendMessage(tabId, { type: "GET_TEXT" })
      .then((res) => res?.text?.trim() || (info.selectionText || "").trim())
      .catch(() => (info.selectionText || "").trim())
      .then((text) => {
        chrome.storage.session.set({
          pendingTask: {
            text,
            mode,
            styleName,
            tabId,
            ts: Date.now(),
          },
        })
      })
  })
})

// ── Relay replace result from panel → content script ──

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "REPLACE_TEXT" && message.tabId) {
    chrome.tabs.sendMessage(message.tabId, {
      type: "REPLACE_TEXT",
      text: message.text,
    })
      .then((res) => sendResponse(res || { ok: false, error: "No response from page" }))
      .catch(() => sendResponse({ ok: false, error: "Could not reach the page" }))
    return true
  }
})
