export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

export function hasMessageType(
  value: unknown
): value is Record<string, unknown> & { type: string } {
  return isRecord(value) && typeof value.type === "string"
}
