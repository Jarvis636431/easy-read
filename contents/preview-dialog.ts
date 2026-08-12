export const PREVIEW_HOST_ID = "easy-read-layout-preview"
export const PREVIEW_STYLE_ID = "easy-read-layout-preview-styles"
export const PREVIEW_CLASS = "easy-read-layout-previewing"

export function clearPreviewUi() {
  document.getElementById(PREVIEW_HOST_ID)?.remove()
  document.getElementById(PREVIEW_STYLE_ID)?.remove()
  document.documentElement.classList.remove(PREVIEW_CLASS)
}
