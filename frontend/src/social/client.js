// The Supabase connection. Accounts are optional: with no project configured (or a key that must never
// ship), `accountsEnabled` is false, nothing here is loaded and the site is exactly the guest game.
const url = import.meta.env.VITE_SUPABASE_URL ?? ''
const key = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

const roleOf = (jwt) => {
  try {
    return JSON.parse(atob(jwt.split('.')[1].replaceAll('-', '+').replaceAll('_', '/'))).role
  } catch {
    return null
  }
}

/**
 * Only a public key may ship in the page: a publishable key (`sb_publishable_…`) or an `anon` JWT.
 * A secret or service-role key bypasses Row Level Security, so it switches accounts off instead of working.
 */
export const isPublicKey = (k) => typeof k === 'string' && (k.startsWith('sb_publishable_') || roleOf(k) === 'anon')

/** A Supabase project address (or a local one while developing). */
export const isProjectUrl = (u, dev = false) => /^https:\/\/[a-z0-9]{10,40}\.supabase\.co$/.test(u) || (dev && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(u))

export const accountsEnabled = isProjectUrl(url, import.meta.env.DEV) && isPublicKey(key)

let client
/** The client, loaded on first use so guests never download it. */
export const supabase = () =>
  (client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key, { auth: { flowType: 'pkce' } })))

/** Calls a database function; throws the database's error (it has a `code`). */
export async function rpc(fn, args) {
  const { data, error } = await (await supabase()).rpc(fn, args)
  if (error) throw error
  return data
}
