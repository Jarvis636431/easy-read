import type { EasyReadSettings, ShareCardTemplate } from "~lib/settings"

const CARD_WIDTH = 1080
const HORIZONTAL_PADDING = 96
const MAX_TEXT_LENGTH = 520

function canvasFontFamily(fontFamily: string) {
  return fontFamily.replace(/!important/gi, "").trim()
}

function alpha(color: string, opacity: number) {
  const match = color.match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)
  if (!match) return color
  return `rgba(${Number.parseInt(match[1], 16)}, ${Number.parseInt(match[2], 16)}, ${Number.parseInt(match[3], 16)}, ${opacity})`
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath()
  context.roundRect(x, y, width, height, radius)
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number
) {
  const normalized = text.replace(/\s+/g, " ").trim()
  const lines: string[] = []
  let line = ""

  for (const character of Array.from(normalized)) {
    const candidate = line + character
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate
      continue
    }
    lines.push(line.trimEnd())
    line = character.trimStart()
    if (lines.length === maxLines) break
  }
  if (lines.length < maxLines && line) lines.push(line.trimEnd())

  const rendered = lines.join("")
  if (rendered.length < normalized.length && lines.length) {
    let last = lines.length - 1
    while (
      lines[last] &&
      context.measureText(`${lines[last]}…`).width > maxWidth
    ) {
      lines[last] = lines[last].slice(0, -1)
    }
    lines[last] = `${lines[last]}…`
  }
  return lines
}

function canvasToBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error("无法生成分享图片"))
    }, "image/png")
  })
}

export async function createShareCard(
  selectedText: string,
  settings: EasyReadSettings,
  template: ShareCardTemplate,
  source: string
) {
  const text = selectedText.trim().slice(0, MAX_TEXT_LENGTH)
  if (!text) throw new Error("没有可分享的文字")

  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")
  if (!context) throw new Error("当前浏览器不支持 Canvas")

  const colors = template.followTheme
    ? {
        page: settings.pageColor,
        card: settings.contentColor,
        text: settings.textColor,
        accent: settings.linkColor
      }
    : {
        page: template.pageColor,
        card: template.cardColor,
        text: template.textColor,
        accent: template.accentColor
      }
  const fontFamily = template.followTheme
    ? settings.fontFamily
    : template.fontFamily
  const baseFontSize = text.length > 300 ? 38 : text.length > 150 ? 44 : 50
  const fontSize = Math.round(baseFontSize * template.fontScale)
  const lineHeight = Math.round(fontSize * 1.58)
  context.font = `600 ${fontSize}px ${canvasFontFamily(fontFamily)}`
  const lines = wrapText(
    context,
    text,
    CARD_WIDTH - HORIZONTAL_PADDING * 2 - 48,
    12
  )
  const cardHeight = Math.max(720, 318 + lines.length * lineHeight)
  canvas.width = CARD_WIDTH
  canvas.height = cardHeight

  context.fillStyle = colors.page
  context.fillRect(0, 0, canvas.width, canvas.height)

  context.fillStyle = alpha(colors.accent, 0.12)
  context.beginPath()
  context.arc(CARD_WIDTH - 62, 74, 210, 0, Math.PI * 2)
  context.fill()

  const cardX = 58
  const cardY = 58
  const cardWidth = CARD_WIDTH - 116
  const innerHeight = cardHeight - 116
  context.shadowColor = alpha(colors.text, 0.15)
  context.shadowBlur = 30
  context.shadowOffsetY = 12
  context.fillStyle = colors.card
  roundedRect(
    context,
    cardX,
    cardY,
    cardWidth,
    innerHeight,
    template.cornerRadius
  )
  context.fill()
  context.shadowColor = "transparent"

  context.fillStyle = colors.accent
  roundedRect(context, cardX, cardY, 12, innerHeight, 6)
  context.fill()

  context.fillStyle = alpha(colors.text, 0.16)
  context.font = `700 116px ${canvasFontFamily(fontFamily)}`
  context.fillText("“", 102, 184)

  context.fillStyle = colors.text
  context.font = `600 ${fontSize}px ${canvasFontFamily(fontFamily)}`
  context.textBaseline = "top"
  lines.forEach((line, index) => {
    context.fillText(line, HORIZONTAL_PADDING + 24, 210 + index * lineHeight)
  })

  const footerY = cardHeight - 138
  context.fillStyle = alpha(colors.text, 0.16)
  context.fillRect(HORIZONTAL_PADDING + 24, footerY - 28, 840, 2)

  context.textBaseline = "alphabetic"
  if (template.showSource) {
    context.fillStyle = alpha(colors.text, 0.62)
    context.font = `500 24px ${canvasFontFamily(fontFamily)}`
    context.fillText(source, HORIZONTAL_PADDING + 24, footerY + 18)
  }

  if (template.showBranding) {
    context.textAlign = "right"
    context.fillStyle = colors.accent
    context.font = "700 22px ui-monospace, SFMono-Regular, Menlo, monospace"
    context.fillText("EASY READ", CARD_WIDTH - HORIZONTAL_PADDING, footerY + 18)
  }

  return canvasToBlob(canvas)
}

export async function copyShareCard(
  selectedText: string,
  settings: EasyReadSettings,
  template: ShareCardTemplate,
  source: string
) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("当前浏览器不支持复制图片")
  }
  const blob = await createShareCard(selectedText, settings, template, source)
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })])
}
