-- UniConnect role-based access and SOS schema
-- Run in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

alter table public.profiles add column if not exists university_email text;
alter table public.profiles add column if not exists role text not null default 'student';
alter table public.profiles add column if not exists is_cr boolean not null default false;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

update public.profiles p
set university_email = coalesce(p.university_email, lower(u.email)),
    role = case
      when p.is_admin then 'admin'
      when p.is_cr then 'cr'
      when lower(coalesce(p.role, 'student')) in ('admin', 'cr') then lower(p.role)
      else 'student'
    end
from auth.users u
where u.id = p.id;

create table if not exists public.admin_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);
alter table public.admin_emails enable row level security;
revoke all on public.admin_emails from anon, authenticated;

insert into public.admin_emails(email) values ('amin@du.ac.bd') on conflict do nothing;

create or replace function public.sync_profile_role_flags()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and lower(coalesce(new.role, 'student')) is distinct from lower(coalesce(old.role, 'student'))
     and auth.uid() is not null
     and not exists (select 1 from public.profiles p where p.id = auth.uid() and lower(p.role) = 'admin') then
    raise exception 'Only an admin can change user roles';
  end if;
  new.role := lower(coalesce(new.role, 'student'));
  if new.role not in ('student', 'cr', 'admin') then new.role := 'student'; end if;
  new.is_admin := new.role = 'admin';
  new.is_cr := new.role in ('cr', 'admin');
  new.university_email := lower(new.university_email);
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists sync_profile_role_flags_trigger on public.profiles;
create trigger sync_profile_role_flags_trigger before insert or update on public.profiles
for each row execute function public.sync_profile_role_flags();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare initial_role text;
begin
  initial_role := case when exists (select 1 from public.admin_emails where email = lower(new.email)) then 'admin' else 'student' end;
  insert into public.profiles (id, university_email, full_name, role)
  values (new.id, lower(new.email), coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), initial_role)
  on conflict (id) do update set
    university_email = excluded.university_email,
    full_name = coalesce(public.profiles.full_name, excluded.full_name),
    role = case when excluded.role = 'admin' then 'admin' else public.profiles.role end;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert or update of email on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = check_user and role = 'admin');
$$;

create or replace function public.is_cr_or_admin(check_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = check_user and role in ('cr', 'admin'));
$$;

revoke all on function public.is_admin(uuid) from public;
revoke all on function public.is_cr_or_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_cr_or_admin(uuid) to authenticated;

create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin(auth.uid()) then raise exception 'Admin access required'; end if;
  if lower(new_role) not in ('student', 'cr', 'admin') then raise exception 'Invalid role'; end if;
  if target_user_id = auth.uid() and lower(new_role) <> 'admin' then raise exception 'An admin cannot remove their own admin role'; end if;
  update public.profiles set role = lower(new_role) where id = target_user_id;
  if not found then raise exception 'User profile not found'; end if;
end;
$$;
revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

update public.profiles p set role = 'admin'
where exists (select 1 from public.admin_emails a where a.email = lower(p.university_email));

create table if not exists public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'resolved')),
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  created_at timestamptz not null default now(),
  activated_at timestamptz,
  resolved_at timestamptz
);
alter table public.sos_events add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.sos_events add column if not exists status text not null default 'pending';
alter table public.sos_events add column if not exists latitude double precision;
alter table public.sos_events add column if not exists longitude double precision;
alter table public.sos_events add column if not exists accuracy double precision;
alter table public.sos_events add column if not exists created_at timestamptz not null default now();
alter table public.sos_events add column if not exists activated_at timestamptz;
alter table public.sos_events add column if not exists resolved_at timestamptz;
create index if not exists sos_events_user_created_idx on public.sos_events(user_id, created_at desc);
create index if not exists sos_events_active_idx on public.sos_events(status) where status in ('pending', 'active');

alter table public.profiles enable row level security;
alter table public.resources enable row level security;
alter table public.products enable row level security;
alter table public.housing_listings enable row level security;
alter table public.sos_events enable row level security;

drop policy if exists "profiles_authenticated_read" on public.profiles;
create policy "profiles_authenticated_read" on public.profiles for select to authenticated using (true);
drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles for insert to authenticated with check (id = auth.uid() and role = 'student');
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "resources_authenticated_read" on public.resources;
create policy "resources_authenticated_read" on public.resources for select to authenticated using (true);
drop policy if exists "resources_cr_insert" on public.resources;
create policy "resources_cr_insert" on public.resources for insert to authenticated with check (uploaded_by = auth.uid() and public.is_cr_or_admin());
drop policy if exists "resources_owner_admin_update" on public.resources;
create policy "resources_owner_admin_update" on public.resources for update to authenticated using (uploaded_by = auth.uid() or public.is_admin()) with check (uploaded_by = auth.uid() or public.is_admin());
drop policy if exists "resources_owner_admin_delete" on public.resources;
create policy "resources_owner_admin_delete" on public.resources for delete to authenticated using (uploaded_by = auth.uid() or public.is_admin());

drop policy if exists "products_authenticated_read" on public.products;
create policy "products_authenticated_read" on public.products for select to authenticated using (true);
drop policy if exists "products_owner_insert" on public.products;
create policy "products_owner_insert" on public.products for insert to authenticated with check (seller_id = auth.uid());
drop policy if exists "products_owner_admin_update" on public.products;
create policy "products_owner_admin_update" on public.products for update to authenticated using (seller_id = auth.uid() or public.is_admin()) with check (seller_id = auth.uid() or public.is_admin());
drop policy if exists "products_owner_admin_delete" on public.products;
create policy "products_owner_admin_delete" on public.products for delete to authenticated using (seller_id = auth.uid() or public.is_admin());

drop policy if exists "housing_authenticated_read" on public.housing_listings;
create policy "housing_authenticated_read" on public.housing_listings for select to authenticated using (true);
drop policy if exists "housing_owner_insert" on public.housing_listings;
create policy "housing_owner_insert" on public.housing_listings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "housing_owner_admin_update" on public.housing_listings;
create policy "housing_owner_admin_update" on public.housing_listings for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());
drop policy if exists "housing_owner_admin_delete" on public.housing_listings;
create policy "housing_owner_admin_delete" on public.housing_listings for delete to authenticated using (user_id = auth.uid() or public.is_admin());

drop policy if exists "sos_own_admin_read" on public.sos_events;
create policy "sos_own_admin_read" on public.sos_events for select to authenticated using (user_id = auth.uid() or public.is_admin());
drop policy if exists "sos_own_insert" on public.sos_events;
create policy "sos_own_insert" on public.sos_events for insert to authenticated with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "sos_own_admin_update" on public.sos_events;
create policy "sos_own_admin_update" on public.sos_events for update to authenticated using (user_id = auth.uid() or public.is_admin()) with check (user_id = auth.uid() or public.is_admin());

-- Review and remove any older broad policies; permissive policies combine using OR.
