import { useEffect, useRef, useState } from "react"

export function useSavedIndicator(duration = 1400) {
  const [saved, setSaved] = useState(false)
  const timeoutRef = useRef<number>()

  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    },
    []
  )

  const showSaved = () => {
    setSaved(true)
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    timeoutRef.current = window.setTimeout(() => setSaved(false), duration)
  }

  return { saved, showSaved }
}
