// The orthographic globe's drawing maths, shared by the veiled globe (board) and the Library's globe.
export const R = 88
export const C = 100
const RAD = Math.PI / 180

// Orthographic projection; null on the far side of the globe (`limb`: pushed out to the edge of the disc instead).
// `zoom` magnifies about the centre; the caller clips to the disc.
export function project(lat, lon, lat0, lon0, limb = false, zoom = 1) {
  const p = lat * RAD
  const p0 = lat0 * RAD
  const dl = (lon - lon0) * RAD
  const front = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl) > 0
  if (!front && !limb) return null
  let x = R * zoom * Math.cos(p) * Math.sin(dl)
  let y = -R * zoom * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl))
  if (!front) {
    const norm = Math.hypot(x, y) || 1
    x = (x / norm) * R * zoom
    y = (y / norm) * R * zoom
  }
  return `${(C + x).toFixed(1)} ${(C + y).toFixed(1)}`
}

// A country as filled outlines. Points past the horizon sit on the edge, which clips a country that runs round the back.
export function silhouette(rings, lat0, lon0, zoom = 1) {
  let d = ''
  for (const ring of rings) {
    if (!ring.some(([lon, lat]) => project(lat, lon, lat0, lon0, false, zoom))) continue
    d += `${ring.map(([lon, lat], i) => `${i ? 'L' : 'M'}${project(lat, lon, lat0, lon0, true, zoom)}`).join('')}Z`
  }
  return d
}

export function graticule(lat0, lon0, zoom = 1) {
  let d = ''
  const trace = (points) => {
    let pen = false
    for (const [lat, lon] of points) {
      const xy = project(lat, lon, lat0, lon0, false, zoom)
      d += xy ? `${pen ? 'L' : 'M'}${xy}` : ''
      pen = xy !== null
    }
  }
  for (let lon = -180; lon < 180; lon += 30) trace(Array.from({ length: 37 }, (_, i) => [-90 + i * 5, lon]))
  for (let lat = -60; lat <= 60; lat += 30) trace(Array.from({ length: 73 }, (_, i) => [lat, -180 + i * 5]))
  return d
}

// How far to magnify a country so it fills about half the disc: small ones zoom in, big ones stay at 1.
export function zoomFor(rings) {
  const pts = rings.flat()
  if (!pts.length) return 1
  const lons = pts.map((p) => p[0])
  const lats = pts.map((p) => p[1])
  const mid = (Math.min(...lats) + Math.max(...lats)) / 2
  const extent = Math.max(Math.max(...lats) - Math.min(...lats), (Math.max(...lons) - Math.min(...lons)) * Math.cos((mid * Math.PI) / 180))
  return Math.min(8, Math.max(1, 80 / (extent * R * (Math.PI / 180)) * 1.1))
}
