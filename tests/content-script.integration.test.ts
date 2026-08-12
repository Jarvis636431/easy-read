import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  EXTENSION_ENABLED_STORAGE_KEY,
  presets,
  RULES_STORAGE_KEY,
  STORAGE_KEY,
  type SiteLayoutRule
} from "~/shared/storage/repository"

import { installVisibleLayout, loadFixture } from "./helpers/dom"

type MessageListener = (
  message: Record<string, unknown>,
  sender: unknown,
  sendResponse: (response: unknown) => void
) => boolean | void

type StorageListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void

const articleLayout: SiteLayoutRule = {
  source: "manual",
  status: "confirmed",
  pageType: "article",
  templateId: "article",
  regions: {
    header: "#news-masthead",
    navigation: "#primary-navigation",
    content: "#story-content",
    sidebar: "#related-stories",
    comments: "#reader-comments",
    footer: "#news-footer"
  },
  hiddenRegions: ["sidebar"],
  collapsedRegions: ["comments"],
  confidence: 1,
  createdAt: 1,
  updatedAt: 1
}

function installChrome(storageValues: Record<string, unknown>) {
  const messageListeners: MessageListener[] = []
  const storageListeners: StorageListener[] = []
  const values = { ...storageValues }

  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: {
      runtime: {
        onMessage: {
          addListener: (listener: MessageListener) =>
            messageListeners.push(listener)
        },
        sendMessage: vi.fn()
      },
      storage: {
        local: {
          get: vi.fn(async (keys: string | string[]) => {
            const requested = Array.isArray(keys) ? keys : [keys]
            return Object.fromEntries(
              requested
                .filter((key) => key in values)
                .map((key) => [key, values[key]])
            )
          }),
          set: vi.fn(async (patch: Record<string, unknown>) => {
            Object.assign(values, patch)
          })
        },
        onChanged: {
          addListener: (listener: StorageListener) =>
            storageListeners.push(listener)
        }
      }
    }
  })

  return {
    values,
    messageListeners,
    storageListeners,
    sendMessage(message: Record<string, unknown>) {
      return new Promise<unknown>((resolve, reject) => {
        const listener = messageListeners[0]
        if (!listener) return reject(new Error("内容脚本没有注册消息监听器"))
        listener(message, {}, resolve)
      })
    },
    emitStorageChange(key: string, newValue: unknown) {
      const oldValue = values[key]
      values[key] = newValue
      for (const listener of storageListeners) {
        listener({ [key]: { oldValue, newValue } }, "local")
      }
    }
  }
}

beforeEach(() => {
  vi.resetModules()
  loadFixture("news-article.html")
  installVisibleLayout()
  history.replaceState({}, "", "/article/42")
})

describe("内容脚本集成", () => {
  it("启动时应用已确认规则、主题和区域状态", async () => {
    const chromeMock = installChrome({
      [EXTENSION_ENABLED_STORAGE_KEY]: true,
      [STORAGE_KEY]: presets.comfortable,
      [RULES_STORAGE_KEY]: [
        {
          id: "news",
          name: "新闻站",
          pattern: "localhost/*",
          enabled: true,
          themeId: "comfortable",
          customHideSelectors: ".newsletter-popup",
          layout: articleLayout
        }
      ]
    })

    await import("~/contents/easy-read")

    await vi.waitFor(() => {
      expect(
        document.documentElement.classList.contains("easy-read-active")
      ).toBe(true)
    })
    expect(chromeMock.messageListeners).toHaveLength(1)
    expect(document.getElementById("easy-read-page-styles")).not.toBeNull()
    expect(document.documentElement.dataset.easyReadLayout).toBe("article")
    expect(document.getElementById("easy-read-layout-shell")).not.toBeNull()
    expect(
      document.querySelector('[data-easy-read-slot="content"] #story-content')
    ).not.toBeNull()
    expect(
      document
        .querySelector('[data-easy-read-slot="sidebar"]')
        ?.getAttribute("data-state")
    ).toBe("hidden")
    expect(
      document
        .querySelector('[data-easy-read-slot="comments"]')
        ?.getAttribute("data-state")
    ).toBe("collapsed")
  })

  it("通过消息协议返回本地分析、摘要和布局校验结果", async () => {
    const chromeMock = installChrome({
      [EXTENSION_ENABLED_STORAGE_KEY]: false,
      [STORAGE_KEY]: presets.comfortable,
      [RULES_STORAGE_KEY]: []
    })
    await import("~/contents/easy-read")

    const analysis = (await chromeMock.sendMessage({
      type: "easy-read:analyze-layout"
    })) as { layout: SiteLayoutRule; health: { valid: boolean } }
    const summary = (await chromeMock.sendMessage({
      type: "easy-read:get-layout-summary"
    })) as { summary: { nodes: Array<{ selector: string }> } }
    const validation = (await chromeMock.sendMessage({
      type: "easy-read:validate-layout",
      layout: articleLayout
    })) as { health: { valid: boolean; score: number } }

    expect(analysis.layout.pageType).toBe("article")
    expect(analysis.health.valid).toBe(true)
    expect(summary.summary.nodes).toContainEqual(
      expect.objectContaining({ selector: "#story-content" })
    )
    expect(validation.health).toEqual(
      expect.objectContaining({ valid: true, score: 1 })
    )
  })

  it("扩展关闭后恢复移动过的原始 DOM 并移除注入样式", async () => {
    const chromeMock = installChrome({
      [EXTENSION_ENABLED_STORAGE_KEY]: true,
      [STORAGE_KEY]: presets.comfortable,
      [RULES_STORAGE_KEY]: [
        {
          id: "news",
          name: "新闻站",
          pattern: "localhost/*",
          enabled: true,
          themeId: "comfortable",
          customHideSelectors: "",
          layout: articleLayout
        }
      ]
    })
    await import("~/contents/easy-read")
    await vi.waitFor(() =>
      expect(document.getElementById("easy-read-layout-shell")).not.toBeNull()
    )

    chromeMock.emitStorageChange(EXTENSION_ENABLED_STORAGE_KEY, false)

    await vi.waitFor(() => {
      expect(document.getElementById("easy-read-layout-shell")).toBeNull()
    })
    expect(
      document.documentElement.classList.contains("easy-read-active")
    ).toBe(false)
    expect(document.getElementById("easy-read-page-styles")).toBeNull()
    expect(document.querySelector(".page-grid #story-content")).not.toBeNull()
    expect(document.getElementById("reader-comments")?.parentElement).toBe(
      document.body
    )
  })
})
