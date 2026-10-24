import { useEffect, useRef, useState } from 'react'
import { useLanguage, useStrings } from '../../i18n.js'
import { shelfText } from '../../game/shelf.js'
import { Button } from '../ui/Button.jsx'
import { showToast } from '../ui/toast.js'
import { drawPostcard } from './postcard.js'
import styles from './Detail.module.css'

/**
 * "Share my shelf": a postcard with one stamp per completed era, drawn on a canvas. It can be shared as an
 * image (where the device allows), saved as a PNG, or copied as text.
 *
 * @param eras   [{ id, label, earned }] every era in order
 */
export function ShareDialog({ eras, stats, onClose }) {
  const strings = useStrings()
  const { lang } = useLanguage()
  const t = strings.library.share
  const dialog = useRef(null)
  const canvas = useRef(null)
  const [busy, setBusy] = useState(false)
  const done = eras.filter((e) => e.earned)

  useEffect(() => {
    const el = dialog.current
    if (!el.open) el.showModal()
    return () => el.open && el.close()
  }, [])

  useEffect(() => {
    const now = new Date()
    const draw = () =>
      drawPostcard(canvas.current, eras, {
        title: t.card.title,
        of: t.card.of(done.length, eras.length),
        brand: t.card.brand,
        word: t.card.word,
        date: [now.toLocaleDateString(lang, { day: '2-digit', month: 'short' }).toUpperCase(), String(now.getFullYear())],
        dear: t.card.dear,
        body: t.card.body(stats.discovered, stats.total, stats.mastered, done.length),
        wish: t.card.wish,
        sign: t.card.sign,
        to: t.card.to,
      })
    draw()
    // the handwriting and sans faces can arrive after the first paint
    document.fonts?.ready.then(draw)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eras, stats, lang])

  const toBlob = () => new Promise((resolve) => canvas.current.toBlob(resolve, 'image/png'))
  const text = () => shelfText(stats, done.map((e) => e.label), t, window.location.origin)

  const shareImage = async () => {
    setBusy(true)
    try {
      const file = new File([await toBlob()], 'arch-guesser-library.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: text() })
      else save(file)
    } catch (error) {
      if (error.name !== 'AbortError') showToast({ text: t.failed })
    }
    setBusy(false)
  }
  const save = (file) => {
    const url = URL.createObjectURL(file)
    const a = Object.assign(document.createElement('a'), { href: url, download: file.name })
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    showToast({ text: t.saved })
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text())
      showToast({ text: t.copied })
    } catch {
      showToast({ text: t.failed })
    }
  }

  return (
    <dialog ref={dialog} className={styles.dialog} aria-label={t.button} onClose={(e) => !e.currentTarget.open && onClose()}>
      <button type="button" className={styles.close} onClick={onClose} aria-label={strings.library.close}>
        ×
      </button>
      <span className={styles.eyebrow}>{t.button}</span>
      <canvas ref={canvas} className={styles.postcard} role="img" aria-label={t.alt(done.length)} />
      <div className={styles.actions}>
        <Button onClick={shareImage} disabled={busy}>
          {typeof navigator !== 'undefined' && navigator.canShare ? t.shareImage : t.saveImage}
        </Button>
        <Button variant="ghost" onClick={copy}>
          {t.copyText}
        </Button>
      </div>
    </dialog>
  )
}
