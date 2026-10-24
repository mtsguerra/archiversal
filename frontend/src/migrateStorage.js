// The site used to be called Arch Guesser. Whatever the browser saved under the old key prefix is copied to the new one
// once (a value already saved under the new name wins) and the old key is dropped. It runs first, before anything reads.
const OLD = 'arch-guesser:'
const NEW = 'archiversal:'

for (const store of ['localStorage', 'sessionStorage']) {
  try {
    const area = window[store]
    for (const key of Object.keys(area)) {
      if (!key.startsWith(OLD)) continue
      const next = NEW + key.slice(OLD.length)
      if (area.getItem(next) === null) area.setItem(next, area.getItem(key))
      area.removeItem(key)
    }
  } catch {
    // Storage blocked or full: nothing to carry over.
  }
}
