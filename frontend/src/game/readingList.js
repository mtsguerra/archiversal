// The reading list: locked buildings the player wants to find, by id. Kept only on this device and read
// back defensively, like the Library's unlocks.
const KEY = 'arch-guesser:reading'
const LIMIT = 200
const ID = /^[a-z0-9-]{1,80}$/

export function sanitizeReading(raw) {
  if (!Array.isArray(raw)) return []
  return [...new Set(raw.filter((id) => typeof id === 'string' && ID.test(id)))].slice(0, LIMIT)
}

export function readReading() {
  try {
    return sanitizeReading(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return []
  }
}

/** The list with `id` added, or removed when it was there. Saved before it is returned. */
export function toggleReading(list, id) {
  const next = sanitizeReading(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked: the list just isn't kept
  }
  return next
}
