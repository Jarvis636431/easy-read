import type { PlasmoCSConfig } from "plasmo"

import {
  readRules,
  readSettings,
  readThemes,
  resolveSettings,
  RULES_STORAGE_KEY,
  STORAGE_KEY,
  THEMES_STORAGE_KEY,
  type EasyReadSettings
} from "~lib/settings"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start"
}

const STYLE_ID = "easy-read-page-styles"
const ROOT_CLASS = "easy-read-active"

function themeStyles(settings: EasyReadSettings) {
  return `
    html.${ROOT_CLASS}, html.${ROOT_CLASS} body { background: ${settings.pageColor} !important; color: ${settings.textColor} !important; }
    html.${ROOT_CLASS} :is(main, article, [role="main"]) { background: ${settings.contentColor} !important; color: ${settings.textColor} !important; }
    html.${ROOT_CLASS} :is(main, article, [role="main"]) :is(p, li, blockquote, h1, h2, h3, h4, h5, h6, span):not([class*="icon"]) { color: inherit; }
    html.${ROOT_CLASS} :is(main, article, [role="main"]) :is(p, li, blockquote) { font-family: ${settings.fontFamily} !important; }
    html.${ROOT_CLASS} :is(main, article, [role="main"]) :is(h1, h2, h3, h4, h5, h6) { font-family: ${settings.headingFontFamily} !important; }
    html.${ROOT_CLASS} a { color: ${settings.linkColor} !important; }
    html.${ROOT_CLASS} img { filter: brightness(${settings.imageBrightness}); }
  `
}

function buildStyles(settings: EasyReadSettings) {
  const cleanup = [
    settings.hideAds &&
      `html.${ROOT_CLASS} :is([id*="advert" i], [class*="advert" i], [id*="sponsor" i], [class*="sponsor" i], [aria-label*="advert" i], iframe[src*="ad" i]) { display: none !important; }`,
    settings.hideSidebars &&
      `html.${ROOT_CLASS} :is(aside, [role="complementary"], [class*="sidebar" i], [id*="sidebar" i]) { display: none !important; }`
  ]
    .filter(Boolean)
    .join("\n")

  return `
    html.${ROOT_CLASS} :is(main, article, [role="main"]) {
      box-sizing: border-box !important;
      max-width: ${settings.contentWidth}px !important;
      margin-inline: auto !important;
      padding-inline: clamp(20px, 4vw, 56px) !important;
    }
    html.${ROOT_CLASS} :is(main, article, [role="main"]) :is(p, li, blockquote) {
      font-size: ${settings.fontSize}px !important;
      line-height: ${settings.lineHeight} !important;
    }
    html.${ROOT_CLASS} :is(main, article, [role="main"]) img,
    html.${ROOT_CLASS} :is(main, article, [role="main"]) video { max-width: 100% !important; height: auto !important; }
    ${themeStyles(settings)}
    ${cleanup}
  `
}

function applySettings(settings: EasyReadSettings) {
  document.documentElement.classList.toggle(ROOT_CLASS, settings.enabled)
  document.getElementById(STYLE_ID)?.remove()

  if (!settings.enabled) return

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = buildStyles(settings)
  ;(document.head ?? document.documentElement).appendChild(style)
}

async function refreshSettings() {
  const [settings, rules, themes] = await Promise.all([
    readSettings(),
    readRules(),
    readThemes()
  ])
  applySettings(resolveSettings(location.href, settings, rules, themes))
}

void refreshSettings()

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    (changes[STORAGE_KEY] ||
      changes[RULES_STORAGE_KEY] ||
      changes[THEMES_STORAGE_KEY])
  ) {
    void refreshSettings()
  }
})
