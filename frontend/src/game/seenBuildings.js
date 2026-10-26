// The building shown last in this tab, so a round never repeats the one before.
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

/** Records the served building; only the last one is kept, so the next round is never the same but any other can come back. */
export function recordSeen(id) {
  write([id])
}
