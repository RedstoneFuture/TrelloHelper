"use strict";

// Default preferences used when no saved values are available.
const DEFAULT_SETTINGS = {
  enabled: true,
  redirectCards: true,
  redirectBoards: true,
  otherPages: "browser",
  closeTabOnFocusLoss: true
};

// IDs of all controls whose values are persisted in extension storage.
const fields = [
  "enabled",
  "redirectCards",
  "redirectBoards",
  "otherPages",
  "closeTabOnFocusLoss"
];

/**
 * Apply defaults and normalize saved values before using them in the UI.
 * @param {Object} raw - Raw preferences returned by browser.storage.local.
 * @returns {Object} A complete preferences object with supported values.
 */
function normalizeSettings(raw = {}) {
  const value = { ...DEFAULT_SETTINGS, ...raw };
  value.enabled = Boolean(value.enabled);
  value.redirectCards = Boolean(value.redirectCards);
  value.redirectBoards = Boolean(value.redirectBoards);
  value.closeTabOnFocusLoss = Boolean(value.closeTabOnFocusLoss);
  value.otherPages = value.otherPages === "app" ? "app" : "browser";
  return value;
}

/**
 * Read the current values from all settings controls.
 * @returns {Object} The preferences represented by the UI controls.
 */
function readControls() {
  return {
    enabled: document.getElementById("enabled").checked,
    redirectCards: document.getElementById("redirectCards").checked,
    redirectBoards: document.getElementById("redirectBoards").checked,
    otherPages: document.getElementById("otherPages").value,
    closeTabOnFocusLoss: document.getElementById("closeTabOnFocusLoss").checked
  };
}

/**
 * Populate the settings controls from a preferences object.
 * @param {Object} value - Normalized preferences to display.
 */
function populateControls(value) {
  document.getElementById("enabled").checked = value.enabled;
  document.getElementById("redirectCards").checked = value.redirectCards;
  document.getElementById("redirectBoards").checked = value.redirectBoards;
  document.getElementById("otherPages").value = value.otherPages;
  document.getElementById("closeTabOnFocusLoss").checked = value.closeTabOnFocusLoss;
  updateEnabledBadge(value.enabled);
  updateCloseTabBadge(value.closeTabOnFocusLoss);
}

/**
 * Update the status badge so the global redirect state is visible at a glance.
 * @param {boolean} enabled - Whether automatic redirection is enabled.
 */
function updateEnabledBadge(enabled) {
  const badge = document.getElementById("enabledBadge");
  badge.textContent = enabled ? "Enabled" : "Paused";
  badge.classList.toggle("off", !enabled);
}

/**
 * Update the status badge for the tab-closing preference.
 * @param {boolean} enabled - Whether focus-based tab closing is enabled.
 */
function updateCloseTabBadge(enabled) {
  const badge = document.getElementById("closeTabBadge");
  badge.textContent = enabled ? "Enabled" : "Disabled";
  badge.classList.toggle("off", !enabled);
}

/**
 * Show an accessible save-status message beneath the settings controls.
 * @param {string} message - Message to display.
 * @param {boolean} isError - Whether the message indicates a failure.
 */
function showStatus(message, isError = false) {
  const status = document.getElementById("saveStatus");
  status.textContent = message;
  status.style.color = isError ? "#c9372c" : "";
}

/**
 * Save the current UI values to local extension storage.
 */
async function saveSettings() {
  try {
    const value = normalizeSettings(readControls());
    await browser.storage.local.set(value);
    updateEnabledBadge(value.enabled);
    updateCloseTabBadge(value.closeTabOnFocusLoss);
    showStatus("Changes saved.");
  } catch (error) {
    console.error("TrelloHelper: Could not save settings.", error);
    showStatus("Could not save settings. Please try again.", true);
  }
}

/**
 * Load saved preferences into the options page, falling back to defaults on error.
 */
async function loadSettings() {
  try {
    const value = normalizeSettings(await browser.storage.local.get(DEFAULT_SETTINGS));
    populateControls(value);
  } catch (error) {
    console.error("TrelloHelper: Could not load settings.", error);
    populateControls(DEFAULT_SETTINGS);
    showStatus("Could not load settings.", true);
  }
}

// Wire each control to automatic saving and restore the defaults on request.
document.addEventListener("DOMContentLoaded", () => {
  for (const id of fields) {
    document.getElementById(id).addEventListener("change", saveSettings);
  }

  document.getElementById("resetButton").addEventListener("click", async () => {
    populateControls(DEFAULT_SETTINGS);
    await saveSettings();
  });

  loadSettings();
});
