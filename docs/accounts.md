# Accounts, profiles, badges and friends

Accounts are optional. The site is still a static build on Vercel; the only backend is a Supabase project
(Postgres with Row Level Security, and Google sign-in through Supabase Auth). The Spring Boot API is unchanged.

With no Supabase project configured the site is exactly the guest game: no sign-in button, no request to
Supabase, and the Supabase client is never downloaded (it is a separate chunk loaded on first use).

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
  Signing out leaves the browser's copy in place, so guest play continues.
- Screens: `#/profile` (sign in, choose a username, edit, sign out, delete account) and `#/u/<username>`
  (the public page), in `frontend/src/components/social/`. The header shows a round account button on wide
  screens; on phones it is a row in `Options`.

## Database rules

Every table has Row Level Security on, and nothing is allowed without a policy. Supabase grants new tables
and functions to the client roles by default, so each migration revokes first and grants only what is needed.

| Table | Client may | Everything else |
|---|---|---|
| `buildings` | nothing | catalogue ids for checks; filled by the generated migration |
| `profiles` | read, insert and update **its own row** (column grants: no `id` or `created_at` changes) | other profiles only through `get_profile(username)` |
| `library_unlocks`, `daily_results`, `player_progress` | read its own rows | written only by `sync_progress()` |

- Cross-user reads go through security-definer functions that return usernames, never ids or emails. This is
  a deliberate difference from "a select policy per privacy level": a table policy would have to expose the
  row's `id`, which is the auth id.
- `get_profile` returns null both for "no such user" and "you may not see it".
- Username rules (`username_ok`): 3 to 20 characters, `a-z 0-9 _`, starts with a letter, a reserved list and
  a short profanity list. The client checks only the shape; the database decides.
- Bio: at most 160 characters, no control characters, stored as typed and rendered by React as text.
- Favourite: a building id or architect name that exists in `buildings`. The public page names a favourite
  building only to a viewer who has unlocked it (the Library never spoils a locked building).
- `delete_account()` removes the auth user; every table cascades.

## Tests

`frontend/src/social/sql.test.js` applies the real migrations to an in-process Postgres (PGlite, a dev
dependency) with Supabase's roles and default grants, and runs every rule as two users and as a signed-out
visitor. `break-protections.mjs` weakens the policies one at a time and checks that these tests fail.
Not covered by tests: Supabase Auth itself and the Google round trip (they need the real project).
