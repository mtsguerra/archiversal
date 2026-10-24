// Plant borders for the postcard. Each border draws one side in local coordinates: x runs along the side
// (from `from` to `to`), y runs from the card's outer edge (0) inwards to `Z`, the border's depth. A side is
// clipped to the stretch between the two corners; `corner` fills the Z x Z square at each corner.

/** A leaf from its base point: pointed at both ends, `len` long, `wid` wide, growing toward `angle`. */
function leaf(ctx, bx, by, len, wid, angle) {
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len * 0.5, -wid, len, 0)
  ctx.quadraticCurveTo(len * 0.5, wid, 0, 0)
  ctx.fill()
  ctx.restore()
}

const along = (from, to, step, draw) => {
  const n = Math.max(1, Math.round((to - from) / step))
  for (let i = 0; i < n; i++) draw(from + ((i + 0.5) * (to - from)) / n, i, (to - from) / n)
}

const dot = (ctx, x, y, r) => {
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}

const stem = (ctx, from, to, y, width) => {
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(from, y)
  ctx.lineTo(to, y)
  ctx.stroke()
}

/** After a block-printed laurel: a solid band on the outer edge with paper-coloured leaves cut out of it, and a row of leaves sprouting inwards, all leaning forward. */
const laurel = {
  side(ctx, { from, to, Z, ink, paper }) {
    const band = Z * 0.5
    ctx.fillStyle = ink
    ctx.fillRect(from, 0, to - from, band)
    along(from, to, Z * 0.52, (x) => {
      ctx.fillStyle = paper
      leaf(ctx, x - Z * 0.17, band * 0.16, Z * 0.6, Z * 0.1, 0.78)
      ctx.fillStyle = ink
      leaf(ctx, x + Z * 0.08, band, Z * 0.62, Z * 0.1, 0.78)
    })
  },
  corner(ctx, { Z, ink, paper }) {
    ctx.fillStyle = ink
    ctx.fillRect(0, 0, Z, Z * 0.5)
    ctx.fillRect(0, 0, Z * 0.5, Z)
    ctx.fillStyle = paper
    dot(ctx, Z * 0.23, Z * 0.23, Z * 0.07)
    ctx.fillStyle = ink
    leaf(ctx, Z * 0.5, Z * 0.5, Z * 0.5, Z * 0.09, Math.PI / 4)
  },
}

/** An olive branch: a thin stem with leaves in pairs leaning forward and the odd olive. */
const olive = {
  side(ctx, { from, to, Z, ink }) {
    const y = Z * 0.5
    ctx.fillStyle = ctx.strokeStyle = ink
    stem(ctx, from, to, y, Z * 0.05)
    along(from, to, Z * 0.5, (x, i) => {
      leaf(ctx, x, y, Z * 0.5, Z * 0.085, 0.95)
      leaf(ctx, x + Z * 0.12, y, Z * 0.5, Z * 0.085, -0.95)
      if (i % 3 === 1) dot(ctx, x + Z * 0.22, y + Z * 0.06, Z * 0.06)
    })
  },
  corner(ctx, { Z, ink }) {
    ctx.fillStyle = ink
    for (const a of [0.2, 0.75, 1.3]) leaf(ctx, Z * 0.2, Z * 0.2, Z * 0.7, Z * 0.1, a)
  },
}

/** Ivy: a wavy stem with heart-shaped leaves on alternate sides and small curled tendrils. */
function heart(ctx, bx, by, size, angle) {
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.bezierCurveTo(size * 0.2, -size * 0.7, size * 1.0, -size * 0.55, size * 1.1, 0)
  ctx.bezierCurveTo(size * 1.0, size * 0.55, size * 0.2, size * 0.7, 0, 0)
  ctx.fill()
  ctx.restore()
}
const ivy = {
  side(ctx, { from, to, Z, ink }) {
    ctx.fillStyle = ctx.strokeStyle = ink
    ctx.lineWidth = Z * 0.045
    ctx.beginPath()
    for (let x = from; x <= to; x += 3) {
      const y = Z * 0.5 + Math.sin(x / (Z * 0.45)) * Z * 0.12
      x === from ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.stroke()
    along(from, to, Z * 0.55, (x, i) => {
      const y = Z * 0.5 + Math.sin(x / (Z * 0.45)) * Z * 0.12
      heart(ctx, x, y, Z * 0.36, i % 2 ? -0.9 : 0.9)
      if (i % 2) {
        ctx.beginPath()
        ctx.arc(x + Z * 0.3, y + Z * 0.2, Z * 0.07, 0, Math.PI * 1.6)
        ctx.stroke()
      }
    })
  },
  corner(ctx, { Z, ink }) {
    ctx.fillStyle = ink
    heart(ctx, Z * 0.3, Z * 0.3, Z * 0.5, Math.PI / 4)
  },
}

/** A fern frond laid along the side: a stem with fine paired leaflets. */
const fern = {
  side(ctx, { from, to, Z, ink }) {
    const y = Z * 0.5
    ctx.fillStyle = ctx.strokeStyle = ink
    stem(ctx, from, to, y, Z * 0.04)
    along(from, to, Z * 0.13, (x) => {
      leaf(ctx, x, y, Z * 0.44, Z * 0.045, 1.05)
      leaf(ctx, x, y, Z * 0.44, Z * 0.045, -1.05)
    })
  },
  corner(ctx, { Z, ink }) {
    // a curled fiddlehead
    ctx.strokeStyle = ink
    ctx.lineWidth = Z * 0.07
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (let a = 0; a < Math.PI * 4.2; a += 0.15) {
      const r = Z * 0.36 * (1 - a / (Math.PI * 4.6))
      const px = Z * 0.5 + Math.cos(a) * r
      const py = Z * 0.5 + Math.sin(a) * r
      a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
    }
    ctx.stroke()
  },
}

/** Ginkgo: fan-shaped leaves on short stalks, alternating above and below a thin stem. */
function fan(ctx, bx, by, size, angle) {
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(angle)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.arc(0, 0, size, -0.95, -0.07)
  ctx.lineTo(0, 0)
  ctx.arc(0, 0, size, 0.07, 0.95)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
const ginkgo = {
  side(ctx, { from, to, Z, ink }) {
    const y = Z * 0.5
    ctx.fillStyle = ctx.strokeStyle = ink
    stem(ctx, from, to, y, Z * 0.035)
    along(from, to, Z * 0.62, (x, i) => {
      fan(ctx, x, y, Z * 0.5, i % 2 ? Math.PI / 2 + 0.2 : -Math.PI / 2 + 0.2)
    })
  },
  corner(ctx, { Z, ink }) {
    ctx.fillStyle = ink
    fan(ctx, Z * 0.25, Z * 0.25, Z * 0.6, Math.PI / 4)
  },
}

/** Wheat: a stem with ears of grain leaning forward, alternating sides, the stem tied at each corner. */
function ear(ctx, bx, by, len, angle) {
  ctx.save()
  ctx.translate(bx, by)
  ctx.rotate(angle)
  const n = 5
  for (let k = 0; k < n; k++) {
    const x = (k / n) * len * 0.8
    const w = len * 0.1
    leaf(ctx, x, 0, len * 0.3, w, -0.7)
    leaf(ctx, x, 0, len * 0.3, w, 0.7)
  }
  leaf(ctx, len * 0.78, 0, len * 0.24, len * 0.07, 0)
  ctx.restore()
}
const wheat = {
  side(ctx, { from, to, Z, ink }) {
    const y = Z * 0.5
    ctx.fillStyle = ctx.strokeStyle = ink
    stem(ctx, from, to, y, Z * 0.04)
    along(from, to, Z * 0.75, (x, i) => ear(ctx, x, y, Z * 0.95, i % 2 ? 0.55 : -0.55))
  },
  corner(ctx, { Z, ink }) {
    ctx.fillStyle = ink
    dot(ctx, Z * 0.5, Z * 0.5, Z * 0.14)
    ctx.fillStyle = ink
    ear(ctx, Z * 0.5, Z * 0.5, Z * 0.9, -0.7)
  },
}

export const BORDERS = { laurel, olive, ivy, fern, ginkgo, wheat }
