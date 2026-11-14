import { useEffect, useState } from 'react'
import { useAccount } from './account.js'
import { fetchBadges, fetchUserBadges } from './badges.js'
import { rpc } from './client.js'

/**
 * What the profile plan draws into its rooms, read together: the player's own card (stats), badges,
 * friends and challenges. Null until it arrives or when it could not be read (the plan then draws empty rooms).
 * Asked again when `key` changes (moving between rooms) and when a sync brings progress or badges.
 */
export function usePlanData(key) {
  const { profile, synced, newBadges } = useAccount()
  const username = profile?.username
  const [data, setData] = useState(null)
  useEffect(() => {
    if (!username) return undefined
    let live = true
    Promise.all([rpc('get_profile', { name: username }), fetchBadges(), fetchUserBadges(username), rpc('list_friends'), rpc('list_challenges')]).then(
      ([card, catalogue, badges, friends, challenges]) =>
        live && setData({ card, catalogue, earned: badges?.earned ?? [], friends, open: challenges.filter((c) => !c.mine).length }),
      () => live && setData(null),
    )
    return () => {
      live = false
    }
  }, [username, key, synced, newBadges])
  return data
}
