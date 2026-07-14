import type { PlasmoCSConfig } from "plasmo"

import {
  readRules,
  readSettings,
  resolveSettings,
  RULES_STORAGE_KEY,
  STORAGE_KEY,
  type EasyReadSettings
} from "~lib/settings"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start"
}

const STYLE_ID = "easy-read-page-styles"
const ROOT_CLASS = "easy-read-active"

function themeStyles(settings: EasyReadSettings) {
  if (settings.mode === "night") {
    return `
      html.${ROOT_CLASS}, html.${ROOT_CLASS} body { background: #111820 !important; color: #dce4e8 !important; color-scheme: dark !important; }
      html.${ROOT_CLASS} :is(main, article, [role="main"]) { background: #17212a !important; color: #dce4e8 !important; }
      html.${ROOT_CLASS} :is(p, li, blockquote, h1, h2, h3, h4, h5, h6, span):not([class*="icon"]) { color: inherit; }
      html.${ROOT_CLASS} a { color: #8fc9e8 !important; }
      html.${ROOT_CLASS} img { filter: brightness(.82) contrast(.96); }
    `
  }

  if (settings.mode === "comfortable") {
    return `
      html.${ROOT_CLASS}, html.${ROOT_CLASS} body { background: #f3f0e7 !important; color: #2b3437 !important; }
      html.${ROOT_CLASS} :is(main, article, [role="main"]) { background: #fbfaf5 !important; color: #2b3437 !important; }
      html.${ROOT_CLASS} a { color: #176b78 !important; }
    `
  }

  return `
    html.${ROOT_CLASS}, html.${ROOT_CLASS} body { background: #eef1f2 !important; color: #202a30 !important; }
    html.${ROOT_CLASS} :is(main, article, [role="main"]) { background: #ffffff !important; color: #202a30 !important; }
    html.${ROOT_CLASS} :is(header, footer) { opacity: .38 !important; transition: opacity .2s ease !important; }
    html.${ROOT_CLASS} :is(header, footer):hover { opacity: 1 !important; }
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
  const [settings, rules] = await Promise.all([readSettings(), readRules()])
  applySettings(resolveSettings(location.href, settings, rules))
}

void refreshSettings()

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    (changes[STORAGE_KEY] || changes[RULES_STORAGE_KEY])
  ) {
    void refreshSettings()
  }
})
