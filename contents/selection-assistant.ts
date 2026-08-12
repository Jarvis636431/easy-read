export function selectionRect(selection: Selection) {
  if (!selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()
  if (rect.width || rect.height) return rect
  return range.getClientRects()[0] ?? null
}

export function selectionIsEditable(selection: Selection) {
  const node = selection.anchorNode
  const element =
    node instanceof Element ? node : node?.parentElement ?? undefined
  return Boolean(element?.closest("input, textarea, [contenteditable='true']"))
}

export function selectionContext(selection: Selection) {
  if (!selection.rangeCount) return ""
  const ancestor = selection.getRangeAt(0).commonAncestorContainer
  const element =
    ancestor instanceof Element ? ancestor : ancestor.parentElement
  const container = element?.closest(
    "p, li, blockquote, article, section, main, [role='main']"
  )
  return (container?.textContent ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 1800)
}
