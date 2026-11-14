// A challenge is a Custom session of ten fixed buildings whose id travels with the session; when the
// recap opens, which of the ten were named goes to the database. No score, no winner.
import { fetchCatalogue } from '../api/buildings.js'
import { emptyConfig, restoreSession, shuffle, startSession } from '../game/custom.js'
import { rpc } from './client.js'

export const CHALLENGE_SIZE = 10

/** Starts playing a challenge ({ id, buildings }) as a Custom session. */
export function playChallenge({ id, buildings }) {
  const session = startSession(buildings.map((building) => ({ id: building })), { ...emptyConfig, rounds: 'all' })
  restoreSession({ ...session, challenge: id })
  window.location.hash = '#/custom/play'
}

/** Sets ten random buildings for friend `username` and starts the sender's own go at them. */
export async function sendChallenge(username, random) {
  const buildings = shuffle(await fetchCatalogue(), random).slice(0, CHALLENGE_SIZE).map((b) => b.id)
  playChallenge({ id: await rpc('challenge_create', { name: username, ids: buildings }), buildings })
}

/** What is sent: every building of the session, true when its name was guessed. */
export const challengeResult = (session) => Object.fromEntries(session.ids.map((id) => [id, session.played.some((p) => p.id === id && p.named)]))

export const submitChallenge = (session) => rpc('challenge_submit', { challenge: session.challenge, result: challengeResult(session) })
