import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildingsSql, buildingsSqlFile } from '../../scripts/make-supabase-buildings.mjs'
import { as, call, freshDb, userId } from './sqlHarness.js'

// Users: 1 = Ana (public profile), 2 = Bruno (private profile), 3 = nobody yet. 0 = signed out.
let db
const profile = (n, username, privacy = 'private') =>
  as(db, n, 'insert into profiles (id, username, privacy) values ($1, $2, $3)', [userId(n), username, privacy])

beforeAll(async () => {
  db = await freshDb()
  await profile(1, 'ana', 'public')
  await profile(2, 'bruno')
}, 60_000)

describe('the catalogue', () => {
  it('is the one generated from buildings.json', async () => {
    expect(readFileSync(buildingsSqlFile, 'utf8')).toBe(buildingsSql())
    expect((await db.query('select count(*)::int as n from buildings')).rows[0].n).toBeGreaterThan(300)
  })

  it('cannot be read or changed by clients', async () => {
    await expect(as(db, 1, 'select * from buildings limit 1')).rejects.toThrow(/permission denied/)
    await expect(as(db, 0, 'select * from buildings limit 1')).rejects.toThrow(/permission denied/)
  })
})

describe('profiles', () => {
  it('a user sees only their own row, signed-out visitors none', async () => {
    expect((await as(db, 1, 'select username from profiles')).map((r) => r.username)).toEqual(['ana'])
    expect((await as(db, 2, 'select username from profiles')).map((r) => r.username)).toEqual(['bruno'])
    await expect(as(db, 0, 'select username from profiles')).rejects.toThrow(/permission denied/)
  })

  it('a user cannot change, replace or create someone else’s profile', async () => {
    await as(db, 2, "update profiles set bio = 'hacked' where username = 'ana'")
    await as(db, 2, "update profiles set bio = 'everyone'") // no WHERE: only the update policy stands between this and every row
    expect((await as(db, 1, 'select bio from profiles'))[0].bio).toBe('')
    await as(db, 2, "update profiles set bio = ''")
    await expect(as(db, 2, 'delete from profiles')).rejects.toThrow(/permission denied/)
    await expect(profile(2, 'second_row')).rejects.toThrow() // one profile per account
    await expect(as(db, 3, 'insert into profiles (id, username) values ($1, $2)', [userId(1), 'impostor'])).rejects.toThrow(/row-level security|duplicate/)
    await expect(as(db, 2, "update profiles set id = $1 where username = 'bruno'", [userId(3)])).rejects.toThrow(/permission denied/)
  })

  it('enforces the username rules in the database', async () => {
    for (const bad of ['ab', 'Ana', 'has space', '1abc', 'way_too_long_for_a_username', 'admin', 'archiversal', 'sh1t_head', '<script>']) {
      await expect(profile(3, bad), bad).rejects.toThrow()
    }
    await expect(profile(3, 'ana'), 'taken').rejects.toThrow(/duplicate/)
  })

  it('limits the bio and checks the favourite against the catalogue', async () => {
    await expect(as(db, 1, 'update profiles set bio = $1', ['x'.repeat(161)])).rejects.toThrow()
    await expect(as(db, 1, "update profiles set favorite_kind = 'building', favorite = 'not-a-building'")).rejects.toThrow(/unknown building/)
    await expect(as(db, 1, "update profiles set favorite_kind = 'architect', favorite = 'Nobody Real'")).rejects.toThrow(/unknown architect/)
    await as(db, 1, "update profiles set favorite_kind = 'architect', favorite = 'Andrea Palladio', bio = '<b>hello</b>'")
  })

  it('shows a public profile to anyone, without ids or emails', async () => {
    for (const viewer of [0, 2, 3]) {
      const seen = await call(db, viewer, 'get_profile', 'ana')
      expect(seen.username).toBe('ana')
      expect(seen.bio).toBe('<b>hello</b>') // stored as typed; the page renders it as text
      expect(JSON.stringify(seen)).not.toMatch(/0000-0000|example\.com/)
    }
    expect((await call(db, 1, 'get_profile', 'ana')).mine).toBe(true)
  })

  it('hides a private profile from everyone but its owner', async () => {
    expect(await call(db, 1, 'get_profile', 'bruno')).toBeNull()
    expect(await call(db, 0, 'get_profile', 'bruno')).toBeNull()
    expect((await call(db, 2, 'get_profile', 'bruno')).username).toBe('bruno')
    expect(await call(db, 1, 'get_profile', 'nobody_here')).toBeNull() // same answer as "may not see"
  })
})

describe('synced progress', () => {
  const entry = (extra = {}) => ({ at: '2026-10-20', mode: 'normal', mastered: false, attempts: 2, ...extra })

  it('merges, skips what it does not know, and never loses a mastered mark', async () => {
    const first = await call(db, 1, 'sync_progress', {
      library: { 'villa-rotonda': entry({ mastered: true }), 'not-a-building': entry(), 'villa-savoye': { at: '2026-99-99', mode: 'normal' }, 'sant-ivo-alla-sapienza': entry({ mode: 'cheat' }) },
      days: { 3: { number: 3, id: 'villa-rotonda', outcome: 'solved', fields: { name: 'correct' }, attempts: 1, hintsUsed: 0 }, x: {}, 4: { id: 'nope', outcome: 'solved', fields: {} } },
      progress: { days: [3, 3, 'x', -1], eras: ['MANNERISM', 'bad'], countries: ['IT', 'Italy'] },
    })
    expect(Object.keys(first.library)).toEqual(['villa-rotonda'])
    expect(Object.keys(first.days)).toEqual(['3'])
    expect(first.progress).toEqual({ days: [3], eras: ['MANNERISM'], countries: ['IT'] })

    const second = await call(db, 1, 'sync_progress', { library: { 'villa-rotonda': entry({ at: '2026-11-01', mastered: false }), 'sant-ivo-alla-sapienza': entry() }, progress: { days: [5] } })
    expect(second.library['villa-rotonda']).toMatchObject({ at: '2026-10-20', mastered: true })
    expect(Object.keys(second.library).sort()).toEqual(['sant-ivo-alla-sapienza', 'villa-rotonda'])
    expect(second.progress.days.sort()).toEqual([3, 5])
    expect((await call(db, 0, 'get_profile', 'ana')).stats).toMatchObject({ unlocked: 2, mastered: 1, countries: 1, dailies: 1 })
  })

  it('is closed to signed-out visitors and to oversized input', async () => {
    await expect(call(db, 0, 'sync_progress', {})).rejects.toThrow(/permission denied/)
    await expect(call(db, 1, 'sync_progress', { junk: 'x'.repeat(400_001) })).rejects.toThrow(/bad progress/)
    await expect(call(db, 1, 'sync_progress', [])).rejects.toThrow(/bad progress/)
  })

  it('keeps each user’s progress to themselves, and takes writes only through the function', async () => {
    for (const table of ['library_unlocks', 'daily_results', 'player_progress']) {
      expect(await as(db, 2, `select * from ${table}`), table).toEqual([])
      expect((await as(db, 1, `select * from ${table}`)).length, table).toBeGreaterThan(0)
      await expect(as(db, 0, `select * from ${table}`), table).rejects.toThrow(/permission denied/)
      await expect(as(db, 1, `delete from ${table}`), table).rejects.toThrow(/permission denied/)
    }
    await expect(as(db, 2, "insert into library_unlocks (user_id, building_id, at, mode) values ($1, 'villa-savoye', current_date, 'normal')", [userId(2)])).rejects.toThrow(/permission denied/)
  })
})

describe('deleting an account', () => {
  it('removes the user’s rows and nobody else’s', async () => {
    await profile(3, 'carla', 'public')
    await call(db, 3, 'sync_progress', { library: { 'villa-rotonda': { at: '2026-10-20', mode: 'normal' } } })
    await call(db, 3, 'delete_account')
    expect(await call(db, 0, 'get_profile', 'carla')).toBeNull()
    expect((await db.query('select count(*)::int as n from library_unlocks where user_id = $1', [userId(3)])).rows[0].n).toBe(0)
    expect((await call(db, 0, 'get_profile', 'ana')).stats.unlocked).toBe(2)
    await db.query('insert into auth.users (id) values ($1)', [userId(3)]) // back for the later tests
  })
})
