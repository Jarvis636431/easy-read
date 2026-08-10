type ValueChange<T> = (value: T) => void

export function ColorField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: ValueChange<string>
}) {
  return (
    <label className="color-field">
      <span>{label}</span>
      <div>
        <input
          type="color"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <code>{value.toUpperCase()}</code>
      </div>
    </label>
  )
}

export function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = "",
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: ValueChange<number>
}) {
  return (
    <label>
      <span>{label}</span>
      <div className="number-input">
        <input
          type="number"
          value={value}
          min={min}
          max={max}
          step={step}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        {suffix && <b>{suffix}</b>}
      </div>
    </label>
  )
}

export function CheckField({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: ValueChange<boolean>
}) {
  return (
    <label>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />{" "}
      {label}
    </label>
  )
}

export function TextField({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: ValueChange<string>
}) {
  return (
    <label>
      <span>{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
