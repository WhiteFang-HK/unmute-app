-- =====================================================================
-- UNMUTE 0002: keep anonymous posters anonymous in replies.
-- Members can no longer read comments.author_id directly; the app reads
-- replies through post_comments(), which hides the name when the reply
-- is by the author of an anonymous post.
-- =====================================================================

revoke select on public.comments from authenticated;
grant select (id, post_id, body, created_at) on public.comments to authenticated;

create or replace function public.post_comments(p_post uuid)
returns table (id uuid, body text, created_at timestamptz, author_name text, is_mine boolean, is_op boolean)
language sql stable security definer set search_path = public as $$
  select c.id, c.body, c.created_at,
         case when p.is_anonymous and c.author_id = p.author_id then null else pr.display_name end,
         c.author_id = auth.uid(),
         c.author_id = p.author_id
  from comments c
  join posts p on p.id = c.post_id
  join profiles pr on pr.id = c.author_id
  where c.post_id = p_post
    and (p.review_state = 'published' or p.author_id = auth.uid() or public.is_staff())
    and public.can_see_group(p.group_id)
    and not public.is_blocked(auth.uid(), c.author_id)
    and pr.status <> 'suspended'
  order by c.created_at;
$$;

grant execute on function public.post_comments(uuid) to authenticated;
