# Prompt: accounts, profiles, badges and friends for Archiversal

You are working in `arch-guesser` (Archiversal). Read `CLAUDE.md`, `PRODUCT.md`, `DESIGN.md`, `docs/security-checklist.md`, `docs/routes-and-library.md` and `docs/game-and-ui-notes.md` first, and follow their rules (design tokens, i18n in en and pt-BR with matching keys, CSP, `break-protections.mjs`, checks before committing).

## Goal

Add optional accounts, public profiles, badges and friends. The site stays a static Vercel build; the backend is Supabase (Postgres + Row Level Security + Google OAuth). Do not add a server of our own. The Spring Boot API stays read-only and dev-only.

Guest play must keep working exactly as today. Accounts are optional and the game must never require login.

## Decisions already made

- **Sign-in:** Google only, through Supabase Auth. No passwords stored by us.
- **Profile:** unique username, preset avatar (architectural icons, no uploads), short bio, learning stats, one favorite building or architect, privacy setting (private / friends / public, default private). Public page at `#/u/<username>`.
- **Badges:** era badges (reuse `EraStamp`), milestone badges, rare/explorer badges, and a showcase of up to 3 pinned badges. Locked badges show how to earn them. Badges stay learning-focused: no scores, timers or leaderboards (see `PRODUCT.md`).
- **Friends:** mutual (request, accept, decline, remove, block). Friends see each other's badges even when the profile is friends-only. Find people by username search (public usernames only) and by invite link / friend code.
- **Social extras:** compare profiles (extend the existing Compare dialog), friends activity feed, challenge a friend (10 buildings, like Custom mode, both results shown).
- **Guest sync:** on first sign-in, merge the `localStorage` Library, streak and daily results into the account once. Guest play keeps working.
- **Awarding badges:** a Postgres function checks the rules against synced progress and grants badges. Clients cannot insert into `user_badges` directly. Not tamper-proof (answers ship in the page), and that is acceptable because nothing is competitive.

## Security rules (non-negotiable)

- Row Level Security on every table, default deny. Write each policy explicitly and test it with a second user.
- Users edit only their own profile. A friendship row is visible only to its two members. Private profiles are readable only by their owner; friends-only ones by accepted friends; public ones by everyone signed in or not.
- Never expose email or auth ids on public profiles. Show username only.
- Username rules enforced in the database: length, lowercase letters/digits/underscore, unique, reserved-names list, simple profanity check.
- Bio and all user text are plain text, length-limited, rendered escaped (never as HTML).
- Rate-limit and cap: friend requests (pending cap per user), username search (few results, min query length), invite codes (random, single-use, expiring), challenges per day.
- Block must hide both users from each other everywhere (search, feed, compare, challenges).
- Only the public Supabase anon key ships in the frontend. No service-role key anywhere in the repo or build. Keep secrets out of git; document the env vars in a `.env.example`.
- Update `vercel.json` CSP (`connect-src` and `img-src` only as needed for Supabase and Google avatars if used) without loosening anything else. Add checks to `frontend/scripts/break-protections.mjs` for the new protections and make sure every line says CAUGHT.
- Update `docs/security-checklist.md`: re-evaluate every "N/A: no accounts" item and record the new evidence.
- Add SQL migrations to the repo (`supabase/migrations/`) so the schema, policies and functions are reviewable and reproducible. Add SQL tests (or a script) that prove RLS blocks cross-user access, direct badge inserts, reading private profiles, and blocked users.

## Data model (adjust if you find a better fit, and say why)

`profiles`, `badges` (catalog), `user_badges`, `library_unlocks` (synced progress), `streaks` / `daily_results` (or one progress table), `friendships` (status: pending, accepted, blocked), `invite_codes`, `events` (feed), `challenges` (sender, recipient, 10 building ids, each side's result).

Validate building ids and architect names against `buildings.json` data on the client and, where practical, in the database.

## Build in batches, all in one run. Do not stop between batches: after each batch run all checks, commit, and continue straight to the next one. Stop only if a check fails and you cannot fix it, or if you need something from me.

Commit after every major change, not only at the end of a batch (for example: migrations, auth, profile page, guest sync, badges, friends, compare, feed, challenges). Each commit must pass the checks and have a short message saying what changed.

**Batch 1: accounts, profiles, sync**
Supabase project config doc, migrations, Google sign-in, sign-in/out UI (header on desktop, `Options` sheet on phones), profile table with RLS, profile edit page, public profile page `#/u/<username>`, privacy setting, learning stats, favorite pick, guest-to-account merge. i18n in en and pt-BR. CSP update and break-protections checks.

**Batch 2: badges and friends**
Badge catalog and award function, era/milestone/explorer badges, showcase of 3, locked-badge hints, earned toast. Friends: requests, accept/decline/remove/block, username search, invite link. Friends list and requests UI. RLS tests for every new table.

**Batch 3: social extras**
Compare profiles (shared badges and shared mastered buildings, reading only what the viewer may see), friends activity feed (events written by the badge function, filtered by friendship and blocks), challenge a friend (reuse Custom mode play flow, both results shown).

## Constraints

- React 19 + Vite, plain JSX, CSS Modules, existing tokens and the drafting-table design language. No new UI library unless unavoidable (say why).
- Reuse existing code: `EraStamp`, Compare dialog, Library view, `route.js` hash routes, strings files, `useGameRound`.
- Phones (640px and narrower) must be fully usable; new settings go in `Options`.
- Accessibility: keyboard and screen-reader support, reduced motion through `motionPref.js`.
- Before every commit: `./gradlew test`, and in `frontend/`: `npx vitest run`, `npm run lint`, `npm run build`, plus `break-protections.mjs`.
- Add small tests for new non-trivial logic (badge rules, merge logic, username validation).
- Commit locally only. Never push, never force, never rewrite history, never commit secrets or `.env`. Update `CLAUDE.md` and `docs/` as you go, and note anything I must do by hand in the Supabase or Google dashboard.

## Final report (once, at the end)

List the commits, what was built, what checks passed, what I must configure manually, and any decision you made that differs from this prompt.
