-- Archiversal accounts, part 2: badges and friends.
-- Same rule as part 1: RLS on everything, own rows only, other users only through functions that
-- return usernames. The tables that pair two users (friendships, blocks, invite codes) are not readable
-- by clients at all, so one player's auth id never reaches another player.

/** The caller's id, or an error when signed out or without a profile (a username is needed to be social). */
create function public.me() returns uuid
language plpgsql stable security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null or not exists (select 1 from profiles where id = auth.uid()) then
    raise exception 'a profile is needed' using errcode = '28000';
  end if;
  return auth.uid();
end $$;

-- ---------------------------------------------------------------------------------------------
-- Friends and blocks
-- ---------------------------------------------------------------------------------------------
-- One row per pair (a < b). `asker` is who asked. A block lives in its own table so that two players
-- can block each other and one unblocking does not undo the other's block.
create table public.friendships (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  asker uuid not null,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b),
  check (asker in (a, b))
);
create index friendships_b on public.friendships (b);

create table public.blocks (
  blocker uuid not null references auth.users (id) on delete cascade,
  blocked uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
create index blocks_blocked on public.blocks (blocked);

create table public.invite_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days',
  used_at timestamptz
);
create index invite_codes_user on public.invite_codes (user_id);

alter table public.friendships enable row level security;
alter table public.blocks enable row level security;
alter table public.invite_codes enable row level security;
revoke all on public.friendships, public.blocks, public.invite_codes from anon, authenticated;

/** True when either of the two has blocked the other. */
create function public.blocked_between(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from blocks where (blocker = x and blocked = y) or (blocker = y and blocked = x))
$$;

create function public.are_friends(x uuid, y uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from friendships where a = least(x, y) and b = greatest(x, y) and status = 'accepted')
$$;

/**
 * The id behind a username as the caller may know it: null when there is no such profile or when
 * either side has blocked the other. Every social function finds people through this, so a block
 * hides both players from each other everywhere.
 */
create function public.find_user(name text) returns uuid
language sql stable security definer set search_path = public, pg_temp as $$
  select id from profiles where username = lower(name) and not blocked_between(id, auth.uid())
$$;

/** Part 1's rule, now with friends and blocks: owner; or not blocked and (public, or friends-only and a friend). */
create or replace function public.can_view(target uuid) returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select target = auth.uid() or exists (
    select 1 from profiles
    where id = target
      and not blocked_between(target, auth.uid())
      and (privacy = 'public' or (privacy = 'friends' and are_friends(target, auth.uid())))
  )
$$;

/**
 * Asks `name` to be friends. Only a public profile can be asked by name (others share an invite code).
 * If they had already asked the caller, this accepts. Returns 'pending' or 'accepted'.
 */
create function public.friend_request(name text) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  target uuid := find_user(name);
  existing friendships;
begin
  if target is null or target = uid or not exists (select 1 from profiles where id = target and privacy = 'public') then
    raise exception 'no such player' using errcode = 'PT404';
  end if;
  select * into existing from friendships where a = least(uid, target) and b = greatest(uid, target);
  if existing.status = 'accepted' then
    return 'accepted';
  elsif existing.status = 'pending' and existing.asker = target then
    update friendships set status = 'accepted' where a = existing.a and b = existing.b;
    return 'accepted';
  elsif existing.status = 'pending' then
    return 'pending';
  end if;
  perform hit_limit('friend_request', 30);
  if (select count(*) from friendships where asker = uid and status = 'pending') >= 20 then
    raise exception 'too many pending requests' using errcode = 'PT429';
  end if;
  insert into friendships (a, b, status, asker) values (least(uid, target), greatest(uid, target), 'pending', uid);
  return 'pending';
end $$;

/** Answers a request `name` sent to the caller: accept it or decline it (the row goes). */
create function public.friend_respond(name text, accept boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  target uuid := find_user(name);
begin
  if accept then
    update friendships set status = 'accepted' where a = least(uid, target) and b = greatest(uid, target) and status = 'pending' and asker = target;
  else
    delete from friendships where a = least(uid, target) and b = greatest(uid, target) and status = 'pending' and asker = target;
  end if;
end $$;

/** Ends a friendship, or takes back a request the caller sent. */
create function public.friend_remove(name text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  target uuid := find_user(name);
begin
  delete from friendships where a = least(uid, target) and b = greatest(uid, target) and (status = 'accepted' or asker = uid);
end $$;

/** Blocks `name`: any friendship or request between the two goes, and each disappears for the other. */
create function public.block_user(name text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  target uuid := (select id from profiles where username = lower(name));
begin
  if target is null or target = uid then
    return; -- silently: blocking must not reveal who exists
  end if;
  perform hit_limit('block', 100);
  insert into blocks (blocker, blocked) values (uid, target) on conflict do nothing;
  delete from friendships where a = least(uid, target) and b = greatest(uid, target);
end $$;

create function public.unblock_user(name text) returns void
language sql security definer set search_path = public, pg_temp as $$
  delete from blocks where blocker = me() and blocked = (select id from profiles where username = lower(name))
$$;

/** The caller's friends, requests in both directions, and the players the caller blocked. Usernames only. */
create function public.list_friends() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  with mine as (
    select case when f.a = me() then f.b else f.a end as other, f.status, f.asker from friendships f where me() in (f.a, f.b)
  ), named as (
    select p.username, p.avatar, m.status, m.asker = me() as sent from mine m join profiles p on p.id = m.other
  )
  select jsonb_build_object(
    'friends', coalesce((select jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar) order by username) from named where status = 'accepted'), '[]'),
    'incoming', coalesce((select jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar) order by username) from named where status = 'pending' and not sent), '[]'),
    'outgoing', coalesce((select jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar) order by username) from named where status = 'pending' and sent), '[]'),
    'blocked', coalesce((select jsonb_agg(p.username order by p.username) from blocks b join profiles p on p.id = b.blocked where b.blocker = me()), '[]')
  )
$$;

/**
 * Public profiles whose username starts with `q` (3+ characters), at most 8, never the caller and never
 * anyone blocked in either direction. Signed-in players only, 300 searches a day.
 */
create function public.search_users(q text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  needle text := lower(btrim(q));
begin
  if needle !~ '^[a-z0-9_]{3,20}$' then
    return '[]'::jsonb;
  end if;
  perform hit_limit('search', 300);
  return coalesce((
    select jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar) order by username)
    from (
      select username, avatar from profiles
      where privacy = 'public' and left(username, length(needle)) = needle and id <> uid and not blocked_between(id, uid)
      order by username limit 8
    ) found), '[]');
end $$;

/** A new invite code: random, usable once, for 7 days. At most 5 unused ones per player, 10 made a day. */
create function public.create_invite() returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  raw text := replace(gen_random_uuid()::text, '-', '');
  new_code text := substr(raw, 1, 12) || substr(raw, 21, 8); -- 80 random bits (the fixed version digits are skipped)
begin
  perform hit_limit('invite', 10);
  delete from invite_codes where user_id = uid and (used_at is not null or expires_at < now());
  if (select count(*) from invite_codes where user_id = uid) >= 5 then
    raise exception 'too many open invites' using errcode = 'PT429';
  end if;
  insert into invite_codes (code, user_id) values (new_code, uid);
  return new_code;
end $$;

/** Uses an invite code: the two become friends at once (the code is the owner's yes). Returns the owner's username, or null for a code that is wrong, used, expired or the caller's own. */
create function public.redeem_invite(invite text) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  owner uuid;
begin
  perform hit_limit('redeem', 30);
  select user_id into owner from invite_codes i
  where i.code = invite and used_at is null and expires_at > now() and user_id <> uid and not blocked_between(user_id, uid)
  for update;
  if owner is null then
    return null; -- not an error: an error would roll back the attempt counted above
  end if;
  update invite_codes i set used_at = now() where i.code = invite;
  insert into friendships (a, b, status, asker) values (least(uid, owner), greatest(uid, owner), 'accepted', owner)
  on conflict (a, b) do update set status = 'accepted';
  return (select username from profiles where id = owner);
end $$;

-- ---------------------------------------------------------------------------------------------
-- Badges
-- ---------------------------------------------------------------------------------------------
-- The catalogue. `rule` names what is counted and `threshold` how many; an era badge needs every
-- building of `target`. Names and hints are in the site's strings, keyed by id.
create table public.badges (
  id text primary key,
  kind text not null check (kind in ('era', 'milestone', 'explorer')),
  rule text not null check (rule in ('era', 'unlocked', 'mastered', 'dailies', 'countries', 'eras_seen', 'collections', 'all')),
  target text,
  threshold int not null default 0,
  sort int not null default 0
);

insert into public.badges (id, kind, rule, threshold, sort) values
  ('first-sheet', 'milestone', 'unlocked', 1, 10),
  ('ten-sheets', 'milestone', 'unlocked', 10, 11),
  ('fifty-sheets', 'milestone', 'unlocked', 50, 12),
  ('hundred-sheets', 'milestone', 'unlocked', 100, 13),
  ('quarter-thousand', 'milestone', 'unlocked', 250, 14),
  ('named-ten', 'milestone', 'mastered', 10, 20),
  ('named-fifty', 'milestone', 'mastered', 50, 21),
  ('named-hundred', 'milestone', 'mastered', 100, 22),
  ('daily-seven', 'milestone', 'dailies', 7, 30),
  ('daily-thirty', 'milestone', 'dailies', 30, 31),
  ('five-countries', 'explorer', 'countries', 5, 40),
  ('fifteen-countries', 'explorer', 'countries', 15, 41),
  ('thirty-countries', 'explorer', 'countries', 30, 42),
  ('ten-eras', 'explorer', 'eras_seen', 10, 50),
  ('every-era', 'explorer', 'eras_seen', 1000, 51), -- 1000 means "all of them" (see award_badges)
  ('first-collection', 'explorer', 'collections', 1, 60),
  ('five-collections', 'explorer', 'collections', 5, 61),
  ('complete-works', 'explorer', 'all', 0, 70);

-- One badge per era in the catalogue (run again after an era is added: it only adds).
insert into public.badges (id, kind, rule, target, sort)
select 'era-' || lower(replace(era, '_', '-')), 'era', 'era', era, 100 from (select distinct era from public.buildings) eras
on conflict (id) do nothing;

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id text not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
revoke all on public.badges, public.user_badges from anon, authenticated;
-- The catalogue is public. A player's badges are theirs to read; nobody can write them.
grant select on public.badges to anon, authenticated;
grant select on public.user_badges to authenticated;
create policy badges_select_all on public.badges for select to anon, authenticated using (true);
create policy user_badges_select_own on public.user_badges for select to authenticated using (user_id = auth.uid());

/**
 * Checks every rule against the caller's synced progress and grants what is newly earned.
 * Returns the ids granted by this call. A badge, once earned, is never taken away.
 */
create function public.award_badges() returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := auth.uid();
  s jsonb;
  eras_seen int;
  eras_total int;
  collections int;
  total int;
  granted jsonb;
begin
  if uid is null then
    raise exception 'not signed in' using errcode = '28000';
  end if;
  s := profile_stats(uid);
  select count(distinct b.era) into eras_seen from library_unlocks u join buildings b on b.id = u.building_id where u.user_id = uid;
  select count(distinct era), count(*) into eras_total, total from buildings;
  select count(*) into collections from (
    select t from buildings b cross join lateral unnest(b.themes) t
    left join library_unlocks u on u.building_id = b.id and u.user_id = uid
    group by t having count(*) = count(u.building_id)
  ) complete;

  with earned as (
    select b.id from badges b
    where case b.rule
      when 'unlocked' then (s ->> 'unlocked')::int >= b.threshold
      when 'mastered' then (s ->> 'mastered')::int >= b.threshold
      when 'dailies' then (s ->> 'dailies')::int >= b.threshold
      when 'countries' then (s ->> 'countries')::int >= b.threshold
      when 'eras_seen' then eras_seen >= least(b.threshold, eras_total) and eras_total > 0
      when 'collections' then collections >= b.threshold
      when 'all' then total > 0 and (s ->> 'unlocked')::int >= total
      when 'era' then exists (select 1 from buildings x where x.era = b.target)
        and not exists (
          select 1 from buildings x where x.era = b.target
            and not exists (select 1 from library_unlocks u where u.user_id = uid and u.building_id = x.id))
    end
  ), fresh as (
    insert into user_badges (user_id, badge_id) select uid, id from earned on conflict do nothing returning badge_id
  )
  select coalesce(jsonb_agg(badge_id), '[]') into granted from fresh;
  return granted;
end $$;

-- The showcase: up to three of the player's own badges, pinned on the profile.
alter table public.profiles add column showcase text[] not null default '{}' check (cardinality(showcase) <= 3);
grant update (showcase) on public.profiles to authenticated;

create function public.showcase_check() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if exists (select 1 from unnest(new.showcase) s where s is null or not exists (select 1 from user_badges where user_id = new.id and badge_id = s))
    or cardinality(new.showcase) <> (select count(distinct s) from unnest(new.showcase) s) then
    raise exception 'only your own badges, once each' using errcode = '23514';
  end if;
  return new;
end $$;
create trigger showcase_check before insert or update of showcase on public.profiles for each row execute function public.showcase_check();

/** The badges of `name` (earned ids with their dates, and the showcase), or null when the caller may not see the profile. */
create function public.get_badges(name text) returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'earned', coalesce((select jsonb_agg(jsonb_build_object('id', badge_id, 'at', earned_at::date) order by earned_at, badge_id) from user_badges where user_id = p.id), '[]'),
    'showcase', to_jsonb(p.showcase)
  )
  from profiles p where p.username = lower(name) and can_view(p.id)
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_profile(text), public.get_badges(text) to anon, authenticated;
grant execute on function
  public.sync_progress(jsonb), public.delete_account(), public.set_username(text), public.username_ok(text), public.award_badges(),
  public.friend_request(text), public.friend_respond(text, boolean), public.friend_remove(text),
  public.block_user(text), public.unblock_user(text), public.list_friends(), public.search_users(text),
  public.create_invite(), public.redeem_invite(text)
  to authenticated;
