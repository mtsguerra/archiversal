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

initUiSounds()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </MotionProvider>
  </StrictMode>,
)
