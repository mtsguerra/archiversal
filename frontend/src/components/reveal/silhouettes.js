// Front elevations for the reveal, one per family of styles. Each is drawn the way the
// building would be built; `delay` and `duration` are seconds from the start, and every
// stroke must finish before the name is lettered in (about 2.3 s). Viewbox is 400x244.
const GROUND = { d: 'M24 214H376', delay: 0.15, duration: 0.7, tone: 'ground' }
const dimension = (from, to) => ({
  d: `M${from} 230H${to}M${from} 224V236M${to} 224V236`,
  delay: 0.3,
  duration: 1.2,
  tone: 'dimension',
})

// A civic front, after the Parthenon: two steps, eight fluted columns swelling slightly, a triglyph frieze, a low pediment.
const COLUMNS = Array.from({ length: 8 }, (_, i) => 84 + i * 33.14)
const column = (x) => `M${x - 7} 190Q${x - 7.6} 154 ${x - 5.5} 118V114H${x + 5.5}V118Q${x + 7.6} 154 ${x + 7} 190`
const flutes = (x) => `M${x - 2.4} 186V122M${x + 2.4} 186V122`
const TRIGLYPHS = Array.from({ length: 15 }, (_, i) => 84 + i * 16.57)
const temple = {
  mass: 'M70 88L200 48L330 88V190H70Z',
  strokes: [
    GROUND,
    { d: 'M48 214V202H352V214', delay: 0.4, duration: 0.6 },
    { d: 'M62 202V190H338V202', delay: 0.6, duration: 0.6 },
    ...COLUMNS.map((x, i) => ({ d: column(x), delay: 0.8 + i * 0.1, duration: 0.55, tone: 'column' })),
    ...COLUMNS.map((x, i) => ({ d: flutes(x), delay: 1.45 + i * 0.05, duration: 0.4, tone: 'column' })),
    { d: 'M66 114V104H334V114', delay: 1.7, duration: 0.4 },
    { d: TRIGLYPHS.map((x) => `M${x} 104V92`).join(''), delay: 1.9, duration: 0.4, tone: 'column' },
    { d: 'M62 92V86H338V92Z', delay: 2.0, duration: 0.4 },
    { d: 'M66 86L200 46L334 86', delay: 2.1, duration: 0.6 },
    { d: 'M96 84L200 54L304 84', delay: 2.35, duration: 0.4, tone: 'column' },
    { d: 'M192 46C192 38 200 34 200 28C200 34 208 38 208 46', delay: 2.5, duration: 0.3, tone: 'accent' },
    dimension(48, 352),
  ],
}

// A smooth-sided pyramid, laid course by course from the base up.
const COURSES = [176, 138, 100, 70]
const pyramid = {
  mass: 'M60 214L200 40L340 214Z',
  strokes: [
    GROUND,
    { d: 'M60 214L200 40L340 214', delay: 0.4, duration: 1.1 },
    { d: 'M200 40L248 214', delay: 1.2, duration: 0.7, tone: 'column' },
    ...COURSES.map((y, i) => {
      const inset = ((214 - y) / 174) * 140
      return { d: `M${60 + inset} ${y}H${340 - inset}`, delay: 0.9 + i * 0.25, duration: 0.5 }
    }),
    { d: 'M196 44H204', delay: 2.0, duration: 0.3, tone: 'accent' },
    dimension(60, 340),
  ],
}

// Modernism: shell vaults like sails on a broad podium (the Sydney Opera House).
const sail = (x0, x1, tipX, tipY, base) => {
  const h = base - tipY
  return `M${x0} ${base}C${x0} ${base - h * 0.55} ${tipX - 6} ${tipY + h * 0.2} ${tipX} ${tipY}C${tipX + (x1 - tipX) * 0.25} ${tipY + h * 0.45} ${x1 - 8} ${base - h * 0.2} ${x1} ${base}Z`
}
const SHELLS = [
  [60, 150, 72, 118],
  [100, 200, 110, 84],
  [140, 250, 150, 50],
  [220, 300, 240, 108],
  [255, 330, 270, 86],
  [290, 355, 305, 134],
].map(([x0, x1, tx, ty]) => ({ x0, x1, tx, ty, d: sail(x0, x1, tx, ty, 190) }))
const sails = {
  mass: `M30 214V190H370V214Z ${SHELLS.map((shell) => shell.d).join(' ')}`,
  strokes: [
    GROUND,
    { d: 'M30 214V190H370V214', delay: 0.3, duration: 0.6 },
    { d: 'M30 202H370', delay: 0.5, duration: 0.6 },
    ...SHELLS.map((shell, i) => ({ d: shell.d, delay: 0.8 + i * 0.22, duration: 0.6 })),
    ...SHELLS.map((shell, i) => ({
      d: `M${shell.tx} ${shell.ty}L${(shell.x0 + shell.x1) / 2} 190`,
      delay: 1.1 + i * 0.22,
      duration: 0.4,
      tone: 'column',
    })),
    dimension(30, 370),
  ],
}

// Pointed or round-headed opening, `w` wide, from `bottom` up to the springing at `top`.
const arch = (c, w, bottom, top, rise = w) =>
  `M${c - w / 2} ${bottom}V${top}Q${c - w / 2} ${top - rise} ${c} ${top - rise}Q${c + w / 2} ${top - rise} ${c + w / 2} ${top}V${bottom}`
const spread = (xs, make, start, step, duration, tone) =>
  xs.map((x, i) => ({ d: make(x), delay: start + i * step, duration, tone }))

// Baroque: twin bell towers with bulbous caps around a swelling, two-storey façade (scrolls, broken pediment, oval window), a lantern dome behind.
const baroque = {
  mass: 'M90 214V74Q90 40 112 38Q134 40 134 74V104H170V68C170 24 230 24 230 68V104H266V74Q266 40 288 38Q310 40 310 74V214Z',
  strokes: [
    GROUND,
    { d: 'M90 214V74H134V214', delay: 0.4, duration: 0.6 },
    { d: 'M266 214V74H310V214', delay: 0.5, duration: 0.6 },
    { d: 'M134 214V142Q200 122 266 142V214', delay: 0.8, duration: 0.7 },
    { d: 'M152 214V138M164 214V134M236 214V134M248 214V138', delay: 1.1, duration: 0.5, tone: 'column' },
    { d: arch(200, 30, 214, 186, 15), delay: 1.3, duration: 0.5, tone: 'column' },
    { d: 'M176 172Q190 162 197 169M203 169Q210 162 224 172', delay: 1.6, duration: 0.4 },
    { d: 'M193 152Q200 142 207 152Q200 162 193 152Z', delay: 1.8, duration: 0.3, tone: 'accent' },
    { d: 'M146 142V104H254V142', delay: 1.5, duration: 0.5 },
    { d: 'M200 110C188 110 188 132 200 132C212 132 212 110 200 110Z', delay: 1.7, duration: 0.4, tone: 'column' },
    { d: 'M134 142Q134 124 146 120Q140 112 146 106M266 142Q266 124 254 120Q260 112 254 106', delay: 1.8, duration: 0.4 },
    { d: arch(112, 14, 120, 104, 8), delay: 1.4, duration: 0.4 },
    { d: arch(288, 14, 120, 104, 8), delay: 1.45, duration: 0.4 },
    { d: 'M106 170V154H118V170M282 170V154H294V170', delay: 1.5, duration: 0.3, tone: 'column' },
    { d: 'M142 104Q200 70 258 104', delay: 1.9, duration: 0.5 },
    { d: 'M86 74H138M262 74H314', delay: 1.95, duration: 0.3, tone: 'column' },
    { d: 'M94 74Q94 44 112 40Q130 44 130 74', delay: 2.0, duration: 0.5 },
    { d: 'M270 74Q270 44 288 40Q306 44 306 74', delay: 2.05, duration: 0.5 },
    { d: 'M170 68C170 24 230 24 230 68', delay: 2.1, duration: 0.6 },
    { d: 'M194 36V24H206V36M194 24Q200 14 206 24', delay: 2.4, duration: 0.3 },
    { d: 'M200 14V6M112 40V28M108 33H116M288 40V28M284 33H292', delay: 2.55, duration: 0.25, tone: 'accent' },
    dimension(90, 310),
  ],
}

// Neoclassical: a six-column portico under a pediment, a colonnaded drum and a ribbed dome with a lantern.
const PORTICO = Array.from({ length: 6 }, (_, i) => 120 + i * 32)
const PERISTYLE = Array.from({ length: 7 }, (_, i) => 158 + i * 14.67)
const domedPortico = {
  mass: 'M96 114L152 98V64C152 20 248 20 248 64V98L304 114V190H96Z',
  strokes: [
    GROUND,
    { d: 'M80 214V202H320V214', delay: 0.4, duration: 0.5 },
    { d: 'M92 202V190H308V202', delay: 0.55, duration: 0.5 },
    ...PORTICO.map((x, i) => ({ d: `M${x - 6} 190V126H${x + 6}V190`, delay: 0.8 + i * 0.12, duration: 0.5, tone: 'column' })),
    { d: `M104 126H296V114H104Z`, delay: 1.4, duration: 0.5 },
    { d: 'M96 114L200 88L304 114', delay: 1.6, duration: 0.6 },
    { d: 'M152 98V64H248V98', delay: 1.9, duration: 0.4 },
    { d: PERISTYLE.map((x) => `M${x} 96V66`).join(''), delay: 2.0, duration: 0.4, tone: 'column' },
    { d: 'M148 64H252', delay: 2.05, duration: 0.3 },
    { d: 'M152 64C152 20 248 20 248 64', delay: 2.1, duration: 0.6 },
    { d: 'M174 64Q182 34 200 28M188 64Q194 36 200 28M212 64Q206 36 200 28M226 64Q218 34 200 28', delay: 2.3, duration: 0.45, tone: 'column' },
    { d: 'M193 28V18H207V28M193 18Q200 8 207 18', delay: 2.5, duration: 0.3, tone: 'accent' },
    dimension(80, 320),
  ],
}

// Brutalist, in Niemeyer's vocabulary: a deep concrete slab raised on two flared piers, a
// ramp climbing to it, a dome and a bowl on its roof, and fins along its length.
const FINS = Array.from({ length: 15 }, (_, i) => 86 + i * 16)
const brutalist = {
  mass: 'M70 160V110H100C100 76 160 76 160 110H200V88C214 112 296 112 310 88V110H330V160H280Q280 190 294 214H246Q260 190 260 160H140Q140 190 154 214H106Q120 190 120 160Z',
  strokes: [
    GROUND,
    { d: 'M106 214Q120 190 120 160H140Q140 190 154 214', delay: 0.4, duration: 0.6 },
    { d: 'M246 214Q260 190 260 160H280Q280 190 294 214', delay: 0.5, duration: 0.6 },
    { d: 'M70 160V110H330V160Z', delay: 0.9, duration: 0.8 },
    { d: 'M160 214C190 214 210 200 250 166', delay: 1.3, duration: 0.6, tone: 'accent' },
    ...spread(FINS, (x) => `M${x} 154V116`, 1.1, 0.04, 0.35, 'column'),
    { d: 'M100 110C100 76 160 76 160 110', delay: 1.9, duration: 0.5 },
    { d: 'M200 88C214 112 296 112 310 88H200', delay: 2.1, duration: 0.5 },
    dimension(70, 330),
  ],
}

// Renaissance: a Florentine palazzo (rusticated base, arched windows in two tiers, a deep cornice) and Brunelleschi's ribbed, pointed dome rising behind.
const BAYS = [88, 144, 200, 256, 312]
const palazzo = {
  mass: 'M60 214V110H146V86C146 40 190 30 200 18C210 30 254 40 254 86V110H340V214Z',
  strokes: [
    GROUND,
    { d: 'M60 214V118H340V214', delay: 0.4, duration: 0.7 },
    { d: 'M54 118V110H346V118', delay: 0.8, duration: 0.4 },
    { d: 'M60 178H340M60 148H340', delay: 1.0, duration: 0.5 },
    { d: 'M60 204H340M60 194H340', delay: 1.1, duration: 0.4, tone: 'column' },
    ...spread([88, 144, 256, 312], (c) => `M${c - 6} 202V188H${c + 6}V202`, 1.2, 0.08, 0.35, 'column'),
    { d: arch(200, 22, 214, 190, 11), delay: 1.3, duration: 0.5, tone: 'column' },
    ...spread(BAYS, (c) => arch(c, 16, 172, 156, 8), 1.4, 0.08, 0.4),
    ...spread(BAYS, (c) => arch(c, 16, 144, 128, 8), 1.55, 0.08, 0.4),
    { d: 'M146 110V86H254V110', delay: 1.9, duration: 0.4 },
    { d: 'M146 86C146 40 190 30 200 18C210 30 254 40 254 86', delay: 2.0, duration: 0.6 },
    { d: 'M162 86C164 50 188 34 200 18M180 86C182 54 194 36 200 18M220 86C218 54 206 36 200 18M238 86C236 50 212 34 200 18', delay: 2.2, duration: 0.5, tone: 'column' },
    { d: 'M200 100m-5 0a5 5 0 1 0 10 0a5 5 0 1 0-10 0', delay: 2.3, duration: 0.3, tone: 'column' },
    { d: 'M196 24V14H204V24M200 14V6', delay: 2.5, duration: 0.3, tone: 'accent' },
    dimension(54, 346),
  ],
}

// Art Deco: a streamlined front with a curved corner, horizontal bands and a vertical sign tower.
const deco = {
  mass: 'M70 214V130Q70 110 90 110H260V30H300V214Z',
  strokes: [
    GROUND,
    { d: 'M70 214V130Q70 110 90 110H260V214', delay: 0.4, duration: 0.8 },
    ...spread([150, 175, 195], (y) => `M70 ${y}H260`, 0.8, 0.15, 0.5),
    { d: 'M110 214V190H200V214', delay: 1.3, duration: 0.5, tone: 'column' },
    { d: 'M260 214V30H300V214', delay: 1.0, duration: 0.9 },
    ...spread([270, 280, 290], (x) => `M${x} 214V40`, 1.5, 0.1, 0.6, 'column'),
    { d: 'M260 70H300M260 100H300', delay: 1.9, duration: 0.4 },
    { d: 'M105 186H205', delay: 2.0, duration: 0.3, tone: 'accent' },
    { d: 'M280 30V8', delay: 2.3, duration: 0.2, tone: 'accent' },
    dimension(70, 300),
  ],
}

// Manueline: a deep portal under a pointed arch, rope-twisted columns, an armillary sphere
// and the cross of the Order of Christ, between pinnacles.
const rope = (x, from, to) => {
  const steps = Array.from({ length: Math.round((from - to) / 18) }, (_, i) => `T${x} ${from - 18 * (i + 1)}`)
  return `M${x} ${from}Q${x + 10} ${from - 9} ${x} ${from - 18}${steps.slice(1).join('')}`
}
const belem = {
  mass: 'M80 214V60H96V30L104 14L112 30V60H288V30L296 14L304 30V60H320V214Z',
  strokes: [
    GROUND,
    { d: 'M80 214V60H320V214', delay: 0.4, duration: 0.7 },
    { d: 'M96 60V30L104 14L112 30V60', delay: 0.8, duration: 0.5 },
    { d: 'M288 60V30L296 14L304 30V60', delay: 0.9, duration: 0.5 },
    { d: 'M150 214V130Q150 70 200 40Q250 70 250 130V214', delay: 1.0, duration: 0.8 },
    { d: 'M164 214V134Q164 88 200 62Q236 88 236 134V214', delay: 1.2, duration: 0.7 },
    { d: rope(140, 214, 106), delay: 1.0, duration: 0.8, tone: 'accent' },
    { d: rope(260, 214, 106), delay: 1.1, duration: 0.8, tone: 'accent' },
    { d: arch(110, 16, 170, 150, 8), delay: 1.6, duration: 0.4 },
    { d: arch(290, 16, 170, 150, 8), delay: 1.7, duration: 0.4 },
    { d: 'M190 46a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M190 46Q200 30 210 46Q200 62 190 46', delay: 1.9, duration: 0.5, tone: 'column' },
    { d: 'M200 28V12M194 18H206', delay: 2.4, duration: 0.3, tone: 'accent' },
    dimension(80, 320),
  ],
}

// Islamic and Byzantine: a domed hall with a horseshoe portal beside a tall minaret.
const domedMinaret = {
  mass: 'M90 214V140H120C120 60 220 60 220 140H250V214ZM272 214V50L280 20L288 50V214Z',
  strokes: [
    GROUND,
    { d: 'M90 214V140H250V214', delay: 0.4, duration: 0.7 },
    { d: 'M152 214V184C132 172 142 150 170 150C198 150 208 172 188 184V214', delay: 0.9, duration: 0.7, tone: 'column' },
    { d: arch(112, 14, 190, 172, 8), delay: 1.2, duration: 0.4 },
    { d: arch(228, 14, 190, 172, 8), delay: 1.3, duration: 0.4 },
    { d: 'M120 140C120 60 220 60 220 140', delay: 1.5, duration: 0.8 },
    { d: 'M170 80V64', delay: 2.3, duration: 0.2, tone: 'accent' },
    { d: 'M272 214V50H288V214', delay: 0.8, duration: 0.9 },
    { d: 'M264 100H296M266 70H294', delay: 1.6, duration: 0.4, tone: 'column' },
    { d: 'M272 50L280 20L288 50', delay: 1.9, duration: 0.4 },
    dimension(90, 288),
  ],
}

// Mannerism: the classical rules bent: giant pilasters, a pediment inside a pediment and a
// keystone that has slipped out of its arch.
const mannerist = {
  mass: 'M80 214V110L200 66L320 110V214Z',
  strokes: [
    GROUND,
    { d: 'M80 214V110H320V214', delay: 0.4, duration: 0.7 },
    ...spread([100, 160, 240, 300], (x) => `M${x - 6} 214V110H${x + 6}V214`, 0.7, 0.12, 0.5, 'column'),
    { d: 'M80 190H320M80 170H320', delay: 1.2, duration: 0.5 },
    { d: 'M170 214V160Q170 130 200 130Q230 130 230 160V214', delay: 1.3, duration: 0.6, tone: 'column' },
    { d: 'M80 110L200 66L320 110', delay: 1.7, duration: 0.6 },
    { d: 'M170 100L200 82L230 100', delay: 2.0, duration: 0.4 },
    { d: 'M193 140H207L204 158H196Z', delay: 2.3, duration: 0.3, tone: 'accent' },
    dimension(80, 320),
  ],
}

// Indic: a curving shikhara tower in tiers over a plinth, with a stepped porch.
const half = (y) => 60 * (1 - ((198 - y) / 150) ** 1.7)
const RIDGES = [170, 146, 122, 98, 74]
const shikhara = {
  mass: 'M70 214V168L105 138L140 168V198C140 120 170 70 200 48C230 70 260 120 260 198V214Z',
  strokes: [
    GROUND,
    { d: 'M70 214V198H330V214', delay: 0.4, duration: 0.5 },
    { d: 'M70 198V168H140V198', delay: 0.7, duration: 0.5 },
    { d: 'M76 168L105 138L134 168', delay: 0.9, duration: 0.5 },
    { d: 'M140 198C140 120 170 70 200 48C230 70 260 120 260 198', delay: 1.0, duration: 1.0 },
    ...RIDGES.map((y, i) => ({
      d: `M${(200 - half(y)).toFixed(1)} ${y}H${(200 + half(y)).toFixed(1)}`,
      delay: 1.2 + i * 0.12,
      duration: 0.35,
    })),
    { d: 'M186 198V170H214V198', delay: 1.6, duration: 0.4, tone: 'column' },
    { d: 'M184 56H216', delay: 2.0, duration: 0.3 },
    { d: 'M200 48V26M196 32H204', delay: 2.3, duration: 0.3, tone: 'accent' },
    dimension(70, 330),
  ],
}

// Russian: after St Basil's, a tented tower ringed with kokoshnik arches among ribbed onion domes on drums.
const onion = (cx, base, w, h) =>
  `M${cx - w / 2} ${base}C${cx - w * 0.9} ${base - h * 0.35} ${cx - w * 0.2} ${base - h * 0.55} ${cx} ${base - h}C${cx + w * 0.2} ${base - h * 0.55} ${cx + w * 0.9} ${base - h * 0.35} ${cx + w / 2} ${base}`
const DOMES = [
  { cx: 126, base: 128, w: 38, h: 44 },
  { cx: 274, base: 128, w: 38, h: 44 },
  { cx: 80, base: 142, w: 28, h: 30 },
  { cx: 320, base: 142, w: 28, h: 30 },
]
const drum = ({ cx, base, w }, top = 150) => `M${cx - w / 2 + 2} ${top}V${base}H${cx + w / 2 - 2}V${top}`
const russian = {
  mass: `M60 214V150H178V96L200 22L222 96V150H340V214Z${DOMES.map((o) => `${onion(o.cx, o.base, o.w, o.h)}Z`).join('')}`,
  strokes: [
    GROUND,
    { d: 'M60 214V150H340V214', delay: 0.4, duration: 0.6 },
    { d: arch(200, 24, 214, 192, 12), delay: 0.8, duration: 0.4, tone: 'column' },
    ...spread([100, 140, 260, 300], (c) => arch(c, 14, 196, 178, 7), 0.9, 0.08, 0.4),
    { d: 'M178 150V96H222V150', delay: 1.0, duration: 0.5 },
    { d: 'M186 142V112H194V142M206 142V112H214V142', delay: 1.2, duration: 0.3, tone: 'column' },
    { d: 'M178 96Q184 86 189 96Q194 86 200 96Q206 86 211 96Q216 86 222 96', delay: 1.3, duration: 0.4 },
    { d: 'M178 96L200 22L222 96', delay: 1.5, duration: 0.6 },
    { d: 'M200 22V96M189 58L200 50L211 58', delay: 1.9, duration: 0.3, tone: 'column' },
    ...DOMES.map((o, i) => ({ d: drum(o), delay: 1.2 + i * 0.08, duration: 0.4 })),
    ...DOMES.map((o, i) => ({ d: onion(o.cx, o.base, o.w, o.h), delay: 1.6 + i * 0.1, duration: 0.55 })),
    ...DOMES.map((o, i) => ({ d: onion(o.cx, o.base, o.w * 0.45, o.h), delay: 2.0 + i * 0.05, duration: 0.4, tone: 'column' })),
    { d: 'M200 22V8M195 14H205M126 84V70M274 84V70M80 112V102M320 112V102', delay: 2.4, duration: 0.3, tone: 'accent' },
    dimension(60, 340),
  ],
}

// Ottoman: after the great mosques of Istanbul, a central dome on a windowed drum, half-domes either side, and two pencil minarets with balconies.
const TICKS = Array.from({ length: 7 }, (_, i) => 166 + i * 11.33)
const ottoman = {
  mass: 'M96 214V172H158V120C158 52 242 52 242 120V172H304V214ZM58 214L60 70L64 26L68 70L70 214ZM330 214L332 70L336 26L340 70L342 214Z',
  strokes: [
    GROUND,
    { d: 'M58 214L60 70H68L70 214', delay: 0.4, duration: 0.9 },
    { d: 'M330 214L332 70H340L342 214', delay: 0.5, duration: 0.9 },
    { d: 'M96 214V172H304V214', delay: 0.6, duration: 0.6 },
    ...spread([124, 162, 200, 238, 276], (c) => arch(c, 14, 208, 190, 8), 0.9, 0.08, 0.4, 'column'),
    { d: 'M158 172V120H242V172', delay: 1.1, duration: 0.5 },
    { d: TICKS.map((x) => `M${x} 152V132`).join(''), delay: 1.5, duration: 0.4, tone: 'column' },
    { d: 'M96 172C100 138 130 126 158 124', delay: 1.5, duration: 0.5 },
    { d: 'M304 172C300 138 270 126 242 124', delay: 1.6, duration: 0.5 },
    { d: 'M54 92H74V98H54ZM326 92H346V98H326Z', delay: 1.6, duration: 0.4 },
    { d: 'M54 124H74M326 124H346', delay: 1.7, duration: 0.3, tone: 'column' },
    { d: 'M158 120C158 52 242 52 242 120', delay: 1.7, duration: 0.7 },
    { d: 'M60 70L64 26L68 70M332 70L336 26L340 70', delay: 2.0, duration: 0.3 },
    { d: 'M200 70V48M193 44Q200 34 207 44Q200 40 193 44Z', delay: 2.2, duration: 0.3, tone: 'accent' },
    { d: 'M64 26V16M336 26V16', delay: 2.4, duration: 0.2, tone: 'accent' },
    dimension(54, 346),
  ],
}

// Pre-Columbian: Machu Picchu, terraces climbing to a plateau of gabled stone houses under Huayna Picchu.
const machuPicchu = {
  mass: 'M40 214V198H80V182H110V166L130 120C170 88 205 58 232 32L246 24L262 44C292 76 330 110 372 150V198H360V214Z',
  strokes: [
    GROUND,
    { d: 'M110 166L130 120C170 88 205 58 232 32L246 24L262 44C292 76 330 110 372 150', delay: 0.4, duration: 1.0, tone: 'column' },
    { d: 'M40 214V198H80V182H110V166H135V150H150', delay: 0.6, duration: 0.7 },
    { d: 'M360 214V198H320V182H290V166H265V150H250', delay: 0.7, duration: 0.7 },
    { d: 'M48 207H78M88 191H108M116 175H133', delay: 0.9, duration: 0.5, tone: 'column' },
    { d: 'M352 207H322M312 191H292M284 175H267', delay: 1.0, duration: 0.5, tone: 'column' },
    { d: 'M150 150H250', delay: 1.2, duration: 0.3 },
    { d: 'M160 150V126H190V150', delay: 1.4, duration: 0.4 },
    { d: 'M206 150V122H238V150', delay: 1.5, duration: 0.4 },
    { d: 'M156 126L175 108L194 126', delay: 1.7, duration: 0.3 },
    { d: 'M202 122L222 102L242 122', delay: 1.8, duration: 0.3 },
    { d: 'M170 150V138H180V150M217 150V136H227V150', delay: 2.1, duration: 0.3, tone: 'accent' },
    dimension(40, 360),
  ],
}

// Islamic: the Taj Mahal, a great onion dome with four small domes, a pointed iwan and four minarets on a plinth.
const tajMahal = {
  mass: 'M30 214V198H72V70H88V198H140V120H168V104C168 70 190 60 200 40C210 60 232 70 232 104V120H260V188H312V70H328V198H370V214Z',
  strokes: [
    GROUND,
    { d: 'M30 214V198H370V214', delay: 0.4, duration: 0.5 },
    { d: 'M70 198V188H330V198', delay: 0.6, duration: 0.4 },
    { d: 'M72 198V72H88V198', delay: 0.8, duration: 0.6 },
    { d: 'M312 198V72H328V198', delay: 0.9, duration: 0.6 },
    { d: 'M140 188V120H260V188', delay: 1.0, duration: 0.6 },
    { d: 'M68 112H92M68 152H92', delay: 1.2, duration: 0.3, tone: 'column' },
    { d: 'M68 72H92M72 72C72 58 88 58 88 72', delay: 1.3, duration: 0.3 },
    { d: 'M308 112H332M308 152H332', delay: 1.3, duration: 0.3, tone: 'column' },
    { d: 'M308 72H332M312 72C312 58 328 58 328 72', delay: 1.4, duration: 0.3 },
    { d: 'M180 188V140L200 110L220 140V188', delay: 1.4, duration: 0.5, tone: 'column' },
    { d: 'M168 120V104H232V120', delay: 1.6, duration: 0.3 },
    { d: 'M170 104C170 72 190 62 200 42C210 62 230 72 230 104', delay: 1.8, duration: 0.7 },
    { d: 'M146 120V112C146 100 160 96 160 86C160 96 174 100 174 112V120', delay: 2.0, duration: 0.4 },
    { d: 'M226 120V112C226 100 240 96 240 86C240 96 254 100 254 112V120', delay: 2.1, duration: 0.4 },
    { d: 'M200 42V20M195 30H205', delay: 2.4, duration: 0.3, tone: 'accent' },
    dimension(30, 370),
  ],
}

// East Asian: a five-tier pagoda; every eave sweeps up at its corners and each storey is a little narrower.
const TIERS = Array.from({ length: 5 }, (_, i) => {
  const bottom = 188 - i * 28
  const hw = 50 - i * 8
  return { bottom, top: bottom - 20, hw, eave: hw + 16 }
})
const pagodaMass =
  `M120 214V188${TIERS.map((t) => `H${200 - t.eave}V${t.top - 2}L${200 - t.hw} ${t.top - 8}`).join('')}` +
  `${[...TIERS].reverse().map((t) => `H${200 + t.hw}L${200 + t.eave} ${t.top - 2}V${t.bottom}`).join('')}H280V214Z`
const pagoda = {
  mass: pagodaMass,
  strokes: [
    GROUND,
    { d: 'M120 214V202H280V214', delay: 0.4, duration: 0.4 },
    { d: 'M130 202V188H270V202', delay: 0.6, duration: 0.4 },
    { d: 'M192 188V174Q200 166 208 174V188', delay: 0.9, duration: 0.3, tone: 'column' },
    ...TIERS.flatMap((t, i) => [
      { d: `M${200 - t.hw} ${t.bottom}V${t.top}H${200 + t.hw}V${t.bottom}`, delay: 0.9 + i * 0.3, duration: 0.35 },
      {
        d: `M${200 - t.eave} ${t.top - 2}Q${200 - t.eave + 10} ${t.top + 8} ${200 - t.hw} ${t.top + 4}L200 ${t.top - 8}L${200 + t.hw} ${t.top + 4}Q${200 + t.eave - 10} ${t.top + 8} ${200 + t.eave} ${t.top - 2}H${200 - t.eave}`,
        delay: 1.0 + i * 0.3,
        duration: 0.45,
      },
      ...(i === 0 ? [] : [{ d: `M196 ${t.top + 5}H204V${t.bottom - 4}H196Z`, delay: 1.15 + i * 0.3, duration: 0.25, tone: 'column' }]),
    ]),
    { d: 'M200 48V10M194 40H206M195 32H205M196 24H204M197 17H203', delay: 2.3, duration: 0.4, tone: 'accent' },
    dimension(120, 280),
  ],
}

// Medieval: the west front of Notre-Dame de Paris: two square towers, three portals, the gallery of kings and the rose window.
const notreDame = {
  mass: 'M100 214V58H150V62H250V58H300V214Z',
  strokes: [
    GROUND,
    { d: 'M100 214V58H150V214', delay: 0.4, duration: 0.8 },
    { d: 'M250 214V58H300V214', delay: 0.5, duration: 0.8 },
    { d: 'M96 58H154M246 58H304', delay: 1.0, duration: 0.4 },
    { d: 'M150 62H250M150 68H250', delay: 1.0, duration: 0.4 },
    { d: 'M100 118H300', delay: 1.1, duration: 0.5 },
    { d: 'M100 124H300', delay: 1.2, duration: 0.5 },
    { d: 'M176 214V172Q176 142 200 126Q224 142 224 172V214', delay: 1.2, duration: 0.7 },
    { d: 'M110 214V178Q110 162 124 152Q138 162 138 178V214', delay: 1.3, duration: 0.6 },
    { d: 'M262 214V178Q262 162 276 152Q290 162 290 178V214', delay: 1.4, duration: 0.6 },
    { d: 'M110 100V78Q110 70 116 70Q122 70 122 78V100M128 100V78Q128 70 134 70Q140 70 140 78V100', delay: 1.3, duration: 0.5, tone: 'column' },
    { d: 'M260 100V78Q260 70 266 70Q272 70 272 78V100M278 100V78Q278 70 284 70Q290 70 290 78V100', delay: 1.4, duration: 0.5, tone: 'column' },
    { d: 'M178 86a22 22 0 1 0 44 0a22 22 0 1 0 -44 0', delay: 1.5, duration: 0.6, tone: 'accent' },
    { d: 'M190 86a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M200 64V108M178 86H222M184 70L216 102M216 70L184 102', delay: 1.8, duration: 0.5, tone: 'column' },
    { d: 'M188 62L200 14L212 62', delay: 2.1, duration: 0.4 },
    { d: 'M200 14V6M196 9H204', delay: 2.4, duration: 0.3, tone: 'accent' },
    dimension(100, 300),
  ],
}

// Historicism: Neuschwanstein, a white fairy-tale castle on a rock, with slim towers under steep conical roofs.
const neuschwanstein = {
  mass: 'M40 214L66 200V92L90 18L112 92V190H120V130L130 112H168V86L185 44L204 86V112H270L286 130V72L309 22L330 72V192L360 214Z',
  strokes: [
    GROUND,
    { d: 'M40 214L66 200L92 204L118 192L150 196L196 190L240 194L268 188L296 196L330 200L360 214', delay: 0.4, duration: 1.0, tone: 'column' },
    { d: 'M120 190V130H280V190', delay: 0.8, duration: 0.6 },
    { d: 'M72 192V92H108V192', delay: 1.0, duration: 0.7 },
    { d: 'M292 192V72H326V192', delay: 1.1, duration: 0.7 },
    { d: 'M114 130L130 112H270L286 130', delay: 1.3, duration: 0.5 },
    { d: 'M170 130V86H200V130', delay: 1.4, duration: 0.5 },
    { d: 'M68 92H112L90 18Z', delay: 1.7, duration: 0.5 },
    { d: 'M288 72H330L309 22Z', delay: 1.8, duration: 0.5 },
    { d: 'M166 86H204L185 44Z', delay: 1.9, duration: 0.4 },
    { d: 'M140 172V154Q140 146 146 146Q152 146 152 154V172M190 172V154Q190 146 196 146Q202 146 202 154V172M240 172V154Q240 146 246 146Q252 146 252 154V172', delay: 2.0, duration: 0.5, tone: 'column' },
    { d: 'M86 168V146Q86 140 90 140Q94 140 94 146V168M86 128V114Q86 108 90 108Q94 108 94 114V128', delay: 2.1, duration: 0.4, tone: 'column' },
    { d: 'M304 170V150Q304 144 309 144Q314 144 314 150V170M304 126V108Q304 102 309 102Q314 102 314 108V126', delay: 2.2, duration: 0.4, tone: 'column' },
    { d: 'M90 18V8L100 12', delay: 2.5, duration: 0.3, tone: 'accent' },
    dimension(40, 360),
  ],
}

// Industrial: the Eiffel Tower, four legs curving into one shaft, three platforms and the lattice between them.
const EIFFEL_Y = Array.from({ length: 16 }, (_, i) => 214 - (i * 178) / 15)
const eiffelHalf = (y) => 4 + 74 * ((y - 36) / 178) ** 2.4
const eiffelL = (y) => +(200 - eiffelHalf(y)).toFixed(1)
const eiffelR = (y) => +(200 + eiffelHalf(y)).toFixed(1)
const eiffelSide = (x) => `M${EIFFEL_Y.map((y) => `${x(y)} ${+y.toFixed(1)}`).join('L')}`
const platform = (y) => `M${eiffelL(y) - 6} ${y}H${eiffelR(y) + 6}M${eiffelL(y) - 6} ${y + 4}H${eiffelR(y) + 6}`
const lattice = (ya, yb) => `M${eiffelL(ya)} ${ya}L${eiffelR(yb)} ${yb}M${eiffelR(ya)} ${ya}L${eiffelL(yb)} ${yb}`
const legInner = (y) => +(146 + (30 * (214 - y)) / 62).toFixed(1)
const legZigzag = (side) => {
  const x = side === 'l' ? (y) => eiffelL(y) : (y) => 400 - eiffelL(y)
  const inner = side === 'l' ? legInner : (y) => 400 - legInner(y)
  return `M${x(200)} 200L${inner(186)} 186L${x(172)} 172L${inner(160)} 160`
}
const eiffel = {
  mass: `${eiffelSide(eiffelL)}L${[...EIFFEL_Y].reverse().map((y) => `${eiffelR(y)} ${+y.toFixed(1)}`).join('L')}Z`,
  strokes: [
    GROUND,
    { d: eiffelSide(eiffelL), delay: 0.4, duration: 1.0 },
    { d: eiffelSide(eiffelR), delay: 0.5, duration: 1.0 },
    { d: 'M146 214Q150 178 200 168Q250 178 254 214', delay: 1.0, duration: 0.5 },
    { d: 'M146 214L176 152', delay: 1.1, duration: 0.4 },
    { d: 'M254 214L224 152', delay: 1.15, duration: 0.4 },
    { d: platform(150), delay: 1.3, duration: 0.4 },
    { d: `${legZigzag('l')}M176 152L200 168L224 152${legZigzag('r')}`, delay: 1.5, duration: 0.5, tone: 'column' },
    { d: platform(100), delay: 1.6, duration: 0.35 },
    { d: lattice(150, 100), delay: 1.7, duration: 0.5, tone: 'column' },
    { d: platform(62), delay: 1.9, duration: 0.35 },
    { d: lattice(100, 62), delay: 2.0, duration: 0.4, tone: 'column' },
    { d: lattice(62, 36), delay: 2.2, duration: 0.3, tone: 'column' },
    { d: 'M200 36V8M196 22H204', delay: 2.3, duration: 0.4, tone: 'accent' },
    dimension(122, 278),
  ],
}

// Art Nouveau: the Sagrada Família, parabolic spires over a rippling cornice, the tallest tower behind.
const SAGRADA = [
  { cx: 112, top: 52 },
  { cx: 168, top: 38 },
  { cx: 232, top: 38 },
  { cx: 288, top: 52 },
]
const spire = (cx, top, hw = 16) =>
  `M${cx - hw} 150C${cx - hw} ${(150 + top) / 2 + 10} ${cx - 5} ${top + 28} ${cx} ${top}C${cx + 5} ${top + 28} ${cx + hw} ${(150 + top) / 2 + 10} ${cx + hw} 150`
const sagrada = {
  mass: `M70 214V150H330V214Z${SAGRADA.map(({ cx, top }) => `${spire(cx, top)}Z`).join('')}${spire(200, 16, 16)}Z`,
  strokes: [
    GROUND,
    { d: 'M70 214V150H330V214', delay: 0.4, duration: 0.6 },
    { d: 'M70 160Q100 150 130 160T190 160T250 160T330 160', delay: 0.8, duration: 0.6, tone: 'column' },
    { d: 'M180 214V178Q180 160 200 154Q220 160 220 178V214', delay: 1.0, duration: 0.5 },
    { d: 'M96 214V190Q96 178 110 174Q124 178 124 190V214', delay: 1.1, duration: 0.5 },
    { d: 'M276 214V190Q276 178 290 174Q304 178 304 190V214', delay: 1.2, duration: 0.5 },
    ...SAGRADA.map(({ cx, top }, i) => ({ d: spire(cx, top), delay: 0.9 + i * 0.25, duration: 0.7 })),
    { d: spire(200, 16), delay: 1.8, duration: 0.8 },
    ...SAGRADA.map(({ cx }, i) => ({
      d: `M${cx - 6} 134V96M${cx + 6} 134V96M${cx - 9} 112H${cx + 9}M${cx - 7} 94H${cx + 7}`,
      delay: 1.25 + i * 0.25,
      duration: 0.4,
      tone: 'column',
    })),
    ...SAGRADA.map(({ cx, top }, i) => ({ d: `M${cx} ${top}V${top - 10}M${cx - 4} ${top - 6}H${cx + 4}`, delay: 2.0 + i * 0.1, duration: 0.3 })),
    { d: 'M200 16V4M195 9H205', delay: 2.5, duration: 0.3, tone: 'accent' },
    dimension(70, 330),
  ],
}

// Postmodernism: the Petronas Towers, two stepped, ribbed towers with spires, joined by a skybridge.
const PETRONAS = [148, 252]
const petronasHalf = (y) => (y > 120 ? 30 : y > 90 ? 26 : y > 62 ? 20 : 14)
const tower = (cx) =>
  `M${cx - 30} 214V120H${cx - 26}V90H${cx - 20}V62H${cx - 14}V44L${cx} 12L${cx + 14} 44V62H${cx + 20}V90H${cx + 26}V120H${cx + 30}V214`
const FLOORS = [200, 186, 172, 158, 144, 130, 112, 100, 84, 72, 56]
const petronas = {
  mass: PETRONAS.map((cx) => `${tower(cx)}Z`).join(''),
  strokes: [
    GROUND,
    { d: 'M90 214V198H310V214', delay: 0.4, duration: 0.4 },
    ...PETRONAS.map((cx, i) => ({ d: tower(cx), delay: 0.5 + i * 0.15, duration: 1.2 })),
    ...PETRONAS.map((cx, i) => ({ d: `M${cx - 10} 214V120M${cx + 10} 214V120M${cx - 8} 120V62M${cx + 8} 120V62`, delay: 1.4 + i * 0.1, duration: 0.5, tone: 'column' })),
    ...PETRONAS.map((cx, i) => ({
      d: FLOORS.map((y) => `M${cx - petronasHalf(y)} ${y}H${cx + petronasHalf(y)}`).join(''),
      delay: 1.6 + i * 0.1,
      duration: 0.6,
      tone: 'column',
    })),
    { d: 'M178 124H222V136H178ZM184 136L200 152L216 136', delay: 1.9, duration: 0.5 },
    ...PETRONAS.map((cx, i) => ({ d: `M${cx} 12V3`, delay: 2.3 + i * 0.1, duration: 0.3, tone: 'accent' })),
    dimension(90, 310),
  ],
}

// Contemporary: the Burj Khalifa, nine setbacks each a little narrower than the last, and a needle spire.
const BURJ = Array.from({ length: 9 }, (_, k) => {
  const hw = 36 - 3.4 * k
  return { yb: 214 - k * 16, yt: 198 - k * 16, l: +(hw + (k % 2 ? 2 : 0)).toFixed(1), r: +(hw + (k % 2 ? 0 : 2)).toFixed(1) }
})
const burjMass =
  `M${200 - BURJ[0].l} 214${BURJ.map((t, k) => `V${t.yt}${k < 8 ? `H${200 - BURJ[k + 1].l}` : ''}`).join('')}H${200 + BURJ[8].r}` +
  `${[...BURJ].reverse().map((t, k, all) => `V${t.yb}${k < 8 ? `H${200 + all[k + 1].r}` : ''}`).join('')}Z`
const burj = {
  mass: burjMass,
  strokes: [
    GROUND,
    { d: 'M100 214V200H300V214', delay: 0.3, duration: 0.4 },
    ...BURJ.map((t, k) => ({ d: `M${200 - t.l} ${t.yb}V${t.yt}H${200 + t.r}V${t.yb}`, delay: 0.5 + k * 0.18, duration: 0.3 })),
    { d: 'M200 214V70', delay: 1.0, duration: 1.2, tone: 'column' },
    { d: 'M182 214V150M218 214V150M190 150V110M210 150V110', delay: 1.2, duration: 0.8, tone: 'column' },
    { d: 'M120 200V184H154M280 200V184H246', delay: 0.6, duration: 0.5, tone: 'column' },
    { d: 'M197 70L200 8L203 70Z', delay: 2.2, duration: 0.5, tone: 'accent' },
    dimension(100, 300),
  ],
}

// CLASSICAL keeps the civic front; any era not listed falls back to it too.
export const BY_ERA = {
  ANCIENT_EGYPTIAN: pyramid,
  PRE_COLUMBIAN: machuPicchu,
  MEDIEVAL: notreDame,
  HISTORICISM: neuschwanstein,
  BAROQUE: baroque,
  NEOCLASSICAL: domedPortico,
  ART_NOUVEAU: sagrada,
  POSTMODERNISM: petronas,
  BRUTALISM: brutalist,
  RENAISSANCE: palazzo,
  ART_DECO: deco,
  MANNERISM: mannerist,
  INDUSTRIAL: eiffel,
  INDIC: shikhara,
  RUSSIAN: russian,
  OTTOMAN: ottoman,
  MANUELINE: belem,
  ISLAMIC: tajMahal,
  BYZANTINE: domedMinaret,
  EAST_ASIAN: pagoda,
  MODERNISM: sails,
  CONTEMPORARY: burj,
}

export const silhouetteFor = (era) => BY_ERA[era] ?? temple
export const silhouettes = {
  temple,
  pyramid,
  machuPicchu,
  notreDame,
  sails,
  burj,
  neuschwanstein,
  baroque,
  domedPortico,
  sagrada,
  petronas,
  brutalist,
  palazzo,
  deco,
  belem,
  domedMinaret,
  tajMahal,
  pagoda,
  mannerist,
  eiffel,
  shikhara,
  russian,
  ottoman,
}
