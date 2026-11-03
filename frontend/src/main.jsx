import './migrateStorage.js'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo/wdth.css'
import './styles/tokens.css'
import './styles/base.css'
import { LanguageProvider } from './LanguageProvider.jsx'
import App from './App.jsx'
import { MotionProvider } from './MotionProvider.jsx'
import { initUiSounds } from './game/sound.js'
import { codeFromHash, importSave } from './game/save.js'

initUiSounds()

// A hand-off link (#/import=<code>) merges the progress it carries before anything reads storage.
const handOff = codeFromHash(window.location.hash)
if (handOff !== null) {
  importSave(handOff)
  history.replaceState(null, '', window.location.pathname)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </MotionProvider>
  </StrictMode>,
)
