// Keeps the account and this browser in step: the browser's progress goes up, the account's comes back,
// and both sides only ever gain (see mergeSave and the database's sync_progress).
import { sanitizeLibrary } from '../game/library.js'
import { sanitizeProgress } from '../game/progress.js'
import { localSave, mergeSave } from '../game/save.js'
import { rpc } from './client.js'

/** What is sent: the same shapes the browser stores, cleaned first. */
export function outgoing(save) {
  return { library: sanitizeLibrary(save.library), days: save.days && typeof save.days === 'object' && !Array.isArray(save.days) ? save.days : {}, progress: sanitizeProgress(save.progress) }
}

/** Two-way merge; returns how many buildings the account brought to this browser (null if storage failed). */
export async function syncProgress() {
  const account = await rpc('sync_progress', { p: outgoing(localSave()) })
  return mergeSave({ v: 1, ...account })
}
