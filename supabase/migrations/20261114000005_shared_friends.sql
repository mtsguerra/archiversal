-- Archiversal accounts, part 4: the friends two players have in common, for the visitor page's Salon.
-- Same rules as the other social functions: found through find_user (a block hides both players from each
-- other), only for a profile the caller may see, usernames and avatars only, signed-in players only.

/**
 * The players who are friends with both the caller and `name`. Everyone listed is already the caller's
 * friend, so nobody new is revealed to the caller. A player either of them blocked is left out.
 * Null when the profile is not visible to the caller (or is the caller's own), like compare_with.
 */
create function public.shared_friends(name text) returns jsonb
language plpgsql stable security definer set search_path = public, pg_temp as $$
declare
  uid uuid := me();
  target uuid := find_user(name);
begin
  if target is null or target = uid or not can_view(target) then
    return null;
  end if;
  return coalesce((
    with mine as (
      select case when a = uid then b else a end as x from friendships where uid in (a, b) and status = 'accepted'
    ), theirs as (
      select case when a = target then b else a end as x from friendships where target in (a, b) and status = 'accepted'
    )
    select jsonb_agg(jsonb_build_object('username', p.username, 'avatar', p.avatar) order by p.username)
    from mine join theirs using (x) join profiles p on p.id = x
    where not blocked_between(x, uid) and not blocked_between(x, target)
  ), '[]');
end $$;

-- Supabase grants every new function to the client roles; only signed-in players may call this one.
revoke execute on function public.shared_friends(text) from public, anon, authenticated;
grant execute on function public.shared_friends(text) to authenticated;
