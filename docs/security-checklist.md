# Security checklist (56 items)

Checked on 2026-10-17 against the three lists the author shared (18 checks for an AI-built app, 20 things to do before launch, and part 2 with items 19 to 36). Each item is marked **OK** (done and verified), **N/A** (the app has no such feature) or **MANUAL** (cannot be checked from the repo; needs the Vercel dashboard).

> **2026-11-14: optional accounts were added (Supabase).** The tables below are the 2026-10-17 review of the
> site without accounts and still hold for a build with no `VITE_SUPABASE_*` variables. Every item that was
> "N/A" because there were no accounts, database or sessions is re-evaluated in
> ["Re-evaluation with accounts"](#re-evaluation-with-accounts-2026-11-14) further down.

## What the app is, so the N/A items make sense

- **Production** is a static site on Vercel: HTML, JS, CSS and prebuilt JSON (`frontend/public/api/*`). No server code runs, no database, no accounts, no cookies, no forms that send data, no uploads, no payments, no outbound requests.
- **The Spring Boot API** is read-only and used for development only (`GET /api/buildings/*`, `/api/eras`). It has no database and no secrets.
- **Browser storage** holds only game preferences (theme, sound, custom setup, today's daily result, a session's building ids).
- **The answers are in the page's data by design** (an educational game with no scores, stakes or accounts), so "client-only security" is not something the game relies on.

## Results

### List 1: 18 security checks

| # | Check | Result | Evidence |
|---|---|---|---|
| 1 | Exposed DB credentials | N/A | No database. No credentials anywhere (item 3 scan). |
| 2 | Public .env files | OK | No `.env` file is or ever was committed (all 106 revisions scanned by name). `.gitignore` now ignores `.env`, `.env.*`, keys, `*.db`, `*.log`; a test fails if that rule disappears or a risky file is tracked. `dist/` contains no dotfiles. |
| 3 | Hardcoded secrets | OK | Pattern scan (AWS, GitHub, OpenAI-style, Google, private keys, JWTs, `key=`/`secret=`/`password=` literals, connection strings) over the working tree and every revision: no matches. There is nothing in the app that needs a secret. |
| 4 | Weak auth | N/A | No login. |
| 5 | Missing authorization check | N/A | All data is public. Write methods (POST/PUT/DELETE) are refused with 405 on every endpoint (test `theApiIsReadOnly`). |
| 6 | Cross-user access | N/A | No users; state lives in each browser. |
| 7 | Open DB permissions | N/A | No database. |
| 8 | Cloud service misconfiguration | MANUAL | Headers and build are in `vercel.json` (tested). Project settings are not visible from the repo: see "Do in the Vercel dashboard". |
| 9 | Unprotected admin route | OK | There is no admin route. `/actuator/*` is 404, no Spring Boot Actuator or DevTools dependency, and a test asserts no management endpoint is exposed. |
| 10 | Exposed prod debug tools | OK | The Vite dev server is not deployed; no `console.*` or `debugger` in the source; no source maps in `dist/` (item 36). |
| 11 | Logs leak secrets | OK | No secrets exist to leak; the app logs no request bodies; `*.log` is git-ignored; the frontend does not log. |
| 12 | Verbose prod errors | OK | `server.error.include-{stacktrace,exception,message,binding-errors}` are locked to "never" and the whitelabel page is off (test `SecurityConfigTest`). Probed on a live server: 404/405 answer with a short problem+json, an encoded `../` or NUL byte gets Tomcat's bare 400 page with no version, `/error` answers without detail. The UI shows a fixed message, never `error.message`. |
| 13 | Secrets in git | OK | Same scan as item 3, over all history. |
| 14 | Secrets in JS | OK | The built bundle was scanned: the only "password:" hit is React's table of input types. |
| 15 | Client-only security | OK (by design) | The game's answers ship with the data, so nothing in the game depends on the client being honest. What does matter (headers, link and data validation, deploy config) is enforced at build or deploy time and tested. Accepted: a player can read the daily's answer. |
| 16 | Input validation | OK | The inputs are the URL hash (an allow-list in `routeFrom`), stored values (rebuilt from known-good parts on every read: config, session, daily result), typed guesses (compared, never rendered as HTML) and the API's `exclude`, `lang` and id (tests; the request-header limit gives 400 for huge values). |
| 17 | SQL injection | N/A | No SQL. |
| 18 | NoSQL injection | N/A | No database. |

### List 2: 20 things to do before launching

| # | Item | Result | Evidence |
|---|---|---|---|
| 1 | Hide API keys | N/A | The app uses none (Wikimedia images are public). |
| 2 | Purge Git secrets | OK | Nothing to purge (items 3 and 13). If one is ever found: rotate it first, then rewrite history. |
| 3 | Use public DB key | N/A | No database. |
| 4 | Row-level security | N/A | No database. |
| 5 | Encrypt sensitive data | OK | No sensitive data is stored. In transit: HTTPS is forced (item 19). |
| 6 | Server-side auth | N/A | No accounts. |
| 7 | Lock record access | N/A | No records per user. |
| 8 | Block field tampering | OK | Nothing is written to a server. Tampered browser storage is validated on read (tests, and the break-protections script proves the tests can fail). |
| 9 | Secure session cookies | OK | The app sets no cookie (checked on a live response; test asserts no `Set-Cookie`). |
| 10 | Hash passwords | N/A | No passwords. |
| 11 | Rate limit login | N/A | No login. |
| 12 | Bot protection | MANUAL | Optional: Vercel Firewall / Bot Protection in the dashboard. Static files are served by Vercel's CDN. |
| 13 | Parameterize queries | N/A | No queries. |
| 14 | Validate all input | OK | See item 16 of list 1. |
| 15 | Escape user content | OK | React escapes all text; no `dangerouslySetInnerHTML`, `innerHTML`, `eval`; every link that comes from data is `https://` on Wikipedia or Wikimedia (Java validator, a test over the pt-BR overlay, and a guard in the static build that stops the deploy). |
| 16 | Restrict file uploads | N/A | No uploads. |
| 17 | Trim API responses | OK | Responses carry only game data; no internal fields, timestamps or ids beyond building ids. The whole building is needed by a round. |
| 18 | Security headers | OK | `vercel.json`: Content-Security-Policy (self-only scripts, images only from Wikimedia, `connect-src 'self'`, no objects, no framing, `upgrade-insecure-requests`), `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy` (camera, microphone, geolocation, payment, usb, topics off), `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`. All asserted in `deploy.test.js`. |
| 19 | Force HTTPS | OK | Vercel redirects http to https; HSTS (2 years) and `upgrade-insecure-requests` added; no `http://` literal in the code or data. |
| 20 | Scan dependencies | OK | `npm audit`: 0 vulnerabilities (production and dev); `npm update` applied (React 19.3.1 and others). The Gradle wrapper download is now pinned to its SHA-256. Java: see "Dependency scan" below (3 packages had advisories; fixed). |

### List 3: part 2, items 19 to 36

| # | Item | Result | Evidence |
|---|---|---|---|
| 19 | XSS | OK | See list 2, item 15; plus the CSP's `script-src 'self'` (no inline scripts, no `eval`). |
| 20 | CSRF | N/A | No cookies, no sessions and no state-changing endpoint (405 tests). |
| 21 | Insecure file uploads | N/A | No uploads. |
| 22 | Path traversal | OK | Probed live: `..%2f..%2fetc%2fpasswd` and NUL bytes are refused (400). The backend looks buildings up by id in a map and serves no file by user path; the frontend only fetches ids that match `^[a-z0-9-]+$`. |
| 23 | SSRF | N/A | The backend makes no outbound request (no HTTP client in the code); the page may only connect to itself (`connect-src 'self'`). |
| 24 | Broken password reset | N/A | No passwords. |
| 25 | Weak session management | N/A | No sessions. |
| 26 | JWT secrets | N/A | No JWTs. |
| 27 | Permissive CORS | OK | No CORS configuration; a request with a foreign `Origin` gets no `Access-Control-*` header; static files send `Cross-Origin-Resource-Policy: same-origin`. |
| 28 | Rate limits | MANUAL | None in the app (nothing writes or costs per request). Production traffic goes through Vercel's CDN; add a rule in Vercel Firewall if abuse ever shows. |
| 29 | Exposed environments | MANUAL | Vercel preview deployments (every branch and pull request) have public URLs unless Deployment Protection is on: see below. |
| 30 | Default credentials | N/A | No credentials of any kind. |
| 31 | Unsigned webhooks | N/A | No webhooks. |
| 32 | Frontend payment checks | N/A | No payments. |
| 33 | IDOR / BOLA | N/A | All data is public and identical for everyone; ids are public. |
| 34 | APIs + user input | OK | Same as list 1, item 16; the unknown-language and traversal cases are tests. |
| 35 | Exposed logs | OK | No endpoint serves logs; `*.log` is git-ignored. Vercel's build and runtime logs are private to the project. |
| 36 | Exposed source maps | OK | The production build emits none (no `.map` files, no `sourceMappingURL`). |

## Re-evaluation with accounts (2026-11-14)

What changed: the static site can now talk to one Supabase project (Postgres with Row Level Security, Google
sign-in through Supabase Auth). There is still no server of our own, no cookie set by the site, no upload and no
payment. Setup and rules: `docs/accounts.md`. Evidence named "SQL test" is `frontend/src/social/sql.test.js`,
which applies the real migrations to an in-process Postgres with Supabase's roles and default grants and runs
each rule as several users and as a signed-out visitor; `break-protections.mjs` weakens 29 of the database rules and 6 client
rules one at a time and every one is CAUGHT (54 cases in all).

| List, # | Item | Was | Now | Evidence |
|---|---|---|---|---|
| 1.1 | Exposed DB credentials | N/A | OK | The page carries only the project URL and the anon key, read from environment variables; none is in the repo (`.env.example` is empty, test). A service-role or secret key switches accounts off (`isPublicKey`, test, break case). |
| 1.4 | Weak auth | N/A | OK / MANUAL | Google only, PKCE flow, through Supabase Auth; no password form exists. MANUAL: turn email sign-up off and set the redirect URLs in the Supabase dashboard (`docs/accounts.md`). |
| 1.5 | Missing authorization check | N/A | OK | Every table has RLS on with default deny; every function is revoked from everyone and granted by name; signed-in functions refuse a signed-out caller (SQL tests). |
| 1.6 | Cross-user access | N/A | OK | A second user reads none of the first user's profile row, progress, badges, friendships, invites, events or challenges, and can change none of them (SQL tests). |
| 1.7 | Open DB permissions | N/A | OK | Each migration revokes Supabase's default grants and grants only what is needed; the tests start from Supabase's default-grant state, so a missing revoke fails them. |
| 1.15 | Client-only security | OK (by design) | OK (by design) | Unchanged for the game. New: badges are granted only by the database from synced progress. A player can still sync progress they did not earn; accepted, nothing is competitive. |
| 1.16 | Input validation | OK | OK | New inputs: username (database rules, one answer for every refusal), bio (160 characters, no control characters), favourite (must exist in the catalogue), synced progress (unknown ids and malformed entries skipped, size cap), invite code and profile link in the URL hash (strict patterns), challenge result (exact shape). All tested. |
| 1.17 | SQL injection | N/A | OK | The client calls PostgREST with parameters only; the functions use no dynamic SQL (`execute` appears nowhere). A quote in a search term is a test. |
| 1.18 | NoSQL injection | N/A | N/A | No document database. |
| 2.1 | Hide API keys | N/A | OK | Only public values ship. The Google client secret lives in the Supabase dashboard only. |
| 2.3 | Use public DB key | N/A | OK | Same as 1.1. |
| 2.4 | Row-level security | N/A | OK | On for all 13 tables. Policies: own row for `profiles` (select, update), own rows for progress and `user_badges` (select), public read for the `badges` catalogue; the other tables have no client access. |
| 2.5 | Encrypt sensitive data | OK | OK | The only personal data is the Google email, held by Supabase Auth and never returned by any function (tests look for it in every cross-user answer). HTTPS only (CSP, HSTS; Supabase enforces TLS). |
| 2.6 | Server-side auth | N/A | OK | Identity is `auth.uid()` from the verified JWT inside the database; nothing trusts an id sent by the client. |
| 2.7 | Lock record access | N/A | OK | Same as 1.6. |
| 2.8 | Block field tampering | OK | OK | Column grants: a client cannot write `id`, `username` or `created_at` on its profile, nor any badge, friendship, event or challenge row; the showcase accepts only earned badges (tests). |
| 2.9 | Secure session cookies | OK | OK | Still no cookie. The Supabase session is kept in localStorage; the CSP (`script-src 'self'`, no inline script) is what protects it. Accepted trade-off of a static site. |
| 2.10 | Hash passwords | N/A | N/A | No passwords: Google sign-in only. |
| 2.11 | Rate limit login | N/A | MANUAL | Supabase Auth's own rate limits (dashboard, leave on). |
| 2.13 | Parameterize queries | N/A | OK | Same as 1.17. |
| 2.16 | Restrict file uploads | N/A | N/A | Avatars are 12 drawings in the page; nothing is uploaded. |
| 2.17 | Trim API responses | OK | OK | Cross-user functions return usernames, avatar ids and counts; never an auth id or email (tests). |
| 2.18 | Security headers | OK | OK | `connect-src` gained `https://*.supabase.co` and nothing else changed: no new script, image, frame or form source (test). Pin it to the project host after setup (`docs/accounts.md`). |
| 3.20 | CSRF | N/A | OK | Requests carry a bearer token from localStorage, not a cookie, so a foreign site cannot ride the session. |
| 3.21 | Insecure file uploads | N/A | N/A | No uploads. |
| 3.23 | SSRF | N/A | N/A | Nothing of ours makes server-side requests. |
| 3.24 | Broken password reset | N/A | N/A | No passwords. |
| 3.25 | Weak session management | N/A | OK / MANUAL | Sessions are Supabase's (short-lived JWT with refresh). Sign-out clears this browser. MANUAL: keep the default JWT expiry. |
| 3.26 | JWT secrets | N/A | OK | The signing secret never leaves Supabase; a test fails if any JWT or secret key is written into a tracked or new file. |
| 3.27 | Permissive CORS | OK | MANUAL | Supabase's API answers any origin by design; RLS is the protection. Nothing to configure in the repo. |
| 3.28 | Rate limits | MANUAL | OK | Per-user daily caps in the database: username tries, friend requests (and a pending cap), searches, invites created and redeemed, blocks, challenges (tests). |
| 3.30 | Default credentials | N/A | N/A | None. |
| 3.31 | Unsigned webhooks | N/A | N/A | No webhooks. |
| 3.32 | Frontend payment checks | N/A | N/A | No payments. |
| 3.33 | IDOR / BOLA | N/A | OK | Other players are addressed by username only, and every function checks privacy, friendship and blocks itself; a challenge id from someone else is refused (tests). |
| 3.19 | XSS | OK | OK | User text (username, bio) is rendered by React as text; a test fails if `dangerouslySetInnerHTML`, `innerHTML` or `eval` appears in the source, and a break case proves it. |

Found during this work: the first version of the profiles migration let a signed-in user tell a taken username
from a refused one, which could confirm that a private username exists. Fixed before any deployment by
`set_username()` (one answer, 10 tries a day; tested).

### Do in the Supabase and Google dashboards

See "What you must set up by hand" in `docs/accounts.md`. Security-relevant: Google as the only provider,
email sign-up off, exact redirect URLs (no wildcards), the default rate limits left on, and never copying the
service-role key anywhere.

### Not verified

- The real Supabase project and the Google sign-in round trip (no project exists yet): the SQL was run in
  PGlite (Postgres 17), not on Supabase.
- `npm audit` after adding `@supabase/supabase-js` and `@electric-sql/pglite` (dev only): production
  dependencies 0 findings; dev dependencies 3 moderate, all `minimatch` through ESLint (GHSA-g3hv-75wg-m249,
  a denial of service in a lint-time tool, not from the new packages). `npm audit fix` is available; it was
  left for a separate change.
- Safari.

## Dependency scan

- **npm** (`npm audit`, production and dev): 0 vulnerabilities, after `npm update`.
- **Java** (all 39 packages on the runtime classpath, checked against the public OSV database by exact version): 3 packages had advisories with Spring Boot 4.1.1's managed versions.
  - `tomcat-embed-core 11.0.24`: three critical advisories about DIGEST and FORM authentication and access control (GHSA-9xv2-5v5q-p794, GHSA-gcx9-497g-6cp6, GHSA-h3x4-894j-xpx5). This app uses no Tomcat authentication, so the real risk was low. Fixed in 11.0.25.
  - `jackson-core 3.1.5` and `jackson-databind 3.1.5`: seven high or moderate advisories, mostly denial of service when parsing untrusted JSON (for example GHSA-7hhh-6rmp-j9qf, GHSA-cxp5-3px4-pw24, GHSA-wv8q-qhhj-9h54). The backend only reads its own data files at startup, so the real risk was low. Fixed in 3.1.7.
  - **Fix:** `build.gradle` overrides the two managed versions (`tomcat.version` 11.0.25, `jackson-bom.version` 3.1.7); tests pass, and a second OSV check shows 0 advisories. No newer Spring Boot existed yet; when one ships with these versions, delete the two override lines (the comment in `build.gradle` says so).
- The OWASP `dependency-check` tool was tried first; without an NVD API key its database download was too slow, so OSV was used instead. Re-run OSV (or dependency-check with a key) after any dependency change.

## What changed in the code for this checklist

- `vercel.json`: HSTS, `X-Frame-Options`, COOP, CORP, `upgrade-insecure-requests`, wider Permissions-Policy.
- `application.properties`: errors never carry internals; `SecurityConfigTest` and two controller tests (read-only API, no leaks, no cookie, odd `lang`).
- `.gitignore`: secrets, keys, databases and logs; Gradle wrapper pinned to a checksum.
- Static build (`build-static-api.mjs`): refuses to build if any shipped link (English or pt-BR) is not an https Wikipedia article or Commons file page; the Java side has a matching test over the pt-BR overlay.
- `deploy.test.js`: asserts every header above, the wrapper checksum, the ignore rules and that no secret-looking file is tracked.
- `break-protections.mjs`: now breaks 16 protections on purpose (CSP x4, HSTS, framing, http upgrade, COOP, wrapper checksum, ignore rules, stored-data checks x3, error stack traces, error messages); every line says CAUGHT.
- Dependencies: `npm update` (patch and minor within the declared ranges) and the Tomcat and Jackson overrides above.

## Do in the Vercel dashboard (cannot be done from the repo)

1. **Preview protection.** Project Settings, Deployment Protection: keep it on for preview deployments (the `overnight` branch and any pull request get a public URL otherwise).
2. **Environment variables.** Review the list: the build injects `NPM_CONFIG_CACHE_DIR` (the repo now ignores that one variable). Remove anything you do not recognise.
3. **Firewall and bot protection (optional).** Turn on Bot Protection or add a rate-limit rule if you see abuse.
4. **The "2 Recommendations"** shown under Deployment Settings in the deploy page: read them; they are Vercel's own suggestions and are not visible from here.

## Accepted risks and limits of this review

- The daily answer and every building's answer can be read from the shipped JSON. That is how the game works.
- Not tested: a real browser (headers were checked in the config, not on the live site). After deploying, run `curl -I https://<your-domain>` and look for the headers above.
- The static `dist/` was scanned with patterns, not a dedicated secret scanner (none is installed here).
