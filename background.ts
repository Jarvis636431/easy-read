import {
  AD_RULESET_ID,
  NETWORK_BLOCKING_STORAGE_KEY,
  readNetworkBlocking
} from "~lib/settings"

async function syncNetworkBlocking() {
  const enabled = await readNetworkBlocking()
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
  if (areaName === "local" && changes[NETWORK_BLOCKING_STORAGE_KEY]) {
    void syncNetworkBlocking()
  }
})
