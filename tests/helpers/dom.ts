import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { vi } from "vitest"

export function loadFixture(name: string) {
  const path = resolve(process.cwd(), "tests", "fixtures", name)
  const html = readFileSync(path, "utf8")
  document.documentElement.innerHTML =
    new DOMParser().parseFromString(html, "text/html").documentElement.innerHTML
}

export function installVisibleLayout() {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: 1200
  })
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: 800
  })
  Object.defineProperty(globalThis, "CSS", {
    configurable: true,
    value: {
      escape: (value: string) => value.replace(/[^\w-]/g, "\\$&")
    }
  })
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function () {
      const element = this as HTMLElement
      const top = Number(element.dataset.testTop ?? 0)
      const width = Number(
        element.dataset.testWidth ??
          (element.matches("aside") ? 300 : element.matches("nav") ? 1000 : 900)
      )
      const height = Number(
        element.dataset.testHeight ??
          Math.max(80, 60 + (element.textContent?.length ?? 0) * 2)
      )
      return {
        x: 0,
        y: top,
        top,
        right: width,
        bottom: top + height,
        left: 0,
        width,
        height,
        toJSON: () => ({})
      }
    }
  )
}
