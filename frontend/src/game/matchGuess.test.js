import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { resolveCountryCode, suggestCountries } from './countries.js'
import { judgeEra, evaluateGuess, scoreOf, matchesName } from './matchGuess.js'
import { normalize } from './text.js'
import { salk, santIvo, villaSavoye } from './testBuildings.js'

describe('normalize', () => {
  it('strips accents, case, punctuation and a leading "the"', () => {
    expect(normalize("  Sant'Ivo   alla SAPIENZA ")).toBe('sant ivo alla sapienza')
    expect(normalize('Charles-Édouard Jeanneret')).toBe('charles edouard jeanneret')
    expect(normalize('The Salk')).toBe('salk')
  })
})

describe('matchesName', () => {
  const savoye = [villaSavoye.name, ...villaSavoye.aliases]

  it.each(['Villa Savoye', 'villa savoye', 'Vila Savoye', 'Savoye', 'Savoy', 'Les Heures Claires'])(
    'accepts %s for Villa Savoye',
    (guess) => expect(matchesName(guess, savoye)).toBe(true),
  )

  it.each(['Villa', 'House', 'Villa Rotonda', 'Sa', ''])('rejects %s for Villa Savoye', (guess) => {
    expect(matchesName(guess, savoye)).toBe(false)
  })

  it('accepts typos scaled to length', () => {
    expect(matchesName('Sant Ivo alla Sapeinza', [santIvo.name])).toBe(true)
    expect(matchesName('Sapienza', [santIvo.name])).toBe(true)
  })

  it('accepts surnames but not first names for people', () => {
    const kahn = ['Louis Kahn', 'Louis I. Kahn', 'Kahn']
    expect(matchesName('Kahn', kahn, { person: true })).toBe(true)
    expect(matchesName('Louis Khan', kahn, { person: true })).toBe(true)
    expect(matchesName('Louis', kahn, { person: true })).toBe(false)
  })
})

describe('countries', () => {
  it.each([
    ['France', 'FR'],
    ['france', 'FR'],
    ['Frnace', 'FR'],
    ['USA', 'US'],
    ['United States of America', 'US'],
    ['us', 'US'],
    ['Turkey', 'TR'],
    ['Türkiye', 'TR'],
    ['England', 'GB'],
    ['Palestine', 'PS'],
    ['Palestina', 'PS'],
  ])('resolves %s to %s', (text, code) => {
    expect(resolveCountryCode(text)).toBe(code)
  })

  it('returns null for nonsense', () => {
    expect(resolveCountryCode('Atlantis')).toBeNull()
    expect(resolveCountryCode('')).toBeNull()
  })

  it('does not offer non-countries', () => {
    expect(resolveCountryCode('European Union')).toBeNull()
  })

  it('suggests prefix matches first', () => {
    const names = suggestCountries('ital').map((c) => c.name)
    expect(names[0]).toBe('Italy')
    expect(suggestCountries('ital', 'pt-BR').map((c) => c.name)).toContain('Itália')
    expect(suggestCountries('united').map((c) => c.code)).toEqual(expect.arrayContaining(['US', 'GB', 'AE']))
  })
})

describe('evaluateGuess', () => {
  it('judges each field and skips empty ones', () => {
    expect(evaluateGuess(villaSavoye, { name: 'Savoye', architect: '', country: 'Italy', era: 'MODERNISM' })).toEqual({
      name: true,
      architect: null,
      country: false,
      era: true,
    })
  })

  it('accepts any one of several architects', () => {
    expect(evaluateGuess(villaSavoye, { architect: 'Pierre Jeanneret' }).architect).toBe(true)
    expect(evaluateGuess(villaSavoye, { architect: 'Le Corbusier' }).architect).toBe(true)
    expect(evaluateGuess(villaSavoye, { architect: 'Mies van der Rohe' }).architect).toBe(false)
  })

  it('treats whitespace as empty', () => {
    expect(evaluateGuess(salk, { name: '   ' }).name).toBeNull()
  })
})

describe('judgeEra', () => {
  it('accepts the exact era', () => {
    expect(judgeEra('BAROQUE', 'BAROQUE')).toBe(true)
  })

  it.each([
    ['BRUTALISM', 'MODERNISM'],
    ['MODERNISM', 'BRUTALISM'],
    ['MODERNISM', 'CONTEMPORARY'],
    ['CONTEMPORARY', 'BRUTALISM'],
    ['POSTMODERNISM', 'CONTEMPORARY'],
    ['ART_NOUVEAU', 'HISTORICISM'],
    ['ART_DECO', 'MODERNISM'],
    ['HISTORICISM', 'NEOCLASSICAL'],
    ['MEDIEVAL', 'MANUELINE'],
    ['MANUELINE', 'RENAISSANCE'],
    ['MANNERISM', 'RENAISSANCE'],
    ['BAROQUE', 'MANNERISM'],
    ['ISLAMIC', 'MEDIEVAL'],
    ['INDUSTRIAL', 'HISTORICISM'],
    ['RUSSIAN', 'BYZANTINE'],
  ])('is %s close to %s (not correct)', (guess, answer) => {
    expect(judgeEra(guess, answer)).toBe('close')
  })

  it.each([
    ['RENAISSANCE', 'BAROQUE'],
    ['POSTMODERNISM', 'MODERNISM'],
    ['ART_NOUVEAU', 'MODERNISM'],
    ['CLASSICAL', 'CONTEMPORARY'],
    ['OTTOMAN', 'BYZANTINE'],
    ['MANUELINE', 'BAROQUE'],
    ['ISLAMIC', 'OTTOMAN'],
    ['MANNERISM', 'MODERNISM'],
    ['EAST_ASIAN', 'INDIC'],
    ['ANCIENT_EGYPTIAN', 'CLASSICAL'],
  ])('rejects %s for %s', (guess, answer) => {
    expect(judgeEra(guess, answer)).toBe(false)
  })

  it('is used when judging a guess', () => {
    expect(evaluateGuess(salk, { era: 'BRUTALISM' }).era).toBe(true)
    expect(evaluateGuess(salk, { era: 'MODERNISM' }).era).toBe('close')
    expect(evaluateGuess(santIvo, { era: 'RENAISSANCE' }).era).toBe(false)
  })
})

describe('scoreOf', () => {
  it('gives 1 for correct, half for close, 0 otherwise', () => {
    expect(scoreOf({ name: 'correct', architect: 'close', country: 'wrong', era: 'idle' })).toBe(1.5)
  })
})

describe('vague answers against the whole catalogue', () => {
  const buildings = JSON.parse(
    readFileSync(new URL('../../../src/main/resources/data/buildings.json', import.meta.url), 'utf8'),
  )
  const accepts = (b, g) => matchesName(g, [b.name, ...b.aliases])

  it('rejects bare building types and shared places', () => {
    const vague = ['tower', 'library', 'museum', 'cathedral', 'station', 'bridge', 'palace', 'church', 'mosque', 'temple',
      'castle', 'stadium', 'theatre', 'pyramid', 'opera house', 'paris', 'london', 'sydney', 'oslo', 'seattle', 'parliament', 'old bridge', 'duomo']
    for (const g of vague) expect(buildings.filter((b) => accepts(b, g)).map((b) => b.id), g).toEqual([])
  })

  it('never accepts one name or alias word for two different buildings', () => {
    const clashes = []
    for (const b of buildings) {
      const words = new Set([b.name, ...b.aliases].flatMap((n) => normalize(n).split(' ')))
      for (const w of words) {
        const hits = buildings.filter((o) => accepts(o, w) && [o.name, ...o.aliases].some((n) => normalize(n).split(' ').includes(w))).map((o) => o.id)
        if (hits.length > 1) clashes.push(`"${w}": ${hits.join(', ')}`)
      }
    }
    // Rome and Paris are both "Pantheon" and the typo allowance joins Coliseum/Coliseu: inherent, not a vague answer.
    expect([...new Set(clashes)].filter((c) => !/^"(pantheon|coliseum)"/.test(c))).toEqual([])
  }, 60000)
})
