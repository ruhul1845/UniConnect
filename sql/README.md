# Supabase setup

Run `role_based_access.sql` and then `notifications_setup.sql` in Supabase Dashboard → SQL Editor. The fixed admin email is currently `amin@du.ac.bd`; change the insert statement before running it if needed.

The React app uses only the anon key. Role authorization is enforced by RLS and the `admin_set_user_role` RPC.

## Email policy

- `@cs.du.ac.bd` is the primary domain. Signup and password changes require an email OTP.
- `@du.ac.bd` temporarily bypasses OTP for fake testing accounts and should be removed before production.
- In Authentication settings, disable the global **Confirm email** option. Conditional verification is enforced by the app and database RPC.
- In **Authentication → Email Templates → Magic Link**, include `{{ .Token }}` so Supabase sends a code.

To rename existing real `@du.ac.bd` accounts, run `migrate_du_accounts_to_cs.sql` once after `role_based_access.sql` and before creating temporary test users. Review the addresses first: converted users must have access to the matching CSE mailbox to verify and continue.
