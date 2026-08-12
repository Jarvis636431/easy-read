import { afterEach, describe, expect, it, vi } from "vitest"

import {
  analyzeLayoutWithLlm,
  interpretReadingCommand
} from "~/features/ai/client"
import type { DomSummary } from "~/features/layouts/analyzer"
import type { LlmProvider } from "~/shared/storage/repository"

const provider: LlmProvider = {
  id: "test",
  name: "Test provider",
  type: "openai-compatible",
  baseUrl: "https://api.example.com/v1",
  model: "test-model",
  apiKey: "test-key"
}

const summary: DomSummary = {
  url: "https://example.com/article",
  viewport: { width: 1200, height: 800 },
  documentHeight: 2400,
  nodes: [
    {
      selector: "#content",
      tag: "main",
      zone: "middle",
      widthRatio: 0.7,
      textLength: 2000,
      paragraphs: 12,
      headings: 3,
      links: 2
    },
    {
      selector: "#sidebar",
      tag: "aside",
      zone: "middle",
      widthRatio: 0.25,
      textLength: 300,
      paragraphs: 2,
      headings: 1,
      links: 8
    }
  ]
}

function mockModelResult(result: unknown) {
  return vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(
      JSON.stringify({
        choices: [{ message: { content: JSON.stringify(result) } }]
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    )
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("AI 布局结果校验", () => {
  it("只接受摘要中出现过的选择器并限制置信度范围", async () => {
    const fetchMock = mockModelResult({
      pageType: "article",
      templateId: "article",
      regions: {
        content: "#content",
        sidebar: "#sidebar",
        header: "body > script"
      },
      confidence: 4
    })

    const result = await analyzeLayoutWithLlm(provider, summary)

    expect(result.regions).toEqual({
      content: "#content",
      sidebar: "#sidebar"
    })
    expect(result.confidence).toBe(1)
    expect(result.status).toBe("draft")
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.example.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    )
  })

  it("自然语言规划不会隐藏正文，并消除隐藏与折叠冲突", async () => {
    mockModelResult({
      pageType: "article",
      templateId: "article",
      regions: { content: "#content", sidebar: "#sidebar" },
      hiddenRegions: ["content", "sidebar"],
      collapsedRegions: ["content", "sidebar"],
      summary: "保留正文并隐藏侧栏",
      confidence: 0.8
    })

    const result = await interpretReadingCommand(
      provider,
      summary,
      "  帮我快速阅读  "
    )

    expect(result.hiddenRegions).toEqual(["sidebar"])
    expect(result.collapsedRegions).toEqual([])
    expect(result.instruction).toBe("帮我快速阅读")
    expect(result.planSummary).toBe("保留正文并隐藏侧栏")
  })

  it("拒绝模型注入的正文选择器和未知布局", async () => {
    mockModelResult({
      pageType: "article",
      templateId: "article",
      regions: { content: "body" },
      confidence: 0.8
    })
    await expect(analyzeLayoutWithLlm(provider, summary)).rejects.toThrow(
      "有效正文区域"
    )

    vi.restoreAllMocks()
    mockModelResult({
      pageType: "article",
      templateId: "generated-html",
      regions: { content: "#content" },
      confidence: 0.8
    })
    await expect(analyzeLayoutWithLlm(provider, summary)).rejects.toThrow(
      "未知布局模板"
    )
  })

  it("在请求前校验供应商配置", async () => {
    await expect(
      analyzeLayoutWithLlm({ ...provider, apiKey: "" }, summary)
    ).rejects.toThrow("API Key")
    await expect(
      analyzeLayoutWithLlm(
        { ...provider, baseUrl: "javascript:alert(1)" },
        summary
      )
    ).rejects.toThrow("HTTP(S)")
  })
})
