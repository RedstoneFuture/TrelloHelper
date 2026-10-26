"use strict";

// Default preferences used until stored preferences are loaded.
const DEFAULT_SETTINGS = Object.freeze({
  enabled: true,
  redirectCards: true,
  redirectBoards: true,
  otherPages: "browser", // Supported values: "browser" and "app".
  closeTabOnFocusLoss: true
});

// Delay briefly before closing a tab so Firefox window-focus transitions can settle.
const FOCUS_GRACE_MS = 300;

// Remove pending-close entries after this time to prevent stale tab IDs from lingering.
const PENDING_CLOSE_TTL_MS = 15000;

// ID used by the toolbar context-menu entry that opens the settings page.
const SETTINGS_MENU_ID = "trellohelper-open-settings";

// Holds the active preferences in memory for synchronous webRequest handling.
let settings = { ...DEFAULT_SETTINGS };

// Tracks the timer associated with each tab that may be closed after focus loss.
const pendingClose = new Map();

// Tracks the pending timer for a Firefox focus-loss event.
let focusLossTimer = null;

/**
 * Merge stored preferences with defaults and normalize each supported value.
 * @param {Object} raw - Preferences loaded from browser storage.
 * @returns {Object} A complete and normalized preference object.
 */
function normalizeSettings(raw = {}) {
  const normalized = { ...DEFAULT_SETTINGS, ...raw };
  normalized.enabled = Boolean(normalized.enabled);
  normalized.redirectCards = Boolean(normalized.redirectCards);
  normalized.redirectBoards = Boolean(normalized.redirectBoards);
  normalized.closeTabOnFocusLoss = Boolean(normalized.closeTabOnFocusLoss);
  normalized.otherPages = normalized.otherPages === "app" ? "app" : "browser";
  return normalized;
}

/**
 * Load preferences from local extension storage and refresh the toolbar indicator.
 */
async function loadSettings() {
  try {
    settings = normalizeSettings(await browser.storage.local.get(DEFAULT_SETTINGS));
  } catch (error) {
    console.error("TrelloHelper: Could not load settings.", error);
    settings = { ...DEFAULT_SETTINGS };
  }

  await updateToolbarState();
}

/**
 * Show the current redirect state on the toolbar button.
 */
async function updateToolbarState() {
  const enabled = settings.enabled;

  try {
    await browser.browserAction.setBadgeText({ text: enabled ? "ON" : "OFF" });
    await browser.browserAction.setBadgeBackgroundColor({
      color: enabled ? "#16803c" : "#6b7280"
    });
    await browser.browserAction.setTitle({
      title: enabled
        ? "TrelloHelper is ON — click to disable; right-click for settings"
        : "TrelloHelper is OFF — click to enable; right-click for settings"
    });
  } catch (error) {
    console.debug("TrelloHelper: Could not update the toolbar indicator.", error);
  }
}

/**
 * Clear a single tab's expiry timer and remove its pending-close entry.
 * @param {number} tabId - Firefox tab ID.
 */
function clearPendingClose(tabId) {
  const timer = pendingClose.get(tabId);
  if (timer !== undefined) {
    clearTimeout(timer);
    pendingClose.delete(tabId);
  }
}

/**
 * Clear all pending tab-close entries and any scheduled focus-loss check.
 */
function clearAllPendingClose() {
  for (const timer of pendingClose.values()) {
    clearTimeout(timer);
  }

  pendingClose.clear();

  if (focusLossTimer !== null) {
    clearTimeout(focusLossTimer);
    focusLossTimer = null;
  }
}

/**
 * Mark a redirected tab for closing after Firefox loses focus.
 * The entry automatically expires if no focus-loss event occurs in time.
 * @param {number} tabId - Firefox tab ID to mark.
 */
function markTabForClosing(tabId) {
  if (tabId < 0 || !settings.closeTabOnFocusLoss) return;

  clearPendingClose(tabId);

  const expiryTimer = setTimeout(() => {
    pendingClose.delete(tabId);
  }, PENDING_CLOSE_TTL_MS);

  pendingClose.set(tabId, expiryTimer);
}

/**
 * Classify a Trello URL as a card, board, or other Trello page.
 * @param {URL} url - Parsed URL to classify.
 * @returns {string|null} The page category, or null for unsupported URLs.
 */
function classifyTrelloUrl(url) {
  if (url.protocol !== "https:") return null;
  if (url.hostname !== "trello.com" && url.hostname !== "www.trello.com") return null;

  const pathParts = url.pathname.split("/").filter(Boolean);
  const firstPart = (pathParts[0] || "").toLowerCase();

  if (firstPart === "c") return "card";
  if (firstPart === "b") return "board";
  return "other";
}

/**
 * Decide whether a URL category should be sent to the desktop application.
 * @param {string} category - Trello page category.
 * @returns {boolean} True when the category should be redirected.
 */
function shouldRedirect(category) {
  if (!settings.enabled) return false;
  if (category === "card") return settings.redirectCards;
  if (category === "board") return settings.redirectBoards;
  return settings.otherPages === "app";
}

/**
 * Convert the web URL to the existing Trello protocol-handler URL format.
 * The path, query string, and fragment are preserved; only the scheme changes.
 * @param {string} originalUrl - Original HTTPS URL.
 * @returns {string} URL using the trello:// scheme.
 */
function buildAppUrl(originalUrl) {
  return originalUrl.replace(/^https:\/\//i, "trello://");
}

// Intercept top-level Trello navigations and redirect categories enabled by the user.
browser.webRequest.onBeforeRequest.addListener(
  (requestDetails) => {
    let url;

    try {
      url = new URL(requestDetails.url);
    } catch (error) {
      return {};
    }

    const category = classifyTrelloUrl(url);
    if (!category || !shouldRedirect(category)) return {};

    markTabForClosing(requestDetails.tabId);

    const appUrl = buildAppUrl(requestDetails.url);
    console.info("TrelloHelper redirect:", category, requestDetails.url, "->", appUrl);

    return { redirectUrl: appUrl };
  },
  {
    urls: ["https://trello.com/*", "https://www.trello.com/*"],
    types: ["main_frame"]
  },
  ["blocking"]
);

// Toggle automatic redirection when the user clicks the toolbar button.
browser.browserAction.onClicked.addListener(async () => {
  try {
    const latest = normalizeSettings(await browser.storage.local.get(DEFAULT_SETTINGS));
    await browser.storage.local.set({ enabled: !latest.enabled });
  } catch (error) {
    console.error("TrelloHelper: Could not toggle redirection.", error);
  }
});

// Create a toolbar context-menu entry for opening the detailed settings page.
browser.runtime.onInstalled.addListener(() => {
  browser.menus.create({
    id: SETTINGS_MENU_ID,
    title: "Open TrelloHelper settings…",
    contexts: ["browser_action"]
  });
});

// Open the options page when the settings context-menu entry is selected.
browser.menus.onClicked.addListener((info) => {
  if (info.menuItemId === SETTINGS_MENU_ID) {
    browser.runtime.openOptionsPage();
  }
});

// Keep the in-memory preferences synchronized with changes made on the options page.
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  const updated = {};
  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (changes[key]) updated[key] = changes[key].newValue;
  }
  if (Object.keys(updated).length === 0) return;

  settings = normalizeSettings({ ...settings, ...updated });
  updateToolbarState();

  // Cancel pending close operations when redirection or tab closing is disabled.
  if (!settings.enabled || !settings.closeTabOnFocusLoss) {
    clearAllPendingClose();
  }
});

// Close marked tabs only when Firefox has fully lost focus for the grace period.
browser.windows.onFocusChanged.addListener((windowId) => {
  if (focusLossTimer !== null) {
    clearTimeout(focusLossTimer);
    focusLossTimer = null;
  }

  if (!settings.closeTabOnFocusLoss || pendingClose.size === 0) return;

  // A focused Firefox window means the user may only be switching between Firefox windows.
  if (windowId !== browser.windows.WINDOW_ID_NONE) return;

  focusLossTimer = setTimeout(async () => {
    focusLossTimer = null;
    if (!settings.enabled || !settings.closeTabOnFocusLoss) return;

    const tabIds = Array.from(pendingClose.keys());
    for (const tabId of tabIds) {
      clearPendingClose(tabId);

      try {
        await browser.tabs.remove(tabId);
      } catch (error) {
        // The tab may already have been closed manually.
        console.debug("TrelloHelper: Tab was already closed or could not be removed.", tabId);
      }
    }
  }, FOCUS_GRACE_MS);
});

// Remove a tab from the pending-close list if it is closed by another action.
browser.tabs.onRemoved.addListener((tabId) => {
  clearPendingClose(tabId);
});

// Register event listeners before loading asynchronous settings.
loadSettings();
