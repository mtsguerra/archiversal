# Accounts, profiles, badges and friends

Accounts are optional. The site is still a static build on Vercel; the only backend is a Supabase project
(Postgres with Row Level Security, and Google sign-in through Supabase Auth). The Spring Boot API is unchanged.

With no Supabase project configured the site is the guest game: no request to Supabase, and the Supabase
client is never downloaded (it is a separate chunk loaded on first use). The account button is still shown
(header on wide screens, Options on phones); it opens `#/profile`, which says accounts are not set up.

## What you must set up by hand

Nothing below can be done from the repository.

### 1. Supabase project

1. Create a project at supabase.com. Note the **Project URL** and the **anon / publishable key**
   (Project Settings, API). Never copy the `service_role` / secret key anywhere.
2. Apply the migrations in `supabase/migrations/`, in file-name order. Either paste each file into the SQL
   editor, or with the Supabase CLI: `supabase link --project-ref <ref>` then `supabase db push`.
3. Authentication, Providers: enable **Google** only. Turn **Email** sign-ups off (the app has no password form).
4. Authentication, URL Configuration: set **Site URL** to the production address
   (`https://archiversal.vercel.app`) and add to **Redirect URLs** that address and
   `http://localhost:5173` for development. Do not add wildcards for preview deployments.
5. Authentication, Rate Limits: leave the defaults on. Database, Settings: leave "Enforce SSL" on.
6. Project Settings, API: keep the `public` schema as the only exposed schema.

### 2. Google sign-in

1. Google Cloud Console, APIs & Services, OAuth consent screen: External, app name "Archiversal", your email
   as support contact. Scopes: only `openid`, `email`, `profile` (the defaults). Publish the app.
2. Credentials, Create credentials, OAuth client ID, Web application.
   - Authorized JavaScript origins: the production address and `http://localhost:5173`.
   - Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback` (shown on Supabase's Google provider page).
3. Paste the client ID and client secret into Supabase's Google provider page. The secret lives only there.

### 3. Vercel

1. Project Settings, Environment Variables (Production, and Preview only if you want accounts there):
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Redeploy.
2. Optional hardening: in `vercel.json` replace `https://*.supabase.co` in `connect-src` with your exact
   project host (`https://<project-ref>.supabase.co`) and update the expectation in `frontend/src/deploy.test.js`.

### 4. Local development

Copy `frontend/.env.example` to `frontend/.env.local` and fill in the two values. `.env.local` is git-ignored.

### 5. After adding buildings

Run `node scripts/make-supabase-buildings.mjs` in `frontend/` and run the regenerated
`supabase/migrations/20261113000002_buildings_data.sql` in the SQL editor (it only adds and updates rows).
A test fails while the file is out of date.

## How it is built

- `frontend/src/social/client.js`: reads the two environment variables. Accounts switch on only for a
  Supabase project address and a public key; a service-role or secret key switches them off.
- `frontend/src/social/account.js`: one store (`useAccount`): `off`, `loading`, `out` or `in`, and the
  player's own profile. `signIn` is a full-page visit to Google and back (PKCE), so the CSP needs no frame,
  script or image source for it.
- `frontend/src/social/sync.js`: on sign-in and a moment after every reveal, the browser's Library, Daily
  results and streak go to `sync_progress()` and the account's copy comes back and is merged with
  `mergeSave` (the same merge the hand-off link uses). Both sides only gain: nothing is overwritten.
  Signing out leaves the browser's copy in place, so guest play continues. The browser remembers whose copy it
  is (`archiversal:owner`); when a different account signs in, that copy is cleared first so it never merges
  into the newcomer (guest play after a sign-out is lost in that case).
- Screens: `#/profile` (sign in, choose a username, edit, sign out, delete account) and `#/u/<username>`
  (the public page), in `frontend/src/components/social/`. The header shows a round account button on wide
  screens; on phones it is a row in `Options`.

## Database rules

Every table has Row Level Security on, and nothing is allowed without a policy. Supabase grants new tables
and functions to the client roles by default, so each migration revokes first and grants only what is needed.

| Table | Client may | Everything else |
|---|---|---|
| `buildings` | nothing | catalogue ids for checks; filled by the generated migration |
| `profiles` | read and update **its own row** (column grants: not `id`, `username` or `created_at`) | created and renamed only by `set_username()`; other profiles only through `get_profile(username)` |
| `library_unlocks`, `daily_results`, `player_progress` | read its own rows | written only by `sync_progress()` |
| `badges` (catalogue) | read (public) | fixed rows from the migration |
| `user_badges` | read its own rows | granted only by `award_badges()`; others' through `get_badges(username)` |
| `friendships`, `blocks`, `invite_codes`, `rate_limits`, `events`, `challenges` | nothing | only through the functions below |

- Cross-user reads go through security-definer functions that return usernames, never ids or emails. This is
  a deliberate difference from "a select policy per privacy level": a table policy would have to expose the
  row's `id`, which is the auth id.
- `get_profile` returns null both for "no such user" and "you may not see it".
- Username rules (`username_ok`): 3 to 20 characters, `a-z 0-9 _`, starts with a letter, a reserved list and
  a short profanity list. The client checks only the shape; the database decides.
- `set_username()` gives one answer ("not available") for taken, reserved and malformed names and allows 10
  tries a day, so it cannot be used to find out which private usernames exist.
- Bio: at most 160 characters, no control characters, stored as typed and rendered by React as text.
- Favourite: a building id or architect name that exists in `buildings`. The public page names a favourite
  building only to a viewer who has unlocked it (the Library never spoils a locked building).
- `delete_account()` removes the auth user; every table cascades.

### Badges

- `award_badges()` (called by the client after each sync) checks every rule against the caller's synced
  progress and inserts what is newly earned; it returns the new ids, which the site shows as a toast.
  Clients have no insert, update or delete right on `user_badges`. Not tamper-proof (a player can sync
  progress they did not earn, since answers ship in the page) and that is accepted: nothing is competitive.
- Catalogue: one badge per era (every building of the era unlocked: drawn with `EraStamp`), milestones
  (1, 10, 50, 100, 250 unlocked; 10, 50, 100 named; 7 and 30 Dailies played on any days: no streak pressure)
  and explorer badges (5, 15, 30 countries; 10 eras and every era seen; 1 and 5 complete collections;
  every building). Names and "how to earn it" hints are in `strings.badges`, keyed by id; a test checks
  that the catalogue and both languages agree.
- Showcase: `profiles.showcase`, up to 3 ids; a trigger refuses a badge the player has not earned.
- After adding an era to the building data, run the era insert at the end of the badges section of
  `20261113000003_badges_friends.sql` again (it only adds).

### Friends

- One row per pair in `friendships` (`pending` or `accepted`). Blocks are a separate table, so two players
  can block each other and one unblocking does not undo the other's block. (The prompt suggested a
  `blocked` status on the friendship; a row per direction is the better fit.)
- `find_user(name)` is how every function finds a player: it answers null when either side has blocked
  the other, so a block hides both players from each other in profiles, badges, search, requests,
  invites, compare, the feed and challenges.
- `friend_request` works by name only for public profiles; everyone else shares an invite code.
- `search_users`: signed-in only, 3+ characters, prefix match, 8 results, public profiles only.
- Invite codes: 80 random bits, single use, 7 days, at most 5 open and 10 created a day; 30 redeem tries a
  day (a wrong code returns null instead of an error, so the try is counted).
- Daily limits (`hit_limit`): 30 friend requests (and 20 pending at once), 300 searches, 100 blocks,
  10 challenges, 10 username tries. Past the limit the function answers HTTP 429.
- `can_view`: the owner; or not blocked and (public, or friends-only and an accepted friend). A private
  profile is closed even to friends.

### Compare, feed, challenges

- `compare_with(name)`: badges both have and buildings both **named**, so nothing names a building the
  viewer has not unlocked. Shown in the Library's Compare dialog frame (`CompareDialog` in `Detail.jsx`).
- `events` are written only in the database: a trigger on `user_badges` (so every badge the award
  function grants is an event) and `challenge_submit`. `friends_feed()` returns the latest 30 from accepted
  friends whose profile the caller may see. Building names never appear in the feed.
- Challenges: `challenge_create(name, ids)` takes ten different catalogue ids for an accepted friend. The
  site picks ten at random and starts a Custom session carrying the challenge id (`social/challenges.js`);
  the recap sends `{ building id: named? }` with `challenge_submit`, once per side. `list_challenges()`
  hides the other side's result until the caller has answered. Both results are shown side by side with
  no total and no winner. A building skipped without a reveal stays unnamed in the table.

### Screens

The signed-in player's profile is a furnished floor plan (`Plan` in `components/social/Shell.jsx`, chosen
from three mocked directions on 2026-11-14). What each room holds is drawn in it and each room is a link:

| Room | Address | Shows | Drawn in the plan |
|---|---|---|---|
| Hall | `#/profile` | edit profile, sign out, delete account | avatar and username |
| Archive | `#/profile/archive` | your card as others see it (stats) | shelves, sheets unlocked |
| Gallery | `#/profile/gallery` | badges and showcase | earned badges on the wall, free hooks |
| Salon | `#/profile/salon` (also `#/friends`) | requests, friends, feed, search, invites, blocked | friends at the table, requests at the door |
| Studio | `#/profile/studio` | challenges and both results | an open challenge on the board |

The plan sits beside the room on wide screens and above it at 1024px and narrower; the same rooms are
repeated as plain links under it. Its numbers come from `usePlanData` (`social/usePlan.js`). Nothing in it
moves on its own. Other screens: `#/u/<username>` (another player's page: friend actions, Compare with me,
badges) and `#/invite/<code>` (accept an invite link). Signed out or without a username, `#/profile` shows
the sign-in or the username form without the plan.

## Tests

`frontend/src/social/sql.test.js` applies the real migrations to an in-process Postgres (PGlite, a dev
dependency) with Supabase's roles and default grants, and runs every rule as two users and as a signed-out
visitor. `break-protections.mjs` weakens the policies one at a time and checks that these tests fail.
Not covered by tests: Supabase Auth itself and the Google round trip (they need the real project).

On 2026-11-14 the signed-in screens were also walked through in Playwright's WebKit against a throwaway
local stub (the same migrations in PGlite behind a PostgREST-shaped server, kept outside the repo): sign-in
state, username refusal, guest merge, badges and showcase, friend request and accept, search, invite link,
compare, challenge play to recap and results, the phone layout and the dark theme. The real Supabase
project, the Google redirect and Safari were not tested.
