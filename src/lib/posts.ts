export function parsePostTags(rawTags: string | null | undefined): string[] {
  if (!rawTags) return []

  try {
    const parsed = JSON.parse(rawTags) as unknown
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((tag): tag is string => typeof tag === 'string')
      .map((tag) => tag.trim())
      .filter(Boolean)
  } catch {
    return []
  }
}