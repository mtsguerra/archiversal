import { silhouetteFor } from '../reveal/silhouettes.js'
import { BORDERS } from './postcardBorders.js'
import postmarkUrl from './postmark.svg?url'

// The Library's postcard, drawn on a canvas (so it can be shared or saved as an image): a plant border (postcardBorders.js),
// two thirds of stamp album (one perforated stamp per completed era, with that era's drawing) and a
// handwritten note with address lines in the last third. Colours are the site's palette.
export const CARD_W = 1800
export const CARD_H = 1200

const OXBLOOD = '#6F1D1B'
const CAMEL = '#BB9457'
const CHOCOLATE = '#432818'
const RUSSET = '#99582A'
const CARD = '#FFFAEA'
const STAMP = '#FFFDF3'
const HUES = [352, 8, 22, 36, 52, 72] // wine, oxblood, russet, chocolate-brown, camel, olive gold
const LIGHTNESS = [24, 32, 40, 47]

/** A colour for each stamp, all different, all in the palette's warm range: six hues from wine to olive gold by four depths. */
export const stampInk = (index) => `hsl(${HUES[index % HUES.length]} 58% ${LIGHTNESS[Math.floor(index / HUES.length) % LIGHTNESS.length]}%)`
const HAND = '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive'
const SANS = 'Archivo, "Helvetica Neue", Arial, sans-serif'

const BORDER = 80
const SPLIT = 1200 // the album takes x < SPLIT: two thirds of the card
const COLS = 6
const ROWS = 4

/** `text` broken into lines no wider than `maxWidth` (as measured by `measure`). A word wider than a line stays whole. */
export function wrapLines(text, maxWidth, measure) {
  const lines = []
  let line = ''
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word
    if (line && measure(next) > maxWidth) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** The plant border round the card, drawn side by side in local coordinates (see postcardBorders.js). */
function drawBorder(ctx, name, ink) {
  const border = BORDERS[name] ?? BORDERS.laurel
  const Z = BORDER
  const base = { Z, ink, paper: CARD }
  const sides = [
    { at: [0, 0], turn: 0, len: CARD_W },
    { at: [CARD_W, 0], turn: Math.PI / 2, len: CARD_H },
    { at: [CARD_W, CARD_H], turn: Math.PI, len: CARD_W },
    { at: [0, CARD_H], turn: -Math.PI / 2, len: CARD_H },
  ]
  for (const { at, turn, len } of sides) {
    ctx.save()
    ctx.translate(at[0], at[1])
    ctx.rotate(turn)
    ctx.beginPath()
    ctx.rect(Z, 0, len - 2 * Z, Z)
    ctx.clip()
    border.side(ctx, { ...base, from: Z, to: len - Z })
    ctx.restore()
    ctx.save()
    ctx.translate(at[0], at[1])
    ctx.rotate(turn)
    border.corner(ctx, base)
    ctx.restore()
  }
}

/** One stamp with the era's drawing, its number and name: a solid ink border with scalloped edges, a cream sheet, a thick inner frame. */
function drawStamp(ctx, { x, y, w, h, era, index, label }) {
  const ink = stampInk(index)
  const band = 13
  const m = 20 // from the stamp's edge to the inner frame
  ctx.save()
  ctx.shadowColor = 'rgb(0 0 0 / 0.28)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  ctx.fillStyle = ink
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  // scallops: half circles bitten out of every edge, in the card's colour
  ctx.fillStyle = CARD
  const r = 9.5
  const bites = (len) => Math.round(len / (r * 2.6))
  const across = bites(w)
  const down = bites(h)
  for (let i = 0; i < across; i++) {
    const px = x + (w / across) * (i + 0.5)
    ctx.beginPath()
    ctx.arc(px, y, r, 0, Math.PI * 2)
    ctx.arc(px, y + h, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let i = 0; i < down; i++) {
    const py = y + (h / down) * (i + 0.5)
    ctx.beginPath()
    ctx.arc(x, py, r, 0, Math.PI * 2)
    ctx.arc(x + w, py, r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = STAMP
  ctx.fillRect(x + band, y + band, w - 2 * band, h - 2 * band)
  // inner frame
  ctx.save()
  ctx.globalAlpha = 0.09
  ctx.fillStyle = ink
  ctx.fillRect(x + m, y + m, w - 2 * m, h - 2 * m)
  ctx.restore()
  ctx.strokeStyle = ink
  ctx.lineWidth = 3.5
  ctx.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m)
  // the drawing
  const { mass, strokes } = silhouetteFor(era)
  const dw = w - 2 * m - 10
  const s = dw / 400
  ctx.save()
  ctx.translate(x + m + 5, y + m + 32)
  ctx.scale(s, s)
  ctx.globalAlpha = 0.18
  ctx.fillStyle = ink
  ctx.fill(new Path2D(mass))
  ctx.globalAlpha = 1
  ctx.strokeStyle = ink
  ctx.lineWidth = 2.2 / s
  ctx.lineCap = ctx.lineJoin = 'round'
  for (const st of strokes) if (st.tone !== 'dimension') ctx.stroke(new Path2D(st.d))
  ctx.restore()
  // number and name
  ctx.fillStyle = ink
  ctx.textAlign = 'left'
  ctx.font = `800 20px ${SANS}`
  ctx.fillText(String(index + 1), x + m + 8, y + m + 24)
  let size = 19
  const name = label.toUpperCase()
  ctx.font = `800 ${size}px ${SANS}`
  while (ctx.measureText(name).width > w - 2 * m - 12 && size > 6) ctx.font = `800 ${--size}px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(name, x + w / 2, y + h - m - 14)
}

function emptySlot(ctx, { x, y, w, h, n }) {
  ctx.save()
  ctx.setLineDash([10, 8])
  ctx.strokeStyle = CAMEL
  ctx.lineWidth = 2.5
  ctx.strokeRect(x + 4, y + 4, w - 8, h - 8)
  ctx.restore()
  ctx.fillStyle = CAMEL
  ctx.font = `800 34px ${SANS}`
  ctx.textAlign = 'center'
  ctx.fillText(String(n), x + w / 2, y + h / 2 + 12)
}

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const easeOut = (t) => 1 - (1 - t) ** 3

const STAMP_LAND = 0.45 // seconds a stamp takes to come down
const MARK_RATIO = 1.55 // canvas px per unit of postmark.svg (183 x 185, ring centred at 90,91)
let markImage = null

/** The postmark drawing (the user's SVG, recoloured to oxblood) as an image; cached after the first load. */
export function loadPostmark() {
  markImage ??= fetch(postmarkUrl)
    .then((r) => r.text())
    .then(
      (svg) =>
        new Promise((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve(img)
          img.onerror = () => {
            markImage = null // try again next time
            reject(new Error('postmark'))
          }
          // a data: URL, because the site's CSP allows data: images but not blob: ones
          img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.replaceAll('#BF0000', OXBLOOD))}`
        }),
    )
  return markImage
}

// The postmark with today's date inside its ring, below the little logo.
function postmark(ctx, image, cx, cy, [line1, line2], t = 1) {
  if (t <= 0) return
  const down = 1 - easeOut(t)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.2 - down * 0.25)
  ctx.scale(1 + down * 0.7, 1 + down * 0.7)
  ctx.globalAlpha = 0.85 * Math.min(1, t * 2.5)
  ctx.drawImage(image, -90 * MARK_RATIO, -91 * MARK_RATIO, 183 * MARK_RATIO, 185 * MARK_RATIO)
  ctx.fillStyle = OXBLOOD
  ctx.textAlign = 'center'
  // the date has to fit inside the ring, which a long month ("24 DE OUT.") would not at full size
  let size = 19
  ctx.font = `900 ${size}px ${SANS}`
  while (ctx.measureText(line1).width > 74 && size > 11) ctx.font = `900 ${--size}px ${SANS}`
  ctx.fillText(line1, -4, 14)
  ctx.font = `800 17px ${SANS}`
  ctx.fillText(line2, -4, 34)
  ctx.restore()
}

/**
 * Draws the postcard on `canvas` (it is resized to CARD_W x CARD_H).
 *
 * @param anim   while it plays: { write 0..1 (the note), glue (seconds since the first stamp), glueStep (seconds between stamps), mark 0..1 (the postmark); left out, the finished card
 * @param eras   [{ id, label, earned }] in order; each earned era becomes a stamp
 * @param card   strings.library.share.card, plus `lines` ready to print: { dear, body, wish, sign, to, brand, title, of, date: [day, year], postmark: the loaded loadPostmark() image }
 */
export function drawPostcard(canvas, eras, card, anim) {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = CARD
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  drawBorder(ctx, card.border, card.borderColor ?? OXBLOOD)

  // the album: header, six by four slots, footer
  const ax = BORDER + 44
  const aw = SPLIT - ax - 20
  ctx.fillStyle = CHOCOLATE
  ctx.textAlign = 'left'
  ctx.font = `900 40px ${SANS}`
  ctx.fillText(card.title.toUpperCase(), ax, BORDER + 82)
  ctx.textAlign = 'right'
  ctx.fillStyle = RUSSET
  ctx.font = `800 28px ${SANS}`
  ctx.fillText(card.of, SPLIT - 20, BORDER + 82)
  const gap = 18
  const sw = (aw - gap * (COLS - 1)) / COLS
  const sh = sw * 1.2
  const top = BORDER + 118
  let lastStamp = null
  let firstSlot = null
  let glued = 0
  for (let i = 0; i < COLS * ROWS; i++) {
    const slot = { x: ax + (i % COLS) * (sw + gap), y: top + Math.floor(i / COLS) * (sh + gap), w: sw, h: sh }
    firstSlot ??= slot
    const era = eras[i]
    if (!era) continue
    if (era.earned) {
      const landed = clamp01(((anim ? anim.glue : Infinity) - glued * (anim?.glueStep ?? 0)) / STAMP_LAND)
      glued++
      if (landed < 1) emptySlot(ctx, { ...slot, n: i + 1 }) // the slot waits until its stamp lands
      if (landed > 0) {
        const lift = 1 - easeOut(landed)
        ctx.save()
        ctx.globalAlpha = Math.min(1, landed * 3)
        ctx.translate(slot.x + slot.w / 2, slot.y + slot.h / 2)
        ctx.scale(1 + lift * 0.35, 1 + lift * 0.35)
        ctx.rotate(lift * (i % 2 ? 0.12 : -0.12))
        ctx.translate(-slot.w / 2 - slot.x, -slot.h / 2 - slot.y)
        drawStamp(ctx, { ...slot, era: era.id, index: i, label: era.label })
        ctx.restore()
      }
      lastStamp = slot
    } else emptySlot(ctx, { ...slot, n: i + 1 })
  }
  ctx.fillStyle = OXBLOOD
  ctx.textAlign = 'left'
  ctx.font = `800 24px ${SANS}`
  ctx.fillText(card.brand.toUpperCase(), ax, CARD_H - BORDER - 34)
  const mark = anim ? anim.mark : 1
  // the postmark is there even before the first stamp, over the empty first slot
  if (card.postmark) {
    if (lastStamp) postmark(ctx, card.postmark, lastStamp.x + lastStamp.w - 14, lastStamp.y + 40, card.date, mark)
    else postmark(ctx, card.postmark, firstSlot.x + firstSlot.w / 2 + 30, firstSlot.y + firstSlot.h / 2, card.date, mark)
  }

  // the divider and the note
  ctx.strokeStyle = CAMEL
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(SPLIT + 24, BORDER + 40)
  ctx.lineTo(SPLIT + 24, CARD_H - BORDER - 40)
  ctx.stroke()
  const nx = SPLIT + 70
  const nw = CARD_W - BORDER - 44 - nx
  ctx.fillStyle = '#2B3A67'
  ctx.textAlign = 'left'
  ctx.font = `700 44px ${HAND}`
  const measure = (s) => ctx.measureText(s).width
  const lines = []
  let y = BORDER + 100
  for (const para of [card.dear, card.body, card.wish, card.sign]) {
    for (const line of wrapLines(para, nw, measure)) {
      lines.push({ text: line, y })
      y += 56
    }
    y += 26
  }
  // the pen: characters appear in order, the way they would be written
  let left = anim ? Math.round(anim.write * lines.reduce((n, l) => n + l.text.length, 0)) : Infinity
  for (const { text, y: ly } of lines) {
    if (left <= 0) break
    ctx.fillText(text.slice(0, left), nx, ly)
    left -= text.length
  }
  ctx.strokeStyle = CAMEL
  ctx.lineWidth = 2.5
  const addressLeft = anim ? (anim.write - 0.8) * 10 : 2 // the address is written last
  for (const [k, text] of [card.to, card.brand].entries()) {
    const ly = CARD_H - BORDER - 150 + k * 78
    let size = 38
    ctx.font = `700 ${size}px ${HAND}`
    while (ctx.measureText(text).width > nw && size > 18) ctx.font = `700 ${--size}px ${HAND}`
    const shown = Math.round(text.length * clamp01(addressLeft - k))
    ctx.fillText(text.slice(0, shown), nx, ly)
    ctx.beginPath()
    ctx.moveTo(nx, ly + 14)
    ctx.lineTo(nx + nw, ly + 14)
    ctx.stroke()
  }
}
