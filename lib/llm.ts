import type { DomSummary } from "~lib/layout"
import type {
  LayoutRegion,
  LayoutTemplateId,
  LlmProvider,
  PageType,
  SiteLayoutRule
} from "~lib/settings"

const PAGE_TYPES: PageType[] = [
  "article",
  "documentation",
  "forum",
  "feed",
  "conservative"
]
const LAYOUT_TEMPLATES: LayoutTemplateId[] = [
  "preserve",
  "article",
  "documentation",
  "forum",
  "wide"
]
const REGIONS: LayoutRegion[] = [
  "header",
  "navigation",
  "content",
  "sidebar",
  "comments",
  "footer"
]

const SYSTEM_PROMPT = `You analyze a privacy-reduced DOM outline for a browser reading tool.
Return one JSON object only, with this exact shape:
{"pageType":"article|documentation|forum|feed|conservative","templateId":"preserve|article|documentation|forum|wide","regions":{"header":"CSS selector","navigation":"CSS selector","content":"CSS selector","sidebar":"CSS selector","comments":"CSS selector","footer":"CSS selector"},"confidence":0.0}
Use only selectors present verbatim in the supplied nodes. Omit uncertain optional regions. The content region is required. Prefer preserve when confidence is low. Do not include markdown or commentary.`

function endpoint(baseUrl: string, path: string) {
  const normalized = baseUrl.trim().replace(/\/+$/, "")
  if (!/^https?:\/\//i.test(normalized))
    throw new Error("API 地址必须使用 HTTP(S)")
  if (normalized.endsWith("/v1") && path.startsWith("/v1/")) {
    return `${normalized}${path.slice(3)}`
  }
  return `${normalized}${path}`
}

function extractJson(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
  const start = trimmed.indexOf("{")
  const end = trimmed.lastIndexOf("}")
  if (start < 0 || end <= start) throw new Error("模型没有返回 JSON")
  return JSON.parse(trimmed.slice(start, end + 1)) as unknown
}

function parseLayout(value: unknown, summary: DomSummary): SiteLayoutRule {
  if (!value || typeof value !== "object") throw new Error("模型返回格式无效")
  const result = value as Record<string, unknown>
  if (!PAGE_TYPES.includes(result.pageType as PageType))
    throw new Error("模型返回了未知页面类型")
  if (!LAYOUT_TEMPLATES.includes(result.templateId as LayoutTemplateId))
    throw new Error("模型返回了未知布局模板")

  const allowedSelectors = new Set(summary.nodes.map((node) => node.selector))
  const rawRegions =
    result.regions && typeof result.regions === "object"
      ? (result.regions as Record<string, unknown>)
      : {}
  const regions: Partial<Record<LayoutRegion, string>> = {}
  for (const region of REGIONS) {
    const selector = rawRegions[region]
    if (typeof selector === "string" && allowedSelectors.has(selector)) {
      regions[region] = selector
    }
  }
  if (!regions.content) throw new Error("模型没有识别出有效正文区域")

  const confidence = Number(result.confidence)
  const now = Date.now()
  return {
    source: "llm",
    status: "draft",
    pageType: result.pageType as PageType,
    templateId: result.templateId as LayoutTemplateId,
    regions,
    confidence: Number.isFinite(confidence)
      ? Math.min(1, Math.max(0, confidence))
      : 0,
    createdAt: now,
    updatedAt: now
  }
}

async function readError(response: Response) {
  const text = await response.text()
  try {
    const value = JSON.parse(text)
    return value?.error?.message ?? value?.message ?? text
  } catch {
    return text
  }
}

async function callOpenAiCompatible(
  provider: LlmProvider,
  summary: DomSummary
) {
  const response = await fetch(
    endpoint(provider.baseUrl, "/v1/chat/completions"),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: JSON.stringify(summary) }
        ]
      })
    }
  )
  if (!response.ok)
    throw new Error(
      `供应商请求失败 (${response.status})：${await readError(response)}`
    )
  const value = await response.json()
  const content = value?.choices?.[0]?.message?.content
  if (typeof content !== "string") throw new Error("供应商响应中没有文本结果")
  return content
}

async function callAnthropic(provider: LlmProvider, summary: DomSummary) {
  const response = await fetch(endpoint(provider.baseUrl, "/v1/messages"), {
    method: "POST",
    headers: {
      "x-api-key": provider.apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: provider.model,
      max_tokens: 1200,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: JSON.stringify(summary) }]
    })
  })
  if (!response.ok)
    throw new Error(
      `供应商请求失败 (${response.status})：${await readError(response)}`
    )
  const value = await response.json()
  const content = value?.content?.find(
    (block: { type?: string }) => block.type === "text"
  )?.text
  if (typeof content !== "string")
    throw new Error("Anthropic 响应中没有文本结果")
  return content
}

export async function analyzeLayoutWithLlm(
  provider: LlmProvider,
  summary: DomSummary
) {
  if (!provider.apiKey.trim()) throw new Error("请先填写 API Key")
  if (!provider.model.trim()) throw new Error("请先填写模型名称")
  if (!summary.nodes.length) throw new Error("当前页面没有可分析的结构")
  const content =
    provider.type === "anthropic"
      ? await callAnthropic(provider, summary)
      : await callOpenAiCompatible(provider, summary)
  return parseLayout(extractJson(content), summary)
}
