// The postcard's plant border. Each border draws one side in local coordinates: x runs along the side
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

/** After a block-printed laurel: a solid band on the outer edge with paper-coloured leaves cut out of it, and a row of leaves sprouting inwards, all leaning forward. */
const laurel = {
  side(ctx, { from, to, Z, ink, paper }) {
    const band = Z * 0.5
    ctx.fillStyle = ink
    ctx.fillRect(from, 0, to - from, band)
    along(from, to, Z * 0.74, (x) => {
      ctx.fillStyle = paper
      leaf(ctx, x - Z * 0.2, band * 0.14, Z * 0.62, Z * 0.15, 0.78)
      ctx.fillStyle = ink
      leaf(ctx, x + Z * 0.1, band, Z * 0.62, Z * 0.14, 0.78)
    })
  },
  // The band turns the corner with a leaf cut across the bend, and three sprigs fan out from the inner corner.
  corner(ctx, { Z, ink, paper }) {
    ctx.fillStyle = ink
    ctx.fillRect(0, 0, Z, Z * 0.5)
    ctx.fillRect(0, 0, Z * 0.5, Z)
    ctx.fillStyle = paper
    leaf(ctx, Z * 0.06, Z * 0.06, Z * 0.64, Z * 0.15, Math.PI / 4)
    ctx.fillStyle = ink
    leaf(ctx, Z * 0.5, Z * 0.5, Z * 0.72, Z * 0.17, Math.PI / 4)
    leaf(ctx, Z * 0.5, Z * 0.5, Z * 0.6, Z * 0.12, Math.PI / 4 - 0.62)
    leaf(ctx, Z * 0.5, Z * 0.5, Z * 0.6, Z * 0.12, Math.PI / 4 + 0.62)
    ctx.fillStyle = paper
    dot(ctx, Z * 0.68, Z * 0.68, Z * 0.045)
  },
}

export const BORDERS = { laurel }
