-- Follow-up for projects that already applied v34_admin_rpc_invoker.
-- Merge permissive profile UPDATE policies and block direct self-promotion.
begin;

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

commit;
