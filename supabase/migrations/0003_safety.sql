-- =====================================================================
-- UNMUTE 0003: safety & trust
--  * New members' posts wait for moderator review (first 24 hours)
--  * Appeals for restricted / suspended members
--  * Profile visibility (show age range / city) + "preview as others"
--  * Delete my account, download my data
--  * Unmatch lookup from a chat
-- =====================================================================

-- ---------- Post review for new members ----------
insert into public.app_settings (key, value)
values ('post_review', '{"enabled": true, "new_member_hours": 24}')
on conflict (key) do nothing;

create or replace function public.posts_review_new_members() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  cfg jsonb := (select value from app_settings where key = 'post_review');
  joined timestamptz := (select created_at from profiles where id = new.author_id);
begin
  if coalesce((cfg ->> 'enabled')::boolean, false)
     and not exists (select 1 from profiles where id = new.author_id and role in ('moderator', 'admin'))
     and joined > now() - make_interval(hours => coalesce((cfg ->> 'new_member_hours')::int, 24)) then
    new.review_state := 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_review_new_members on public.posts;
create trigger posts_review_new_members
  before insert on public.posts
  for each row execute function public.posts_review_new_members();

-- Staff list of posts waiting for review (author shown to staff only).
create or replace function public.admin_pending_posts()
returns table (id uuid, group_name text, body text, is_anonymous boolean, author_name text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  return query
    select p.id, g.name, p.body, p.is_anonymous, pr.display_name, p.created_at
    from posts p join groups g on g.id = p.group_id join profiles pr on pr.id = p.author_id
    where p.review_state = 'pending'
    order by p.created_at;
end;
$$;

-- ---------- Appeals ----------
create table if not exists public.appeals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  message text not null check (char_length(message) between 10 and 2000),
  status text not null default 'open' check (status in ('open', 'accepted', 'rejected')),
  staff_note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.appeals enable row level security;
revoke all on public.appeals from anon, authenticated;
grant select on public.appeals to authenticated;
grant insert (message) on public.appeals to authenticated;
create policy appeals_read on public.appeals for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
create policy appeals_insert on public.appeals for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.profiles where id = auth.uid() and status <> 'active')
              and not exists (select 1 from public.appeals a where a.user_id = auth.uid() and a.status = 'open'));

create or replace function public.admin_decide_appeal(p_appeal uuid, p_accept boolean, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare
  a appeals;
begin
  if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  select * into a from appeals where id = p_appeal;
  if a.id is null then raise exception 'NO_APPEAL'; end if;
  update appeals set status = case when p_accept then 'accepted' else 'rejected' end,
                     staff_note = p_note, decided_at = now()
  where id = p_appeal;
  if p_accept then
    update profiles set status = 'active' where id = a.user_id;
  end if;
  insert into audit_log (actor_id, action, target, reason)
  values (auth.uid(), case when p_accept then 'appeal:accept' else 'appeal:reject' end, a.user_id::text, p_note);
end;
$$;

create or replace function public.admin_open_appeals()
returns table (id uuid, user_id uuid, display_name text, member_status text, message text, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  return query
    select a.id, a.user_id, pr.display_name, pr.status, a.message, a.created_at
    from appeals a join profiles pr on pr.id = a.user_id
    where a.status = 'open'
    order by a.created_at;
end;
$$;

-- The latest audit reason for a member's own restriction, so the app can explain it.
create or replace function public.my_restriction()
returns table (status text, reason text, since timestamptz, appeal_status text)
language sql stable security definer set search_path = public as $$
  select p.status,
         (select l.reason from audit_log l where l.target = p.id::text and l.action like 'member_status:%'
          order by l.created_at desc limit 1),
         (select l.created_at from audit_log l where l.target = p.id::text and l.action like 'member_status:%'
          order by l.created_at desc limit 1),
         (select a.status from appeals a where a.user_id = p.id order by a.created_at desc limit 1)
  from profiles p where p.id = auth.uid();
$$;

-- ---------- Visibility ----------
alter table public.profiles add column if not exists show_age boolean not null default true;
alter table public.profiles add column if not exists show_city boolean not null default true;
alter table public.profiles add column if not exists public_age_range text
  generated always as (case when show_age then age_range end) stored;
alter table public.profiles add column if not exists public_city text
  generated always as (case when show_city then city end) stored;

-- Other members only ever read the public_* versions. Your own real values come from my_profile().
revoke select on public.profiles from authenticated;
grant select (id, display_name, public_age_range, public_city, gender, language, bio, community_on,
              friendship_on, dating_on, care_on, discovery_paused, onboarding_step, role, status, created_at)
  on public.profiles to authenticated;
grant update (bio, city, language, discovery_paused, show_age, show_city) on public.profiles to authenticated;

create or replace function public.my_profile()
returns setof public.profiles
language sql stable security definer set search_path = public as $$
  select * from profiles where id = auth.uid();
$$;

-- Discovery functions return the public versions.
create or replace function public.friend_suggestions(p_limit int default 20)
returns table (id uuid, display_name text, age_range text, city text, bio text,
               shared_count int, interests text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.public_age_range, p.public_city, p.bio,
         (select count(*)::int from profile_interests a join profile_interests b
            on a.interest_id = b.interest_id and b.user_id = auth.uid() where a.user_id = p.id),
         array(select i.name from profile_interests pi join interests i on i.id = pi.interest_id
               where pi.user_id = p.id order by i.name)
  from profiles p
  where p.id <> auth.uid()
    and p.friendship_on and not p.discovery_paused
    and p.status = 'active' and p.onboarding_step = 'done'
    and not public.is_blocked(auth.uid(), p.id)
    and not exists (select 1 from friend_requests f
                    where (f.from_id = auth.uid() and f.to_id = p.id)
                       or (f.from_id = p.id and f.to_id = auth.uid()))
    and exists (select 1 from profiles me where me.id = auth.uid() and me.friendship_on)
  order by 6 desc, p.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

create or replace function public.dating_suggestions(p_limit int default 20)
returns table (id uuid, display_name text, age_range text, city text, bio text, interests text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.public_age_range, p.public_city, p.bio,
         array(select i.name from profile_interests pi join interests i on i.id = pi.interest_id
               where pi.user_id = p.id order by i.name)
  from profiles p
  where p.id <> auth.uid()
    and p.dating_on and not p.discovery_paused
    and p.status = 'active'
    and not public.is_blocked(auth.uid(), p.id)
    and not exists (select 1 from dating_likes l where l.from_id = auth.uid() and l.to_id = p.id)
    and exists (select 1 from profiles me where me.id = auth.uid() and me.dating_on)
  order by p.created_at desc
  limit greatest(1, least(p_limit, 50));
$$;

-- What other members see of me (for "Preview as others").
create or replace function public.my_public_card()
returns table (display_name text, age_range text, city text, bio text, interests text[])
language sql stable security definer set search_path = public as $$
  select p.display_name, p.public_age_range, p.public_city, p.bio,
         array(select i.name from profile_interests pi join interests i on i.id = pi.interest_id
               where pi.user_id = p.id order by i.name)
  from profiles p where p.id = auth.uid();
$$;

-- ---------- Unmatch from a chat ----------
create or replace function public.match_for_conversation(p_conversation uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from matches
  where conversation_id = p_conversation and active and auth.uid() in (user_a, user_b)
  limit 1;
$$;

-- ---------- Download my data ----------
create or replace function public.export_my_data()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'exported_at', now(),
    'profile', (select to_jsonb(p) from profiles p where p.id = auth.uid()),
    'private_details', (select to_jsonb(d) from private_details d where d.user_id = auth.uid()),
    'interests', (select coalesce(jsonb_agg(i.name), '[]') from profile_interests pi join interests i on i.id = pi.interest_id where pi.user_id = auth.uid()),
    'consents', (select coalesce(jsonb_agg(to_jsonb(c) - 'user_id' order by c.created_at), '[]') from consents c where c.user_id = auth.uid()),
    'groups', (select coalesce(jsonb_agg(jsonb_build_object('group', g.name, 'status', gm.status, 'joined_at', gm.joined_at)), '[]') from group_members gm join groups g on g.id = gm.group_id where gm.user_id = auth.uid()),
    'posts', (select coalesce(jsonb_agg(jsonb_build_object('body', body, 'anonymous', is_anonymous, 'state', review_state, 'created_at', created_at) order by created_at), '[]') from posts where author_id = auth.uid()),
    'replies', (select coalesce(jsonb_agg(jsonb_build_object('body', body, 'created_at', created_at) order by created_at), '[]') from comments where author_id = auth.uid()),
    'messages_sent', (select coalesce(jsonb_agg(jsonb_build_object('body', body, 'created_at', created_at) order by created_at), '[]') from messages where sender_id = auth.uid()),
    'friend_requests_sent', (select count(*) from friend_requests where from_id = auth.uid()),
    'reports_made', (select coalesce(jsonb_agg(jsonb_build_object('reason', reason, 'status', status, 'created_at', created_at)), '[]') from reports where reporter_id = auth.uid()),
    'care_enquiries', (select coalesce(jsonb_agg(jsonb_build_object('topic', topic, 'note', note, 'status', status, 'created_at', created_at)), '[]') from enquiries where member_id = auth.uid()),
    'mood_checkins', (select coalesce(jsonb_agg(jsonb_build_object('mood', mood, 'at', created_at) order by created_at), '[]') from mood_checkins where user_id = auth.uid()),
    'appeals', (select coalesce(jsonb_agg(jsonb_build_object('message', message, 'status', status, 'created_at', created_at)), '[]') from appeals where user_id = auth.uid())
  );
$$;

-- ---------- Delete my account ----------
-- Removes the sign-in and (through cascades) everything linked to it.
-- The deletion itself is recorded in the audit log (without any personal details).
create or replace function public.delete_my_account(p_confirm text)
returns void language plpgsql security definer set search_path = public, auth as $$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_confirm <> 'DELETE' then raise exception 'CONFIRM_REQUIRED'; end if;
  insert into public.audit_log (actor_id, action, target, reason) values (null, 'account:self_delete', me::text, null);
  delete from auth.users where id = me;
end;
$$;

grant execute on function
  public.admin_pending_posts(), public.admin_decide_appeal(uuid, boolean, text), public.admin_open_appeals(),
  public.my_restriction(), public.my_profile(), public.my_public_card(), public.match_for_conversation(uuid),
  public.export_my_data(), public.delete_my_account(text),
  public.friend_suggestions(int), public.dating_suggestions(int)
to authenticated;
revoke execute on function public.posts_review_new_members() from public, anon, authenticated;
