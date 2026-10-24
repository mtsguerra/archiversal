// Ids of buildings already shown in this tab, so rounds don't repeat.
// sessionStorage can throw (privacy modes, blocked storage); the game then just forgets.
const KEY = 'archiversal:seen'

export function readSeen() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY))
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

function write(ids) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(ids))
  } catch {
    // Ignore: repetition is harmless.
  }
}

/**
 * Records a served building. If it was already seen, the backend has run out
 * of unseen buildings and started over, so the list restarts from this one.
 */
export function recordSeen(id, seenBefore) {
  write(seenBefore.includes(id) ? [id] : [...seenBefore, id])
}
