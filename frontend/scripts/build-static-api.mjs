// Turns the Spring Boot catalogue into static JSON so the app can be hosted on a static host.
//   public/api/eras.json                 -> GET /api/eras
//   public/api/buildings/index.json      -> every building id (the browser picks the random one)
//   public/api/buildings/catalogue.json  -> id, architects, era, themes, year, country per building (Custom and Themed filters)
//   public/api/buildings/{id}.json       -> GET /api/buildings/{id}
//   public/api/pt-BR/buildings/{id}.json -> GET /api/buildings/{id}?lang=pt-BR (translated text)
// The Java side stays the source of truth: BuildingValidator checks buildings.json at startup and
// in `./gradlew test`, and Era.java defines the eras, so run those before shipping data changes.
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const buildingsFile = join(root, 'src/main/resources/data/buildings.json')
const eraFile = join(root, 'src/main/java/com/mtsguerra/archiversal/building/Era.java')
const translationsDir = join(root, 'src/main/resources/data/pt-BR')
const out = join(root, 'frontend/public/api')

const write = (path, value) => writeFileSync(path, JSON.stringify(value))

// The Spring API serializes every record component, writing null for optional ones the source
// JSON leaves out. Read the component names from the Java records so the static files match.
const javaDir = join(root, 'src/main/java/com/mtsguerra/archiversal/building')
function components(record) {
  const source = readFileSync(join(javaDir, `${record}.java`), 'utf8')
  const start = source.indexOf(`record ${record}(`) + `record ${record}(`.length
  let depth = 0
  let end = start
  for (; end < source.length; end++) {
    const c = source[end]
    if (c === '<' || c === '(') depth++
    else if (c === '>') depth--
    else if (c === ')') {
      if (depth === 0) break
      depth--
    }
  }
  const names = []
  let part = ''
  depth = 0
  for (const c of source.slice(start, end) + ',') {
    if (c === '<') depth++
    else if (c === '>') depth--
    if (c === ',' && depth === 0) {
      const name = part.replace(/\/\*[\s\S]*?\*\//g, '').trim().split(/\s+/).pop()
      if (name) names.push(name)
      part = ''
    } else part += c
  }
  return names
}
const fields = Object.fromEntries(
  ['Building', 'Architect', 'Location', 'Drawing', 'Photo', 'Hint', 'Summary', 'Crop'].map((r) => [r, components(r)]),
)
const full = (record, value) => Object.fromEntries(fields[record].map((name) => [name, value[name] ?? null]))
const each = (list, record) => (list ?? []).map((item) => full(record, item))

const toApi = (b) => ({
  ...full('Building', b),
  aliases: b.aliases ?? [],
  architects: each(b.architects, 'Architect'),
  location: full('Location', b.location),
  drawings: (b.drawings ?? []).map((d) => ({ ...full('Drawing', d), crop: d.crop ? full('Crop', d.crop) : null })),
  photos: (b.photos ?? []).map((p) => ({ ...full('Photo', p), crop: p.crop ? full('Crop', p.crop) : null })),
  hints: each(b.hints, 'Hint'),
  summary: full('Summary', b.summary),
})

const buildings = JSON.parse(readFileSync(buildingsFile, 'utf8')).map(toApi)

const eraPattern = /^\s*([A-Z_]+)\("([^"]+)"\)/gm
const eras = [...readFileSync(eraFile, 'utf8').matchAll(eraPattern)].map(([, id, label]) => ({
  id,
  label,
}))
if (eras.length === 0) throw new Error(`No eras found in ${eraFile}`)
const unknownEra = buildings.find((b) => !eras.some((e) => e.id === b.era))
if (unknownEra) throw new Error(`${unknownEra.id} uses an era missing from Era.java: ${unknownEra.era}`)

// Mirrors BuildingTranslator.java: lays the pt-BR text over a building; list sizes must match.
const orElse = (translated, source) => (translated == null || String(translated).trim() === '' ? source : translated)
function zip(b, what, source, translated, merge) {
  if (translated == null) return source
  if (translated.length !== source.length) {
    throw new Error(`Translation of ${b.id}: ${what} has ${translated.length} entries, the source has ${source.length}`)
  }
  return source.map((item, i) => (translated[i] == null ? item : merge(item, translated[i])))
}
function translate(b, t) {
  const name = orElse(t.name, b.name)
  const aliases = new Set(b.aliases)
  if (name !== b.name) aliases.add(b.name)
  for (const a of t.aliases ?? []) aliases.add(a)
  aliases.delete(name)
  const s = t.summary
  return {
    ...b,
    name,
    aliases: [...aliases],
    architects: zip(b, 'architects', b.architects, t.architects, (a, x) => ({
      ...a,
      aliases: [...new Set([...a.aliases, ...(x.aliases ?? [])])],
      nationality: orElse(x.nationality, a.nationality),
      lifespan: orElse(x.lifespan, a.lifespan),
      bio: orElse(x.bio, a.bio),
    })),
    location: { ...b.location, city: orElse(t.city, b.location.city) },
    style: orElse(t.style, b.style),
    wikipedia: orElse(t.wikipedia, b.wikipedia),
    drawings: zip(b, 'drawings', b.drawings, t.drawings, (d, x) => ({ ...d, label: orElse(x.label, d.label), alt: orElse(x.alt, d.alt) })),
    photos: zip(b, 'photos', b.photos, t.photos, (p, x) => ({ ...p, alt: orElse(x.alt, p.alt), caption: orElse(x.caption, p.caption) })),
    hints: zip(b, 'hints', b.hints, t.hints, (h, text) => ({ ...h, text: orElse(text, h.text) })),
    summary: s
      ? {
          ...b.summary,
          description: orElse(s.description, b.summary.description),
          keyFeatures: zip(b, 'summary.keyFeatures', b.summary.keyFeatures, s.keyFeatures, (_, x) => x),
          funFacts: zip(b, 'summary.funFacts', b.summary.funFacts, s.funFacts, (_, x) => x),
        }
      : b.summary,
  }
}
const translations = {}
for (const file of readdirSync(translationsDir).filter((f) => f.endsWith('.json')).sort()) {
  for (const [id, t] of Object.entries(JSON.parse(readFileSync(join(translationsDir, file), 'utf8')))) {
    if (translations[id]) throw new Error(`Building '${id}' is translated twice (see ${file})`)
    if (!buildings.some((b) => b.id === id)) throw new Error(`${file} translates unknown building '${id}'`)
    translations[id] = t
  }
}

// The Java validator checks the English source, not the pt-BR overlay or this build, so check every
// link that will ship: articles and file pages on Wikipedia and Wikimedia Commons, over https, only.
const ARTICLE = /^https:\/\/(en|pt)\.wikipedia\.org\/wiki\/\S+$/
const FILE_PAGE = /^https:\/\/commons\.wikimedia\.org\/wiki\/\S+$/
for (const b of buildings) {
  for (const book of [b, translations[b.id] ? translate(b, translations[b.id]) : b]) {
    if (!ARTICLE.test(book.wikipedia)) throw new Error(`${b.id}: wikipedia link is not an https Wikipedia article: ${book.wikipedia}`)
    for (const image of [...book.drawings, ...book.photos]) {
      if (!FILE_PAGE.test(image.source ?? '')) throw new Error(`${b.id}: image source is not an https Commons file page: ${image.source}`)
    }
  }
}

rmSync(out, { recursive: true, force: true })
mkdirSync(join(out, 'buildings'), { recursive: true })
write(join(out, 'eras.json'), eras)
write(join(out, 'buildings', 'index.json'), buildings.map((b) => b.id))
// The fields Custom and Themed mode filter on (mirrors CatalogueEntry.java).
write(
  join(out, 'buildings', 'catalogue.json'),
  buildings.map((b) => ({
    id: b.id,
    architects: b.architects.map((a) => a.name),
    era: b.era,
    themes: b.themes ?? [],
    yearCompleted: b.yearCompleted,
    countryCode: b.location.countryCode,
    country: b.location.country,
  })),
)
mkdirSync(join(out, 'pt-BR', 'buildings'), { recursive: true })
// The Library's rows, per language (mirrors LibraryEntry.java).
const libraryRow = (b) => ({
  id: b.id,
  name: b.name,
  architects: b.architects.map((a) => a.name),
  era: b.era,
  yearCompleted: b.yearCompleted,
  countryCode: b.location.countryCode,
  country: b.location.country,
  photo: b.photos.find((p) => p.view === 'EXTERIOR')?.src ?? null,
})
write(join(out, 'library.json'), buildings.map(libraryRow))
write(join(out, 'pt-BR', 'library.json'), buildings.map((b) => libraryRow(translations[b.id] ? translate(b, translations[b.id]) : b)))
for (const b of buildings) {
  write(join(out, 'buildings', `${b.id}.json`), b)
  write(join(out, 'pt-BR', 'buildings', `${b.id}.json`), translations[b.id] ? translate(b, translations[b.id]) : b)
}
console.log(`Static API: ${buildings.length} buildings, ${eras.length} eras -> ${out}`)
