-- v3.4 P0: remove public owner-privileged RPC warnings without changing the
-- frontend RPC contract. Admin writes are authorized by column grants + RLS.
begin;

grant update(role) on table public.profiles to authenticated;
drop policy if exists "users update own display name" on public.profiles;
drop policy if exists "admins update managed roles" on public.profiles;
drop policy if exists "profile updates by owner or admin" on public.profiles;
create policy "profile updates by owner or admin"
  on public.profiles for update to authenticated
  using (id=(select auth.uid()) or (select private.can_manage_roles()))
  with check (id=(select auth.uid()) or (select private.can_manage_roles()));

create or replace function private.guard_profile_role_update()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.role is distinct from old.role and not private.can_manage_roles() then
    raise exception 'Admin authorization required for role changes';
  end if;
  return new;
end $$;
revoke all on function private.guard_profile_role_update() from public,anon,authenticated;
drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard before update of role on public.profiles
for each row execute function private.guard_profile_role_update();

grant insert(actor_id,subject_id,old_role,new_role)
  on table public.role_audit_events to authenticated;
drop policy if exists "admins write role audit" on public.role_audit_events;
create policy "admins write role audit"
  on public.role_audit_events for insert to authenticated
  with check (actor_id=(select auth.uid()) and (select private.can_manage_roles()));

grant update(status,reviewed_at,reviewed_by,review_note)
  on table public.author_requests to authenticated;
drop policy if exists "admins review author requests" on public.author_requests;
create policy "admins review author requests"
  on public.author_requests for update to authenticated
  using ((select private.can_manage_roles()))
  with check (
    (select private.can_manage_roles())
    and reviewed_by=(select auth.uid())
    and status in ('approved','rejected')
  );

create or replace function public.admin_set_author(target_user_id uuid,make_author boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid; old_value text; next_value text;
begin
  actor := (select auth.uid());
  if actor is null or not private.can_manage_roles() then raise exception 'Admin authorization required'; end if;
  if actor=target_user_id then raise exception 'Administrators cannot change their own role here'; end if;
  select role into old_value from public.profiles where id=target_user_id for update;
  if old_value is null then raise exception 'User profile not found'; end if;
  if old_value in ('admin','editor') then raise exception 'This operation only assigns or revokes Author'; end if;
  next_value := case when make_author then 'author' else 'learner' end;
  if old_value is distinct from next_value then
    update public.profiles set role=next_value where id=target_user_id;
    insert into public.role_audit_events(actor_id,subject_id,old_role,new_role)
    values(actor,target_user_id,old_value,next_value);
  end if;
  return jsonb_build_object('ok',true,'role',next_value,'message',case when make_author then 'نقش Author اعطا شد؛ رخداد ثبت شد.' else 'نقش Author لغو شد؛ رخداد ثبت شد.' end);
end $$;

create or replace function public.admin_review_author_request(request_id uuid,approve boolean,response text default '')
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid; request_row public.author_requests%rowtype; old_value text; next_status text;
begin
  actor := (select auth.uid());
  if actor is null or not private.can_manage_roles() then raise exception 'Admin authorization required'; end if;
  select * into request_row from public.author_requests where id=request_id for update;
  if request_row.id is null then raise exception 'Author request not found'; end if;
  if request_row.status <> 'pending' then raise exception 'Author request has already been reviewed'; end if;
  if approve then
    select role into old_value from public.profiles where id=request_row.user_id for update;
    if old_value is distinct from 'learner' then raise exception 'Applicant is no longer eligible for Author role'; end if;
    update public.profiles set role='author' where id=request_row.user_id;
    insert into public.role_audit_events(actor_id,subject_id,old_role,new_role)
    values(actor,request_row.user_id,old_value,'author');
    next_status := 'approved';
  else next_status := 'rejected'; end if;
  update public.author_requests
    set status=next_status,reviewed_at=now(),reviewed_by=actor,review_note=left(coalesce(response,''),1000)
    where id=request_id;
  return jsonb_build_object('ok',true,'status',next_status,'message',case when approve then 'درخواست تأیید شد و نقش Author ثبت شد.' else 'درخواست رد شد.' end);
end $$;

revoke all on function public.admin_set_author(uuid,boolean) from public,anon;
revoke all on function public.admin_review_author_request(uuid,boolean,text) from public,anon;
grant execute on function public.admin_set_author(uuid,boolean) to authenticated;
grant execute on function public.admin_review_author_request(uuid,boolean,text) to authenticated;

comment on function public.admin_set_author(uuid,boolean) is
  'SECURITY INVOKER admin RPC; column grants and RLS authorize role changes.';
comment on function public.admin_review_author_request(uuid,boolean,text) is
  'SECURITY INVOKER admin RPC; column grants and RLS authorize request review.';

commit;
