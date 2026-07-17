import type { DomSummary } from "~lib/layout"
import { analyzeLayoutWithLlm, interpretReadingCommand } from "~lib/llm"
import {
  AD_RULESET_ID,
  EXTENSION_ENABLED_STORAGE_KEY,
  NETWORK_BLOCKING_STORAGE_KEY,
  readExtensionEnabled,
  readLlmSettings,
  readNetworkBlocking
} from "~lib/settings"

async function syncNetworkBlocking() {
  const [networkBlocking, extensionEnabled] = await Promise.all([
    readNetworkBlocking(),
    readExtensionEnabled()
  ])
  const enabled = networkBlocking && extensionEnabled
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: enabled ? [AD_RULESET_ID] : [],
    disableRulesetIds: enabled ? [] : [AD_RULESET_ID]
  })
}

void syncNetworkBlocking()

chrome.runtime.onInstalled.addListener(() => {
  void syncNetworkBlocking()
})

chrome.runtime.onStartup.addListener(() => {
  void syncNetworkBlocking()
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (
    areaName === "local" &&
    (changes[NETWORK_BLOCKING_STORAGE_KEY] ||
      changes[EXTENSION_ENABLED_STORAGE_KEY])
  ) {
    void syncNetworkBlocking()
  }
})

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message?.type !== "easy-read:analyze-layout-with-llm" &&
    message?.type !== "easy-read:interpret-reading-command"
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
      const layout =
        message.type === "easy-read:interpret-reading-command"
          ? await interpretReadingCommand(
              provider,
              message.summary as DomSummary,
              String(message.instruction ?? "")
            )
          : await analyzeLayoutWithLlm(provider, message.summary as DomSummary)
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
