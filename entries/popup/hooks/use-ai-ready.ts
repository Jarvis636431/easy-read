import { useMemo } from "react"

import type { LlmSettings } from "~features/ai"

export function useAiReady(settings: LlmSettings | null) {
  return useMemo(() => {
    const provider = settings?.providers.find(
      (item) => item.id === settings.activeProviderId
    )
    return Boolean(settings?.enabled && provider?.apiKey && provider.model)
  }, [settings])
}
