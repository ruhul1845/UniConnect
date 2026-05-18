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

-- 3) Trigger function. One clean function for resources, products, housing_listings.
create or replace function public.create_update_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notify_user uuid;
  actor_user uuid;
  item_title text;
begin
  if TG_TABLE_NAME = 'resources' then
    notify_user := NEW.uploaded_by;
  elsif TG_TABLE_NAME = 'products' then
    notify_user := NEW.seller_id;
  elsif TG_TABLE_NAME = 'housing_listings' then
    notify_user := NEW.user_id;
  else
    return NEW;
  end if;

  actor_user := auth.uid();
  item_title := coalesce(NEW.title, 'Untitled');

  if notify_user is null then
    return NEW;
  end if;

  insert into public.notifications (
    user_id,
    updated_by,
    table_name,
    record_id,
    action,
    title,
    message
  )
  values (
    notify_user,
    actor_user,
    TG_TABLE_NAME,
    NEW.id::text,
    'updated',
    item_title,
    item_title || ' was updated'
  );

  return NEW;
end;
$$;

-- 4) Triggers.
drop trigger if exists resources_update_notification on public.resources;
create trigger resources_update_notification
after update on public.resources
for each row
execute function public.create_update_notification();

drop trigger if exists products_update_notification on public.products;
create trigger products_update_notification
after update on public.products
for each row
execute function public.create_update_notification();

drop trigger if exists housing_update_notification on public.housing_listings;
create trigger housing_update_notification
after update on public.housing_listings
for each row
execute function public.create_update_notification();

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
