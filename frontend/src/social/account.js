// Who is signed in, as one small store. Guests ('out') and builds without accounts ('off') never
// touch the network here.
import { useSyncExternalStore } from 'react'
import { accountsEnabled, rpc, supabase } from './client.js'
import { syncProgress } from './sync.js'

const FIELDS = 'username, avatar, bio, favorite_kind, favorite, privacy'

// status: 'off' (no accounts in this build) | 'loading' | 'out' | 'in'; profile is null until a username is chosen.
// `synced` goes up whenever the account brought progress into this browser, so screens can read it again.
let state = { status: accountsEnabled ? 'loading' : 'off', profile: null, synced: 0 }
const listeners = new Set()
const set = (patch) => {
  state = { ...state, ...patch }
  listeners.forEach((notify) => notify())
}
const subscribe = (notify) => {
  listeners.add(notify)
  return () => listeners.delete(notify)
}
export const useAccount = () => useSyncExternalStore(subscribe, () => state, () => state)
export const getAccount = () => state

let userId = null
const AFTER = 'archiversal:after-sign-in'
let timer

/** Sends progress to the account and takes the account's back; safe to call at any time. */
export async function syncNow() {
  if (state.status !== 'in') return
  try {
    const added = await syncProgress()
    if (added) set({ synced: state.synced + 1 })
    afterSync.forEach((run) => run())
  } catch {
    // offline or the service is down: the browser keeps everything and the next sync sends it
  }
}
/** Hooks that run after each sync (the badge check registers itself here). */
export const afterSync = new Set()

/** A sync a moment from now (after a reveal has been saved). */
export function queueSync() {
  if (state.status !== 'in') return
  clearTimeout(timer)
  timer = setTimeout(syncNow, 1500)
}

async function onSession(session) {
  if (!session) {
    userId = null
    set({ status: 'out', profile: null })
    return
  }
  if (session.user.id === userId) return // a token refresh: nothing changed
  userId = session.user.id
  try {
    const { data, error } = await (await supabase()).from('profiles').select(FIELDS).maybeSingle()
    if (error) throw error
    set({ status: 'in', profile: data })
    // Coming back from Google lands on the bare address: go on to where the sign-in was started.
    try {
      const next = sessionStorage.getItem(AFTER)
      sessionStorage.removeItem(AFTER)
      if (next) window.location.hash = next
    } catch {
      // no storage: stay on the home page
    }
    syncNow() // the first sign-in on this browser merges the guest progress into the account
  } catch {
    userId = null
    set({ status: 'out', profile: null })
  }
}

/** Starts watching the session; called once at startup. */
export function initAccount() {
  if (!accountsEnabled) return
  supabase()
    // The callback must not await Supabase calls itself, so the work is deferred.
    .then((sb) => sb.auth.onAuthStateChange((_event, session) => setTimeout(() => onSession(session), 0)))
    .catch(() => set({ status: 'out' }))
}

export async function signIn() {
  // Back to the site's own address; the page then finishes the sign-in and returns to the profile.
  try {
    sessionStorage.setItem(AFTER, '#/profile')
  } catch {
    // no storage: the player lands on the home page instead
  }
  await (await supabase()).auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } })
}

/** Signs out here only; what was played stays in this browser, so guest play goes on. */
export async function signOut() {
  await (await supabase()).auth.signOut({ scope: 'local' })
}

/**
 * Creates or changes the signed-in player's profile. Returns null, or what went wrong:
 * 'taken' (username in use), 'refused' (a rule in the database said no) or 'failed'.
 */
export async function saveProfile(fields) {
  try {
    const table = (await supabase()).from('profiles')
    const query = state.profile ? table.update(fields).eq('id', userId) : table.insert({ id: userId, ...fields })
    const { data, error } = await query.select(FIELDS).single()
    if (error) return error.code === '23505' ? 'taken' : error.code === '23514' ? 'refused' : 'failed'
    set({ profile: data })
    return null
  } catch {
    return 'failed'
  }
}

export async function deleteAccount() {
  await rpc('delete_account')
  await signOut()
}
