import { useLanguage } from '../../i18n.js'
import { SquishSwitch } from '../ui/SquishSwitch.jsx'

/** EN on the left, PT on the right; the thumb squishes across and carries the chosen code. */
export function LanguageSwitch() {
  const { lang, setLang, strings } = useLanguage()
  return <SquishSwitch checked={lang === 'pt-BR'} onChange={(pt) => setLang(pt ? 'pt-BR' : 'en')} offLabel="EN" onLabel="PT" ariaLabel={strings.language.label} />
}
