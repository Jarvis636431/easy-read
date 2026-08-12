import { describe, expect, it } from "vitest"

import {
  builtinThemes,
  findMatchingRule,
  matchesUrl,
  presets,
  resolveSettings,
  type UrlRule
} from "~/shared/storage/repository"

function rule(overrides: Partial<UrlRule> = {}): UrlRule {
  return {
    id: "rule-1",
    name: "示例规则",
    pattern: "*.example.com/*",
    enabled: true,
    themeId: "night",
    customHideSelectors: "",
    ...overrides
  }
}

describe("URL 规则匹配", () => {
  it.each([
    ["*.example.com/*", "https://docs.example.com/guide", true],
    ["example.com/article/*", "https://example.com/article/42", true],
    ["https://example.com/exact", "https://example.com/exact", true],
    ["https://example.com/exact", "http://example.com/exact", false],
    ["*.example.com/*", "https://example.org/guide", false],
    ["", "https://example.com/", false]
  ])("%s 匹配 %s => %s", (pattern, url, expected) => {
    expect(matchesUrl(pattern, url)).toBe(expected)
  })

  it("把正则特殊字符当作普通 URL 字符处理", () => {
    expect(matchesUrl("example.com/a+b", "https://example.com/a+b")).toBe(true)
  })

  it("按顺序返回第一条启用且命中的规则", () => {
    const rules = [
      rule({ id: "disabled", enabled: false }),
      rule({ id: "first", pattern: "*.example.com/*" }),
      rule({ id: "second", pattern: "docs.example.com/*" })
    ]

    expect(findMatchingRule("https://docs.example.com/guide", rules)?.id).toBe(
      "first"
    )
  })

  it("命中规则时应用主题，主题不存在时保留全局设置", () => {
    const url = "https://docs.example.com/guide"

    expect(
      resolveSettings(url, presets.comfortable, [rule()], builtinThemes)
    ).toEqual(presets.night)
    expect(
      resolveSettings(
        url,
        presets.comfortable,
        [rule({ themeId: "missing" })],
        builtinThemes
      )
    ).toEqual(presets.comfortable)
  })
})
