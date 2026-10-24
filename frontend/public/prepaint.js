// Runs before the page paints (loaded in <head> without defer), so nothing flashes the wrong look:
//  - the theme: the saved choice, else the system setting;
//  - the root text scale, so a big or small window gets a proportionally sized page;
//  - the motion setting (reduced or full);
//  - "lite" for weak devices, which drops blur.
// It is a file, not an inline script, because the Content-Security-Policy allows only 'self' scripts.
(() => {
  const root = document.documentElement
  const THEME_KEY = 'archiversal:theme'

  let saved = null
  try {
    saved = localStorage.getItem(THEME_KEY) ?? localStorage.getItem('arch-guesser:theme') // the old name, until the app copies it over
  } catch {
    // Storage blocked: follow the system.
  }
  const dark = saved ? saved === 'dark' : window.matchMedia?.('(prefers-color-scheme: dark)').matches
  root.dataset.theme = dark ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#1f1209' : '#432818')

  // 1 at the size the layout was drawn for (1470 x 860); between 0.82 and 1.3 either side; phones stay at 1.
  const DESIGN = { w: 1470, h: 860 }
  const setScale = () => {
    const fit = Math.min(window.innerWidth / DESIGN.w, window.innerHeight / DESIGN.h)
    const scale = window.innerWidth < 640 ? 1 : Math.min(1.3, Math.max(0.82, fit))
    root.style.setProperty('--scale', scale.toFixed(3))
  }
  setScale()
  window.addEventListener('resize', setScale, { passive: true })

  // "reduced" from the saved choice, else the system setting; the toggle changes it later (src/motionPref.js).
  let motion = null
  try {
    motion = (localStorage.getItem('archiversal:motion') ?? localStorage.getItem('arch-guesser:motion'))
  } catch {
    // Storage blocked: follow the system.
  }
  const less = motion ? motion === 'reduced' : window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  root.dataset.motion = less ? 'reduced' : 'full'

  const weak =
    navigator.hardwareConcurrency <= 4 || navigator.deviceMemory <= 4 || navigator.connection?.saveData === true
  if (weak) root.classList.add('lite')
})()
