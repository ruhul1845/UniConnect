-- UniConnect notifications setup
-- Run this in Supabase SQL Editor.

-- 1) Table shape. Safe if the table already exists.
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

create index if not exists notifications_user_created_idx
on public.notifications (user_id, created_at desc);

create index if not exists notifications_table_record_idx
on public.notifications (table_name, record_id);

-- 2) RLS policies.
alter table public.notifications enable row level security;

drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications"
on public.notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications"
on public.notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own notifications" on public.notifications;
create policy "Users can delete own notifications"
on public.notifications
for delete
to authenticated
using (user_id = auth.uid());

-- This is helpful for manual/app inserts. Trigger inserts work through the function.
drop policy if exists "Authenticated users can create notifications" on public.notifications;
create policy "Authenticated users can create notifications"
on public.notifications
for insert
to authenticated
with check (user_id = auth.uid() or updated_by = auth.uid());

-- 3) Broadcast public platform events to every user.
-- Events performed by an admin are intentionally not broadcast.
drop function if exists public.create_update_notification();
create or replace function public.broadcast_platform_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user uuid;
  row_data jsonb;
  target_id text;
  item_title text;
  event_action text;
  event_message text;
begin
  if TG_OP = 'DELETE' then
    row_data := to_jsonb(OLD);
    target_id := OLD.id::text;
  else
    row_data := to_jsonb(NEW);
    target_id := NEW.id::text;
  end if;

  actor_user := auth.uid();

  if actor_user is not null and exists (
    select 1
    from public.profiles actor
    where actor.id = actor_user
      and (lower(coalesce(actor.role, 'student')) = 'admin' or coalesce(actor.is_admin, false))
  ) then
    if TG_OP = 'DELETE' then return OLD; end if;
    return NEW;
  end if;

  event_action := case TG_OP when 'INSERT' then 'created' when 'UPDATE' then 'updated' else 'deleted' end;
  item_title := coalesce(
    row_data->>'title',
    row_data->>'file_name',
    case when TG_TABLE_NAME = 'sos_events' then 'Safety alert' else 'Untitled' end
  );
  event_message := case TG_TABLE_NAME
    when 'resources' then 'Resource "' || item_title || '" was ' || event_action || '.'
    when 'products' then 'Marketplace item "' || item_title || '" was ' || event_action || '.'
    when 'housing_listings' then 'Housing listing "' || item_title || '" was ' || event_action || '.'
    when 'sos_events' then 'A campus safety alert was ' || event_action || '.'
    else 'A platform item was ' || event_action || '.'
  end;

  insert into public.notifications (
    user_id,
    updated_by,
    table_name,
    record_id,
    action,
    title,
    message
  )
  select
    p.id,
    actor_user,
    TG_TABLE_NAME,
    target_id,
    event_action,
    item_title,
    event_message
  from public.profiles p
  where p.id is not null;

  if TG_OP = 'DELETE' then return OLD; end if;
  return NEW;
end;
$$;

-- 4) Triggers.
drop trigger if exists resources_update_notification on public.resources;
drop trigger if exists resources_platform_notification on public.resources;
create trigger resources_platform_notification
after insert or update or delete on public.resources
for each row
execute function public.broadcast_platform_notification();

drop trigger if exists products_update_notification on public.products;
drop trigger if exists products_platform_notification on public.products;
create trigger products_platform_notification
after insert or update or delete on public.products
for each row
execute function public.broadcast_platform_notification();

drop trigger if exists housing_update_notification on public.housing_listings;
drop trigger if exists housing_platform_notification on public.housing_listings;
create trigger housing_platform_notification
after insert or update or delete on public.housing_listings
for each row
execute function public.broadcast_platform_notification();

drop trigger if exists sos_platform_notification on public.sos_events;
create trigger sos_platform_notification
after insert or update or delete on public.sos_events
for each row
execute function public.broadcast_platform_notification();

-- 5) Enable realtime for the notifications table if it is not already enabled.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
