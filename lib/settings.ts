export type ReadingMode = "native" | "comfortable" | "night" | "immersive"

export type EasyReadSettings = {
  enabled: boolean
  mode: ReadingMode
  fontSize: number
  lineHeight: number
  contentWidth: number
  hideAds: boolean
  hideSidebars: boolean
}

export const STORAGE_KEY = "easyReadSettings"
export const RULES_STORAGE_KEY = "easyReadUrlRules"

export type UrlRule = {
  id: string
  name: string
  pattern: string
  enabled: boolean
  settings: EasyReadSettings
}

export const presets: Record<ReadingMode, EasyReadSettings> = {
  native: {
    enabled: false,
    mode: "native",
    fontSize: 16,
    lineHeight: 1.6,
    contentWidth: 960,
    hideAds: false,
    hideSidebars: false
  },
  comfortable: {
    enabled: true,
    mode: "comfortable",
    fontSize: 18,
    lineHeight: 1.8,
    contentWidth: 860,
    hideAds: true,
    hideSidebars: false
  },
  night: {
    enabled: true,
    mode: "night",
    fontSize: 18,
    lineHeight: 1.85,
    contentWidth: 820,
    hideAds: true,
    hideSidebars: false
  },
  immersive: {
    enabled: true,
    mode: "immersive",
    fontSize: 19,
    lineHeight: 1.9,
    contentWidth: 760,
    hideAds: true,
    hideSidebars: true
  }
}

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
  rules: UrlRule[]
) {
  const rule = rules.find(
    (candidate) => candidate.enabled && matchesUrl(candidate.pattern, url)
  )
  return rule?.settings ?? fallback
}
