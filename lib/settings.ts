export type ReadingMode = "native" | "comfortable" | "night" | "immersive"

export type EasyReadSettings = {
  enabled: boolean
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
}

export const STORAGE_KEY = "easyReadSettings"
export const RULES_STORAGE_KEY = "easyReadUrlRules"
export const THEMES_STORAGE_KEY = "easyReadCustomThemes"

export type ReadingTheme = {
  id: string
  name: string
  builtin: boolean
  settings: EasyReadSettings
}

export type UrlRule = {
  id: string
  name: string
  pattern: string
  enabled: boolean
  themeId: string
}

export const presets: Record<ReadingMode, EasyReadSettings> = {
  native: {
    enabled: false,
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
    imageBrightness: 1
  },
  comfortable: {
    enabled: true,
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
    imageBrightness: 1
  },
  night: {
    enabled: true,
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
    imageBrightness: 0.82
  },
  immersive: {
    enabled: true,
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
    imageBrightness: 1
  }
}

export const builtinThemes: ReadingTheme[] = (
  Object.keys(presets) as ReadingMode[]
).map((id) => ({
  id,
  name: {
    native: "原生",
    comfortable: "舒适",
    night: "夜间",
    immersive: "沉浸"
  }[id],
  builtin: true,
  settings: presets[id]
}))

export const defaultSettings = presets.native

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
  const rule = rules.find(
    (candidate) => candidate.enabled && matchesUrl(candidate.pattern, url)
  )
  if (!rule) return fallback
  return themes.find((theme) => theme.id === rule.themeId)?.settings ?? fallback
}
