// The shape of a username, checked before asking the database (which also holds the reserved and
// impolite names, and is the one that decides).
export const USERNAME = /^[a-z][a-z0-9_]{2,19}$/
export const MAX_BIO = 160

/** What is wrong with a typed username: 'short' | 'long' | 'start' | 'chars', or null when the shape is fine. */
export function usernameProblem(name) {
  if (name.length < 3) return 'short'
  if (name.length > 20) return 'long'
  if (!/^[a-z]/.test(name)) return 'start'
  return USERNAME.test(name) ? null : 'chars'
}

const PROFILE_LINK = /^#\/u\/([a-z][a-z0-9_]{2,19})$/
/** The username in `#/u/<username>`, or null. */
export const usernameFrom = (hash) => PROFILE_LINK.exec(hash)?.[1] ?? null

const INVITE = /([0-9a-f]{20})\s*$/
/** The invite code in `#/invite/<code>`, in a pasted link, or typed alone; null when there is none. */
export const inviteFrom = (text) => INVITE.exec(text.trim())?.[1] ?? null
export const inviteCodeFromHash = (hash) => /^#\/invite\/([0-9a-f]{20})$/.exec(hash)?.[1] ?? null
