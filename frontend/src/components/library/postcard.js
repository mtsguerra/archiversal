import { silhouetteFor } from '../reveal/silhouettes.js'

// The Library's postcard, drawn on a canvas (so it can be shared or saved as an image): a block-printed leaf border,
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

const BORDER = 64
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

/** A leaf cut out of the band: pointed at both ends, `len` long and `wid` wide, tilted `angle` radians. */
function leaf(ctx, cx, cy, len, wid, angle) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(-len / 2, 0)
  ctx.quadraticCurveTo(0, -wid, len / 2, 0)
  ctx.quadraticCurveTo(0, wid, -len / 2, 0)
  ctx.fill()
  ctx.restore()
}

/**
 * A block-printed leaf border: a solid band round the card with a row of paper-coloured leaves cut out of it,
 * all leaning the same way round the card, and a dot in each corner.
 */
function leafBorder(ctx, color) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.rect(0, 0, CARD_W, CARD_H)
  ctx.rect(BORDER, BORDER, CARD_W - 2 * BORDER, CARD_H - 2 * BORDER)
  ctx.fill('evenodd')
  ctx.fillStyle = CARD
  const len = BORDER * 1.2
  const wid = BORDER * 0.25
  const tilt = -0.7
  const sides = [
    { from: [BORDER, BORDER / 2], to: [CARD_W - BORDER, BORDER / 2], turn: 0 },
    { from: [CARD_W - BORDER / 2, BORDER], to: [CARD_W - BORDER / 2, CARD_H - BORDER], turn: Math.PI / 2 },
    { from: [CARD_W - BORDER, CARD_H - BORDER / 2], to: [BORDER, CARD_H - BORDER / 2], turn: Math.PI },
    { from: [BORDER / 2, CARD_H - BORDER], to: [BORDER / 2, BORDER], turn: -Math.PI / 2 },
  ]
  for (const { from, to, turn } of sides) {
    const span = Math.hypot(to[0] - from[0], to[1] - from[1])
    const n = Math.round(span / (BORDER * 0.78))
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n
      leaf(ctx, from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t, len, wid, turn + tilt)
    }
  }
  for (const [x, y] of [[BORDER / 2, BORDER / 2], [CARD_W - BORDER / 2, BORDER / 2], [CARD_W - BORDER / 2, CARD_H - BORDER / 2], [BORDER / 2, CARD_H - BORDER / 2]]) {
    ctx.beginPath()
    ctx.arc(x, y, BORDER * 0.13, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** One perforated stamp with the era's drawing, its number and name. */
function drawStamp(ctx, { x, y, w, h, era, index, label }) {
  const ink = stampInk(index)
  ctx.save()
  ctx.shadowColor = 'rgb(0 0 0 / 0.28)'
  ctx.shadowBlur = 6
  ctx.shadowOffsetY = 2
  ctx.fillStyle = STAMP
  ctx.fillRect(x, y, w, h)
  ctx.restore()
  // inner frame
  const m = 13
  ctx.save()
  ctx.globalAlpha = 0.09
  ctx.fillStyle = ink
  ctx.fillRect(x + m, y + m, w - 2 * m, h - 2 * m)
  ctx.restore()
  ctx.strokeStyle = ink
  ctx.lineWidth = 2.5
  ctx.strokeRect(x + m, y + m, w - 2 * m, h - 2 * m)
  // the drawing
  const { mass, strokes } = silhouetteFor(era)
  const dw = w - 2 * m - 14
  const s = dw / 400
  ctx.save()
  ctx.translate(x + m + 7, y + m + 34)
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
  // perforations, cut out in the card's colour
  ctx.fillStyle = CARD
  const r = 6.5
  for (let px = x + r; px < x + w; px += 2 * r * 1.6) {
    ctx.beginPath()
    ctx.arc(px, y, r, 0, Math.PI * 2)
    ctx.arc(px, y + h, r, 0, Math.PI * 2)
    ctx.fill()
  }
  for (let py = y + r; py < y + h; py += 2 * r * 1.6) {
    ctx.beginPath()
    ctx.arc(x, py, r, 0, Math.PI * 2)
    ctx.arc(x + w, py, r, 0, Math.PI * 2)
    ctx.fill()
  }
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

function postmark(ctx, cx, cy, { word, line1, line2 }) {
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.2)
  ctx.globalAlpha = 0.82
  ctx.strokeStyle = ctx.fillStyle = CHOCOLATE
  ctx.lineWidth = 4
  for (const r of [86, 70]) {
    ctx.beginPath()
    ctx.arc(0, 0, r, 0, Math.PI * 2)
    ctx.stroke()
  }
  // the word runs along the top of the ring
  ctx.font = `800 24px ${SANS}`
  ctx.textAlign = 'center'
  const chars = [...word.toUpperCase()]
  const step = 0.2
  chars.forEach((ch, i) => {
    const a = -Math.PI / 2 + (i - (chars.length - 1) / 2) * step
    ctx.save()
    ctx.rotate(a + Math.PI / 2)
    ctx.fillText(ch, 0, -54 - 14)
    ctx.restore()
  })
  ctx.font = `900 28px ${SANS}`
  ctx.fillText(line1, 0, 8)
  ctx.font = `700 22px ${SANS}`
  ctx.fillText(line2, 0, 38)
  ctx.lineWidth = 5
  for (const dy of [-34, -14, 6, 26]) {
    ctx.beginPath()
    ctx.moveTo(96, dy)
    ctx.bezierCurveTo(140, dy - 10, 170, dy + 10, 230, dy)
    ctx.stroke()
  }
  ctx.restore()
}

/**
 * Draws the postcard on `canvas` (it is resized to CARD_W x CARD_H).
 *
 * @param eras   [{ id, label, earned }] in order; each earned era becomes a stamp
 * @param card   strings.library.share.card, plus `lines` ready to print: { dear, body, wish, sign, to, brand, title, of, word, date: [day, year] }
 */
export function drawPostcard(canvas, eras, card) {
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = CARD
  ctx.fillRect(0, 0, CARD_W, CARD_H)
  leafBorder(ctx, card.borderColor ?? OXBLOOD)

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
  for (let i = 0; i < COLS * ROWS; i++) {
    const slot = { x: ax + (i % COLS) * (sw + gap), y: top + Math.floor(i / COLS) * (sh + gap), w: sw, h: sh }
    const era = eras[i]
    if (!era) continue
    if (era.earned) {
      drawStamp(ctx, { ...slot, era: era.id, index: i, label: era.label })
      lastStamp = slot
    } else emptySlot(ctx, { ...slot, n: i + 1 })
  }
  ctx.fillStyle = OXBLOOD
  ctx.textAlign = 'left'
  ctx.font = `800 24px ${SANS}`
  ctx.fillText(card.brand.toUpperCase(), ax, CARD_H - BORDER - 34)
  if (lastStamp) postmark(ctx, lastStamp.x + lastStamp.w - 14, lastStamp.y + 40, { word: card.word, line1: card.date[0], line2: card.date[1] })

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
  let y = BORDER + 100
  for (const para of [card.dear, card.body, card.wish, card.sign]) {
    for (const line of wrapLines(para, nw, measure)) {
      ctx.fillText(line, nx, y)
      y += 56
    }
    y += 26
  }
  ctx.strokeStyle = CAMEL
  ctx.lineWidth = 2.5
  for (const [k, text] of [card.to, card.brand].entries()) {
    const ly = CARD_H - BORDER - 150 + k * 78
    let size = 38
    ctx.font = `700 ${size}px ${HAND}`
    while (ctx.measureText(text).width > nw && size > 18) ctx.font = `700 ${--size}px ${HAND}`
    ctx.fillText(text, nx, ly)
    ctx.beginPath()
    ctx.moveTo(nx, ly + 14)
    ctx.lineTo(nx + nw, ly + 14)
    ctx.stroke()
  }
}
