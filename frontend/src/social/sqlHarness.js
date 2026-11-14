// Test-only: a real Postgres (PGlite, in this process) with the Supabase migrations applied, so the
// Row Level Security rules are proved by running them as two different users. Not part of the app.
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PGlite } from '@electric-sql/pglite'

const migrations = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url))

// What Supabase provides before any migration runs: the two client roles, auth.users, auth.uid(), and
// its habit of granting every new table and function to those roles (so the migrations' revokes are tested).
const SUPABASE = `
  create role anon nologin;
  create role authenticated nologin;
  create schema auth;
  create table auth.users (id uuid primary key, email text);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
`

export const userId = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`

/** A database with every migration applied and `users` accounts (1..n) in auth.users. */
export async function freshDb(users = 3) {
  const db = new PGlite()
  await db.exec(SUPABASE)
  for (const file of readdirSync(migrations).sort()) await db.exec(readFileSync(migrations + file, 'utf8'))
  for (let n = 1; n <= users; n++) await db.query('insert into auth.users (id, email) values ($1, $2)', [userId(n), `user${n}@example.com`])
  return db
}

/** Runs `sql` as user number `n` (0 or null: signed out) and returns the rows. Throws what Postgres throws. */
export async function as(db, n, sql, params = []) {
  await db.exec(`set role ${n ? 'authenticated' : 'anon'}; select set_config('request.jwt.claim.sub', '${n ? userId(n) : ''}', false);`)
  try {
    return (await db.query(sql, params)).rows
  } finally {
    await db.exec('reset role')
  }
}

/** One function call as user `n`; returns its value. */
export const call = async (db, n, fn, ...args) =>
  (await as(db, n, `select public.${fn}(${args.map((_, i) => `$${i + 1}`).join(', ')}) as v`, args))[0].v
