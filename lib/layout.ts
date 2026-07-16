import type { LayoutRegion, PageType, SiteLayoutRule } from "~lib/settings"

const REGION_HINTS: Record<LayoutRegion, string[]> = {
  header: ["header", "masthead", "topbar", "top-bar"],
  navigation: ["nav", "menu", "breadcrumb", "toc"],
  content: ["main", "content", "article", "post", "entry", "story"],
  sidebar: ["sidebar", "side-bar", "aside", "rail", "secondary"],
  comments: ["comment", "discussion", "reply", "responses"],
  footer: ["footer", "site-footer", "bottom"]
}

export type LayoutHealth = {
  valid: boolean
  score: number
  matchedRegions: number
  missingRegions: LayoutRegion[]
}

export type DomSummaryNode = {
  selector: string
  tag: string
  role?: string
  landmark?: string
  zone: "top" | "middle" | "bottom"
  widthRatio: number
  textLength: number
  paragraphs: number
  headings: number
  links: number
}

export type DomSummary = {
  url: string
  viewport: { width: number; height: number }
  documentHeight: number
  nodes: DomSummaryNode[]
}

function elementName(element: Element) {
  return [
    element.id,
    element.className,
    element.getAttribute("role"),
    ...Array.from(element.attributes)
      .filter((attribute) => attribute.name.startsWith("data-"))
      .map((attribute) => `${attribute.name} ${attribute.value}`)
  ]
    .join(" ")
    .toLowerCase()
}

function textStats(element: Element) {
  const textLength = (element.textContent ?? "").trim().length
  const links = Array.from(element.querySelectorAll("a"))
  const linkLength = links.reduce(
    (total, link) => total + (link.textContent ?? "").trim().length,
    0
  )
  return {
    textLength,
    paragraphs: element.querySelectorAll("p").length,
    headings: element.querySelectorAll("h1, h2, h3").length,
    linkDensity: textLength ? linkLength / textLength : 1
  }
}

function isVisible(element: Element) {
  const rect = element.getBoundingClientRect()
  const style = getComputedStyle(element)
  return (
    rect.width > 80 &&
    rect.height > 24 &&
    style.display !== "none" &&
    style.visibility !== "hidden"
  )
}

function scoreElement(element: Element, region: LayoutRegion) {
  if (!isVisible(element)) return -Infinity
  const tag = element.tagName.toLowerCase()
  const role = element.getAttribute("role")?.toLowerCase() ?? ""
  const name = elementName(element)
  const stats = textStats(element)
  const rect = element.getBoundingClientRect()
  let score = 0

  if (REGION_HINTS[region].some((hint) => name.includes(hint))) score += 40
  if (tag === region) score += 75
  if (region === "header" && (tag === "header" || role === "banner"))
    score += 90
  if (region === "navigation" && (tag === "nav" || role === "navigation"))
    score += 100
  if (region === "content" && (tag === "main" || role === "main")) score += 110
  if (region === "content" && tag === "article") score += 80
  if (region === "sidebar" && (tag === "aside" || role === "complementary"))
    score += 90
  if (region === "footer" && (tag === "footer" || role === "contentinfo"))
    score += 90
  if (region === "comments" && name.includes("comment")) score += 75

  if (region === "content") {
    score += Math.min(stats.paragraphs * 9, 72)
    score += Math.min(stats.headings * 4, 20)
    score += Math.min(stats.textLength / 180, 45)
    score -= stats.linkDensity * 45
    if (rect.width > innerWidth * 0.95) score -= 18
  }

  if (region === "navigation") score += stats.linkDensity * 35
  if (region === "header" && rect.top < 160) score += 25
  if (region === "footer" && rect.top > innerHeight) score += 18
  if (region === "sidebar" && rect.width < innerWidth * 0.42) score += 18
  return score
}

function stableClassNames(element: Element) {
  return Array.from(element.classList)
    .filter(
      (name) =>
        name.length < 48 &&
        !/^(css-|jsx-|sc-|_[a-z0-9]|[a-z0-9]{8,})/i.test(name)
    )
    .slice(0, 2)
}

export function selectorFor(element: Element) {
  if (element.id && /^[A-Za-z][\w-]*$/.test(element.id)) {
    return `#${CSS.escape(element.id)}`
  }

  for (const attribute of ["data-testid", "data-role", "data-component"]) {
    const value = element.getAttribute(attribute)
    if (value && value.length < 80) {
      return `${element.tagName.toLowerCase()}[${attribute}="${CSS.escape(value)}"]`
    }
  }

  const path: string[] = []
  let current: Element | null = element
  while (current && current !== document.body && path.length < 4) {
    const tag = current.tagName.toLowerCase()
    const classes = stableClassNames(current)
    let part = `${tag}${classes.map((name) => `.${CSS.escape(name)}`).join("")}`
    if (!classes.length && current.parentElement) {
      const siblings = Array.from(current.parentElement.children).filter(
        (sibling) => sibling.tagName === current?.tagName
      )
      if (siblings.length > 1)
        part += `:nth-of-type(${siblings.indexOf(current) + 1})`
    }
    path.unshift(part)
    const selector = path.join(" > ")
    if (document.querySelectorAll(selector).length === 1) return selector
    current = current.parentElement
  }
  return path.join(" > ")
}

function findBest(region: LayoutRegion, candidates: Element[]) {
  return candidates
    .map((element) => ({ element, score: scoreElement(element, region) }))
    .sort((a, b) => b.score - a.score)[0]
}

function detectPageType(
  regions: Partial<Record<LayoutRegion, Element>>
): PageType {
  const content = regions.content
  if (!content) return "conservative"
  const name = elementName(content)
  if (
    /docs|documentation|markdown|wiki/.test(name) ||
    content.querySelectorAll("pre, code").length > 6
  )
    return "documentation"
  if (
    regions.comments &&
    /thread|forum|discussion|topic/.test(document.body.className + " " + name)
  )
    return "forum"
  const stats = textStats(content)
  if (stats.paragraphs >= 4 && stats.linkDensity < 0.35) return "article"
  if (stats.linkDensity > 0.45) return "feed"
  return "conservative"
}

export function analyzeDocument(): SiteLayoutRule {
  const candidates = Array.from(
    document.querySelectorAll(
      "header, nav, main, article, aside, footer, section, [role], body > div"
    )
  ).slice(0, 1200)
  const elements: Partial<Record<LayoutRegion, Element>> = {}
  const scores: number[] = []

  for (const region of Object.keys(REGION_HINTS) as LayoutRegion[]) {
    const result = findBest(region, candidates)
    const threshold = region === "content" ? 55 : 45
    if (result && result.score >= threshold) {
      elements[region] = result.element
      scores.push(Math.min(result.score / 130, 1))
    }
  }

  const now = Date.now()
  return {
    source: "local",
    status: "confirmed",
    pageType: detectPageType(elements),
    strategy: elements.content ? "balanced" : "preserve",
    regions: Object.fromEntries(
      Object.entries(elements).map(([region, element]) => [
        region,
        selectorFor(element)
      ])
    ),
    confidence: scores.length
      ? Number(
          (
            scores.reduce((sum, score) => sum + score, 0) / scores.length
          ).toFixed(2)
        )
      : 0,
    createdAt: now,
    updatedAt: now
  }
}

export function createDomSummary(): DomSummary {
  const candidates = Array.from(
    document.querySelectorAll(
      "header, nav, main, article, aside, footer, section, [role], body > div"
    )
  )
    .filter(isVisible)
    .slice(0, 180)
  const documentHeight = Math.max(
    document.documentElement.scrollHeight,
    document.body?.scrollHeight ?? 0,
    innerHeight
  )

  return {
    url: `${location.origin}${location.pathname}`,
    viewport: { width: innerWidth, height: innerHeight },
    documentHeight,
    nodes: candidates.flatMap((element) => {
      const selector = selectorFor(element)
      if (!selector) return []
      const rect = element.getBoundingClientRect()
      const stats = textStats(element)
      const center = rect.top + scrollY + rect.height / 2
      const landmark = (Object.keys(REGION_HINTS) as LayoutRegion[]).find(
        (region) => scoreElement(element, region) >= 70
      )
      return [
        {
          selector,
          tag: element.tagName.toLowerCase(),
          role: element.getAttribute("role") || undefined,
          landmark,
          zone:
            center < documentHeight * 0.25
              ? "top"
              : center > documentHeight * 0.75
                ? "bottom"
                : "middle",
          widthRatio: Number((rect.width / Math.max(innerWidth, 1)).toFixed(2)),
          textLength: Math.min(stats.textLength, 20_000),
          paragraphs: stats.paragraphs,
          headings: stats.headings,
          links: element.querySelectorAll("a").length
        } satisfies DomSummaryNode
      ]
    })
  }
}

export function checkLayoutHealth(rule?: SiteLayoutRule): LayoutHealth {
  if (!rule)
    return { valid: false, score: 0, matchedRegions: 0, missingRegions: [] }
  const entries = Object.entries(rule.regions) as Array<[LayoutRegion, string]>
  const missingRegions: LayoutRegion[] = []
  let matchedRegions = 0

  for (const [region, selector] of entries) {
    try {
      const count = document.querySelectorAll(selector).length
      if (count > 0 && count <= (region === "navigation" ? 4 : 2))
        matchedRegions += 1
      else missingRegions.push(region)
    } catch {
      missingRegions.push(region)
    }
  }
  const score = entries.length ? matchedRegions / entries.length : 0
  return {
    valid: Boolean(rule.regions.content) && score >= 0.6,
    score,
    matchedRegions,
    missingRegions
  }
}
