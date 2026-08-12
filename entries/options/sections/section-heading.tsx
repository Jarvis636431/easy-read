import type { ReactNode } from "react"

export function SectionHeading({
  eyebrow,
  title,
  children
}: {
  eyebrow: string
  title: string
  children: ReactNode
}) {
  return (
    <div className="section-heading">
      <div>
        <span>{eyebrow}</span>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  )
}
