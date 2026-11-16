-- =====================================================================
-- UNMUTE POC: full database schema
-- Paste this whole file into Supabase > SQL Editor > New query > Run.
-- Every table has row-level security (RLS) on. Private data
-- (date of birth, relationship stage, CARE notes) lives in tables
-- that only the owner can read.
-- =====================================================================

-- gen_random_uuid() is built into Postgres 13+, no extension needed.

-- ---------------------------------------------------------------------
-- 1. Members
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text unique check (char_length(display_name) between 3 and 30),
  age_range text,
  gender text check (gender in ('woman', 'man', 'non_binary', 'prefer_not')),
  city text,
  language text not null default 'en' check (language in ('en', 'hi')),
  bio text check (char_length(bio) <= 300),
  community_on boolean not null default false,
  friendship_on boolean not null default false,
  dating_on boolean not null default false,
  care_on boolean not null default false,
  discovery_paused boolean not null default false,
  onboarding_step text not null default 'basics'
    check (onboarding_step in ('basics', 'stage', 'interests', 'pillars', 'done')),
  role text not null default 'member' check (role in ('member', 'moderator', 'admin', 'professional')),
  status text not null default 'active' check (status in ('active', 'restricted', 'suspended')),
  created_at timestamptz not null default now()
);

-- Only the owner ever reads these.
create table public.private_details (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dob date,
  relationship_stage text check (relationship_stage in (
    'thinking', 'considering', 'preparing', 'underway', 'separated', 'divorced', 'prefer_not'))
);

create table public.interests (
  id smallserial primary key,
  name text not null unique
);

create table public.profile_interests (
  user_id uuid not null references public.profiles (id) on delete cascade,
  interest_id smallint not null references public.interests (id) on delete cascade,
  primary key (user_id, interest_id)
);

-- One row per consent given or withdrawn, with the policy version (FRD M04).
create table public.consents (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pillar text not null check (pillar in ('community', 'friendship', 'dating', 'care')),
  policy_version text not null default 'v1.0',
  given boolean not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. Community
-- ---------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  access text not null default 'open' check (access in ('open', 'restricted')),
  rules text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'approved' check (status in ('pending', 'approved')),
  role text not null default 'member' check (role in ('member', 'moderator')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  is_anonymous boolean not null default false,
  -- Members never see author_id; they see this instead (empty when anonymous).
  public_author_id uuid generated always as (case when is_anonymous then null else author_id end) stored,
  review_state text not null default 'published' check (review_state in ('pending', 'published', 'hidden', 'removed')),
  created_at timestamptz not null default now()
);
create index posts_group_created on public.posts (group_id, created_at desc);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index comments_post on public.comments (post_id, created_at);

create table public.reactions (
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('strength', 'been_there')),
  primary key (post_id, user_id, kind)
);

-- ---------------------------------------------------------------------
-- 3. Friendship, dating, messaging
-- ---------------------------------------------------------------------
create table public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 300),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'withdrawn')),
  created_at timestamptz not null default now(),
  unique (from_id, to_id),
  check (from_id <> to_id)
);

create table public.dating_likes (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('friend', 'dating', 'group', 'pro')),
  group_id uuid references public.groups (id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid references public.conversations (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index messages_conversation on public.messages (conversation_id, created_at);

-- ---------------------------------------------------------------------
-- 4. Safety
-- ---------------------------------------------------------------------
create table public.blocks (
  blocker_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  reported_user_id uuid references public.profiles (id) on delete set null,
  post_id uuid references public.posts (id) on delete set null,
  message_id uuid references public.messages (id) on delete set null,
  reason text not null check (reason in (
    'harassment', 'money', 'sexual', 'fake', 'threats', 'private_info', 'underage', 'other')),
  details text check (char_length(details) <= 2000),
  status text not null default 'new' check (status in ('new', 'in_review', 'actioned', 'dismissed')),
  created_at timestamptz not null default now()
);

create table public.audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target text,
  reason text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. CARE
-- ---------------------------------------------------------------------
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  stage text not null check (stage in ('deciding', 'preparing', 'underway', 'after')),
  minutes smallint not null default 5,
  body text not null,
  published boolean not null default true
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  name text not null,
  kind text not null check (kind in ('advocate', 'counsellor', 'psychologist')),
  city text,
  languages text[] not null default '{}',
  areas text[] not null default '{}',
  fee_text text,
  bio text,
  verified boolean not null default false
);

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professionals (id) on delete cascade,
  topic text not null,
  note text check (char_length(note) <= 1000),
  mode text,
  best_time text,
  status text not null default 'sent' check (status in ('sent', 'replied', 'closed')),
  created_at timestamptz not null default now()
);

create table public.care_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  done boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. Home extras and settings
-- ---------------------------------------------------------------------
create table public.mood_checkins (
  id bigserial primary key,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  mood smallint not null check (mood between 1 and 5),
  created_at timestamptz not null default now()
);

create table public.app_settings (
  key text primary key,
  value jsonb not null
);

-- =====================================================================
-- Helper functions
-- =====================================================================
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('moderator', 'admin'));
$$;

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks
                 where (blocker_id = a and blocked_id = b) or (blocker_id = b and blocked_id = a));
$$;

create or replace function public.is_approved_member(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from group_members
                 where group_id = g and user_id = auth.uid() and status = 'approved');
$$;

create or replace function public.can_see_group(g uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from groups where id = g and access = 'open') or public.is_approved_member(g);
$$;

create or replace function public.is_conversation_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversation_members where conversation_id = c and user_id = auth.uid())
      or exists (select 1 from conversations cv
                 join group_members gm on gm.group_id = cv.group_id
                 where cv.id = c and cv.kind = 'group'
                   and gm.user_id = auth.uid() and gm.status = 'approved');
$$;

create or replace function public.is_active_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and status = 'active');
$$;

-- New sign-up => empty profile row.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.private_details (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- Onboarding functions (FRD M02, M04)
-- =====================================================================
create or replace function public.complete_basics(
  p_display_name text, p_dob date, p_gender text, p_city text, p_language text)
returns void language plpgsql security definer set search_path = public as $$
declare
  yrs int := extract(year from age(current_date, p_dob));
  lo int;
begin
  if p_dob is null or yrs < 30 then
    -- Nothing is saved for people under 30.
    raise exception 'NOT_ELIGIBLE';
  end if;
  if yrs > 100 then
    raise exception 'INVALID_DOB';
  end if;
  lo := (yrs / 5) * 5;
  update private_details set dob = p_dob where user_id = auth.uid();
  update profiles set
    display_name = trim(p_display_name),
    age_range = lo || '–' || (lo + 5),
    gender = p_gender,
    city = p_city,
    language = coalesce(p_language, 'en'),
    onboarding_step = 'stage'
  where id = auth.uid();
end;
$$;

create or replace function public.set_stage(p_stage text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update private_details set relationship_stage = p_stage where user_id = auth.uid();
  update profiles set onboarding_step = case when onboarding_step = 'stage' then 'interests' else onboarding_step end
  where id = auth.uid();
end;
$$;

create or replace function public.set_interests(p_ids smallint[])
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from profile_interests where user_id = auth.uid();
  insert into profile_interests (user_id, interest_id)
    select auth.uid(), unnest(coalesce(p_ids, '{}'::smallint[]));
  update profiles set onboarding_step = case when onboarding_step = 'interests' then 'pillars' else onboarding_step end
  where id = auth.uid();
end;
$$;

-- Turn one pillar on or off and record the consent.
create or replace function public.set_pillar(p_pillar text, p_on boolean, p_version text default 'v1.0')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_pillar = 'dating' and p_on then
    raise exception 'USE_DATING_POLICY';
  end if;
  insert into consents (user_id, pillar, policy_version, given) values (auth.uid(), p_pillar, p_version, p_on);
  update profiles set
    community_on  = case when p_pillar = 'community'  then p_on else community_on end,
    friendship_on = case when p_pillar = 'friendship' then p_on else friendship_on end,
    dating_on     = case when p_pillar = 'dating'     then p_on else dating_on end,
    care_on       = case when p_pillar = 'care'       then p_on else care_on end
  where id = auth.uid();
end;
$$;

create or replace function public.finish_onboarding(p_community boolean, p_friendship boolean, p_care boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.set_pillar('community', p_community);
  perform public.set_pillar('friendship', p_friendship);
  perform public.set_pillar('care', p_care);
  update profiles set onboarding_step = 'done' where id = auth.uid();
end;
$$;

-- Dating opens only after the member confirms the eligibility policy (FRD M11).
create or replace function public.accept_dating_policy(p_version text default 'v1.0')
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from private_details
                 where user_id = auth.uid() and relationship_stage in ('underway', 'separated', 'divorced')) then
    raise exception 'DATING_NOT_ELIGIBLE';
  end if;
  insert into consents (user_id, pillar, policy_version, given) values (auth.uid(), 'dating', p_version, true);
  update profiles set dating_on = true where id = auth.uid();
end;
$$;

-- =====================================================================
-- Community functions
-- =====================================================================
create or replace function public.join_group(p_group uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  acc text;
  st text;
begin
  select access into acc from groups where id = p_group;
  if acc is null then raise exception 'NO_GROUP'; end if;
  st := case when acc = 'open' then 'approved' else 'pending' end;
  insert into group_members (group_id, user_id, status) values (p_group, auth.uid(), st)
    on conflict (group_id, user_id) do nothing;
  return st;
end;
$$;

create or replace function public.leave_group(p_group uuid)
returns void language sql security definer set search_path = public as $$
  delete from group_members where group_id = p_group and user_id = auth.uid();
$$;

-- Feed for the signed-in member: posts they may see, newest first,
-- with the author's display name only when the post isn't anonymous.
create or replace function public.feed(p_group uuid default null, p_limit int default 30, p_post uuid default null)
returns table (
  id uuid, group_id uuid, group_name text, body text, is_anonymous boolean,
  author_name text, is_mine boolean, review_state text, created_at timestamptz,
  strength_count bigint, been_there_count bigint, comment_count bigint,
  my_strength boolean, my_been_there boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.group_id, g.name, p.body, p.is_anonymous,
         case when p.is_anonymous then null else pr.display_name end,
         p.author_id = auth.uid(), p.review_state, p.created_at,
         (select count(*) from reactions r where r.post_id = p.id and r.kind = 'strength'),
         (select count(*) from reactions r where r.post_id = p.id and r.kind = 'been_there'),
         (select count(*) from comments c where c.post_id = p.id),
         exists (select 1 from reactions r where r.post_id = p.id and r.kind = 'strength' and r.user_id = auth.uid()),
         exists (select 1 from reactions r where r.post_id = p.id and r.kind = 'been_there' and r.user_id = auth.uid())
  from posts p
  join groups g on g.id = p.group_id
  join profiles pr on pr.id = p.author_id
  where (p_group is null or p.group_id = p_group)
    and (p_post is null or p.id = p_post)
    and public.can_see_group(p.group_id)
    and (p_group is not null or p_post is not null or public.is_approved_member(p.group_id))
    and (p.review_state = 'published' or p.author_id = auth.uid())
    and not public.is_blocked(auth.uid(), p.author_id)
    and pr.status <> 'suspended'
  order by p.created_at desc
  limit greatest(1, least(p_limit, 100));
$$;

-- =====================================================================
-- Friendship functions (FRD M09, M10)
-- =====================================================================
create or replace function public.friend_suggestions(p_limit int default 20)
returns table (id uuid, display_name text, age_range text, city text, bio text,
               shared_count int, interests text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.age_range, p.city, p.bio,
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

create or replace function public.send_friend_request(p_to uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_active_member() then raise exception 'NOT_ACTIVE'; end if;
  if public.is_blocked(auth.uid(), p_to) then raise exception 'BLOCKED'; end if;
  if (select count(*) from friend_requests where from_id = auth.uid()
        and created_at > now() - interval '1 day') >= 20 then
    raise exception 'RATE_LIMIT';
  end if;
  insert into friend_requests (from_id, to_id, note) values (auth.uid(), p_to, p_note)
    on conflict (from_id, to_id) do nothing;
end;
$$;

create or replace function public.respond_friend_request(p_request uuid, p_accept boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  req friend_requests;
  conv uuid;
begin
  select * into req from friend_requests where id = p_request and to_id = auth.uid() and status = 'pending';
  if req.id is null then raise exception 'NO_REQUEST'; end if;
  update friend_requests set status = case when p_accept then 'accepted' else 'declined' end where id = p_request;
  if not p_accept then return null; end if;
  insert into conversations (kind) values ('friend') returning id into conv;
  insert into conversation_members (conversation_id, user_id) values (conv, req.from_id), (conv, req.to_id);
  return conv;
end;
$$;

-- =====================================================================
-- Dating functions (FRD M11, M12)
-- =====================================================================
create or replace function public.dating_suggestions(p_limit int default 20)
returns table (id uuid, display_name text, age_range text, city text, bio text, interests text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, p.age_range, p.city, p.bio,
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

-- Returns the new conversation id when the like is mutual, else null.
create or replace function public.dating_respond(p_to uuid, p_like boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a uuid := least(auth.uid(), p_to);
  b uuid := greatest(auth.uid(), p_to);
  conv uuid;
begin
  if not exists (select 1 from profiles where id = auth.uid() and dating_on) then
    raise exception 'DATING_OFF';
  end if;
  if public.is_blocked(auth.uid(), p_to) then raise exception 'BLOCKED'; end if;
  insert into dating_likes (from_id, to_id, liked) values (auth.uid(), p_to, p_like)
    on conflict (from_id, to_id) do update set liked = excluded.liked;
  if p_like and exists (select 1 from dating_likes where from_id = p_to and to_id = auth.uid() and liked) then
    insert into conversations (kind) values ('dating') returning id into conv;
    insert into conversation_members (conversation_id, user_id) values (conv, a), (conv, b);
    insert into matches (user_a, user_b, conversation_id) values (a, b, conv)
      on conflict (user_a, user_b) do update set active = true, conversation_id = excluded.conversation_id;
    return conv;
  end if;
  return null;
end;
$$;

create or replace function public.unmatch(p_match uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m matches;
begin
  select * into m from matches where id = p_match and auth.uid() in (user_a, user_b);
  if m.id is null then raise exception 'NO_MATCH'; end if;
  update matches set active = false where id = m.id;
  update conversations set active = false where id = m.conversation_id;
end;
$$;

-- =====================================================================
-- Messaging (FRD M13)
-- =====================================================================
create or replace function public.my_conversations()
returns table (id uuid, kind text, title text, other_id uuid, last_body text,
               last_at timestamptz, unread boolean)
language sql stable security definer set search_path = public as $$
  with mine as (
    select c.id, c.kind, c.group_id, c.created_at, cm.last_read_at
    from conversations c
    join conversation_members cm on cm.conversation_id = c.id and cm.user_id = auth.uid()
    where c.active
    union
    select c.id, c.kind, c.group_id, c.created_at, now()
    from conversations c
    join group_members gm on gm.group_id = c.group_id and gm.user_id = auth.uid() and gm.status = 'approved'
    where c.kind = 'group' and c.active
  )
  select m.id, m.kind,
         coalesce(g.name, o.display_name, 'Conversation'),
         o.id,
         lm.body, coalesce(lm.created_at, m.created_at),
         coalesce(lm.created_at > m.last_read_at and lm.sender_id <> auth.uid(), false)
  from mine m
  left join groups g on g.id = m.group_id
  left join lateral (
    select p.id, p.display_name from conversation_members x join profiles p on p.id = x.user_id
    where x.conversation_id = m.id and x.user_id <> auth.uid() limit 1) o on true
  left join lateral (
    select body, created_at, sender_id from messages where conversation_id = m.id
    order by created_at desc limit 1) lm on true
  where o.id is null or not public.is_blocked(auth.uid(), o.id)
  order by 6 desc;
$$;

create or replace function public.mark_read(p_conversation uuid)
returns void language sql security definer set search_path = public as $$
  update conversation_members set last_read_at = now()
  where conversation_id = p_conversation and user_id = auth.uid();
$$;

-- =====================================================================
-- Safety (FRD M17)
-- =====================================================================
create or replace function public.block_user(p_target uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into blocks (blocker_id, blocked_id) values (auth.uid(), p_target) on conflict do nothing;
  update friend_requests set status = 'withdrawn'
    where status = 'pending' and ((from_id = auth.uid() and to_id = p_target) or (from_id = p_target and to_id = auth.uid()));
  update matches set active = false
    where user_a = least(auth.uid(), p_target) and user_b = greatest(auth.uid(), p_target);
end;
$$;

-- The member's own block list, with names (blocked profiles are otherwise hidden).
create or replace function public.my_blocked()
returns table (id uuid, display_name text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked_id, p.display_name, b.created_at
  from blocks b join profiles p on p.id = b.blocked_id
  where b.blocker_id = auth.uid()
  order by b.created_at desc;
$$;

-- Staff actions, each recorded in the audit log.
create or replace function public.admin_set_member_status(p_user uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  update profiles set status = p_status where id = p_user;
  insert into audit_log (actor_id, action, target, reason) values (auth.uid(), 'member_status:' || p_status, p_user::text, p_reason);
end;
$$;

create or replace function public.admin_moderate_post(p_post uuid, p_state text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  update posts set review_state = p_state where id = p_post;
  insert into audit_log (actor_id, action, target, reason) values (auth.uid(), 'post:' || p_state, p_post::text, p_reason);
end;
$$;

create or replace function public.admin_update_report(p_report uuid, p_status text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then raise exception 'STAFF_ONLY'; end if;
  update reports set status = p_status where id = p_report;
  insert into audit_log (actor_id, action, target, reason) values (auth.uid(), 'report:' || p_status, p_report::text, p_reason);
end;
$$;

create or replace function public.admin_review_group_member(p_group uuid, p_user uuid, p_approve boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_staff() or exists (select 1 from group_members
           where group_id = p_group and user_id = auth.uid() and role = 'moderator')) then
    raise exception 'STAFF_ONLY';
  end if;
  if p_approve then
    update group_members set status = 'approved' where group_id = p_group and user_id = p_user;
  else
    delete from group_members where group_id = p_group and user_id = p_user;
  end if;
  insert into audit_log (actor_id, action, target, reason)
    values (auth.uid(), case when p_approve then 'group_join:approve' else 'group_join:decline' end, p_group::text || '/' || p_user::text, null);
end;
$$;

-- =====================================================================
-- Row-level security
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.private_details enable row level security;
alter table public.interests enable row level security;
alter table public.profile_interests enable row level security;
alter table public.consents enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;
alter table public.friend_requests enable row level security;
alter table public.dating_likes enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.matches enable row level security;
alter table public.messages enable row level security;
alter table public.blocks enable row level security;
alter table public.reports enable row level security;
alter table public.audit_log enable row level security;
alter table public.articles enable row level security;
alter table public.professionals enable row level security;
alter table public.enquiries enable row level security;
alter table public.care_notes enable row level security;
alter table public.mood_checkins enable row level security;
alter table public.app_settings enable row level security;

-- Nothing for signed-out visitors.
-- Supabase grants everything to these roles by default; start from nothing.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, public;

-- Profiles: members see others' public fields; writes to a few safe columns only.
revoke all on public.profiles from authenticated;
grant select (id, display_name, age_range, gender, city, language, bio, community_on, friendship_on,
              dating_on, care_on, discovery_paused, onboarding_step, role, status, created_at)
  on public.profiles to authenticated;
grant update (bio, city, language, discovery_paused) on public.profiles to authenticated;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff()
         or (status <> 'suspended' and onboarding_step = 'done' and not public.is_blocked(auth.uid(), id)));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

grant select on public.private_details to authenticated;
create policy private_own on public.private_details for select to authenticated using (user_id = auth.uid());

grant select on public.interests to authenticated;
create policy interests_read on public.interests for select to authenticated using (true);

grant select on public.profile_interests to authenticated;
create policy profile_interests_read on public.profile_interests for select to authenticated using (true);

grant select on public.consents to authenticated;
create policy consents_own on public.consents for select to authenticated using (user_id = auth.uid());

grant select on public.groups to authenticated;
create policy groups_read on public.groups for select to authenticated using (true);

grant select on public.group_members to authenticated;
create policy group_members_read on public.group_members for select to authenticated using (true);

-- Posts: author_id is never readable by members.
revoke all on public.posts from authenticated;
grant select (id, group_id, body, is_anonymous, public_author_id, review_state, created_at) on public.posts to authenticated;
grant insert (group_id, body, is_anonymous) on public.posts to authenticated;
grant delete on public.posts to authenticated;
create policy posts_read on public.posts for select to authenticated
  using (public.is_staff() or author_id = auth.uid()
         or (review_state = 'published' and public.can_see_group(group_id)
             and not public.is_blocked(auth.uid(), author_id)));
create policy posts_insert on public.posts for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_member() and public.is_approved_member(group_id));
create policy posts_delete_own on public.posts for delete to authenticated using (author_id = auth.uid());

grant select, delete on public.comments to authenticated;
grant insert (post_id, body) on public.comments to authenticated;
create policy comments_read on public.comments for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id)
         and not public.is_blocked(auth.uid(), author_id));
create policy comments_insert on public.comments for insert to authenticated
  with check (author_id = auth.uid() and public.is_active_member()
              and exists (select 1 from public.posts p where p.id = post_id and public.is_approved_member(p.group_id)));
create policy comments_delete_own on public.comments for delete to authenticated using (author_id = auth.uid());

grant select, delete on public.reactions to authenticated;
grant insert (post_id, kind) on public.reactions to authenticated;
create policy reactions_read on public.reactions for select to authenticated using (true);
create policy reactions_insert on public.reactions for insert to authenticated with check (user_id = auth.uid());
create policy reactions_delete on public.reactions for delete to authenticated using (user_id = auth.uid());

grant select on public.friend_requests to authenticated;
grant update (status) on public.friend_requests to authenticated;
create policy fr_read on public.friend_requests for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());
create policy fr_withdraw on public.friend_requests for update to authenticated
  using (from_id = auth.uid() and status = 'pending') with check (status = 'withdrawn');

grant select on public.dating_likes to authenticated;
create policy likes_own on public.dating_likes for select to authenticated using (from_id = auth.uid());

grant select on public.conversations to authenticated;
create policy conv_read on public.conversations for select to authenticated using (public.is_conversation_member(id));

grant select on public.conversation_members to authenticated;
create policy conv_members_read on public.conversation_members for select to authenticated
  using (public.is_conversation_member(conversation_id));

grant select on public.matches to authenticated;
create policy matches_read on public.matches for select to authenticated using (auth.uid() in (user_a, user_b));

grant select on public.messages to authenticated;
grant insert (conversation_id, body) on public.messages to authenticated;
create policy messages_read on public.messages for select to authenticated
  using (public.is_conversation_member(conversation_id) and not public.is_blocked(auth.uid(), sender_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.is_active_member()
              and public.is_conversation_member(conversation_id)
              and exists (select 1 from public.conversations c where c.id = conversation_id and c.active)
              and not exists (select 1 from public.conversation_members o
                              where o.conversation_id = messages.conversation_id
                                and o.user_id <> auth.uid() and public.is_blocked(auth.uid(), o.user_id)));

grant select, delete on public.blocks to authenticated;
create policy blocks_own on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());

grant select on public.reports to authenticated;
grant insert (reported_user_id, post_id, message_id, reason, details) on public.reports to authenticated;
create policy reports_read on public.reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_staff());
create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());

grant select on public.audit_log to authenticated;
create policy audit_staff on public.audit_log for select to authenticated using (public.is_staff());

grant select on public.articles to authenticated;
create policy articles_read on public.articles for select to authenticated using (published or public.is_staff());

grant select on public.professionals to authenticated;
create policy pros_read on public.professionals for select to authenticated
  using (verified or user_id = auth.uid() or public.is_staff());

grant select on public.enquiries to authenticated;
grant insert (professional_id, topic, note, mode, best_time) on public.enquiries to authenticated;
create policy enquiries_read on public.enquiries for select to authenticated
  using (member_id = auth.uid()
         or exists (select 1 from public.professionals p where p.id = professional_id and p.user_id = auth.uid()));
create policy enquiries_insert on public.enquiries for insert to authenticated with check (member_id = auth.uid());

grant select, delete on public.care_notes to authenticated;
grant insert (body) on public.care_notes to authenticated;
grant update (done, body) on public.care_notes to authenticated;
create policy notes_own on public.care_notes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.mood_checkins to authenticated;
grant insert (mood) on public.mood_checkins to authenticated;
grant usage on sequence public.mood_checkins_id_seq to authenticated;
create policy mood_own on public.mood_checkins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.app_settings to authenticated;
create policy settings_read on public.app_settings for select to authenticated using (true);

-- Functions the app may call.
grant execute on function
  public.complete_basics(text, date, text, text, text), public.set_stage(text),
  public.set_interests(smallint[]), public.set_pillar(text, boolean, text),
  public.finish_onboarding(boolean, boolean, boolean), public.accept_dating_policy(text),
  public.join_group(uuid), public.leave_group(uuid), public.feed(uuid, int, uuid), public.my_blocked(),
  public.friend_suggestions(int), public.send_friend_request(uuid, text),
  public.respond_friend_request(uuid, boolean), public.dating_suggestions(int),
  public.dating_respond(uuid, boolean), public.unmatch(uuid), public.my_conversations(),
  public.mark_read(uuid), public.block_user(uuid),
  public.admin_set_member_status(uuid, text, text), public.admin_moderate_post(uuid, text, text),
  public.admin_update_report(uuid, text, text), public.admin_review_group_member(uuid, uuid, boolean),
  public.is_staff(), public.is_blocked(uuid, uuid), public.is_approved_member(uuid),
  public.can_see_group(uuid), public.is_conversation_member(uuid), public.is_active_member()
to authenticated;

-- Live chat: send new messages to open chat screens.
alter publication supabase_realtime add table public.messages;

-- =====================================================================
-- Starter content
-- =====================================================================
insert into public.interests (name) values
  ('Reading'), ('Cooking'), ('Fitness'), ('Walking & treks'), ('Music'), ('Films'), ('Travel'),
  ('Yoga'), ('Board games'), ('Coffee'), ('Theatre'), ('Gardening'), ('Cycling'), ('Spirituality'),
  ('Parenting'), ('Volunteering'), ('Photography'), ('Art & craft'), ('Dance'), ('Career change');

insert into public.groups (slug, name, description, access, rules) values
  ('life-after-divorce', 'Life After Divorce', 'Rebuilding everyday life after divorce: homes, routines, money, and small wins.', 'open',
    array['Talk about experiences, not about your ex as a person.', 'No legal documents or case details.', 'No selling or promotions.']),
  ('separation-journey', 'Separation Journey', 'For anyone separated or thinking it through. Questions welcome, judgement isn''t.', 'open',
    array['Be kind.', 'No legal documents or case details.', 'No DMs without consent.']),
  ('women-of-unmute', 'Women of UNMUTE', 'A space for women only.', 'restricted',
    array['Women only.', 'What is shared here stays here.']),
  ('men-of-unmute', 'Men of UNMUTE', 'A space for men only.', 'restricted',
    array['Men only.', 'What is shared here stays here.']),
  ('single-parents-circle', 'Single Parents Circle', 'For parents raising children through and after separation. Kids'' names and photos are never posted here.', 'restricted',
    array['No children''s names, schools or photos.', 'No legal documents or case details in posts.', 'Talk about experiences, not about your ex as a person.', 'No selling, promotions or DMs without consent.']),
  ('starting-again-after-40', 'Starting Again After 40', 'New cities, new hobbies, new routines in your 40s and beyond.', 'open',
    array['Be kind.', 'No selling or promotions.']),
  ('friendship-circle', 'Friendship Circle', 'Find people for walks, coffee, books and weekend plans.', 'open',
    array['Meet in public places first.', 'No romance pressure here.']),
  ('dating-again', 'Dating Again', 'For members who have opted into dating. Experiences, not hookups.', 'restricted',
    array['Dating opted-in members only.', 'Never share another member''s details.']);

insert into public.conversations (kind, group_id)
  select 'group', id from public.groups;

insert into public.articles (slug, title, stage, minutes, body) values
  ('mutual-vs-contested', 'Mutual consent vs contested divorce: what''s the difference?', 'deciding', 6,
   '[Draft for the POC. The full article must be written and reviewed by a family-law advocate before launch.]' || chr(10) || chr(10) ||
   'There are broadly two routes. In a mutual consent divorce, both spouses agree to end the marriage and settle terms like maintenance and custody together. It is usually quicker and less stressful.' || chr(10) || chr(10) ||
   'In a contested divorce, one spouse files on specific legal grounds and the other may oppose it. It generally takes longer and needs more evidence.'),
  ('before-you-speak-to-a-lawyer', 'What to organise before you speak to a lawyer', 'deciding', 4,
   '[Draft for the POC, to be reviewed by an advocate.]' || chr(10) || chr(10) || 'Write down key dates, your questions, and what outcome matters most to you. Keep a calm, factual timeline.'),
  ('talking-to-children', 'Talking to children about separation', 'preparing', 5,
   '[Draft for the POC, to be reviewed by a counsellor.]' || chr(10) || chr(10) || 'Keep it simple, honest and age-appropriate. Reassure them it is not their fault, and keep routines steady.'),
  ('first-hearing', 'What happens at the first hearing', 'underway', 5,
   '[Draft for the POC, to be reviewed by an advocate.]'),
  ('co-parenting-agreements', 'Co-parenting agreements that work', 'after', 6,
   '[Draft for the POC, to be reviewed by a counsellor.]');

insert into public.professionals (name, kind, city, languages, areas, fee_text, bio, verified) values
  ('Adv. [Sample A]', 'advocate', 'Bengaluru', array['English', 'Kannada'], array['Mutual consent', 'Child custody'], '₹[fee] / 45 min', '[Sample listing for the POC]', true),
  ('Adv. [Sample B]', 'advocate', 'Online', array['Hindi', 'English'], array['Maintenance', 'Separation'], '₹[fee] / 45 min', '[Sample listing for the POC]', true),
  ('[Sample C], Counselling Psychologist', 'counsellor', 'Online', array['English', 'Hindi'], array['Grief', 'Rebuilding'], '₹[fee] / 50 min', '[Sample listing for the POC]', true);

insert into public.app_settings (key, value) values
  ('pillars', '{"community": true, "friendship": true, "dating": true, "care": true}'),
  ('policy_versions', '{"terms": "v1.0", "dating": "v1.0"}');
