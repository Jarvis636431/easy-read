import {
  AD_RULESET_ID,
  EXTENSION_ENABLED_STORAGE_KEY,
  NETWORK_BLOCKING_STORAGE_KEY,
  readExtensionEnabled,
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
