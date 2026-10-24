import { useSyncExternalStore } from 'react'
import { dailyNumber } from './game/daily.js'
import { withTransition } from './viewTransition.js'

const ROUTES = { '#/play': 'play', '#/daily': 'daily', '#/custom': 'custom', '#/custom/play': 'customPlay', '#/themed': 'themed', '#/themed/play': 'themedPlay', '#/library': 'library' }

const LIBRARY_BUILDING = /^#\/library\/([a-z0-9-]+)$/

/** The building id in `#/library/<id>`, or null for any other hash. */
export const libraryIdFrom = (hash) => LIBRARY_BUILDING.exec(hash)?.[1] ?? null

const PAST_DAILY = /^#\/daily\/(\d+)$/

/** The number in `#/daily/<n>` when it names a day before today, else null. */
export const pastDailyFrom = (hash, today = dailyNumber()) => {
  const n = Number(PAST_DAILY.exec(hash)?.[1])
  return n >= 1 && n < today ? n : null
}

/** The hash picks the screen; anything unknown is the homepage. */
export const routeFrom = (hash) => ROUTES[hash] ?? (libraryIdFrom(hash) ? 'libraryBuilding' : pastDailyFrom(hash) ? 'dailyPast' : 'home')

const subscribe = (notify) => {
  const onChange = () => withTransition(notify)
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

export const useRoute = () =>
  useSyncExternalStore(subscribe, () => routeFrom(window.location.hash), () => 'home')
