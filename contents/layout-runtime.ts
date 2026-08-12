import type { LayoutRegion } from "~features/layouts"

export const STYLE_ID = "easy-read-page-styles"
export const ROOT_CLASS = "easy-read-active"
export const REGION_ATTRIBUTE = "data-easy-read-region"
export const VISIBILITY_ATTRIBUTE = "data-easy-read-visibility"
export const LAYOUT_ATTRIBUTE = "data-easy-read-layout"
export const LAYOUT_SHELL_ID = "easy-read-layout-shell"
export const TEMPLATED_CLASS = "easy-read-templated"

export const REGION_LABELS: Record<LayoutRegion, string> = {
  header: "页头",
  navigation: "导航",
  content: "正文",
  sidebar: "侧栏",
  comments: "评论",
  footer: "页脚"
}

export const REGION_COLORS: Record<LayoutRegion, string> = {
  header: "#547a91",
  navigation: "#805da3",
  content: "#168678",
  sidebar: "#c27632",
  comments: "#a34f6f",
  footer: "#657078"
}
