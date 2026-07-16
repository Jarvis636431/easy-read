import type { PlasmoCSConfig } from "plasmo"

import {
  analyzeDocument,
  checkLayoutHealth,
  createDomSummary
} from "~lib/layout"
import {
  ACTIVE_SHARE_TEMPLATE_STORAGE_KEY,
  builtinLayoutTemplates,
  EXTENSION_ENABLED_STORAGE_KEY,
  findMatchingRule,
  readActiveShareTemplateId,
  readExtensionEnabled,
  readRules,
  readSettings,
  readShareTemplates,
  readThemes,
  resolveSettings,
  RULES_STORAGE_KEY,
  SHARE_TEMPLATES_STORAGE_KEY,
  STORAGE_KEY,
  THEMES_STORAGE_KEY,
  writeRules,
  type EasyReadSettings,
  type LayoutRegion,
  type ShareCardTemplate,
  type SiteLayoutRule,
  type UrlRule
} from "~lib/settings"
import { copyShareCard } from "~lib/share-card"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start"
}

const STYLE_ID = "easy-read-page-styles"
const ROOT_CLASS = "easy-read-active"
const REGION_ATTRIBUTE = "data-easy-read-region"
const LAYOUT_ATTRIBUTE = "data-easy-read-layout"
const LAYOUT_SHELL_ID = "easy-read-layout-shell"
const TEMPLATED_CLASS = "easy-read-templated"
const PREVIEW_HOST_ID = "easy-read-layout-preview"
const PREVIEW_STYLE_ID = "easy-read-layout-preview-styles"
const PREVIEW_CLASS = "easy-read-layout-previewing"
const SHARE_HOST_ID = "easy-read-share-selection"

let currentSettings: EasyReadSettings | null = null
let currentShareTemplate: ShareCardTemplate | null = null
let sharingEnabled = false
let movedLayoutNodes: Array<{ node: Element; placeholder: Comment }> = []

const REGION_LABELS: Record<LayoutRegion, string> = {
  header: "页头",
  navigation: "导航",
  content: "正文",
  sidebar: "侧栏",
  comments: "评论",
  footer: "页脚"
}

const REGION_COLORS: Record<LayoutRegion, string> = {
  header: "#547a91",
  navigation: "#805da3",
  content: "#168678",
  sidebar: "#c27632",
  comments: "#a34f6f",
  footer: "#657078"
}

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
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}] { color: ${settings.textColor} !important; }
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="content"] { background: ${settings.contentColor} !important; }
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}] :is(p, li, blockquote, h1, h2, h3, h4, h5, h6, span):not([class*="icon"]) { color: inherit; }
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}] :is(p, li, blockquote) { font-family: ${settings.fontFamily} !important; }
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}] :is(h1, h2, h3, h4, h5, h6) { font-family: ${settings.headingFontFamily} !important; }
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
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="content"] {
      box-sizing: border-box !important;
      max-width: ${settings.contentWidth}px !important;
      margin-inline: auto !important;
      padding-inline: clamp(20px, 4vw, 56px) !important;
    }
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="content"] :is(p, li, blockquote) {
      font-size: ${settings.fontSize}px !important;
      line-height: ${settings.lineHeight} !important;
    }
    html.${ROOT_CLASS} [${REGION_ATTRIBUTE}="content"] :is(img, video) { max-width: 100% !important; height: auto !important; }
    html.${TEMPLATED_CLASS} body > *:not(#${LAYOUT_SHELL_ID}) { display: none !important; }
    html.${TEMPLATED_CLASS} body > #${LAYOUT_SHELL_ID} { display: grid !important; }
    #${LAYOUT_SHELL_ID} { box-sizing: border-box !important; width: min(100% - 32px, 1400px) !important; min-height: 100vh !important; margin: 0 auto !important; padding: 18px 0 56px !important; gap: 18px !important; color: ${settings.textColor} !important; background: ${settings.pageColor} !important; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot] { min-width: 0 !important; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot] > [${REGION_ATTRIBUTE}] { box-sizing: border-box !important; position: static !important; inset: auto !important; float: none !important; width: 100% !important; max-width: none !important; margin: 0 !important; transform: none !important; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot="header"] { grid-area: header; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot="navigation"] { grid-area: navigation; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot="content"] { grid-area: content; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot="sidebar"] { grid-area: sidebar; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot="comments"] { grid-area: comments; }
    #${LAYOUT_SHELL_ID} [data-easy-read-slot="footer"] { grid-area: footer; }
    #${LAYOUT_SHELL_ID}[data-template="article"] { width: min(100% - 32px, ${settings.contentWidth + 120}px) !important; grid-template-columns: minmax(0, 1fr); grid-template-areas: "header" "navigation" "content" "comments" "sidebar" "footer"; }
    #${LAYOUT_SHELL_ID}[data-template="documentation"] { grid-template-columns: minmax(210px, 280px) minmax(0, 1fr); grid-template-areas: "header header" "navigation content" "sidebar content" ". comments" "footer footer"; align-items: start; }
    #${LAYOUT_SHELL_ID}[data-template="documentation"] [data-easy-read-slot="navigation"] { position: sticky !important; top: 18px !important; max-height: calc(100vh - 36px) !important; overflow: auto !important; }
    #${LAYOUT_SHELL_ID}[data-template="forum"] { width: min(100% - 32px, 1040px) !important; grid-template-columns: minmax(0, 1fr); grid-template-areas: "header" "navigation" "content" "comments" "sidebar" "footer"; }
    #${LAYOUT_SHELL_ID}[data-template="wide"] { grid-template-columns: minmax(0, 1fr) minmax(260px, 360px); grid-template-areas: "header header" "navigation navigation" "content sidebar" "comments sidebar" "footer footer"; align-items: start; }
    @media (max-width: 820px) { #${LAYOUT_SHELL_ID}[data-template] { width: min(100% - 20px, ${settings.contentWidth}px) !important; grid-template-columns: minmax(0, 1fr) !important; grid-template-areas: "header" "navigation" "content" "sidebar" "comments" "footer" !important; } #${LAYOUT_SHELL_ID}[data-template="documentation"] [data-easy-read-slot="navigation"] { position: static !important; max-height: none !important; } }
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

function restoreLayoutTemplate() {
  for (const { node, placeholder } of [...movedLayoutNodes].reverse()) {
    if (placeholder.parentNode) {
      placeholder.parentNode.insertBefore(node, placeholder)
      placeholder.remove()
    } else {
      document.body?.appendChild(node)
    }
  }
  movedLayoutNodes = []
  document.getElementById(LAYOUT_SHELL_ID)?.remove()
  document.documentElement.classList.remove(TEMPLATED_CLASS)
}

function clearLayoutMarkers() {
  restoreLayoutTemplate()
  document.documentElement.removeAttribute(LAYOUT_ATTRIBUTE)
  document.querySelectorAll(`[${REGION_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(REGION_ATTRIBUTE)
  })
}

function mountLayoutTemplate(rule: SiteLayoutRule) {
  if (rule.templateId === "preserve" || !document.body) return
  const selected = (Object.keys(rule.regions) as LayoutRegion[]).flatMap(
    (region) => {
      const element = document.querySelector(rule.regions[region]!)
      return element ? [{ region, element }] : []
    }
  )
  const unique = selected.filter(
    ({ element }, index) =>
      selected.findIndex((item) => item.element === element) === index
  )
  if (!unique.some((item) => item.region === "content")) return

  const shell = document.createElement("div")
  shell.id = LAYOUT_SHELL_ID
  shell.dataset.template = rule.templateId
  for (const { region, element } of unique) {
    const placeholder = document.createComment(`easy-read:${region}`)
    element.parentNode?.insertBefore(placeholder, element)
    movedLayoutNodes.push({ node: element, placeholder })
    let slot = shell.querySelector<HTMLElement>(
      `[data-easy-read-slot="${region}"]`
    )
    if (!slot) {
      slot = document.createElement("div")
      slot.dataset.easyReadSlot = region
      shell.appendChild(slot)
    }
    slot.appendChild(element)
  }
  document.body.appendChild(shell)
  document.documentElement.classList.add(TEMPLATED_CLASS)
}

function clearPreviewUi() {
  document.getElementById(PREVIEW_HOST_ID)?.remove()
  document.getElementById(PREVIEW_STYLE_ID)?.remove()
  document.documentElement.classList.remove(PREVIEW_CLASS)
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
  document.documentElement.setAttribute(LAYOUT_ATTRIBUTE, rule.templateId)
  mountLayoutTemplate(rule)
  return health
}

async function refreshSettings() {
  const [
    settings,
    rules,
    themes,
    extensionEnabled,
    shareTemplates,
    activeShareTemplateId
  ] = await Promise.all([
    readSettings(),
    readRules(),
    readThemes(),
    readExtensionEnabled(),
    readShareTemplates(),
    readActiveShareTemplateId()
  ])
  const rule = findMatchingRule(location.href, rules)
  const resolvedSettings = resolveSettings(
    location.href,
    settings,
    rules,
    themes
  )
  currentSettings = resolvedSettings
  currentShareTemplate =
    shareTemplates.find((template) => template.id === activeShareTemplateId) ??
    shareTemplates[0]
  sharingEnabled = extensionEnabled
  if (!sharingEnabled) clearShareAction()
  if (extensionEnabled && resolvedSettings.mode !== "native") {
    const savedLayout = rule?.layout
    const savedHealth = checkLayoutHealth(savedLayout)
    const layout =
      savedLayout?.status === "confirmed" && savedHealth.valid
        ? savedLayout
        : analyzeDocument()
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

function clearShareAction() {
  document.getElementById(SHARE_HOST_ID)?.remove()
}

function selectionRect(selection: Selection) {
  if (!selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (rect.width || rect.height) return rect
  return range.getClientRects()[0] ?? null
}

function selectionIsEditable(selection: Selection) {
  const node = selection.anchorNode
  const element =
    node instanceof Element ? node : node?.parentElement ?? undefined
  return Boolean(element?.closest("input, textarea, [contenteditable='true']"))
}

function showShareAction() {
  clearShareAction()
  if (
    !sharingEnabled ||
    !currentSettings ||
    !currentShareTemplate ||
    document.getElementById(PREVIEW_HOST_ID)
  )
    return
  const selection = getSelection()
  const text = selection?.toString().replace(/\s+/g, " ").trim() ?? ""
  if (!selection || text.length < 2 || selectionIsEditable(selection)) return
  const rect = selectionRect(selection)
  if (!rect) return

  const host = document.createElement("div")
  host.id = SHARE_HOST_ID
  host.style.position = "fixed"
  host.style.zIndex = "2147483646"
  host.style.left = `${Math.max(10, Math.min(innerWidth - 154, rect.left + rect.width / 2 - 72))}px`
  host.style.top = `${Math.max(10, rect.top - 46)}px`
  const shadow = host.attachShadow({ mode: "closed" })
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      button { display: flex; align-items: center; gap: 7px; min-height: 34px; padding: 0 12px; color: #f7faf8; font: 700 11px/1 -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; cursor: pointer; border: 1px solid #45696d; border-radius: 5px; background: #183039; box-shadow: 0 8px 24px #102a3040; }
      button::before { content: "◫"; color: #8fc4c6; font-size: 15px; }
      button:hover { background: #22515a; }
      button:disabled { cursor: default; opacity: .88; }
      button:focus-visible { outline: 2px solid #e29656; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) { button { transition: none; } }
    </style>
    <button type="button">复制分享卡片</button>`
  const button = shadow.querySelector("button")!
  button.addEventListener("pointerdown", (event) => event.preventDefault())
  button.addEventListener("click", async () => {
    button.disabled = true
    button.textContent = "正在生成图片…"
    try {
      await copyShareCard(
        text,
        currentSettings!,
        currentShareTemplate!,
        location.hostname
      )
      button.textContent = "图片已复制"
      window.setTimeout(clearShareAction, 1200)
    } catch (error) {
      button.disabled = false
      button.textContent =
        error instanceof Error ? error.message : "复制失败，请重试"
    }
  })
  document.documentElement.appendChild(host)
}

document.addEventListener("mouseup", (event) => {
  if (
    event
      .composedPath()
      .some((node) => node === document.getElementById(SHARE_HOST_ID))
  )
    return
  window.setTimeout(showShareAction)
})
document.addEventListener("keyup", (event) => {
  if (event.key === "Shift" || event.key.startsWith("Arrow")) {
    window.setTimeout(showShareAction)
  }
})
document.addEventListener(
  "scroll",
  () => {
    clearShareAction()
  },
  { passive: true }
)

function installPreviewHighlights(rule: SiteLayoutRule) {
  document.getElementById(PREVIEW_STYLE_ID)?.remove()
  const style = document.createElement("style")
  style.id = PREVIEW_STYLE_ID
  style.textContent = Object.keys(rule.regions)
    .map((region) => {
      const color = REGION_COLORS[region as LayoutRegion]
      return `html.${PREVIEW_CLASS} [${REGION_ATTRIBUTE}="${region}"] { outline: 3px solid ${color} !important; outline-offset: -3px !important; }`
    })
    .join("\n")
  ;(document.head ?? document.documentElement).appendChild(style)
  document.documentElement.classList.add(PREVIEW_CLASS)
}

async function saveConfirmedPreview(rule: SiteLayoutRule, themeId: string) {
  const rules = await readRules()
  const existing = findMatchingRule(location.href, rules)
  const confirmed: SiteLayoutRule = {
    ...rule,
    status: "confirmed",
    updatedAt: Date.now()
  }
  const nextRule: UrlRule = existing
    ? { ...existing, layout: confirmed }
    : {
        id: crypto.randomUUID(),
        name: `${location.hostname} 布局`,
        pattern: `${location.hostname}/*`,
        enabled: true,
        themeId,
        customHideSelectors: "",
        layout: confirmed
      }
  await writeRules(
    existing
      ? rules.map((item) => (item.id === existing.id ? nextRule : item))
      : [...rules, nextRule]
  )
}

async function previewLayout(rule: SiteLayoutRule, themeId: string) {
  clearPreviewUi()
  clearShareAction()
  const health = checkLayoutHealth(rule)
  if (!health.valid) throw new Error("AI 规则未通过当前页面校验")
  const [settings, rules, themes] = await Promise.all([
    readSettings(),
    readRules(),
    readThemes()
  ])
  const matchedRule = findMatchingRule(location.href, rules)
  const resolvedSettings = resolveSettings(
    location.href,
    settings,
    rules,
    themes
  )
  const previewSettings: EasyReadSettings = {
    ...resolvedSettings,
    mode:
      resolvedSettings.mode === "native" ? "comfortable" : resolvedSettings.mode
  }
  const selectors = parseCustomSelectors(matchedRule?.customHideSelectors)
  const layoutTemplate =
    builtinLayoutTemplates.find(
      (template) => template.id === rule.templateId
    ) ?? builtinLayoutTemplates[0]

  const showReflow = () => {
    applySettings(previewSettings, selectors, true)
    applyLayoutRule(rule)
    installPreviewHighlights(rule)
  }
  const showOriginal = () => {
    clearLayoutMarkers()
    applySettings(resolvedSettings, selectors, false)
    document.documentElement.classList.remove(PREVIEW_CLASS)
  }

  showReflow()
  const host = document.createElement("div")
  host.id = PREVIEW_HOST_ID
  const shadow = host.attachShadow({ mode: "closed" })
  const regions = (Object.keys(rule.regions) as LayoutRegion[])
    .map(
      (region) =>
        `<span><i style="--region-color:${REGION_COLORS[region]}"></i>${REGION_LABELS[region]}</span>`
    )
    .join("")
  shadow.innerHTML = `
    <style>
      :host { all: initial; }
      * { box-sizing: border-box; }
      aside { position: fixed; z-index: 2147483647; top: 18px; right: 18px; width: min(390px, calc(100vw - 36px)); color: #183039; font-family: Inter, -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif; border: 1px solid #9eb4b2; border-radius: 6px; background: #f8faf8; box-shadow: 0 16px 50px #102a3040; }
      header { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; border-bottom: 1px solid #d5dfdd; background: #e8f0ed; }
      header div { display: grid; gap: 2px; }
      header b { font-size: 12px; }
      header small { color: #64787a; font-size: 9px; }
      header em { padding: 4px 6px; color: #24666d; font: 700 9px/1 ui-monospace, monospace; font-style: normal; border-radius: 2px; background: #d9e9e6; }
      .body { padding: 12px 14px 14px; }
      .regions { display: flex; flex-wrap: wrap; gap: 6px 10px; margin-bottom: 12px; }
      .regions span { display: flex; align-items: center; gap: 4px; color: #607275; font-size: 9px; }
      .regions i { width: 8px; height: 8px; border-radius: 2px; background: var(--region-color); }
      .compare { display: grid; grid-template-columns: 1fr 1fr; padding: 3px; border-radius: 4px; background: #e5ecea; }
      button { min-height: 32px; padding: 0 10px; color: #38575b; font: 700 10px/1 inherit; cursor: pointer; border: 0; border-radius: 3px; background: transparent; }
      .compare button.active { color: #1d656d; background: white; box-shadow: 0 1px 4px #1830391a; }
      footer { display: flex; justify-content: flex-end; gap: 7px; margin-top: 12px; }
      footer button { border: 1px solid #b8c9c7; background: white; }
      footer .confirm { color: white; border-color: #287781; background: #287781; }
      button:focus-visible { outline: 2px solid #e29656; outline-offset: 2px; }
      @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
    </style>
    <aside role="dialog" aria-label="AI 布局规则预览">
      <header><div><b>AI 布局草稿 · ${layoutTemplate.name}</b><small>${layoutTemplate.description}</small></div><em>${Math.round(rule.confidence * 100)}%</em></header>
      <div class="body">
        <div class="regions">${regions}</div>
        <div class="compare"><button data-view="original">原页面</button><button class="active" data-view="preview">重排预览</button></div>
        <footer><button data-action="cancel">取消</button><button class="confirm" data-action="confirm">确认并应用</button></footer>
      </div>
    </aside>`
  const originalButton = shadow.querySelector<HTMLButtonElement>(
    '[data-view="original"]'
  )!
  const previewButton = shadow.querySelector<HTMLButtonElement>(
    '[data-view="preview"]'
  )!
  originalButton.addEventListener("click", () => {
    showOriginal()
    originalButton.classList.add("active")
    previewButton.classList.remove("active")
  })
  previewButton.addEventListener("click", () => {
    showReflow()
    previewButton.classList.add("active")
    originalButton.classList.remove("active")
  })
  shadow
    .querySelector('[data-action="cancel"]')
    ?.addEventListener("click", () => {
      clearPreviewUi()
      void refreshSettings()
    })
  shadow
    .querySelector<HTMLButtonElement>('[data-action="confirm"]')
    ?.addEventListener("click", async (event) => {
      const button = event.currentTarget as HTMLButtonElement
      button.disabled = true
      button.textContent = "正在保存…"
      try {
        await saveConfirmedPreview(rule, themeId)
        clearPreviewUi()
        await refreshSettings()
      } catch {
        button.disabled = false
        button.textContent = "保存失败，请重试"
      }
    })
  document.documentElement.appendChild(host)
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
  if (message?.type === "easy-read:analyze-layout") {
    const layout = analyzeDocument()
    const health = checkLayoutHealth(layout)
    sendResponse({ layout, health })
  }
  if (message?.type === "easy-read:get-layout-summary") {
    sendResponse({ summary: createDomSummary() })
  }
  if (message?.type === "easy-read:validate-layout") {
    sendResponse({ health: checkLayoutHealth(message.layout) })
  }
  if (message?.type === "easy-read:preview-layout") {
    void previewLayout(message.layout, message.themeId)
      .then(() => sendResponse({ ok: true }))
      .catch((error) =>
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "无法预览 AI 规则"
        })
      )
    return true
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    (changes[STORAGE_KEY] ||
      changes[RULES_STORAGE_KEY] ||
      changes[THEMES_STORAGE_KEY] ||
      changes[SHARE_TEMPLATES_STORAGE_KEY] ||
      changes[ACTIVE_SHARE_TEMPLATE_STORAGE_KEY] ||
      changes[EXTENSION_ENABLED_STORAGE_KEY])
  ) {
    if (!document.getElementById(PREVIEW_HOST_ID)) void refreshSettings()
  }
})
