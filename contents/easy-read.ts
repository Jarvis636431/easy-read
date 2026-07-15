import type { PlasmoCSConfig } from "plasmo"

import { analyzeDocument, checkLayoutHealth } from "~lib/layout"
import {
  EXTENSION_ENABLED_STORAGE_KEY,
  findMatchingRule,
  readExtensionEnabled,
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
const REGION_ATTRIBUTE = "data-easy-read-region"
const LAYOUT_ATTRIBUTE = "data-easy-read-layout"

const AD_SELECTORS = [
  "ins.adsbygoogle",
  "[data-ad]",
  "[data-ad-slot]",
  "[data-ad-unit]",
  "[data-ad-container]",
  '[data-testid="ad"]',
  '[data-testid^="ad-"]',
  '[data-testid*="advert"]',
  '[aria-label="Advertisement" i]',
  '[aria-label="Sponsored" i]',
  '[id^="google_ads_"]',
  '[id^="div-gpt-ad"]',
  '[id^="ad-container"]',
  '[id$="-ad-container"]',
  '[class~="ad"]',
  '[class~="ads"]',
  '[class~="advert"]',
  '[class*="ad-container" i]',
  '[class*="ad-wrapper" i]',
  '[class*="advertisement" i]',
  '[class*="sponsored-content" i]',
  '[class*="sponsor-block" i]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="googleadservices.com"]',
  'iframe[title*="advertisement" i]'
]

function themeStyles(settings: EasyReadSettings) {
  return `
    html.${ROOT_CLASS}, html.${ROOT_CLASS} body { background: ${settings.pageColor} !important; color: ${settings.textColor} !important; }
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}], main, article, [role="main"]) { color: ${settings.textColor} !important; }
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}="content"], main, article, [role="main"]) { background: ${settings.contentColor} !important; }
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}], main, article, [role="main"]) :is(p, li, blockquote, h1, h2, h3, h4, h5, h6, span):not([class*="icon"]) { color: inherit; }
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}], main, article, [role="main"]) :is(p, li, blockquote) { font-family: ${settings.fontFamily} !important; }
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}], main, article, [role="main"]) :is(h1, h2, h3, h4, h5, h6) { font-family: ${settings.headingFontFamily} !important; }
    html.${ROOT_CLASS} a { color: ${settings.linkColor} !important; }
    html.${ROOT_CLASS} img { filter: brightness(${settings.imageBrightness}); }
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="header"],
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="navigation"],
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="sidebar"],
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="comments"],
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="footer"] { border-color: color-mix(in srgb, ${settings.textColor} 16%, transparent) !important; }
  `
}

function buildStyles(
  settings: EasyReadSettings,
  customHideSelectors: string[] = []
) {
  const adSelectors = [...AD_SELECTORS, ...customHideSelectors].join(",\n")
  const cleanup = [
    settings.hideAds &&
      `html.${ROOT_CLASS} :is(${adSelectors}) { display: none !important; visibility: hidden !important; }`,
    settings.hideSidebars &&
      `html.${ROOT_CLASS} :is(aside, [role="complementary"], [class*="sidebar" i], [id*="sidebar" i]) { display: none !important; }`
  ]
    .filter(Boolean)
    .join("\n")

  return `
    html.${ROOT_CLASS}:not([${LAYOUT_ATTRIBUTE}="preserve"]) :is([${REGION_ATTRIBUTE}="content"], main, article, [role="main"]) {
      box-sizing: border-box !important;
      max-width: ${settings.contentWidth}px !important;
      margin-inline: auto !important;
      padding-inline: clamp(20px, 4vw, 56px) !important;
    }
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}="content"], main, article, [role="main"]) :is(p, li, blockquote) {
      font-size: ${settings.fontSize}px !important;
      line-height: ${settings.lineHeight} !important;
    }
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}="content"], main, article, [role="main"]) img,
    html.${ROOT_CLASS} :is([${REGION_ATTRIBUTE}="content"], main, article, [role="main"]) video { max-width: 100% !important; height: auto !important; }
    html.${ROOT_CLASS}[${LAYOUT_ATTRIBUTE}="balanced"] [${REGION_ATTRIBUTE}="sidebar"] { box-sizing: border-box !important; max-width: min(360px, 32vw) !important; }
    html.${ROOT_CLASS}[${LAYOUT_ATTRIBUTE}="single-column"] :is([${REGION_ATTRIBUTE}="content"], [${REGION_ATTRIBUTE}="sidebar"], [${REGION_ATTRIBUTE}="comments"]) { box-sizing: border-box !important; width: min(${settings.contentWidth}px, calc(100% - 40px)) !important; max-width: none !important; margin-inline: auto !important; position: static !important; float: none !important; }
    ${themeStyles(settings)}
    ${cleanup}
  `
}

function applySettings(
  settings: EasyReadSettings,
  customHideSelectors: string[] = [],
  extensionEnabled = false
) {
  const shouldApply = extensionEnabled && settings.mode !== "native"
  document.documentElement.classList.toggle(ROOT_CLASS, shouldApply)
  document.getElementById(STYLE_ID)?.remove()

  if (!shouldApply) return

  const style = document.createElement("style")
  style.id = STYLE_ID
  style.textContent = buildStyles(settings, customHideSelectors)
  ;(document.head ?? document.documentElement).appendChild(style)
}

function clearLayoutMarkers() {
  document.documentElement.removeAttribute(LAYOUT_ATTRIBUTE)
  document.querySelectorAll(`[${REGION_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(REGION_ATTRIBUTE)
  })
}

function applyLayoutRule(rule = analyzeDocument()) {
  clearLayoutMarkers()
  const health = checkLayoutHealth(rule)
  if (!health.valid) return health

  for (const [region, selector] of Object.entries(rule.regions)) {
    try {
      document.querySelectorAll(selector).forEach((element) => {
        element.setAttribute(REGION_ATTRIBUTE, region)
      })
    } catch {
      // Invalid selectors are reported by the health check and skipped here.
    }
  }
  document.documentElement.setAttribute(LAYOUT_ATTRIBUTE, rule.strategy)
  return health
}

async function refreshSettings() {
  const [settings, rules, themes, extensionEnabled] = await Promise.all([
    readSettings(),
    readRules(),
    readThemes(),
    readExtensionEnabled()
  ])
  const rule = findMatchingRule(location.href, rules)
  const resolvedSettings = resolveSettings(
    location.href,
    settings,
    rules,
    themes
  )
  if (extensionEnabled && resolvedSettings.mode !== "native") {
    const savedLayout = rule?.layout
    const savedHealth = checkLayoutHealth(savedLayout)
    const layout = savedHealth.valid ? savedLayout : analyzeDocument()
    applyLayoutRule(layout)
  } else {
    clearLayoutMarkers()
  }
  applySettings(
    resolvedSettings,
    parseCustomSelectors(rule?.customHideSelectors),
    extensionEnabled
  )
}

function parseCustomSelectors(value = "") {
  return value
    .split("\n")
    .map((selector) => selector.trim())
    .filter((selector) => {
      if (!selector || /[{};]/.test(selector)) return false
      try {
        document.querySelector(selector)
        return true
      } catch {
        return false
      }
    })
}

function refreshWhenReady() {
  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      () => void refreshSettings(),
      {
        once: true
      }
    )
  } else {
    void refreshSettings()
  }
}

refreshWhenReady()

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "easy-read:analyze-layout") return
  const layout = analyzeDocument()
  const health = checkLayoutHealth(layout)
  sendResponse({ layout, health })
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    (changes[STORAGE_KEY] ||
      changes[RULES_STORAGE_KEY] ||
      changes[THEMES_STORAGE_KEY] ||
      changes[EXTENSION_ENABLED_STORAGE_KEY])
  ) {
    void refreshSettings()
  }
})
