import type { RuntimeRequest, RuntimeResponse } from "./protocol"

export function sendRuntimeRequest(request: RuntimeRequest) {
  return chrome.runtime.sendMessage(request) as Promise<RuntimeResponse>
}
