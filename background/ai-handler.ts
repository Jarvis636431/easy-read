import {
  analyzeLayoutWithLlm,
  assistSelection,
  interpretReadingCommand,
  type SelectionAssistantAction
} from "~features/ai/client"
import type { DomSummary } from "~features/layouts/analyzer"
import { readLlmSettings } from "~shared/storage/repository"
import { hasMessageType } from "~shared/validation/guards"

export function registerAiHandler() {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!hasMessageType(message)) return
    if (
      message.type !== "easy-read:analyze-layout-with-llm" &&
      message.type !== "easy-read:interpret-reading-command" &&
      message.type !== "easy-read:assist-selection"
    )
      return
    void (async () => {
      try {
        const settings = await readLlmSettings()
        if (!settings.enabled) throw new Error("请先在设置页启用 AI 分析")
        const provider = settings.providers.find(
          (item) => item.id === settings.activeProviderId
        )
        if (!provider) throw new Error("未找到当前 AI 供应商")
        if (message.type === "easy-read:assist-selection") {
          const result = await assistSelection(
            provider,
            message.action as SelectionAssistantAction,
            String(message.selectedText ?? ""),
            String(message.context ?? ""),
            String(message.pageLanguage ?? "")
          )
          sendResponse({ ok: true, result })
          return
        }
        const layout =
          message.type === "easy-read:interpret-reading-command"
            ? await interpretReadingCommand(
                provider,
                message.summary as DomSummary,
                String(message.instruction ?? "")
              )
            : await analyzeLayoutWithLlm(
                provider,
                message.summary as DomSummary
              )
        sendResponse({ ok: true, layout })
      } catch (error) {
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : "AI 分析失败"
        })
      }
    })()
    return true
  })
}
