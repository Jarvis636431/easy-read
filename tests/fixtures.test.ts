import { beforeEach, describe, expect, it } from "vitest"

import { analyzeDocument, checkLayoutHealth } from "~/features/layouts/analyzer"

import { installVisibleLayout, loadFixture } from "./helpers/dom"

beforeEach(() => {
  installVisibleLayout()
})

describe.each([
  {
    fixture: "news-article.html",
    pageType: "article",
    templateId: "article",
    content: "#story-content"
  },
  {
    fixture: "technical-docs.html",
    pageType: "documentation",
    templateId: "documentation",
    content: "#documentation-content"
  },
  {
    fixture: "forum-thread.html",
    pageType: "forum",
    templateId: "forum",
    content: "#thread-content"
  },
  {
    fixture: "link-feed.html",
    pageType: "feed",
    templateId: "wide",
    content: "#content-feed"
  }
])("$fixture 页面 fixture", ({ fixture, pageType, templateId, content }) => {
  it(`识别为 ${pageType} 并生成健康布局`, () => {
    loadFixture(fixture)

    const layout = analyzeDocument()
    const health = checkLayoutHealth(layout)

    expect(layout).toEqual(
      expect.objectContaining({
        pageType,
        templateId,
        regions: expect.objectContaining({ content })
      })
    )
    expect(layout.confidence).toBeGreaterThan(0.5)
    expect(health.valid).toBe(true)
    expect(health.score).toBe(1)
  })
})
