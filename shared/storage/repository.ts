export type ReadingMode = "native" | "comfortable" | "night" | "immersive"

export type EasyReadSettings = {
  mode: ReadingMode
  fontSize: number
  lineHeight: number
  contentWidth: number
  hideAds: boolean
  hideSidebars: boolean
  pageColor: string
  contentColor: string
  textColor: string
  linkColor: string
  imageBrightness: number
  fontFamily: string
  headingFontFamily: string
}

export const STORAGE_KEY = "easyReadSettings"
export const RULES_STORAGE_KEY = "easyReadUrlRules"
export const THEMES_STORAGE_KEY = "easyReadCustomThemes"
export const NETWORK_BLOCKING_STORAGE_KEY = "easyReadNetworkAdBlocking"
export const AD_RULESET_ID = "easy_read_ads"
export const QUICK_THEMES_STORAGE_KEY = "easyReadQuickThemeIds"
export const ACTIVE_THEME_STORAGE_KEY = "easyReadActiveThemeId"
export const EXTENSION_ENABLED_STORAGE_KEY = "easyReadExtensionEnabled"
export const LLM_SETTINGS_STORAGE_KEY = "easyReadLlmSettings"
export const SHARE_TEMPLATES_STORAGE_KEY = "easyReadShareTemplates"
export const ACTIVE_SHARE_TEMPLATE_STORAGE_KEY = "easyReadActiveShareTemplateId"
export const defaultQuickThemeIds = [
  "native",
  "comfortable",
  "night",
  "immersive"
]

export type ReadingTheme = {
  id: string
  name: string
  builtin: boolean
  settings: EasyReadSettings
}

export type ShareCardTemplate = {
  id: string
  name: string
  builtin: boolean
  followTheme: boolean
  pageColor: string
  cardColor: string
  textColor: string
  accentColor: string
  fontFamily: string
  fontScale: number
  cornerRadius: number
  showSource: boolean
  showBranding: boolean
}

export const builtinShareTemplates: ShareCardTemplate[] = [
  {
    id: "theme-spine",
    name: "主题书脊",
    builtin: true,
    followTheme: true,
    pageColor: "#f3f0e7",
    cardColor: "#fbfaf5",
    textColor: "#2b3437",
    accentColor: "#176b78",
    fontFamily: '"Helvetica Neue", Arial, "PingFang SC", sans-serif',
    fontScale: 1,
    cornerRadius: 18,
    showSource: true,
    showBranding: true
  },
  {
    id: "midnight-note",
    name: "午夜摘录",
    builtin: true,
    followTheme: false,
    pageColor: "#101820",
    cardColor: "#18252e",
    textColor: "#e7ecee",
    accentColor: "#e6a15c",
    fontFamily: 'Georgia, "Songti SC", serif',
    fontScale: 1.04,
    cornerRadius: 8,
    showSource: true,
    showBranding: true
  }
]

export type LayoutRuleSource = "local" | "llm" | "manual"
export type PageType =
  | "article"
  | "documentation"
  | "forum"
  | "feed"
  | "conservative"
export type LayoutTemplateId =
  | "preserve"
  | "article"
  | "documentation"
  | "forum"
  | "wide"

export type LayoutTemplate = {
  id: LayoutTemplateId
  name: string
  description: string
}

export const builtinLayoutTemplates: LayoutTemplate[] = [
  { id: "preserve", name: "保留原页", description: "不移动 DOM，只应用主题" },
  {
    id: "article",
    name: "文章单栏",
    description: "正文居中，评论接在正文之后"
  },
  {
    id: "documentation",
    name: "文档双栏",
    description: "导航固定在左侧，正文位于右侧"
  },
  { id: "forum", name: "论坛流", description: "主帖与回复按阅读顺序纵向排列" },
  { id: "wide", name: "宽屏双栏", description: "正文与辅助侧栏并排展示" }
]
export type LayoutRegion =
  | "header"
  | "navigation"
  | "content"
  | "sidebar"
  | "comments"
  | "footer"

export type SiteLayoutRule = {
  source: LayoutRuleSource
  status: "draft" | "confirmed"
  pageType: PageType
  templateId: LayoutTemplateId
  regions: Partial<Record<LayoutRegion, string>>
  hiddenRegions: LayoutRegion[]
  collapsedRegions: LayoutRegion[]
  instruction?: string
  planSummary?: string
  confidence: number
  createdAt: number
  updatedAt: number
}

export type LlmProviderType = "openai-compatible" | "anthropic"

export type LlmProvider = {
  id: string
  name: string
  type: LlmProviderType
  baseUrl: string
  model: string
  apiKey: string
}

export type LlmSettings = {
  enabled: boolean
  activeProviderId: string
  providers: LlmProvider[]
}

export const defaultLlmSettings: LlmSettings = {
  enabled: false,
  activeProviderId: "openai",
  providers: [
    {
      id: "openai",
      name: "OpenAI compatible",
      type: "openai-compatible",
      baseUrl: "https://api.openai.com/v1",
      model: "",
      apiKey: ""
    },
    {
      id: "anthropic",
      name: "Anthropic",
      type: "anthropic",
      baseUrl: "https://api.anthropic.com",
      model: "",
      apiKey: ""
    }
  ]
}

export type UrlRule = {
  id: string
  name: string
  pattern: string
  enabled: boolean
  themeId: string
  customHideSelectors: string
  layout?: SiteLayoutRule
}

export const presets: Record<ReadingMode, EasyReadSettings> = {
  native: {
    mode: "native",
    fontSize: 16,
    lineHeight: 1.6,
    contentWidth: 960,
    hideAds: false,
    hideSidebars: false,
    pageColor: "#ffffff",
    contentColor: "#ffffff",
    textColor: "#202a30",
    linkColor: "#176b78",
    imageBrightness: 1,
    fontFamily: '"Helvetica Neue", Arial, "PingFang SC", sans-serif',
    headingFontFamily: 'Georgia, "Songti SC", serif'
  },
  comfortable: {
    mode: "comfortable",
    fontSize: 18,
    lineHeight: 1.8,
    contentWidth: 860,
    hideAds: true,
    hideSidebars: false,
    pageColor: "#f3f0e7",
    contentColor: "#fbfaf5",
    textColor: "#2b3437",
    linkColor: "#176b78",
    imageBrightness: 1,
    fontFamily: '"Helvetica Neue", Arial, "PingFang SC", sans-serif',
    headingFontFamily: 'Georgia, "Songti SC", serif'
  },
  night: {
    mode: "night",
    fontSize: 18,
    lineHeight: 1.85,
    contentWidth: 820,
    hideAds: true,
    hideSidebars: false,
    pageColor: "#111820",
    contentColor: "#17212a",
    textColor: "#dce4e8",
    linkColor: "#8fc9e8",
    imageBrightness: 0.82,
    fontFamily: '"Helvetica Neue", Arial, "PingFang SC", sans-serif',
    headingFontFamily: 'Georgia, "Songti SC", serif'
  },
  immersive: {
    mode: "immersive",
    fontSize: 19,
    lineHeight: 1.9,
    contentWidth: 760,
    hideAds: true,
    hideSidebars: true,
    pageColor: "#eef1f2",
    contentColor: "#ffffff",
    textColor: "#202a30",
    linkColor: "#176b78",
    imageBrightness: 1,
    fontFamily: '"Helvetica Neue", Arial, "PingFang SC", sans-serif',
    headingFontFamily: 'Georgia, "Songti SC", serif'
  }
}

export const builtinThemes: ReadingTheme[] = [
  ...(Object.keys(presets) as ReadingMode[]).map((id) => ({
    id,
    name: {
      native: "原生",
      comfortable: "舒适",
      night: "夜间",
      immersive: "沉浸"
    }[id],
    builtin: true,
    settings: presets[id]
  })),
  {
    id: "claude",
    name: "Claude 暖纸",
    builtin: true,
    settings: {
      mode: "comfortable",
      fontSize: 18,
      lineHeight: 1.7,
      contentWidth: 820,
      hideAds: true,
      hideSidebars: false,
      pageColor: "#F5F4ED",
      contentColor: "#FAF9F5",
      textColor: "#141413",
      linkColor: "#D97757",
      imageBrightness: 0.96,
      fontFamily:
        '"Anthropic Sans", "Helvetica Neue", Arial, "PingFang SC", sans-serif',
      headingFontFamily: '"Anthropic Serif", Georgia, "Songti SC", serif'
    }
  },
  {
    id: "kindle",
    name: "Kindle 纸张",
    builtin: true,
    settings: {
      mode: "comfortable",
      fontSize: 19,
      lineHeight: 1.9,
      contentWidth: 720,
      hideAds: true,
      hideSidebars: true,
      pageColor: "#E8E3D5",
      contentColor: "#F4F1E8",
      textColor: "#292821",
      linkColor: "#725B3A",
      imageBrightness: 0.9,
      fontFamily:
        '"Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif',
      headingFontFamily:
        '"Noto Serif SC", "Source Han Serif SC", "Songti SC", Georgia, serif'
    }
  }
]

export const defaultSettings = presets.comfortable

export async function readSettings(): Promise<EasyReadSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY)
  return { ...defaultSettings, ...result[STORAGE_KEY] }
}

export async function writeSettings(settings: EasyReadSettings) {
  await chrome.storage.local.set({ [STORAGE_KEY]: settings })
}

export async function readRules(): Promise<UrlRule[]> {
  const result = await chrome.storage.local.get(RULES_STORAGE_KEY)
  return Array.isArray(result[RULES_STORAGE_KEY])
    ? result[RULES_STORAGE_KEY]
    : []
}

export async function readThemes(): Promise<ReadingTheme[]> {
  const result = await chrome.storage.local.get(THEMES_STORAGE_KEY)
  const custom = Array.isArray(result[THEMES_STORAGE_KEY])
    ? result[THEMES_STORAGE_KEY]
    : []
  return [...builtinThemes, ...custom]
}

export async function writeCustomThemes(themes: ReadingTheme[]) {
  await chrome.storage.local.set({
    [THEMES_STORAGE_KEY]: themes.filter((theme) => !theme.builtin)
  })
}

export async function writeRules(rules: UrlRule[]) {
  await chrome.storage.local.set({ [RULES_STORAGE_KEY]: rules })
}

export async function readNetworkBlocking(): Promise<boolean> {
  const result = await chrome.storage.local.get(NETWORK_BLOCKING_STORAGE_KEY)
  return result[NETWORK_BLOCKING_STORAGE_KEY] !== false
}

export async function writeNetworkBlocking(enabled: boolean) {
  await chrome.storage.local.set({ [NETWORK_BLOCKING_STORAGE_KEY]: enabled })
}

export async function readQuickThemeIds(): Promise<string[]> {
  const result = await chrome.storage.local.get(QUICK_THEMES_STORAGE_KEY)
  const stored = result[QUICK_THEMES_STORAGE_KEY]
  return Array.isArray(stored) && stored.length === 4
    ? stored
    : defaultQuickThemeIds
}

export async function writeQuickThemeIds(themeIds: string[]) {
  await chrome.storage.local.set({
    [QUICK_THEMES_STORAGE_KEY]: themeIds.slice(0, 4)
  })
}

export async function readActiveThemeId(): Promise<string> {
  const result = await chrome.storage.local.get(ACTIVE_THEME_STORAGE_KEY)
  return result[ACTIVE_THEME_STORAGE_KEY] ?? "comfortable"
}

export async function writeActiveThemeId(themeId: string) {
  await chrome.storage.local.set({ [ACTIVE_THEME_STORAGE_KEY]: themeId })
}

export async function readExtensionEnabled(): Promise<boolean> {
  const result = await chrome.storage.local.get(EXTENSION_ENABLED_STORAGE_KEY)
  return result[EXTENSION_ENABLED_STORAGE_KEY] === true
}

export async function writeExtensionEnabled(enabled: boolean) {
  await chrome.storage.local.set({ [EXTENSION_ENABLED_STORAGE_KEY]: enabled })
}

export async function readLlmSettings(): Promise<LlmSettings> {
  const result = await chrome.storage.local.get(LLM_SETTINGS_STORAGE_KEY)
  const stored = result[LLM_SETTINGS_STORAGE_KEY] as Partial<LlmSettings>
  return {
    ...defaultLlmSettings,
    ...stored,
    providers: Array.isArray(stored?.providers)
      ? stored.providers
      : defaultLlmSettings.providers
  }
}

export async function writeLlmSettings(settings: LlmSettings) {
  await chrome.storage.local.set({ [LLM_SETTINGS_STORAGE_KEY]: settings })
}

export async function readShareTemplates(): Promise<ShareCardTemplate[]> {
  const result = await chrome.storage.local.get(SHARE_TEMPLATES_STORAGE_KEY)
  const custom = Array.isArray(result[SHARE_TEMPLATES_STORAGE_KEY])
    ? result[SHARE_TEMPLATES_STORAGE_KEY]
    : []
  return [...builtinShareTemplates, ...custom]
}

export async function writeCustomShareTemplates(
  templates: ShareCardTemplate[]
) {
  await chrome.storage.local.set({
    [SHARE_TEMPLATES_STORAGE_KEY]: templates.filter(
      (template) => !template.builtin
    )
  })
}

export async function readActiveShareTemplateId(): Promise<string> {
  const result = await chrome.storage.local.get(
    ACTIVE_SHARE_TEMPLATE_STORAGE_KEY
  )
  return result[ACTIVE_SHARE_TEMPLATE_STORAGE_KEY] ?? "theme-spine"
}

export async function writeActiveShareTemplateId(templateId: string) {
  await chrome.storage.local.set({
    [ACTIVE_SHARE_TEMPLATE_STORAGE_KEY]: templateId
  })
}

export function matchesUrl(pattern: string, url: string) {
  const normalized = pattern.trim()
  if (!normalized) return false

  const escaped = normalized
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
  const targets = normalized.includes("://")
    ? [url]
    : [new URL(url).hostname + new URL(url).pathname]

  return targets.some((target) => new RegExp(`^${escaped}$`, "i").test(target))
}

export function resolveSettings(
  url: string,
  fallback: EasyReadSettings,
  rules: UrlRule[],
  themes: ReadingTheme[]
) {
  const rule = findMatchingRule(url, rules)
  if (!rule) return fallback
  return themes.find((theme) => theme.id === rule.themeId)?.settings ?? fallback
}

export function findMatchingRule(url: string, rules: UrlRule[]) {
  return rules.find(
    (candidate) => candidate.enabled && matchesUrl(candidate.pattern, url)
  )
}
