-- UniConnect targeted notifications
-- Run after role_based_access.sql in Supabase Dashboard -> SQL Editor.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  table_name text not null,
  record_id text not null,
  action text not null default 'updated',
  title text,
  message text,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.notifications add column if not exists updated_by uuid references auth.users(id) on delete set null;
alter table public.notifications add column if not exists is_read boolean not null default false;

-- Remove duplicates created by older broadcast triggers before enforcing delivery-once.
delete from public.notifications n
using public.notifications duplicate
where n.user_id = duplicate.user_id
  and n.table_name = duplicate.table_name
  and n.record_id = duplicate.record_id
  and n.action = duplicate.action
  and (n.created_at < duplicate.created_at or (n.created_at = duplicate.created_at and n.id::text < duplicate.id::text));

create unique index if not exists notifications_delivery_once_idx
on public.notifications (user_id, table_name, record_id, action);
create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications" on public.notifications for delete to authenticated using (user_id = auth.uid());
drop policy if exists "Authenticated users can create notifications" on public.notifications;

-- Trigger-only delivery: routine page visits and ordinary edits do not create noise.
create or replace function public.create_relevant_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  row_data jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  old_data jsonb := case when tg_op = 'INSERT' then '{}'::jsonb else to_jsonb(old) end;
  actor uuid := auth.uid();
  record_key text := row_data->>'id';
  owner_id uuid;
  notice_action text;
  notice_title text;
  notice_message text;
  is_approved boolean;
  was_approved boolean;
begin
  if tg_table_name = 'sos_events' then
    owner_id := (row_data->>'user_id')::uuid;
    if tg_op = 'INSERT' then
      notice_action := 'sos_created';
      notice_title := 'SOS alert received';
      notice_message := 'Your SOS alert was received. Campus administrators can now see it.';
    elsif coalesce(old_data->>'status', '') is distinct from coalesce(row_data->>'status', '') then
      notice_action := 'sos_' || coalesce(row_data->>'status', 'updated');
      notice_title := case row_data->>'status' when 'active' then 'SOS alert is active' when 'resolved' then 'SOS alert resolved' when 'cancelled' then 'SOS alert cancelled' else 'SOS status updated' end;
      notice_message := 'The SOS alert status is now ' || coalesce(row_data->>'status', 'updated') || '.';
    else
      if tg_op = 'DELETE' then return old; else return new; end if;
    end if;

    insert into public.notifications (user_id, updated_by, table_name, record_id, action, title, message)
    select recipient, actor, tg_table_name, record_key, notice_action, notice_title,
      case when recipient = owner_id then notice_message else 'A student sent an SOS alert. Open the admin console for their contact and location.' end
    from (
      select owner_id recipient
      union
      select p.id from public.profiles p where lower(coalesce(p.role, 'student')) = 'admin' or coalesce(p.is_admin, false)
    ) recipients
    where recipient is not null
    on conflict (user_id, table_name, record_id, action) do nothing;

  elsif tg_table_name = 'resources' then
    is_approved := lower(coalesce(row_data->>'approved', 'false')) = 'true' or lower(coalesce(row_data->>'status', '')) = 'approved';
    was_approved := lower(coalesce(old_data->>'approved', 'false')) = 'true' or lower(coalesce(old_data->>'status', '')) = 'approved';
    if (tg_op = 'INSERT' and is_approved) or (tg_op = 'UPDATE' and is_approved and not was_approved) then
      insert into public.notifications (user_id, updated_by, table_name, record_id, action, title, message)
      select p.id, actor, tg_table_name, record_key, 'resource_approved', 'New academic resource',
        coalesce(row_data->>'title', row_data->>'file_name', 'A resource') || ' is now available.'
      from public.profiles p where p.id is distinct from actor
      on conflict (user_id, table_name, record_id, action) do nothing;
    end if;

  elsif tg_table_name in ('products', 'housing_listings') then
    owner_id := nullif(coalesce(row_data->>'seller_id', row_data->>'user_id'), '')::uuid;
    if owner_id is not null and owner_id is distinct from actor and (
      tg_op = 'DELETE' or coalesce(old_data->>'status', '') is distinct from coalesce(row_data->>'status', '')
    ) then
      notice_action := case when tg_op = 'DELETE' then 'removed' else 'status_' || coalesce(row_data->>'status', 'updated') end;
      notice_title := case when tg_table_name = 'products' then 'Marketplace listing updated' else 'Housing listing updated' end;
      insert into public.notifications (user_id, updated_by, table_name, record_id, action, title, message)
      values (owner_id, actor, tg_table_name, record_key, notice_action, notice_title,
        coalesce(row_data->>'title', 'Your listing') || case when tg_op = 'DELETE' then ' was removed.' else ' is now ' || coalesce(row_data->>'status', 'updated') || '.' end)
      on conflict (user_id, table_name, record_id, action) do nothing;
    end if;
  end if;

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists resources_update_notification on public.resources;
drop trigger if exists resources_platform_notification on public.resources;
drop trigger if exists resources_relevant_notification on public.resources;
create trigger resources_relevant_notification after insert or update on public.resources for each row execute function public.create_relevant_notification();

drop trigger if exists products_update_notification on public.products;
drop trigger if exists products_platform_notification on public.products;
drop trigger if exists products_relevant_notification on public.products;
create trigger products_relevant_notification after update or delete on public.products for each row execute function public.create_relevant_notification();

drop trigger if exists housing_update_notification on public.housing_listings;
drop trigger if exists housing_platform_notification on public.housing_listings;
drop trigger if exists housing_relevant_notification on public.housing_listings;
create trigger housing_relevant_notification after update or delete on public.housing_listings for each row execute function public.create_relevant_notification();

drop trigger if exists sos_platform_notification on public.sos_events;
drop trigger if exists sos_relevant_notification on public.sos_events;
create trigger sos_relevant_notification after insert or update on public.sos_events for each row execute function public.create_relevant_notification();

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications') then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
