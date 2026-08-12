import {
  builtinShareTemplates,
  builtinThemes,
  type LayoutRegion,
  type LlmProvider,
  type LlmProviderType,
  type ReadingTheme,
  type ShareCardTemplate,
  type SiteLayoutRule,
  type UrlRule
} from "~shared/storage/repository"

export const layoutRegions: Array<{ id: LayoutRegion; label: string }> = [
  { id: "header", label: "页头" },
  { id: "navigation", label: "导航" },
  { id: "content", label: "主要内容" },
  { id: "sidebar", label: "侧栏" },
  { id: "comments", label: "评论" },
  { id: "footer", label: "页脚" }
]

export function createEmptyLayout(): SiteLayoutRule {
  const now = Date.now()
  return {
    source: "manual",
    status: "draft",
    pageType: "conservative",
    templateId: "preserve",
    regions: {},
    hiddenRegions: [],
    collapsedRegions: [],
    confidence: 0,
    createdAt: now,
    updatedAt: now
  }
}

export function createTheme(
  source: ReadingTheme = builtinThemes[1]
): ReadingTheme {
  return {
    id: crypto.randomUUID(),
    name: `${source.name}副本`,
    builtin: false,
    settings: { ...source.settings, mode: "comfortable" }
  }
}

export function createRule(themeId: string): UrlRule {
  return {
    id: crypto.randomUUID(),
    name: "新网站规则",
    pattern: "*.example.com/*",
    enabled: true,
    themeId,
    customHideSelectors: ""
  }
}

export function createProvider(type: LlmProviderType): LlmProvider {
  return {
    id: crypto.randomUUID(),
    name: type === "anthropic" ? "Anthropic" : "OpenAI compatible",
    type,
    baseUrl:
      type === "anthropic"
        ? "https://api.anthropic.com"
        : "https://api.openai.com/v1",
    model: "",
    apiKey: ""
  }
}

export function createShareTemplate(
  source: ShareCardTemplate = builtinShareTemplates[0]
): ShareCardTemplate {
  return {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name}副本`,
    builtin: false
  }
}
