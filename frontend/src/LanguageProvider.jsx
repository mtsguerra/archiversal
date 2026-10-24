import { useCallback, useEffect, useMemo, useState } from 'react'
import { LanguageContext, detectLanguage } from './i18n.js'
import { bundles } from './strings/index.js'

const STORAGE_KEY = 'archiversal:lang'

function initialLanguage() {
  let saved = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    // storage blocked: fall through to the browser language
  }
  return detectLanguage(saved, typeof navigator !== 'undefined' ? navigator.language : undefined)
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(initialLanguage)

  const setLang = useCallback((next) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage blocked: the choice just won't persist
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = bundles[lang].appName
  }, [lang])

  const value = useMemo(() => ({ lang, setLang, strings: bundles[lang] }), [lang, setLang])
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
