import { flushSync } from 'react-dom'
import { useSyncExternalStore } from 'react'

// The first choice is made before paint by public/prepaint.js; this is the live part.
const KEY = 'archiversal:theme'
const COLORS = { light: '#432818', dark: '#1f1209' } // the phone's status bar

const getTheme = () => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

const subscribe = (notify) => {
  window.addEventListener('themechange', notify)
  return () => window.removeEventListener('themechange', notify)
}

export const useTheme = () => useSyncExternalStore(subscribe, getTheme, () => 'light')

function apply(theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COLORS[theme])
  window.dispatchEvent(new Event('themechange'))
}


/**
 * Switches the theme and remembers the choice. With `origin` (the button that was pressed), the new
 * theme spreads in a circle from it, where the browser has view transitions; otherwise it just switches.
 */
export function setTheme(theme, origin) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Not remembered, but still switched.
  }
  if (!origin || !document.startViewTransition) return apply(theme)

  const box = origin.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))
  const root = document.documentElement
  root.classList.add('theme-wipe') // switches off the default cross-fade (base.css)
  const transition = document.startViewTransition(() => flushSync(() => apply(theme)))
  transition.ready
    .then(() =>
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', pseudoElement: '::view-transition-new(root)' },
      ),
    )
    .catch(() => {}) // skipped (the tab was hidden): the theme is already applied
  transition.finished.finally(() => root.classList.remove('theme-wipe'))
}

// Without a choice of their own, the page follows the system as it changes.
window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
  let saved = null
  try {
    saved = localStorage.getItem(KEY)
  } catch {
    // Storage blocked: follow the system.
  }
  if (!saved) apply(event.matches ? 'dark' : 'light')
})
