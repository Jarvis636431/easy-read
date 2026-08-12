import type {
  SelectionAssistantAction,
  SelectionAssistantResult
} from "~features/selection"
import type { SiteLayoutRule } from "~shared/storage/repository"
import type { DomSummary } from "~shared/types/layout"

export type RuntimeRequest =
  | { type: "easy-read:analyze-layout-with-llm"; summary: DomSummary }
  | {
      type: "easy-read:interpret-reading-command"
      summary: DomSummary
      instruction: string
    }
  | {
      type: "easy-read:assist-selection"
      action: SelectionAssistantAction
      selectedText: string
      context: string
      pageLanguage: string
    }

export type RuntimeResponse =
  | { ok: true; layout: SiteLayoutRule }
  | { ok: true; result: SelectionAssistantResult }
  | { ok: false; error: string }

export type ContentRequest =
  | { type: "easy-read:analyze-layout" }
  | { type: "easy-read:get-layout-summary" }
  | { type: "easy-read:validate-layout"; layout: SiteLayoutRule }
  | {
      type: "easy-read:preview-layout"
      layout: SiteLayoutRule
      themeId: string
    }
