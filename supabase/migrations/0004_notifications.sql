-- 0004 — Notifications (US-M16-01, US-M16-02, US-M16-03) and the welcome tour (US-M05-03)
-- Safe to run more than once.

-- pg_net lets the database call Expo's push service (Supabase ships it; skipped where missing).
do $$ begin
  create extension if not exists pg_net;
exception when others then null; end $$;

-- ── Welcome tour ────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists tour_seen boolean not null default false;
grant update (tour_seen) on public.profiles to authenticated;

-- ── In-app notifications ────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'friend_request', 'friend_accepted', 'match', 'message', 'reply',
    'post_approved', 'post_removed', 'appeal')),
  category text not null check (category in ('friends', 'matches', 'messages', 'replies', 'safety')),
  title text not null,
  body text,
  link text,                      -- app route to open
  ref_id uuid,                    -- conversation / post used to group repeats
  count int not null default 1,   -- how many events this row stands for
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
drop policy if exists notifications_own_read on public.notifications;
create policy notifications_own_read on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists notifications_own_update on public.notifications;
create policy notifications_own_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Preferences: which categories reach the phone ───────────────────────────
create table if not exists public.notification_prefs (
  user_id uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  friends boolean not null default true,
  matches boolean not null default true,
  messages boolean not null default true,
  replies boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.notification_prefs enable row level security;
revoke all on public.notification_prefs from anon, authenticated;
grant select, insert (user_id, friends, matches, messages, replies), update (user_id, friends, matches, messages, replies, updated_at)
  on public.notification_prefs to authenticated;
drop policy if exists prefs_own on public.notification_prefs;
create policy prefs_own on public.notification_prefs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── Phone push tokens ───────────────────────────────────────────────────────
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  platform text,
  updated_at timestamptz not null default now()
);
alter table public.push_tokens enable row level security;
revoke all on public.push_tokens from anon, authenticated;

create or replace function public.register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'NOT_SIGNED_IN'; end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[.+\]$' then raise exception 'BAD_TOKEN'; end if;
  insert into push_tokens (token, user_id, platform) values (p_token, auth.uid(), p_platform)
    on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.remove_push_token(p_token text)
returns void language sql security definer set search_path = public as $$
  delete from push_tokens where token = p_token and user_id = auth.uid();
$$;

-- ── Core: create (or merge) a notification ──────────────────────────────────
-- Skips self-notifications and blocked pairs. Repeats for the same unread
-- chat or post are merged into one row (count goes up, time moves to now).
create or replace function public.notify(
  p_user uuid, p_actor uuid, p_kind text, p_category text,
  p_title text, p_body text, p_link text, p_ref uuid)
returns void language plpgsql security definer set search_path = public as $$
declare existing uuid;
begin
  if p_user is null then return; end if;
  if p_actor is not null and (p_actor = p_user or public.is_blocked(p_actor, p_user)) then return; end if;
  if p_kind in ('message', 'reply') and p_ref is not null then
    select id into existing from notifications
      where user_id = p_user and kind = p_kind and ref_id = p_ref and read_at is null
      order by created_at desc limit 1;
    if existing is not null then
      update notifications set count = count + 1, created_at = now(), title = p_title, body = p_body
        where id = existing;
      return;
    end if;
  end if;
  insert into notifications (user_id, kind, category, title, body, link, ref_id)
    values (p_user, p_kind, p_category, p_title, p_body, p_link, p_ref);
end;
$$;

create or replace function public.name_of(p uuid) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select display_name from profiles where id = p), 'A member');
$$;

-- Friend requests
create or replace function public.trg_notify_friend_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform notify(new.to_id, new.from_id, 'friend_request', 'friends',
      name_of(new.from_id) || ' sent you a friend request', new.note, '/requests', new.id);
  elsif tg_op = 'UPDATE' and new.status = 'accepted' and old.status is distinct from 'accepted' then
    perform notify(new.from_id, new.to_id, 'friend_accepted', 'friends',
      name_of(new.to_id) || ' accepted your friend request', 'You can now chat in your inbox.', '/inbox', new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists notify_friend_request on public.friend_requests;
create trigger notify_friend_request after insert or update of status on public.friend_requests
  for each row execute function public.trg_notify_friend_request();

-- Dating matches
create or replace function public.trg_notify_match() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.active and (tg_op = 'INSERT' or not old.active) then
    perform notify(new.user_a, null, 'match', 'matches', 'It''s a match with ' || name_of(new.user_b),
      'You both said yes. Say hello when you''re ready.', '/chat/' || new.conversation_id, new.id);
    perform notify(new.user_b, null, 'match', 'matches', 'It''s a match with ' || name_of(new.user_a),
      'You both said yes. Say hello when you''re ready.', '/chat/' || new.conversation_id, new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists notify_match on public.matches;
create trigger notify_match after insert or update of active on public.matches
  for each row execute function public.trg_notify_match();

-- Messages (one-to-one chats only; group chats would be too noisy)
create or replace function public.trg_notify_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare c conversations; m record;
begin
  select * into c from conversations where id = new.conversation_id;
  if c.kind = 'group' then return new; end if;
  for m in select user_id from conversation_members where conversation_id = new.conversation_id and user_id <> new.sender_id loop
    perform notify(m.user_id, new.sender_id, 'message', 'messages', 'New message from ' || name_of(new.sender_id),
      left(new.body, 120), '/chat/' || new.conversation_id, new.conversation_id);
  end loop;
  return new;
end;
$$;
drop trigger if exists notify_message on public.messages;
create trigger notify_message after insert on public.messages
  for each row execute function public.trg_notify_message();

-- Replies on my post (the replier's name is hidden if they are the anonymous author — they can't be, since self is skipped)
create or replace function public.trg_notify_reply() returns trigger
language plpgsql security definer set search_path = public as $$
declare p posts;
begin
  select * into p from posts where id = new.post_id;
  if p.id is null or p.review_state <> 'published' then return new; end if;
  perform notify(p.author_id, new.author_id, 'reply', 'replies', name_of(new.author_id) || ' replied to your post',
    left(new.body, 120), '/post/' || p.id, p.id);
  return new;
end;
$$;
drop trigger if exists notify_reply on public.comments;
create trigger notify_reply after insert on public.comments
  for each row execute function public.trg_notify_reply();

-- Post review outcome
create or replace function public.trg_notify_post_review() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.review_state = 'pending' and new.review_state = 'published' then
    perform notify(new.author_id, null, 'post_approved', 'safety', 'Your post is live',
      'Thanks for waiting. Others can now see and reply to it.', '/post/' || new.id, new.id);
  elsif old.review_state = 'pending' and new.review_state = 'removed' then
    perform notify(new.author_id, null, 'post_removed', 'safety', 'Your post wasn''t published',
      'It didn''t meet the group rules. Please read them before posting again.', null, new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists notify_post_review on public.posts;
create trigger notify_post_review after update of review_state on public.posts
  for each row execute function public.trg_notify_post_review();

-- Appeal decided
create or replace function public.trg_notify_appeal() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.status = 'open' and new.status in ('accepted', 'rejected') then
    perform notify(new.user_id, null, 'appeal', 'safety',
      case when new.status = 'accepted' then 'Your account is active again' else 'Your appeal was reviewed' end,
      new.staff_note, '/', new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists notify_appeal on public.appeals;
create trigger notify_appeal after update of status on public.appeals
  for each row execute function public.trg_notify_appeal();

-- ── Member functions ────────────────────────────────────────────────────────
create or replace function public.mark_all_notifications_read()
returns void language sql security definer set search_path = public as $$
  update notifications set read_at = now() where user_id = auth.uid() and read_at is null;
$$;

create or replace function public.unread_notification_count()
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int from notifications where user_id = auth.uid() and read_at is null;
$$;

-- ── Phone push (sent by the database through pg_net when it exists) ────────
-- Wording is deliberately neutral: no names, no message text, no dating/legal words.
create or replace function public.trg_push_notification() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  allowed boolean;
  line text;
  tokens jsonb;
begin
  if to_regprocedure('net.http_post(text,jsonb,jsonb,jsonb,integer)') is null then return new; end if;
  select case new.category
           when 'friends' then coalesce(p.friends, true)
           when 'matches' then coalesce(p.matches, true)
           when 'messages' then coalesce(p.messages, true)
           when 'replies' then coalesce(p.replies, true)
           else true end
    into allowed
    from (select 1) one left join notification_prefs p on p.user_id = new.user_id;
  if not allowed then return new; end if;
  select jsonb_agg(token) into tokens from push_tokens where user_id = new.user_id;
  if tokens is null then return new; end if;
  line := case new.kind
            when 'friend_request' then 'Someone wants to connect with you'
            when 'friend_accepted' then 'You have a new connection'
            when 'match' then 'You have something new in Connect'
            when 'message' then 'You have a new message'
            when 'reply' then 'Someone replied to your post'
            else 'You have an update about your account' end;
  execute 'select net.http_post(url := $1, body := $2, headers := $3)'
    using 'https://exp.host/--/api/v2/push/send',
          jsonb_build_object('to', tokens, 'title', 'UNMUTE', 'body', line, 'sound', 'default',
                             'data', jsonb_build_object('link', new.link)),
          '{"Content-Type": "application/json"}'::jsonb;
  return new;
exception when others then
  return new;  -- a push failure must never block the in-app notification
end;
$$;
drop trigger if exists push_notification on public.notifications;
create trigger push_notification after insert on public.notifications
  for each row execute function public.trg_push_notification();

-- ── Permissions ─────────────────────────────────────────────────────────────
revoke execute on function
  public.notify(uuid, uuid, text, text, text, text, text, uuid), public.name_of(uuid),
  public.trg_notify_friend_request(), public.trg_notify_match(), public.trg_notify_message(),
  public.trg_notify_reply(), public.trg_notify_post_review(), public.trg_notify_appeal(),
  public.trg_push_notification()
  from public, anon, authenticated;
revoke execute on function public.register_push_token(text, text), public.remove_push_token(text),
  public.mark_all_notifications_read(), public.unread_notification_count() from public, anon;
grant execute on function public.register_push_token(text, text), public.remove_push_token(text),
  public.mark_all_notifications_read(), public.unread_notification_count() to authenticated;

-- Live badge updates
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
