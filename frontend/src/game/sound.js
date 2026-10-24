import { useSyncExternalStore } from 'react'

// Small sounds made with the Web Audio API (no files), one per moment of the game and its menus,
// chosen on the sound board. On from the first visit (the browser still waits for a first tap before it
// plays anything), and a choice to turn it off is remembered. The audio context is created on the first sound, after a tap, as
// browsers require.
const KEY = 'archiversal:sound'

let on = true
try {
  on = localStorage.getItem(KEY) !== 'off'
} catch {
  // Storage blocked: stays on, the choice is not remembered.
}

let context = null
const audio = () => {
  if (!on) return null
  try {
    context ??= new (window.AudioContext || window.webkitAudioContext)()
    if (context.state === 'suspended') context.resume()
    return context
  } catch {
    return null
  }
}

/** One soft note: an oscillator with a quick attack and a decay, so it never clicks. */
function tone({ f, to, type = 'sine', at = 0, len = 0.12, g = 0.12, a = 0.006, bus }) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + at
  const osc = ac.createOscillator()
  const amp = ac.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(f, t)
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + len)
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(g, t + a)
  amp.gain.exponentialRampToValueAtTime(0.0001, t + len)
  osc.connect(amp).connect(bus ?? ac.destination)
  osc.start(t)
  osc.stop(t + len + 0.03)
}

/** A burst of filtered noise, optionally sweeping the filter from `f` to `to`. */
function noise({ at = 0, len = 0.1, g = 0.1, type = 'bandpass', f = 2000, to, q = 1, a = 0.01, bus }) {
  const ac = audio()
  if (!ac) return
  const t = ac.currentTime + at
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * len), ac.sampleRate)
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const source = ac.createBufferSource()
  source.buffer = buffer
  const filter = ac.createBiquadFilter()
  filter.type = type
  filter.Q.value = q
  filter.frequency.setValueAtTime(f, t)
  if (to) filter.frequency.exponentialRampToValueAtTime(to, t + len)
  const amp = ac.createGain()
  amp.gain.setValueAtTime(0.0001, t)
  amp.gain.exponentialRampToValueAtTime(g, t + Math.min(a, len / 2))
  amp.gain.exponentialRampToValueAtTime(0.0001, t + len)
  source.connect(filter).connect(amp).connect(bus ?? ac.destination)
  source.start(t)
}

const click = (at = 0, f = 3500, g = 0.09) => noise({ at, len: 0.012, g, type: 'highpass', f, a: 0.002 })
const bell = (f, at = 0, len = 0.9, g = 0.07, bus) =>
  [[1, 1], [2.76, 0.45], [5.4, 0.2]].forEach(([m, v]) => tone({ f: f * m, at, len: len / (m > 1 ? m * 0.6 : 1), g: g * v, bus }))

// In the game
/** A field locks: a latch closing with a faint ping. */
export const lock = () => { click(0, 2600, 0.12); tone({ f: 1500, at: 0.02, len: 0.1, g: 0.05 }) }
/** A close guess: two notes a step apart. */
export const close = () => { tone({ f: 523, len: 0.12, g: 0.07 }); tone({ f: 587, at: 0.11, len: 0.18, g: 0.07 }) }
/** A wrong guess: a soft smudge over a low thud. */
export const wrong = () => { noise({ len: 0.18, g: 0.07, type: 'lowpass', f: 450, to: 250, a: 0.04 }); tone({ f: 100, to: 70, len: 0.14, g: 0.12 }) }
/** A hint card opens. */
export const hint = () => tone({ f: 1000, len: 0.04, g: 0.08, a: 0.003 })
/** Another drawing or photo: a quiet slide of paper. */
export const sheet = () => noise({ len: 0.14, g: 0.05, f: 1200, to: 2600, q: 0.7, a: 0.05 })
/** The century or decade changes: a ratchet slowing down. */
export const dial = () => [0, 0.035, 0.08, 0.14].forEach((t) => click(t, 2400, 0.08))
/** Next building: a page turning. */
export const turn = () => { noise({ len: 0.25, g: 0.07, type: 'highpass', f: 3500, to: 900, a: 0.08 }); noise({ at: 0.12, len: 0.06, g: 0.05, f: 2000 }) }

// Reveal and results
/** Runs `build(bus)`, which schedules sounds into a gain node; the returned `stop` fades them out. */
function score(build) {
  const ac = audio()
  if (!ac) return () => {}
  const bus = ac.createGain()
  bus.connect(ac.destination)
  build(bus)
  return () => bus.gain.setTargetAtTime(0, ac.currentTime, 0.06)
}

/**
 * The reveal overlay, scored to its animation (RevealBuild's timings, in seconds): a relay desk. Pips and a sweep when all four were
 * right, two slow ticks per drawn stroke, a mains hum as the building rises, a soft relay click every other letter as the name is
 * lettered (2.3 to 3.2 s), a bell each for the architect and the place, then a solenoid thunk and a bell. Returns `stop`, which
 * fades it out (the overlay was skipped or closed).
 */
export const revealScore = (strokes, solved, letters) => score((bus) => {
  if (solved) {
    noise({ at: 0.2, len: 1.2, g: 0.02, f: 300, to: 2000, q: 1, a: 0.4, bus })
    ;[0, 1, 2, 3].forEach((i) => tone({ f: 600 + i * 120, type: 'square', at: 0.3 + i * 0.18, len: 0.04, g: 0.01, a: 0.004, bus }))
  }
  strokes.forEach(({ delay, duration }) =>
    [0.03, Math.min(duration, 0.9) - 0.02].forEach((t) => noise({ at: delay + t, len: 0.02, g: 0.035, type: 'lowpass', f: 1800, a: 0.003, bus })))
  tone({ f: 60, at: 1.7, len: 1.1, g: 0.06, a: 0.4, bus })
  tone({ f: 120, at: 1.7, len: 1.1, g: 0.025, a: 0.4, bus })
  for (let i = 0; i < letters; i += 2) noise({ at: 2.3 + (i * 0.9) / letters, len: 0.018, g: 0.04, type: 'lowpass', f: 1600 + (i % 3) * 200, a: 0.003, bus })
  bell(1568, 2.9, 0.5, 0.03, bus)
  bell(1976, 3.15, 0.5, 0.025, bus)
  tone({ f: 95, to: 60, at: 3.4, len: 0.2, g: 0.2, bus })
  bell(1175, 3.55, 0.9, 0.03, bus)
})

/** The recap's hatching on a row you got right: a pencil scratch as long as the drawn strokes, ending on a soft note per row. */
export const hatchScore = (at, strokes, row) => score((bus) => {
  const len = strokes * 0.012 + 0.3
  noise({ at, len, g: 0.02, f: 2600, to: 3400, q: 1.2, a: 0.06, bus })
  tone({ f: [523.25, 659.25, 783.99, 1046.5][row % 4], at: at + len, len: 0.3, g: 0.03, bus })
})

/** All four right: the pen plotting the second rule round the sheet, a glide that ends in a bell. */
export const signScore = (at, len) => score((bus) => {
  tone({ f: 440, to: 880, type: 'triangle', at, len, g: 0.03, a: 0.2, bus })
  noise({ at, len, g: 0.012, f: 2000, to: 3200, q: 0.8, a: 0.3, bus })
  bell(1318.5, at + len, 1, 0.035, bus)
})
/** A button with nothing to act on (Check guess with every field empty): two padded knocks, "not yet". */
export const nothing = () => { tone({ f: 180, len: 0.06, g: 0.1, a: 0.01 }); tone({ f: 180, at: 0.09, len: 0.06, g: 0.1, a: 0.01 }) }
/** The Daily's "Approved": a key strike and a carriage bell. */
export const stamp = () => { click(0, 2800, 0.14); tone({ f: 1000, len: 0.03, g: 0.06 }); bell(2093, 0.2, 0.6, 0.04) }
/** A session is complete. */
export const done = () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ f, at: i * 0.09, len: 0.4, g: 0.07 }))
/** Copied or shared. */
export const copied = () => { tone({ f: 880, len: 0.06, g: 0.07 }); tone({ f: 1318, at: 0.07, len: 0.1, g: 0.07 }) }

// Menus: played from `data-sound` / `data-sound-hover` attributes (see initUiSounds).
const level = () => noise({ len: 0.06, g: 0.012, f: 1800, q: 0.5, a: 0.03 })
const pick = () => tone({ f: 600, to: 900, len: 0.06, g: 0.1, a: 0.004 })
const start = () => { noise({ len: 0.2, g: 0.06, f: 600, to: 3000, q: 0.8, a: 0.1 }); tone({ f: 784, at: 0.17, len: 0.2, g: 0.07 }) }
const dice = () => { noise({ len: 0.28, g: 0.05, f: 900, to: 2400, q: 2, a: 0.1 }); tone({ f: 1175, at: 0.28, len: 0.3, g: 0.07 }) }
const toggle = () => { tone({ f: 440, len: 0.12, g: 0.03, a: 0.02 }); tone({ f: 660, at: 0.03, len: 0.12, g: 0.02, a: 0.02 }) }
/** Picking an item from a list (a country, a style, a difficulty): a wood tap and a small high note. */
const choose = () => { tone({ f: 520, type: 'triangle', len: 0.05, g: 0.12 }); tone({ f: 780, at: 0.04, len: 0.08, g: 0.06 }) }
/** Giving up for the answer: a quiet rising rustle, like a curtain drawn. */
const unveil = () => noise({ len: 0.22, g: 0.03, f: 500, to: 1500, q: 0.6, a: 0.1 })

/** The rounds slider: a tick that rises in pitch with the number of rounds (`share` is 0 to 1). */
export const roundStep = (share) => tone({ f: 500 + share * 700, type: 'triangle', len: 0.035, g: 0.09, a: 0.003 })
const ON_CLICK = { pick, choose, start, dice, toggle, sheet, unveil }
const ON_HOVER = { level }

/**
 * Any element can carry `data-sound="pick|start|dice|toggle|sheet"` (played on click) or
 * `data-sound-hover="level"` (played when the pointer arrives), so components don't import this file.
 */
let lastHover = 0
export function initUiSounds() {
  document.addEventListener('click', (e) => ON_CLICK[e.target.closest?.('[data-sound]')?.dataset.sound]?.())
  document.addEventListener('pointerover', (e) => {
    const el = e.target.closest?.('[data-sound-hover]')
    // Sweeping across several rows must not stack clicks: at most one hover sound per 180 ms.
    if (!el || el.contains(e.relatedTarget) || e.timeStamp - lastHover < 180) return
    lastHover = e.timeStamp
    ON_HOVER[el.dataset.soundHover]?.()
  })
}

const subscribe = (notify) => {
  window.addEventListener('soundchange', notify)
  return () => window.removeEventListener('soundchange', notify)
}

export const useSoundOn = () => useSyncExternalStore(subscribe, () => on, () => false)

/** Turns sound on or off (the toggle's own click sound plays once it is on). */
export function toggleSound() {
  on = !on
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    // Not remembered.
  }
  window.dispatchEvent(new Event('soundchange'))
}
