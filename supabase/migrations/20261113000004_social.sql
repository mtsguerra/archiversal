-- Archiversal accounts, part 3: comparing profiles, the friends feed and challenges.
-- Same rule as before: RLS on, no client access to these tables, everything through functions that
-- check friendship, privacy and blocks and return usernames only.

-- ---------------------------------------------------------------------------------------------
-- Compare
-- ---------------------------------------------------------------------------------------------

/**
 * What the caller and `name` have in common: the badges both earned and the buildings both mastered
 * (so nothing here names a building the caller has not unlocked), with both sets of stats.
 * Null when the profile is not visible to the caller, like get_profile.
 */
create function public.compare_with(name text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  target uuid := find_user(name);
begin
  if target is null or target = uid or not can_view(target) then
    return null;
  end if;
  return jsonb_build_object(
    'username', (select username from profiles where id = target),
    'avatar', (select avatar from profiles where id = target),
    'mine', profile_stats(uid),
    'theirs', profile_stats(target),
    'badges', coalesce((
      select jsonb_agg(m.badge_id order by m.badge_id) from user_badges m
      join user_badges t on t.badge_id = m.badge_id and t.user_id = target where m.user_id = uid), '[]'),
    'mastered', coalesce((
      select jsonb_agg(m.building_id order by m.building_id) from library_unlocks m
      join library_unlocks t on t.building_id = m.building_id and t.user_id = target and t.mastered
      where m.user_id = uid and m.mastered), '[]')
  );
end $$;

-- ---------------------------------------------------------------------------------------------
-- Events: what the feed shows. Written only here in the database (a badge being granted, a
-- challenge being finished), never by a client.
-- ---------------------------------------------------------------------------------------------
create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('badge', 'challenge')),
  ref text not null, -- the badge id, or the other player's username at the time
  created_at timestamptz not null default now()
);
create index events_user on public.events (user_id, id desc);
alter table public.events enable row level security;
revoke all on public.events from anon, authenticated;

/** Adds an event and keeps only the player's latest 50. */
create function public.add_event(who uuid, what text, about text) returns void
language sql security definer set search_path = public, pg_temp as $$
  insert into events (user_id, kind, ref) values (who, what, about);
  delete from events where user_id = who and id not in (select id from events where user_id = who order by id desc limit 50);
$$;

/** Every badge the award function grants becomes an event. */
create function public.badge_event() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform add_event(new.user_id, 'badge', new.badge_id);
  return new;
end $$;
create trigger badge_event after insert on public.user_badges for each row execute function public.badge_event();

/**
 * The latest 30 events of the caller's accepted friends. A friend whose profile the caller may not see
 * (private) is left out, and a block ends the friendship, so blocked players never appear.
 */
create function public.friends_feed() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  -- `ref` is given only for a badge: a challenge's other player may be private or blocked for this caller.
  select coalesce(jsonb_agg(jsonb_build_object('username', username, 'avatar', avatar, 'kind', kind, 'ref', case when kind = 'badge' then ref end, 'at', created_at) order by id desc), '[]')
  from (
    select e.id, p.username, p.avatar, e.kind, e.ref, e.created_at
    from events e join profiles p on p.id = e.user_id
    where are_friends(e.user_id, me()) and not blocked_between(e.user_id, me()) and can_view(e.user_id)
    order by e.id desc limit 30
  ) latest
$$;

-- ---------------------------------------------------------------------------------------------
-- Challenges: ten buildings one friend sets for another. Each side's result is which of the ten
-- they named ({ building id: true | false }); there is no score and no winner.
-- ---------------------------------------------------------------------------------------------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null references auth.users (id) on delete cascade,
  recipient uuid not null references auth.users (id) on delete cascade,
  building_ids text[] not null check (cardinality(building_ids) = 10),
  sender_result jsonb,
  recipient_result jsonb,
  created_at timestamptz not null default now(),
  check (sender <> recipient)
);
create index challenges_sender on public.challenges (sender, created_at desc);
create index challenges_recipient on public.challenges (recipient, created_at desc);
alter table public.challenges enable row level security;
revoke all on public.challenges from anon, authenticated;

/** Challenges friend `name` with ten different catalogue buildings. At most 10 a day. Returns the challenge id. */
create function public.challenge_create(name text, ids text[]) returns uuid
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  target uuid := find_user(name);
  new_id uuid;
begin
  if target is null or not are_friends(uid, target) then
    raise exception 'no such friend' using errcode = 'PT404';
  end if;
  if ids is null or cardinality(ids) <> 10 or (select count(distinct b.id) from buildings b where b.id = any (ids)) <> 10 then
    raise exception 'a challenge is ten different buildings' using errcode = '22023';
  end if;
  perform hit_limit('challenge', 10);
  insert into challenges (sender, recipient, building_ids) values (uid, target, ids) returning id into new_id;
  return new_id;
end $$;

/**
 * Records the caller's side of a challenge, once: an object with exactly the ten building ids as keys and
 * true/false values. Returns false when it was not taken (not a member, already answered, blocked, bad shape).
 */
create function public.challenge_submit(challenge uuid, result jsonb) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  c challenges;
begin
  select * into c from challenges where id = challenge and uid in (sender, recipient) for update;
  if c.id is null or blocked_between(c.sender, c.recipient)
    or jsonb_typeof(result) is distinct from 'object'
    or (select count(*) from jsonb_each(result)) <> 10
    or exists (select 1 from jsonb_each(result) e where not (e.key = any (c.building_ids)) or jsonb_typeof(e.value) <> 'boolean')
    or (uid = c.sender and c.sender_result is not null)
    or (uid = c.recipient and c.recipient_result is not null) then
    return false;
  end if;
  if uid = c.sender then
    update challenges set sender_result = result where id = c.id;
  else
    update challenges set recipient_result = result where id = c.id;
  end if;
  perform add_event(uid, 'challenge', (select username from profiles where id = case when uid = c.sender then c.recipient else c.sender end));
  return true;
end $$;

/**
 * The caller's latest 20 challenges, sent and received, hiding any with a player who is blocked. The
 * other side's result is shown only once the caller has answered, so it cannot be used as a hint.
 */
create function public.list_challenges() returns jsonb
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id, 'sent', sent, 'with', username, 'avatar', avatar, 'buildings', to_jsonb(building_ids), 'at', created_at,
    'mine', mine, 'theirs', case when mine is null then null else theirs end, 'answered', theirs is not null
  ) order by created_at desc), '[]')
  from (
    select c.id, c.sender = me() as sent, p.username, p.avatar, c.building_ids, c.created_at,
      case when c.sender = me() then c.sender_result else c.recipient_result end as mine,
      case when c.sender = me() then c.recipient_result else c.sender_result end as theirs
    from challenges c join profiles p on p.id = case when c.sender = me() then c.recipient else c.sender end
    where me() in (c.sender, c.recipient) and not blocked_between(c.sender, c.recipient)
    order by c.created_at desc limit 20
  ) latest
$$;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.get_profile(text), public.get_badges(text) to anon, authenticated;
grant execute on function
  public.sync_progress(jsonb), public.delete_account(), public.set_username(text), public.username_ok(text), public.award_badges(),
  public.friend_request(text), public.friend_respond(text, boolean), public.friend_remove(text),
  public.block_user(text), public.unblock_user(text), public.list_friends(), public.search_users(text),
  public.create_invite(), public.redeem_invite(text),
  public.compare_with(text), public.friends_feed(), public.list_challenges(),
  public.challenge_create(text, text[]), public.challenge_submit(uuid, jsonb)
  to authenticated;
