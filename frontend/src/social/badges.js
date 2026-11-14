// Badges on the client: names, the showcase, and the two reads. Granting happens only in the database.
import { rpc, supabase } from './client.js'

export const MAX_SHOWCASE = 3

/** The era an era badge is for ('era-art-nouveau' -> 'ART_NOUVEAU'), or null for any other badge. */
export const eraOfBadge = (id) => (/^era-[a-z-]+$/.test(id) ? id.slice(4).toUpperCase().replaceAll('-', '_') : null)

export function badgeName(strings, id) {
  const era = eraOfBadge(id)
  return era ? strings.badges.era(strings.eras[era] ?? era) : (strings.badges.names[id] ?? id)
}

/** How a badge is earned. */
export function badgeHint(strings, id) {
  const era = eraOfBadge(id)
  return era ? strings.badges.eraHint(strings.eras[era] ?? era) : (strings.badges.hints[id] ?? '')
}

/** The showcase with `id` pinned or unpinned; only earned badges go in, and a fourth pin is ignored. */
export function togglePin(showcase, id, earnedIds) {
  if (showcase.includes(id)) return showcase.filter((x) => x !== id)
  return earnedIds.includes(id) && showcase.length < MAX_SHOWCASE ? [...showcase, id] : showcase
}

let catalogue
/** Every badge there is (public), fetched once; a failure is not cached. */
export function fetchBadges() {
  catalogue ??= supabase()
    .then((sb) => sb.from('badges').select('id, kind, rule, target, threshold').order('sort').order('id'))
    .then(({ data, error }) => {
      if (error) throw error
      return data
    })
    .catch((error) => {
      catalogue = undefined
      throw error
    })
  return catalogue
}

/** { earned: [{ id, at }], showcase: [id] } for `username`, or null when the viewer may not see them. */
export const fetchUserBadges = (username) => rpc('get_badges', { name: username })
