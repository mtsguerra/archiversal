import { useEffect } from 'react'
import { libraryIdFrom, pastDailyFrom, useRoute } from './route.js'
import { readSession } from './game/custom.js'
import { readThemedSession } from './game/themed.js'
import Game from './Game.jsx'
import { CustomSetup } from './components/custom/CustomSetup.jsx'
import { ThemedSetup } from './components/themed/ThemedSetup.jsx'
import { Home } from './components/home/Home.jsx'
import { Library } from './components/library/Library.jsx'
import { LibraryBuilding } from './components/library/LibraryBuilding.jsx'
import { ToastHost } from './components/ui/ToastHost.jsx'

// A custom game needs the session the setup screen starts; without one, go back to the setup.
function CustomPlay() {
  const hasSession = readSession() !== null
  useEffect(() => {
    if (!hasSession) window.location.hash = '#/custom'
  }, [hasSession])
  return hasSession ? <Game mode="custom" /> : null
}

// Same for a themed game.
function ThemedPlay() {
  const hasSession = readThemedSession() !== null
  useEffect(() => {
    if (!hasSession) window.location.hash = '#/themed'
  }, [hasSession])
  return hasSession ? <Game mode="themed" /> : null
}

function Screen({ route }) {
  if (route === 'home') return <Home />
  if (route === 'library') return <Library />
  if (route === 'libraryBuilding') return <LibraryBuilding key={libraryIdFrom(window.location.hash)} />
  if (route === 'custom') return <CustomSetup />
  if (route === 'customPlay') return <CustomPlay />
  if (route === 'themed') return <ThemedSetup />
  if (route === 'themedPlay') return <ThemedPlay />
  if (route === 'dailyPast') return <Game key={window.location.hash} mode="daily" day={pastDailyFrom(window.location.hash)} />
  // Keyed so Normal and Daily never share round state.
  return <Game key={route} mode={route === 'daily' ? 'daily' : 'normal'} />
}

export default function App() {
  return (
    <>
      <Screen route={useRoute()} />
      <ToastHost />
    </>
  )
}
