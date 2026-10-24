import { Download, FastForward, MessageCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLanguage, useStrings } from '../../i18n.js'
import { shelfText } from '../../game/shelf.js'
import { isReduced } from '../../motionPref.js'
import { Button } from '../ui/Button.jsx'
import { CopyIcon, ShareIcon } from '../ui/InstrumentIcons.jsx'
import { showToast } from '../ui/toast.js'
import { drawPostcard, loadPostmark } from './postcard.js'
import styles from './Detail.module.css'

const OPEN_MS = 450 // the dialog's own entrance, before the pen starts
const WRITE_END = 4.2 // seconds from the start until the note is written and the last stamp is on
const MARK_TIME = 0.55 // the postmark comes down after that
const clamp = (v) => Math.min(1, Math.max(0, v))

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

  // The postcard writes itself: the note is penned and the stamps are glued on together, then the postmark comes down.
  const finish = useRef(() => {})
  const [playing, setPlaying] = useState(!isReduced())
  useEffect(() => {
    const now = new Date()
    let postmark
    const paint = (anim) =>
      drawPostcard(
        canvas.current,
        eras,
        {
          postmark,
          title: t.card.title,
          of: t.card.of(done.length, eras.length),
          brand: t.card.brand,
          date: [now.toLocaleDateString(lang, { day: '2-digit', month: 'short' }).toUpperCase(), String(now.getFullYear())],
          dear: t.card.dear,
          body: t.card.body(stats.discovered, stats.total, stats.mastered, done.length),
          wish: t.card.wish,
          sign: t.card.sign,
          to: t.card.to,
        },
        anim,
      )
    const glueStep = Math.min(0.18, 3.7 / Math.max(1, done.length - 1))
    const start = performance.now() + OPEN_MS
    let frame = 0
    let running = !isReduced()
    const tick = (time) => {
      const s = (time - start) / 1000
      if (!running || s >= WRITE_END + MARK_TIME) {
        running = false
        setPlaying(false)
        paint()
        return
      }
      paint({ write: clamp((s - 0.3) / (WRITE_END - 0.3)), glue: Math.max(0, s - 0.2), glueStep, mark: clamp((s - WRITE_END - 0.1) / MARK_TIME) })
      frame = requestAnimationFrame(tick)
    }
    finish.current = () => {
      running = false
      setPlaying(false)
      cancelAnimationFrame(frame)
      paint()
    }
    frame = requestAnimationFrame(tick)
    loadPostmark().then((img) => {
      postmark = img
      if (!running) paint()
    })
    // the handwriting and sans faces can arrive after the first paint
    document.fonts?.ready.then(() => !running && paint())
    return () => cancelAnimationFrame(frame)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eras, stats, lang])

  const toBlob = () => {
    finish.current() // an image saved or shared mid-way is the finished card
    return new Promise((resolve) => canvas.current.toBlob(resolve, 'image/png'))
  }
  const text = () => shelfText(stats, done.map((e) => e.label), t, window.location.origin)

  const shareImage = async () => {
    setBusy(true)
    try {
      const file = new File([await toBlob()], 'archiversal-library.png', { type: 'image/png' })
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
  const download = async () => save(new File([await toBlob()], 'archiversal-library.png', { type: 'image/png' }))
  // a link cannot carry the picture, so WhatsApp gets the text; "Share the postcard" sends the image itself
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(text())}`, '_blank', 'noopener')
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text())
      showToast({ text: t.copied })
    } catch {
      showToast({ text: t.failed })
    }
  }

  return (
    <dialog ref={dialog} className={`${styles.dialog} ${styles.shareDialog}`} aria-label={t.button} onClose={(e) => !e.currentTarget.open && onClose()}>
      <button type="button" className={styles.close} onClick={onClose} aria-label={strings.library.close}>
        ×
      </button>
      <span className={styles.eyebrow}>{t.button}</span>
      <div className={styles.postcardWrap}>
        <canvas ref={canvas} className={styles.postcard} role="img" aria-label={t.alt(done.length)} />
        {playing && (
          <button type="button" className={styles.skip} onClick={() => finish.current()}>
            {t.skip}
            <FastForward aria-hidden="true" strokeWidth={2} />
          </button>
        )}
      </div>
      <div className={styles.actions}>
        <Button className={styles.sendAction} icon={ShareIcon} onClick={shareImage} disabled={busy}>
          {t.shareImage}
        </Button>
        <Button className={styles.chatAction} icon={MessageCircle} onClick={whatsapp}>
          {t.whatsapp}
        </Button>
        <Button variant="ghost" className={styles.copyAction} icon={CopyIcon} onClick={copy}>
          {t.copyText}
        </Button>
        <Button variant="ghost" className={styles.downloadAction} icon={Download} onClick={download}>
          {t.download}
        </Button>
      </div>
    </dialog>
  )
}
