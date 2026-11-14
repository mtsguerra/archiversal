import { useEffect } from 'react'
import { libraryIdFrom, pastDailyFrom, useHash, useRoute } from './route.js'
import { readSession } from './game/custom.js'
import { readThemedSession } from './game/themed.js'
import Game from './Game.jsx'
import { CustomSetup } from './components/custom/CustomSetup.jsx'
import { ThemedSetup } from './components/themed/ThemedSetup.jsx'
import { Home } from './components/home/Home.jsx'
import { Library } from './components/library/Library.jsx'
import { LibraryBuilding } from './components/library/LibraryBuilding.jsx'
import { ProfilePage } from './components/social/ProfilePage.jsx'
import { UserPage } from './components/social/UserPage.jsx'
import { InvitePage } from './components/social/Friends.jsx'
import { roomFrom } from './social/username.js'
import { badgeName } from './social/badges.js'
import { showToast } from './components/ui/toast.js'
import { useStrings } from './i18n.js'
import { useAccount } from './social/account.js'
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
  if (route === 'profile') return <ProfilePage room={roomFrom(window.location.hash)} />
  if (route === 'user') return <UserPage key={window.location.hash} />
  if (route === 'invite') return <InvitePage />
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

// Screens that read saved progress when they open; they are opened again when the account brings progress in.
const READS_PROGRESS = ['home', 'library', 'profile', 'user']

// A sync that earned badges says so, with a way to go and see them.
function useBadgeToast(newBadges) {
  const strings = useStrings()
  useEffect(() => {
    if (!newBadges.length) return
    const t = strings.badges
    showToast({ text: newBadges.length === 1 ? t.toast(badgeName(strings, newBadges[0])) : t.toastMany(newBadges.length), actionLabel: t.view, onAction: () => (window.location.hash = '#/profile') })
    // Only a new set of badges speaks; switching language does not repeat it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newBadges])
}

export default function App() {
  const route = useRoute()
  useHash() // going from one profile to another keeps the route but must draw the other page
  const { synced, newBadges } = useAccount()
  useBadgeToast(newBadges)
  return (
    <>
      <Screen key={READS_PROGRESS.includes(route) ? synced : 0} route={route} />
      <ToastHost />
    </>
  )
}
