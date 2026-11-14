// Breaks each protection on purpose and checks that a test notices, so we know the tests can fail.
//   node scripts/break-protections.mjs        (from frontend/; every line must say CAUGHT)
// Each case edits one file, runs the test that should fail, then puts the file back. SETUP-ERROR
// means the text to break was not found: the code moved, so update the case. Exit code 1 if any
// protection is NOT CAUGHT or a case could not be set up.
import { readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const frontend = join(dirname(fileURLToPath(import.meta.url)), '..')
const repo = join(frontend, '..')
const sql = join(repo, 'supabase/migrations')

const cases = [
  ['CSP allows inline scripts', join(repo, 'vercel.json'), "script-src 'self';", "script-src 'self' 'unsafe-inline';", 'src/deploy.test.js'],
  ['CSP allows framing', join(repo, 'vercel.json'), "frame-ancestors 'none'", 'frame-ancestors *', 'src/deploy.test.js'],
  ['CSP allows any https image', join(repo, 'vercel.json'), 'img-src \'self\' data: https://upload.wikimedia.org', "img-src 'self' data: https:", 'src/deploy.test.js'],
  ['CSP allows any connection', join(repo, 'vercel.json'), "connect-src 'self'", "connect-src *", 'src/deploy.test.js'],
  ['saved daily result is trusted without checks', join(frontend, 'src/game/daily.js'), 'saved?.number === number && validResult(saved)', 'saved?.number === number', 'src/game/daily.test.js'],
  ['recap links are not limited to https', join(frontend, 'src/game/custom.js'), "p.wikipedia.startsWith('https://')", 'true', 'src/game/custom.test.js'],
  ['session ids are not checked', join(frontend, 'src/game/custom.js'), '!s.ids.every(isId)', 'false', 'src/game/custom.test.js'],
  ['stored filter mode is not checked', join(frontend, 'src/game/custom.js'), 'MODES.includes(v.mode) ? v.mode : emptyConfig.mode', 'v.mode', 'src/game/custom.test.js'],
  ['stored library ids are not checked', join(frontend, 'src/game/library.js'), 'ID.test(id) ? entry(value) : null', 'entry(value)', 'src/game/library.test.js'],
  ['stored library modes are not checked', join(frontend, 'src/game/library.js'), '!MODES.includes(raw.mode)', 'false', 'src/game/library.test.js'],
  ['a search can find a locked building', join(frontend, 'src/game/libraryView.js'), '(query || country || feature) && !row.open', 'false', 'src/game/libraryView.test.js'],
  ['HSTS header is dropped', join(repo, 'vercel.json'), '"Strict-Transport-Security"', '"X-Not-Hsts"', 'src/deploy.test.js'],
  ['framing is allowed by X-Frame-Options', join(repo, 'vercel.json'), '"value": "DENY"', '"value": "SAMEORIGIN"', 'src/deploy.test.js'],
  ['stray http requests are not upgraded', join(repo, 'vercel.json'), '; upgrade-insecure-requests', '', 'src/deploy.test.js'],
  ['cross-origin isolation is dropped', join(repo, 'vercel.json'), '"Cross-Origin-Opener-Policy"', '"X-Not-Coop"', 'src/deploy.test.js'],
  ['the Gradle download is no longer checksummed', join(repo, 'gradle/wrapper/gradle-wrapper.properties'), 'distributionSha256Sum=', '#distributionSha256Sum=', 'src/deploy.test.js'],
  ['secrets are no longer git-ignored', join(repo, '.gitignore'), '\n.env\n', '\n#.env\n', 'src/deploy.test.js'],
  ['error responses carry stack traces', join(repo, 'src/main/resources/application.properties'), 'server.error.include-stacktrace=never', 'server.error.include-stacktrace=always', 'SecurityConfigTest', 'gradle'],
  ['error responses carry exception messages', join(repo, 'src/main/resources/application.properties'), 'server.error.include-message=never', 'server.error.include-message=always', 'SecurityConfigTest', 'gradle'],
  // Accounts (Supabase): the page may carry only a public key and talk only to a Supabase project.
  ['a service-role key is accepted in the page', join(frontend, 'src/social/client.js'), "roleOf(k) === 'anon'", 'roleOf(k) !== null', 'src/social/social.test.js'],
  ['accounts may talk to any address', join(frontend, 'src/social/client.js'), '\\.supabase\\.co$/.test(u)', '/.test(u)', 'src/social/social.test.js'],
  ['a secret key is written into the example env file', join(frontend, '.env.example'), 'VITE_SUPABASE_ANON_KEY=\n', 'VITE_SUPABASE_ANON_KEY=sb_' + 'secret_abcdefgh12345678\n', 'src/deploy.test.js'],
  ['a bio is rendered as markup', join(frontend, 'src/components/social/UserPage.jsx'), '<p className={styles.bio}>{profile.bio}</p>', '<p dangerouslySetInnerHTML={{ __html: profile.bio }} />', 'src/deploy.test.js'],
  ['the account can take a mastered mark away', join(frontend, 'src/game/save.js'), 'if (theirs[id]?.mastered)', 'if (false)', 'src/social/social.test.js'],
  // The database rules (run in a real Postgres by src/social/sql.test.js).
  ['profiles can be read by other users', join(sql, '20261113000001_core.sql'), 'for select to authenticated using (id = auth.uid());', 'for select to authenticated using (true);', 'src/social/sql.test.js'],
  ['a profile can be edited by another user', join(sql, '20261113000001_core.sql'), 'for update to authenticated using (id = auth.uid()) with check (id = auth.uid());', 'for update to authenticated using (true) with check (true);', 'src/social/sql.test.js'],
  ['a private profile is shown to anyone', join(sql, '20261113000003_badges_friends.sql'), "      and (privacy = 'public' or (privacy = 'friends' and are_friends(target, auth.uid())))\n", '', 'src/social/sql.test.js'],
  ['a friends-only profile is shown to strangers', join(sql, '20261113000003_badges_friends.sql'), "(privacy = 'friends' and are_friends(target, auth.uid()))", "privacy = 'friends'", 'src/social/sql.test.js'],
  ['a blocked player can still open the profile', join(sql, '20261113000003_badges_friends.sql'), '      and not blocked_between(target, auth.uid())\n', '', 'src/social/sql.test.js'],
  ['a blocked player still shows up in search', join(sql, '20261113000003_badges_friends.sql'), 'and id <> uid and not blocked_between(id, uid)', 'and id <> uid', 'src/social/sql.test.js'],
  ['search finds private profiles', join(sql, '20261113000003_badges_friends.sql'), "where privacy = 'public' and left(username", 'where left(username', 'src/social/sql.test.js'],
  ['usernames can be tried without limit', join(sql, '20261113000001_core.sql'), "perform hit_limit('username', 10);", '', 'src/social/sql.test.js'],
  ['a client can write its own badges', join(sql, '20261113000003_badges_friends.sql'), 'grant select on public.user_badges to authenticated;', 'grant all on public.user_badges to authenticated;', 'src/social/sql.test.js'],
  ['badges of other players can be read', join(sql, '20261113000003_badges_friends.sql'), 'user_badges for select to authenticated using (user_id = auth.uid());', 'user_badges for select to authenticated using (true);', 'src/social/sql.test.js'],
  ['the showcase can pin a badge that was not earned', join(sql, '20261113000003_badges_friends.sql'), 'create trigger showcase_check before insert or update of showcase on public.profiles for each row execute function public.showcase_check();', '', 'src/social/sql.test.js'],
  ['friendships, blocks and invites are open to clients', join(sql, '20261113000003_badges_friends.sql'), 'revoke all on public.friendships, public.blocks, public.invite_codes from anon, authenticated;', '', 'src/social/sql.test.js'],
  ['a friend request can be accepted by its sender', join(sql, '20261113000003_badges_friends.sql'), "update friendships set status = 'accepted' where a = least(uid, target) and b = greatest(uid, target) and status = 'pending' and asker = target;", "update friendships set status = 'accepted' where a = least(uid, target) and b = greatest(uid, target) and status = 'pending';", 'src/social/sql.test.js'],
  ['an invite code works twice', join(sql, '20261113000003_badges_friends.sql'), 'where i.code = invite and used_at is null and', 'where i.code = invite and', 'src/social/sql.test.js'],
  ['an expired invite code works', join(sql, '20261113000003_badges_friends.sql'), 'and expires_at > now() and user_id <> uid', 'and user_id <> uid', 'src/social/sql.test.js'],
  ['an invite gets around a block', join(sql, '20261113000003_badges_friends.sql'), 'and user_id <> uid and not blocked_between(user_id, uid)', 'and user_id <> uid', 'src/social/sql.test.js'],
  ['username rules are not enforced by the database', join(sql, '20261113000001_core.sql'), 'check (public.username_ok(username))', 'check (true)', 'src/social/sql.test.js'],
  ['shared friends ignores a block with the player asked about', join(sql, '20261114000005_shared_friends.sql'), ' and not blocked_between(x, target) and can_view(x)\n', ' and can_view(x)\n', 'src/social/sql.test.js'],
  ['shared friends lists private players', join(sql, '20261114000005_shared_friends.sql'), ' and can_view(x)\n', '\n', 'src/social/sql.test.js'],
  ['shared friends is open to signed-out visitors', join(sql, '20261114000005_shared_friends.sql'), 'revoke execute on function public.shared_friends(text) from public, anon, authenticated;', '', 'src/social/sql.test.js'],
  ['synced progress can be read by other users', join(sql, '20261113000001_core.sql'), 'library_unlocks for select to authenticated using (user_id = auth.uid());', 'library_unlocks for select to authenticated using (true);', 'src/social/sql.test.js'],
  ['synced progress can be written without the sync function', join(sql, '20261113000001_core.sql'), 'revoke all on public.library_unlocks, public.daily_results, public.player_progress from anon, authenticated;', '', 'src/social/sql.test.js'],
  ['signed-out visitors can call the signed-in functions', join(sql, '20261113000004_social.sql'), '\n  to authenticated;\n', '\n  to anon, authenticated;\n', 'src/social/sql.test.js'],
  // Compare, feed and challenges.
  ['compare opens a profile the viewer may not see', join(sql, '20261113000004_social.sql'), 'if target is null or target = uid or not can_view(target) then', 'if target is null or target = uid then', 'src/social/sql.test.js'],
  ['the feed shows players who are not friends', join(sql, '20261113000004_social.sql'), 'where are_friends(e.user_id, me()) and not blocked_between', 'where not blocked_between', 'src/social/sql.test.js'],
  ['the feed shows a friend whose profile went private', join(sql, '20261113000004_social.sql'), ' and can_view(e.user_id)', '', 'src/social/sql.test.js'],
  ['events and challenges are open to clients', join(sql, '20261113000004_social.sql'), 'revoke all on public.events from anon, authenticated;', '', 'src/social/sql.test.js'],
  ['a stranger can be challenged', join(sql, '20261113000004_social.sql'), 'if target is null or not are_friends(uid, target) then', 'if target is null then', 'src/social/sql.test.js'],
  ['someone outside a challenge can answer it', join(sql, '20261113000004_social.sql'), 'where id = challenge and uid in (sender, recipient) for update', 'where id = challenge for update', 'src/social/sql.test.js'],
  ['a challenge can be answered twice', join(sql, '20261113000004_social.sql'), '\n    or (uid = c.recipient and c.recipient_result is not null) then', ' then', 'src/social/sql.test.js'],
  ['the other side of a challenge shows before answering', join(sql, '20261113000004_social.sql'), 'case when mine is null then null else theirs end', 'theirs', 'src/social/sql.test.js'],
  ['challenges with a blocked player stay visible', join(sql, '20261113000004_social.sql'), 'where me() in (c.sender, c.recipient) and not blocked_between(c.sender, c.recipient)', 'where me() in (c.sender, c.recipient)', 'src/social/sql.test.js'],
  ['a forged challenge id is kept in the session', join(frontend, 'src/game/custom.js'), 'CHALLENGE_ID.test(s.challenge) ?', 's.challenge ?', 'src/social/social.test.js'],
  ['the feed names the other player of a challenge', join(sql, '20261113000004_social.sql'), "'ref', case when kind = 'badge' then ref end", "'ref', ref", 'src/social/sql.test.js'],
]

let originals = []
const restore = () => originals.forEach(([file, text]) => writeFileSync(file, text))
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => (restore(), process.exit(130)))

let failed = 0
for (const [name, file, find, replace, test, kind] of cases) {
  const original = readFileSync(file, 'utf8')
  if (!original.includes(find)) {
    console.log(`SETUP-ERROR  ${name}`)
    failed++
    continue
  }
  originals = [[file, original]]
  writeFileSync(file, original.replace(find, replace))
  const run =
    kind === 'gradle'
      ? spawnSync('./gradlew', ['test', '--tests', `*${test}`, '-q'], { cwd: repo, encoding: 'utf8' })
      : spawnSync('npx', ['vitest', 'run', test], { cwd: frontend, encoding: 'utf8' })
  restore()
  originals = []
  const caught = run.status !== 0
  console.log(`${caught ? 'CAUGHT     ' : 'NOT CAUGHT'}  ${name}`)
  if (!caught) failed++
}
process.exit(failed ? 1 : 0)
