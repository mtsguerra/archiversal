import { useSyncExternalStore } from 'react'

// The first value is set before paint by public/prepaint.js (the saved choice, else the system setting);
// this is the live part. CSS reads html[data-motion='reduced'] (postcss-motion-attr.js).
const KEY = 'archiversal:motion'
const NOTE_KEY = 'archiversal:motion-note'

export const isReduced = () => document.documentElement.dataset.motion === 'reduced'

const subscribe = (notify) => {
  window.addEventListener('motionchange', notify)
  return () => window.removeEventListener('motionchange', notify)
}

/** Drop-in for Motion's `useReducedMotion`, driven by the toggle as well as the system. */
export const useReducedMotion = () => useSyncExternalStore(subscribe, isReduced, () => false)

/** True while reduced motion is on and the explanation hasn't been dismissed. */
export const useMotionNote = () => useSyncExternalStore(subscribe, () => isReduced() && !noteSeen(), () => false)

export function setReduced(reduced) {
  try {
    localStorage.setItem(KEY, reduced ? 'reduced' : 'full')
  } catch {
    // Not remembered, but still switched.
  }
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
  window.dispatchEvent(new Event('motionchange'))
}

export const noteSeen = () => {
  try {
    return localStorage.getItem(NOTE_KEY) === '1'
  } catch {
    return true
  }
}

export function dismissNote() {
  try {
    localStorage.setItem(NOTE_KEY, '1')
  } catch {
    // It may show again next visit.
  }
  window.dispatchEvent(new Event('motionchange'))
}
