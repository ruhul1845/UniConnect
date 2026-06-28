-- One-time migration for existing real accounts.
-- Run role_based_access.sql first and run this BEFORE creating temporary @du.ac.bd test users.
-- This changes login emails as well as public profile emails.

begin;

do $$
begin
  if exists (
    select 1
    from auth.users old_user
    join auth.users cse_user
      on lower(cse_user.email) = lower(regexp_replace(old_user.email, '@du\.ac\.bd$', '@cs.du.ac.bd'))
     and cse_user.id <> old_user.id
    where lower(old_user.email) like '%@du.ac.bd'
      and lower(old_user.email) not like '%@cs.du.ac.bd'
  ) then
    raise exception 'Migration stopped: one or more matching @cs.du.ac.bd accounts already exist';
  end if;
end $$;

update public.admin_emails
set email = regexp_replace(lower(email), '@du\.ac\.bd$', '@cs.du.ac.bd')
where lower(email) like '%@du.ac.bd'
  and lower(email) not like '%@cs.du.ac.bd';

update auth.users
set email = regexp_replace(lower(email), '@du\.ac\.bd$', '@cs.du.ac.bd'),
    updated_at = now()
where lower(email) like '%@du.ac.bd'
  and lower(email) not like '%@cs.du.ac.bd';

update auth.identities
set identity_data = jsonb_set(
      identity_data,
      '{email}',
      to_jsonb(regexp_replace(lower(identity_data->>'email'), '@du\.ac\.bd$', '@cs.du.ac.bd')),
      true
    ),
    updated_at = now()
where lower(coalesce(identity_data->>'email', '')) like '%@du.ac.bd'
  and lower(identity_data->>'email') not like '%@cs.du.ac.bd';

update public.profiles
set university_email = regexp_replace(lower(university_email), '@du\.ac\.bd$', '@cs.du.ac.bd'),
    email_verified = false,
    email_verified_at = null,
    updated_at = now()
where lower(university_email) like '%@du.ac.bd'
  and lower(university_email) not like '%@cs.du.ac.bd';

commit;
