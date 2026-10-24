import { BookIcon } from '../ui/icons.jsx'
import { useStrings } from '../../i18n.js'
import { SlimButton } from './SlimButton.jsx'

/** From any setup screen to the Library. */
export function LibraryLink() {
  const strings = useStrings()
  return (
    <SlimButton icon={BookIcon} onClick={() => (window.location.hash = '#/library')}>
      {strings.library.nav}
    </SlimButton>
  )
}
