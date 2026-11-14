import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildingsSql, buildingsSqlFile } from '../../scripts/make-supabase-buildings.mjs'
import { bundles } from '../strings/index.js'
import { as, call, freshDb, userId } from './sqlHarness.js'

// Users: 1 = Ana (public profile), 2 = Bruno (private), 3 = Carla (public, from the friends tests on),
// 4 = Dani (friends only), 5 = Eve (public). 0 = signed out.
let db
const profile = async (n, username, privacy = 'private') => {
  const ok = await call(db, n, 'set_username', username)
  if (ok) await as(db, n, 'update profiles set privacy = $1', [privacy])
  return ok
}

beforeAll(async () => {
  db = await freshDb(5)
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
    await expect(as(db, 3, 'insert into profiles (id, username) values ($1, $2)', [userId(3), 'impostor'])).rejects.toThrow(/permission denied/)
    await expect(as(db, 2, "update profiles set id = $1 where username = 'bruno'", [userId(3)])).rejects.toThrow(/permission denied/)
    await expect(as(db, 2, "update profiles set username = 'renamed'")).rejects.toThrow(/permission denied/)
  })

  it('enforces the username rules in the database, with one answer for every refusal', async () => {
    for (const bad of ['ab', 'Ana', 'has space', '1abc', 'way_too_long_for_a_username', 'admin', 'archiversal', 'sh1t_head', '<script>', 'ana']) {
      expect(await profile(3, bad), bad).toBe(false) // 'ana' is taken: same answer as a reserved or malformed name
    }
    expect(await as(db, 3, 'select 1 from profiles')).toEqual([])
    await expect(call(db, 0, 'set_username', 'visitor')).rejects.toThrow(/permission denied/)
  })

  it('limits how many names an account can try in a day', async () => {
    await expect(profile(3, 'one_more')).rejects.toThrow(/too many/) // the ten tries above were counted, though each failed
    await db.exec("delete from rate_limits where action = 'username'")
    expect(await profile(2, 'bruno')).toBe(true) // keeping your own name is not a try
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

describe('badges', () => {
  const eraBuildings = async (era) => (await db.query('select id from buildings where era = $1', [era])).rows.map((r) => r.id)
  const unlocks = (ids) => Object.fromEntries(ids.map((id) => [id, { at: '2026-10-20', mode: 'normal' }]))

  it('has a name and a hint in both languages for every badge in the catalogue', async () => {
    const catalogue = await as(db, 0, 'select id, kind, target from badges') // the catalogue is public
    const fixed = catalogue.filter((b) => b.kind !== 'era').map((b) => b.id).sort()
    for (const lang of ['en', 'pt-BR']) {
      expect(Object.keys(bundles[lang].badges.names).sort()).toEqual(fixed)
      expect(Object.keys(bundles[lang].badges.hints).sort()).toEqual(fixed)
    }
    const eras = (await db.query('select distinct era from buildings')).rows.map((r) => r.era).sort()
    expect(catalogue.filter((b) => b.kind === 'era').map((b) => b.target).sort()).toEqual(eras)
    for (const era of eras) expect(bundles.en.eras[era], era).toBeTruthy()
  })

  it('grants what the synced progress has earned, once', async () => {
    expect(await call(db, 1, 'award_badges')).toEqual(['first-sheet']) // Ana has two buildings
    expect(await call(db, 1, 'award_badges')).toEqual([])
    await expect(call(db, 0, 'award_badges')).rejects.toThrow(/permission denied/)
  })

  it('grants an era badge only when every building of the era is unlocked', async () => {
    const { era } = (await db.query('select era from buildings group by era order by count(*), era limit 1')).rows[0]
    const ids = await eraBuildings(era)
    const badge = `era-${era.toLowerCase().replaceAll('_', '-')}`
    await call(db, 2, 'sync_progress', { library: unlocks(ids.slice(1)) })
    expect(await call(db, 2, 'award_badges')).not.toContain(badge)
    await call(db, 2, 'sync_progress', { library: unlocks(ids) })
    expect(await call(db, 2, 'award_badges')).toContain(badge)
  })

  it('cannot be granted, changed or removed by a client', async () => {
    await expect(as(db, 1, "insert into user_badges (user_id, badge_id) values ($1, 'complete-works')", [userId(1)])).rejects.toThrow(/permission denied/)
    await expect(as(db, 1, 'delete from user_badges')).rejects.toThrow(/permission denied/)
    await expect(as(db, 1, "update user_badges set badge_id = 'complete-works'")).rejects.toThrow(/permission denied/)
    await expect(as(db, 1, "insert into badges (id, kind, rule) values ('free', 'milestone', 'unlocked')")).rejects.toThrow(/permission denied/)
    expect((await as(db, 1, 'select badge_id from user_badges')).map((r) => r.badge_id)).toEqual(['first-sheet']) // own rows only
    await expect(as(db, 0, 'select * from user_badges')).rejects.toThrow(/permission denied/)
  })

  it('pins only the player’s own badges in the showcase, three at most', async () => {
    await as(db, 1, "update profiles set showcase = array['first-sheet']")
    await expect(as(db, 1, "update profiles set showcase = array['complete-works']")).rejects.toThrow(/only your own/)
    await expect(as(db, 1, "update profiles set showcase = array['first-sheet', 'first-sheet']")).rejects.toThrow(/only your own/)
    await expect(as(db, 1, "update profiles set showcase = array['first-sheet', 'a', 'b', 'c']")).rejects.toThrow()
  })

  it('shows a player’s badges only to those who may see the profile', async () => {
    expect(await call(db, 0, 'get_badges', 'ana')).toMatchObject({ showcase: ['first-sheet'], earned: [{ id: 'first-sheet' }] })
    expect(await call(db, 1, 'get_badges', 'bruno')).toBeNull()
    expect((await call(db, 2, 'get_badges', 'bruno')).earned.length).toBeGreaterThan(0)
  })
})

describe('friends', () => {
  const friendsOf = async (n) => (await call(db, n, 'list_friends')).friends.map((f) => f.username)

  beforeAll(async () => {
    await db.exec("delete from rate_limits where action = 'username'")
    await profile(3, 'carla', 'public')
    await profile(4, 'dani', 'friends')
    await profile(5, 'eve', 'public')
  })

  it('keeps the pairing tables closed to every client', async () => {
    for (const table of ['friendships', 'blocks', 'invite_codes', 'rate_limits']) {
      for (const who of [0, 1]) await expect(as(db, who, `select * from ${table}`), table).rejects.toThrow(/permission denied/)
      await expect(as(db, 1, `delete from ${table}`), table).rejects.toThrow(/permission denied/)
    }
    await expect(as(db, 1, "insert into friendships (a, b, status, asker) values ($1, $2, 'accepted', $1)", [userId(1), userId(2)])).rejects.toThrow(/permission denied/)
  })

  it('a request is seen only by its two members, and only the one asked can accept it', async () => {
    expect(await call(db, 2, 'friend_request', 'ana')).toBe('pending')
    expect((await call(db, 1, 'list_friends')).incoming.map((f) => f.username)).toEqual(['bruno'])
    expect((await call(db, 2, 'list_friends')).outgoing.map((f) => f.username)).toEqual(['ana'])
    expect(await call(db, 3, 'list_friends')).toEqual({ friends: [], incoming: [], outgoing: [], blocked: [] })
    expect(JSON.stringify(await call(db, 1, 'list_friends'))).not.toMatch(/0000-0000|example\.com/)

    await call(db, 3, 'friend_respond', 'bruno', true) // Carla is not part of it
    await call(db, 2, 'friend_respond', 'ana', true) // the asker cannot accept their own request
    expect(await friendsOf(1)).toEqual([])
    await call(db, 1, 'friend_respond', 'bruno', true)
    expect(await friendsOf(1)).toEqual(['bruno'])
    expect(await friendsOf(2)).toEqual(['ana'])
    await expect(call(db, 0, 'list_friends')).rejects.toThrow(/permission denied/)
  })

  it('only public profiles can be asked by name', async () => {
    for (const name of ['bruno', 'dani', 'nobody_here', 'carla']) {
      await expect(call(db, 3, 'friend_request', name), name).rejects.toThrow(/no such player/) // private, friends-only, missing, self
    }
  })

  it('declining or removing leaves nothing behind', async () => {
    await call(db, 3, 'friend_request', 'eve')
    await call(db, 5, 'friend_respond', 'carla', false)
    expect(await call(db, 3, 'list_friends')).toMatchObject({ outgoing: [], friends: [] })
    await call(db, 3, 'friend_request', 'eve')
    await call(db, 3, 'friend_remove', 'eve') // taking a request back
    expect((await call(db, 5, 'list_friends')).incoming).toEqual([])
    await call(db, 1, 'friend_remove', 'bruno')
    expect(await friendsOf(2)).toEqual([])
  })

  it('a friends-only profile opens to accepted friends and nobody else', async () => {
    expect(await call(db, 1, 'get_profile', 'dani')).toBeNull()
    const code = await call(db, 4, 'create_invite')
    expect(code).toMatch(/^[0-9a-f]{20}$/)
    expect(await call(db, 4, 'redeem_invite', code)).toBeNull() // not your own
    expect(await call(db, 1, 'redeem_invite', code)).toBe('dani')
    expect(await call(db, 3, 'redeem_invite', code)).toBeNull() // used once
    expect(await friendsOf(4)).toEqual(['ana'])
    expect((await call(db, 1, 'get_profile', 'dani')).username).toBe('dani')
    expect(await call(db, 1, 'get_badges', 'dani')).toMatchObject({ earned: [] })
    for (const outsider of [0, 3, 5]) {
      expect(await call(db, outsider, 'get_profile', 'dani'), String(outsider)).toBeNull()
      expect(await call(db, outsider, 'get_badges', 'dani'), String(outsider)).toBeNull()
    }
    // A private profile stays closed even to a friend.
    await as(db, 4, "update profiles set privacy = 'private'")
    expect(await call(db, 1, 'get_profile', 'dani')).toBeNull()
    await as(db, 4, "update profiles set privacy = 'friends'")
  })

  it('invite codes expire, are capped, and wrong guesses are counted', async () => {
    const code = await call(db, 4, 'create_invite')
    await db.query("update invite_codes set expires_at = now() - interval '1 minute' where code = $1", [code])
    expect(await call(db, 3, 'redeem_invite', code)).toBeNull()
    for (let i = 0; i < 5; i++) await call(db, 4, 'create_invite') // the expired one was cleared
    await expect(call(db, 4, 'create_invite')).rejects.toThrow(/too many open invites/)
    await db.query("update rate_limits set count = 30 where user_id = $1 and action = 'redeem'", [userId(3)])
    await expect(call(db, 3, 'redeem_invite', 'guess')).rejects.toThrow(/too many requests/)
    await expect(call(db, 0, 'redeem_invite', code)).rejects.toThrow(/permission denied/)
  })

  it('search finds public usernames only, a few at a time', async () => {
    const found = async (n, q) => (await call(db, n, 'search_users', q)).map((u) => u.username)
    expect(await found(1, 'ca')).toEqual([]) // too short
    expect(await found(1, 'car')).toEqual(['carla'])
    expect(await found(1, 'CARLA ')).toEqual(['carla'])
    expect(await found(1, 'bru')).toEqual([]) // private
    expect(await found(1, 'dan')).toEqual([]) // friends only, even to a friend
    expect(await found(1, 'ana')).toEqual([]) // not yourself
    expect(await found(1, 'c_r')).toEqual([]) // an underscore is a character, not a wildcard
    expect(await found(1, "x' or '1'='1")).toEqual([])
    expect(Object.keys((await call(db, 1, 'search_users', 'car'))[0]).sort()).toEqual(['avatar', 'username'])
    await expect(call(db, 0, 'search_users', 'car')).rejects.toThrow(/permission denied/)
    await db.query("update rate_limits set count = 300 where user_id = $1 and action = 'search'", [userId(1)])
    await expect(found(1, 'car')).rejects.toThrow(/too many requests/)
    await db.exec("delete from rate_limits where action = 'search'")
  })

  it('a block hides both players from each other everywhere, and ends the friendship', async () => {
    const found = async (n, q) => (await call(db, n, 'search_users', q)).map((u) => u.username)
    await call(db, 3, 'friend_request', 'ana')
    await call(db, 1, 'friend_respond', 'carla', true)
    expect(await friendsOf(1)).toContain('carla')

    await call(db, 3, 'block_user', 'ana')
    expect(await friendsOf(1)).not.toContain('carla')
    expect(await friendsOf(3)).toEqual([])
    for (const [viewer, hidden] of [[1, 'carla'], [3, 'ana']]) {
      expect(await call(db, viewer, 'get_profile', hidden), hidden).toBeNull() // though both are public
      expect(await call(db, viewer, 'get_badges', hidden), hidden).toBeNull()
      expect(await found(viewer, hidden.slice(0, 3)), hidden).toEqual([])
      await expect(call(db, viewer, 'friend_request', hidden), hidden).rejects.toThrow(/no such player/)
    }
    expect((await call(db, 3, 'list_friends')).blocked).toEqual(['ana'])
    expect((await call(db, 1, 'list_friends')).blocked).toEqual([]) // the blocked player is not told
    expect((await call(db, 5, 'get_profile', 'ana')).username).toBe('ana') // others are unaffected

    // An invite cannot get around a block.
    await db.exec("delete from invite_codes; delete from rate_limits where action in ('invite', 'redeem')")
    expect(await call(db, 1, 'redeem_invite', await call(db, 3, 'create_invite'))).toBeNull()

    // Both block each other: one unblocking does not undo the other's block.
    await call(db, 1, 'block_user', 'carla')
    await call(db, 3, 'unblock_user', 'ana')
    expect(await call(db, 3, 'get_profile', 'ana')).toBeNull()
    await call(db, 1, 'unblock_user', 'carla')
    expect((await call(db, 3, 'get_profile', 'ana')).username).toBe('ana')
    expect(await friendsOf(1)).not.toContain('carla') // unblocking does not bring the friendship back
  })
})
