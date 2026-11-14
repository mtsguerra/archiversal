-- Archiversal accounts, part 1: the building catalogue, profiles and synced progress.
--
-- The rule of this schema:
--   * Row Level Security is on for every table and nothing is allowed unless a policy says so.
--   * A signed-in user reads and changes only their own rows.
--   * Anything about another user is read through the security-definer functions below, which
--     return usernames only. Auth ids and emails never leave the database.
--   * Supabase grants table and function rights to anon/authenticated by default, so every object
--     here revokes first and then grants exactly what is needed.

-- ---------------------------------------------------------------------------------------------
-- Small helpers (no table access)
-- ---------------------------------------------------------------------------------------------

/** A date from text, or null when the text is not a real date. */
create function public.safe_date(t text) returns date
language plpgsql immutable set search_path = pg_catalog as $$
begin
  return t::date;
exception when others then
  return null;
end $$;

/** A whole number from a JSON value, clamped to lo..hi; anything else gives lo. */
create function public.json_int(v jsonb, lo int, hi int) returns int
language sql immutable set search_path = pg_catalog as $$
  select case when jsonb_typeof(v) = 'number' then least(greatest(trunc((v #>> '{}')::numeric), lo), hi)::int else lo end
$$;

/** The distinct values of a text array, sorted, at most `cap` of them. */
create function public.uniq(a text[], cap int) returns text[]
language sql immutable set search_path = pg_catalog as $$
  select coalesce(array(select distinct x from unnest(a) x where x is not null order by 1 limit cap), '{}')
$$;

/**
 * Username rules: 3 to 20 characters, lowercase letters, digits and underscore, starting with a
 * letter; not a reserved name; no word from a short profanity list (underscores and common digit
 * swaps are ignored when looking for one).
 */
create function public.username_ok(name text) returns boolean
language sql immutable set search_path = pg_catalog as $$
  select name ~ '^[a-z][a-z0-9_]{2,19}$'
    and name <> all (array[
      'admin', 'administrator', 'root', 'system', 'support', 'help', 'staff', 'moderator', 'mod', 'official',
      'archiversal', 'supabase', 'google', 'security', 'account', 'accounts', 'profile', 'profiles',
      'friends', 'friend', 'invite', 'login', 'logout', 'signin', 'signup', 'settings', 'library', 'daily', 'play',
      'custom', 'themed', 'api', 'null', 'undefined', 'anonymous', 'guest', 'everyone', 'user', 'users', 'me', 'you'
    ])
    and not translate(replace(name, '_', ''), '013457', 'oieast') ~
      '(fuck|shit|cunt|bitch|nigg|fagg|nazi|hitler|porn|penis|vagina|whore|slut|puta|caralho|merda|foda|buceta|viado)'
$$;

-- ---------------------------------------------------------------------------------------------
-- Rate limits: a counter per user, action and day.
-- ---------------------------------------------------------------------------------------------
create table public.rate_limits (
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  day date not null default current_date,
  count int not null default 1,
  primary key (user_id, action, day)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

/** Counts one use of `what` today and refuses (HTTP 429 through PostgREST) past `most`. */
create function public.hit_limit(what text, most int) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  n int;
begin
  delete from rate_limits where user_id = auth.uid() and day < current_date - 7;
  insert into rate_limits as r (user_id, action) values (auth.uid(), what)
  on conflict (user_id, action, day) do update set count = r.count + 1
  returning r.count into n;
  if n > most then
    raise exception 'too many requests today' using errcode = 'PT429';
  end if;
end $$;

-- ---------------------------------------------------------------------------------------------
-- buildings: the catalogue ids, so synced progress and favourites can be checked in the database.
-- Filled by the next migration (generated from buildings.json). Clients never read it.
-- ---------------------------------------------------------------------------------------------
create table public.buildings (
  id text primary key check (id ~ '^[a-z0-9-]{1,80}$'),
  era text not null,
  country text not null,
  architects text[] not null,
  themes text[] not null default '{}'
);
alter table public.buildings enable row level security;
revoke all on public.buildings from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------------------------
create type public.privacy as enum ('private', 'friends', 'public');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (public.username_ok(username)),
  avatar text not null default 'arch'
    check (avatar in ('arch', 'column', 'dome', 'tower', 'bridge', 'house', 'castle', 'temple', 'pyramid', 'skyscraper', 'compass', 'plan')),
  -- Plain text: shown escaped, never as HTML. No control characters, so no hidden line tricks.
  bio text not null default '' check (char_length(bio) <= 160 and bio !~ '[[:cntrl:]]'),
  favorite_kind text check (favorite_kind in ('building', 'architect')),
  favorite text check (char_length(favorite) <= 80),
  privacy public.privacy not null default 'private',
  created_at timestamptz not null default now(),
  check ((favorite_kind is null) = (favorite is null))
);

/** A favourite must be a building id or an architect name from the catalogue. */
create function public.profiles_check() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if new.favorite_kind = 'building' and not exists (select 1 from buildings where id = new.favorite) then
    raise exception 'unknown building' using errcode = '23514';
  end if;
  if new.favorite_kind = 'architect' and not exists (select 1 from buildings where new.favorite = any (architects)) then
    raise exception 'unknown architect' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger profiles_check before insert or update on public.profiles for each row execute function public.profiles_check();

alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
-- No insert and no username column here: a profile is created, and renamed, only by set_username().
grant update (avatar, bio, favorite_kind, favorite, privacy) on public.profiles to authenticated;
create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

/**
 * Creates the caller's profile with this username, or renames it. Returns false when the name cannot be
 * had: taken, reserved and badly formed all give the same answer, and tries are limited to 10 a day, so
 * this cannot be used to find out which private usernames exist. (It returns false instead of raising so
 * that the counted try is kept: an error would roll it back.)
 */
create function public.set_username(name text) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if exists (select 1 from profiles where id = uid and username = name) then
    return true;
  end if;
  perform hit_limit('username', 10);
  begin
    insert into profiles (id, username) values (uid, name) on conflict (id) do update set username = excluded.username;
  exception when unique_violation or check_violation then
    return false;
  end;
  return true;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Synced progress: the same three things the browser keeps (Library unlocks, Daily results, and the
-- streak days with the eras and countries seen). Written only by sync_progress(); read by its owner.
-- ---------------------------------------------------------------------------------------------
create table public.library_unlocks (
  user_id uuid not null references auth.users (id) on delete cascade,
  building_id text not null references public.buildings (id) on delete cascade,
  at date not null,
  mode text not null check (mode in ('normal', 'daily', 'custom', 'themed')),
  mastered boolean not null default false,
  attempts smallint not null default 0 check (attempts between 0 and 99),
  primary key (user_id, building_id)
);

create table public.daily_results (
  user_id uuid not null references auth.users (id) on delete cascade,
  number int not null check (number between 1 and 999999),
  building_id text not null references public.buildings (id) on delete cascade,
  outcome text not null check (outcome in ('solved', 'gaveUp')),
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and octet_length(fields::text) <= 300),
  attempts smallint not null check (attempts between 0 and 999),
  hints_used smallint not null check (hints_used between 0 and 99),
  late boolean not null default false,
  primary key (user_id, number)
);

create table public.player_progress (
  user_id uuid primary key references auth.users (id) on delete cascade,
  days text[] not null default '{}', -- Daily numbers played on their day (the streak), kept as text
  eras text[] not null default '{}',
  countries text[] not null default '{}'
);

alter table public.library_unlocks enable row level security;
alter table public.daily_results enable row level security;
alter table public.player_progress enable row level security;
revoke all on public.library_unlocks, public.daily_results, public.player_progress from anon, authenticated;
grant select on public.library_unlocks, public.daily_results, public.player_progress to authenticated;
create policy library_unlocks_select_own on public.library_unlocks for select to authenticated using (user_id = auth.uid());
create policy daily_results_select_own on public.daily_results for select to authenticated using (user_id = auth.uid());
create policy player_progress_select_own on public.player_progress for select to authenticated using (user_id = auth.uid());

/**
 * Merges the browser's progress into the account and returns the account's progress in the same shape
 * ({ library, days, progress }), so the browser can merge it back. Nothing is ever taken away: an unlock
 * keeps its first day and can only gain the mastered mark; a Daily result is kept as first saved.
 * Unknown building ids and malformed entries are skipped.
 */
create function public.sync_progress(p jsonb) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  if jsonb_typeof(p) is distinct from 'object' or octet_length(p::text) > 400000 then
    raise exception 'bad progress' using errcode = '22023';
  end if;

  insert into library_unlocks (user_id, building_id, at, mode, mastered, attempts)
  select uid, b.id, safe_date(e.value ->> 'at'), e.value ->> 'mode', coalesce(e.value -> 'mastered' = 'true'::jsonb, false), json_int(e.value -> 'attempts', 0, 99)
  from jsonb_each(case when jsonb_typeof(p -> 'library') = 'object' then p -> 'library' else '{}' end) e
  join buildings b on b.id = e.key
  where safe_date(e.value ->> 'at') is not null and e.value ->> 'mode' in ('normal', 'daily', 'custom', 'themed')
  on conflict (user_id, building_id) do update set mastered = library_unlocks.mastered or excluded.mastered;

  insert into daily_results (user_id, number, building_id, outcome, fields, attempts, hints_used, late)
  select uid, e.key::int, b.id, e.value ->> 'outcome', e.value -> 'fields', json_int(e.value -> 'attempts', 0, 999), json_int(e.value -> 'hintsUsed', 0, 99), coalesce(e.value -> 'late' = 'true'::jsonb, false)
  from jsonb_each(case when jsonb_typeof(p -> 'days') = 'object' then p -> 'days' else '{}' end) e
  join buildings b on b.id = e.value ->> 'id'
  where e.key ~ '^[1-9][0-9]{0,5}$' and e.value ->> 'outcome' in ('solved', 'gaveUp')
    and jsonb_typeof(e.value -> 'fields') = 'object' and octet_length((e.value -> 'fields')::text) <= 300
  on conflict (user_id, number) do nothing;

  insert into player_progress (user_id, days, eras, countries)
  select uid,
    uniq(array(select x from jsonb_array_elements_text(case when jsonb_typeof(p #> '{progress,days}') = 'array' then p #> '{progress,days}' else '[]' end) x where x ~ '^[1-9][0-9]{0,5}$'), 2000),
    uniq(array(select x from jsonb_array_elements_text(case when jsonb_typeof(p #> '{progress,eras}') = 'array' then p #> '{progress,eras}' else '[]' end) x where x ~ '^[A-Z_]{2,30}$'), 60),
    uniq(array(select x from jsonb_array_elements_text(case when jsonb_typeof(p #> '{progress,countries}') = 'array' then p #> '{progress,countries}' else '[]' end) x where x ~ '^[A-Z]{2}$'), 300)
  on conflict (user_id) do update set
    days = uniq(player_progress.days || excluded.days, 2000),
    eras = uniq(player_progress.eras || excluded.eras, 60),
    countries = uniq(player_progress.countries || excluded.countries, 300);

  return jsonb_build_object(
    'library', coalesce((select jsonb_object_agg(building_id, jsonb_build_object('at', at, 'mode', mode, 'mastered', mastered, 'attempts', attempts)) from library_unlocks where user_id = uid), '{}'),
    'days', coalesce((select jsonb_object_agg(number::text, jsonb_build_object('number', number, 'id', building_id, 'outcome', outcome, 'fields', fields, 'attempts', attempts, 'hintsUsed', hints_used, 'late', late)) from daily_results where user_id = uid), '{}'),
    'progress', (select jsonb_build_object('days', (select coalesce(jsonb_agg(d::int order by d::int), '[]') from unnest(days) d), 'eras', to_jsonb(eras), 'countries', to_jsonb(countries)) from player_progress where user_id = uid)
  );
end $$;

-- ---------------------------------------------------------------------------------------------
-- Reading someone's profile
-- ---------------------------------------------------------------------------------------------

/** May the caller see `target`'s profile? Its owner always; anyone when it is public. (Friends are added in part 2.) */
create function public.can_view(target uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select target = auth.uid() or exists (select 1 from profiles where id = target and privacy = 'public')
$$;

/** Learning stats, counted from synced progress. */
create function public.profile_stats(target uuid) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'unlocked', (select count(*) from library_unlocks where user_id = target),
    'mastered', (select count(*) from library_unlocks where user_id = target and mastered),
    'countries', (select count(distinct b.country) from library_unlocks u join buildings b on b.id = u.building_id where u.user_id = target),
    'eras', (
      select count(*) from (
        select b.era from buildings b left join library_unlocks u on u.building_id = b.id and u.user_id = target
        group by b.era having count(*) = count(u.building_id)
      ) complete),
    'dailies', (select count(*) from daily_results where user_id = target)
  )
$$;

/**
 * A profile by username: what its page shows, or null when there is no such profile or the caller
 * may not see it (the two cases look the same on purpose). No id, no email.
 */
create function public.get_profile(name text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'username', p.username, 'avatar', p.avatar, 'bio', p.bio,
    'favorite_kind', p.favorite_kind, 'favorite', p.favorite,
    'privacy', p.privacy, 'joined', to_char(p.created_at, 'YYYY-MM'),
    'mine', p.id = auth.uid(),
    'stats', profile_stats(p.id)
  )
  from profiles p where p.username = lower(name) and can_view(p.id)
$$;

/** Deletes the caller's account and everything that hangs from it. */
create function public.delete_account() returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  delete from auth.users where id = auth.uid();
end $$;

-- Functions: nobody by default, then exactly who needs each one.
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_profile(text) to anon, authenticated;
grant execute on function public.sync_progress(jsonb), public.delete_account() to authenticated;
grant execute on function public.set_username(text) to authenticated;
-- Every update of a profile re-runs its checks as the signed-in user, so the username check must be callable.
grant execute on function public.username_ok(text) to authenticated;
