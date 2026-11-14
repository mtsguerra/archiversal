import { useCallback, useEffect, useState } from 'react'
import { useAccount } from './account.js'
import { rpc } from './client.js'

/** Which message a failed call deserves. */
const problem = (error) => (error?.code === 'PT429' ? 'limit' : error?.code === 'PT404' ? 'missing' : 'failed')

/**
 * The signed-in player's friends, requests and blocks, with `act(fn, args)` to change them: it calls the
 * database function, reloads the lists and returns the function's answer (null when it has none), or
 * undefined after a failure, which is shown through `error` ('limit' | 'missing' | 'failed').
 */
export function useFriends() {
  const { status, profile } = useAccount()
  const ready = status === 'in' && Boolean(profile)
  const [lists, setLists] = useState(null)
  const [error, setError] = useState(null)
  const [version, setVersion] = useState(0)
  useEffect(() => {
    if (!ready) return undefined
    let live = true
    rpc('list_friends').then(
      (found) => live && setLists(found),
      (e) => live && setError(problem(e)),
    )
    return () => {
      live = false
    }
  }, [ready, version])
  const act = useCallback(async (fn, args) => {
    setError(null)
    try {
      const answer = await rpc(fn, args)
      setVersion((v) => v + 1)
      return answer ?? null
    } catch (e) {
      setError(problem(e))
      return undefined
    }
  }, [])
  return { ready, lists, error, act }
}
