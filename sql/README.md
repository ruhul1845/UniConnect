# Supabase setup

Run `role_based_access.sql` in Supabase Dashboard → SQL Editor. The fixed admin email is currently `amin@du.ac.bd`; change the insert statement before running it if needed.

The React app uses only the anon key. Role authorization is enforced by RLS and the `admin_set_user_role` RPC.
