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
