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
  ['a private profile is shown to anyone', join(sql, '20261113000001_core.sql'), "where id = target and privacy = 'public')", 'where id = target)', 'src/social/sql.test.js'],
  ['username rules are not enforced by the database', join(sql, '20261113000001_core.sql'), 'check (public.username_ok(username))', 'check (true)', 'src/social/sql.test.js'],
  ['synced progress can be read by other users', join(sql, '20261113000001_core.sql'), 'library_unlocks for select to authenticated using (user_id = auth.uid());', 'library_unlocks for select to authenticated using (true);', 'src/social/sql.test.js'],
  ['synced progress can be written without the sync function', join(sql, '20261113000001_core.sql'), 'revoke all on public.library_unlocks, public.daily_results, public.player_progress from anon, authenticated;', '', 'src/social/sql.test.js'],
  ['signed-out visitors can sync progress', join(sql, '20261113000001_core.sql'), 'grant execute on function public.sync_progress(jsonb), public.delete_account() to authenticated;', 'grant execute on function public.sync_progress(jsonb), public.delete_account() to anon, authenticated;', 'src/social/sql.test.js'],
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
