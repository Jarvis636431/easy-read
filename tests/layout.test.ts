import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  analyzeDocument,
  checkLayoutHealth,
  createDomSummary,
  selectorFor
} from "~/lib/layout"
import type { SiteLayoutRule } from "~/lib/settings"

function visibleRect(
  top = 0,
  width = 900,
  height = 300
): DOMRect {
  return {
    x: 0,
    y: top,
    top,
    right: width,
    bottom: top + height,
    left: 0,
    width,
    height,
    toJSON: () => ({})
  }
}

function layoutRule(
  regions: SiteLayoutRule["regions"],
  templateId: SiteLayoutRule["templateId"] = "article"
): SiteLayoutRule {
  return {
    source: "local",
    status: "confirmed",
    pageType: "article",
    templateId,
    regions,
    hiddenRegions: [],
    collapsedRegions: [],
    confidence: 0.9,
    createdAt: 1,
    updatedAt: 1
  }
}

beforeEach(() => {
  document.body.innerHTML = ""
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1200
  })
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800
  })
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: {
      escape: (value: string) => value.replace(/[^\w-]/g, "\\$&")
    }
  })
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function () {
      const top = Number((this as HTMLElement).dataset.testTop ?? 0)
      const width = Number((this as HTMLElement).dataset.testWidth ?? 900)
      const height = Number((this as HTMLElement).dataset.testHeight ?? 300)
      return visibleRect(top, width, height)
    }
  )
})

describe("页面结构分析", () => {
  it("优先生成稳定的 ID 和 data-testid 选择器", () => {
    document.body.innerHTML = `
      <main id="article-main"></main>
      <section data-testid="comment-list"></section>
    `

    expect(selectorFor(document.querySelector("main")!)).toBe("#article-main")
    expect(selectorFor(document.querySelector("section")!)).toBe(
      'section[data-testid="comment-list"]'
    )
  })

  it("识别文章正文、导航和评论，并选择文章布局", () => {
    document.body.innerHTML = `
      <header id="site-header">站点标题</header>
      <nav id="site-nav"><a href="/a">文章</a><a href="/b">归档</a></nav>
      <main id="article-main">
        <h1>测试文章</h1>
        <p>这是第一段足够长的文章内容，用于验证正文结构识别。</p>
        <p>这是第二段文章内容，继续提供低链接密度的正文。</p>
        <p>这是第三段文章内容，使文章类型判断更加稳定。</p>
        <p>这是第四段文章内容，满足文章页面的段落数量要求。</p>
      </main>
      <section id="comments" class="comments"><p>读者评论</p></section>
      <footer id="site-footer" data-test-top="1600">页脚</footer>
    `

    const result = analyzeDocument()

    expect(result.pageType).toBe("article")
    expect(result.templateId).toBe("article")
    expect(result.regions.content).toBe("#article-main")
    expect(result.regions.navigation).toBe("#site-nav")
    expect(result.regions.comments).toBe("#comments")
    expect(result.confidence).toBeGreaterThan(0.5)
  })

  it("生成不包含正文内容的隐私缩减 DOM 摘要", () => {
    document.body.innerHTML = `
      <main id="content"><h1>私密标题</h1><p>不应出现在摘要中的正文</p></main>
    `

    const summary = createDomSummary()
    const serialized = JSON.stringify(summary)

    expect(summary.nodes).toContainEqual(
      expect.objectContaining({
        selector: "#content",
        tag: "main",
        headings: 1,
        paragraphs: 1
      })
    )
    expect(serialized).not.toContain("私密标题")
    expect(serialized).not.toContain("不应出现在摘要中的正文")
  })
})

describe("布局规则健康检查", () => {
  it("在正文和多数区域都存在时判定有效", () => {
    document.body.innerHTML = `
      <main id="content"></main>
      <nav id="nav"></nav>
      <aside id="sidebar"></aside>
    `

    expect(
      checkLayoutHealth(
        layoutRule({
          content: "#content",
          navigation: "#nav",
          sidebar: "#sidebar"
        })
      )
    ).toEqual({
      valid: true,
      score: 1,
      matchedRegions: 3,
      missingRegions: []
    })
  })

  it("拒绝缺失正文、重复命中过多或未知模板的规则", () => {
    document.body.innerHTML = `
      <nav class="nav"></nav><nav class="nav"></nav><nav class="nav"></nav>
    `

    const result = checkLayoutHealth(
      layoutRule({ content: "#missing", navigation: ".nav" }, "article")
    )
    expect(result.valid).toBe(false)
    expect(result.missingRegions).toEqual(["content"])

    expect(
      checkLayoutHealth(
        layoutRule(
          { navigation: ".nav" },
          "unknown" as SiteLayoutRule["templateId"]
        )
      ).valid
    ).toBe(false)
  })
})
