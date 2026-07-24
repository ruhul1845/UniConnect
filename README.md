# UniConnect — CSE Departmental Hub

UniConnect is a React and Supabase web application that brings departmental
resources, a student marketplace, housing listings, chat, safety tools, user
dashboards, and role-based administration into one portal.

> The project is under active development. The UI and main application flows
> are implemented, but a new Supabase project still needs the application
> tables, storage buckets, and policies described below.

## Features

- University-email signup, login, verification, and protected routes
- Student and admin dashboards with profile and activity information
- Filterable academic resources with CR/admin uploads
- Marketplace listings, saved items, offers, and buyer/seller chat
- Housing search, posting, editing, and location maps
- Hold-to-activate SOS alerts with a five-second cancellation window
- Realtime notifications and role-based admin management
- Responsive blue, gold, and white university design

## Tech Stack

- React 19 and Create React App
- React Router
- Tailwind CSS
- Supabase Auth, Database, Storage, and Realtime
- React Leaflet and Leaflet
- Jest and React Testing Library
- Docker and nginx

## Prerequisites

For local development:

- Node.js 20 or later
- npm
- A Supabase project

For the container workflow, install Docker with Docker Compose instead of
installing Node.js locally.

## Local Setup

1. Clone the repository and enter it:

   ```bash
   git clone https://github.com/ruhul1845/UniConnect.git
   cd UniConnect
   ```

2. Install the locked dependencies:

   ```bash
   npm ci
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

4. Add the URL and anon key from **Supabase Dashboard → Project Settings →
   API** to `.env`.

5. Complete the [Supabase setup](#supabase-setup).

6. Start the development server:

   ```bash
   npm start
   ```

Open [http://localhost:3000](http://localhost:3000). Create React App may offer
another port if `3000` is already in use.

## Environment Variables

Create `.env` in the repository root. Do not commit this file.

| Variable | Required | Purpose |
|---|---:|---|
| `REACT_APP_SUPABASE_URL` | Yes | Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Yes | Public Supabase anon key; never use the service-role key in the browser |
| `REACT_APP_CAMPUS_SECURITY_PHONE` | No | Campus Security telephone link; defaults to `999` |
| `REACT_APP_MEDICAL_PHONE` | No | Medical Help telephone link; defaults to `999` |
| `REACT_APP_PROCTOR_PHONE` | No | Proctorial Body telephone link; defaults to `999` |

Example:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_CAMPUS_SECURITY_PHONE=999
REACT_APP_MEDICAL_PHONE=999
REACT_APP_PROCTOR_PHONE=999
```

All `REACT_APP_*` values are embedded in the browser bundle at build time.
Restart the development server or rebuild the image after changing them.

## Supabase Setup

1. Create the application's base tables in Supabase. The current frontend uses:
   `profiles`, `resources`, `categories`, `products`, `product_images`,
   `saved_items`, `offers`, `conversations`, `messages`, `cr`,
   `housing_listings`, `notifications`, and `sos_events`.
2. Create public storage buckets named `avatars`, `resources`, `housing-image`,
   and `product-images`. The marketplace uploader also checks the legacy
   `products` and `marketplace-images` bucket names.
3. In **Supabase Dashboard → SQL Editor**, run
   [`sql/role_based_access.sql`](sql/role_based_access.sql).
4. Run [`sql/notifications_setup.sql`](sql/notifications_setup.sql).
5. Before running the role script, replace its seeded `amin@du.ac.bd` address
   if a different account should be the initial admin.
6. In Supabase Authentication settings, disable the global **Confirm email**
   option. The application and database RPC enforce conditional verification.
7. In **Authentication → Email Templates → Magic Link**, include
   `{{ .Token }}` so the verification email contains an OTP.

The `@cs.du.ac.bd` domain is the primary account domain and requires email
verification. The temporary `@du.ac.bd` testing exception should be removed
before production. For an existing project that needs its real accounts
renamed, review and run
[`sql/migrate_du_accounts_to_cs.sql`](sql/migrate_du_accounts_to_cs.sql) after
the role script and before creating temporary test users.

More database notes are available in [`sql/README.md`](sql/README.md).

> A complete baseline schema for every application table is not currently
> committed. The included role and notification scripts configure and extend
> existing tables; they do not create the entire application database from an
> empty Supabase project.

## Run, Test, and Build Commands

| Command | Description |
|---|---|
| `npm start` | Start the development server |
| `npm test` | Run Jest in interactive watch mode |
| `CI=true npm test -- --runInBand` | Run the complete test suite once |
| `npm run build` | Create an optimized production build in `build/` |

The verified non-interactive test command currently runs 3 suites and 7 tests.

## Docker

Docker Compose builds the React bundle and serves it with nginx:

```bash
cp .env.example .env
# Fill in the required Supabase values in .env
docker compose up --build
```

Open [http://localhost:3004](http://localhost:3004).

Stop the container with:

```bash
docker compose down
```

The Compose setup passes the Supabase values as image build arguments because
Create React App embeds them during compilation.

## Application Routes

| Route | Access | Description |
|---|---|---|
| `/` | Public | Homepage |
| `/login` | Public only | Student login |
| `/signup` | Public only | Student registration |
| `/verify-email` | Signed in | Email verification |
| `/dashboard` | Verified user | User dashboard and profile |
| `/resources` | Verified user | Academic resources |
| `/marketplace` | Verified user | Student marketplace |
| `/sell` | Verified user | Create a marketplace listing |
| `/my-listings` | Verified user | Current user's marketplace listings |
| `/product/:id` | Verified user | Marketplace item details |
| `/saved-items` | Verified user | Saved marketplace items |
| `/offers/:productId` | Verified user | Seller offers for an item |
| `/conversations` | Verified user | Conversation list |
| `/chat/:conversationId` | Verified user | Buyer/seller chat |
| `/housing` | Verified user | Housing and to-let finder |
| `/housing/post` | Verified user | Create a housing listing |
| `/housing/my-listings` | Verified user | Current user's housing listings |
| `/housing/edit/:id` | Verified user | Edit a housing listing |
| `/housing/:id` | Verified user | Housing listing details |
| `/safety` | Verified user | SOS and emergency contacts |
| `/admin` | Admin only | Role-protected admin console |

## Screenshots

The supplied captures cover these screens:

1. Admin dashboard
2. Homepage
3. Academic resources
4. Student marketplace
5. Housing and to-let finder
6. Safety and emergency support

The image binaries must be committed under `docs/screenshots/` before they can
be embedded here. Use these filenames so the final Markdown remains stable:

```text
docs/screenshots/admin-dashboard.png
docs/screenshots/homepage.png
docs/screenshots/resources.png
docs/screenshots/marketplace.png
docs/screenshots/housing.png
docs/screenshots/safety.png
```

## Project Structure

```text
UniConnect/
├── public/                 Static assets
├── sql/                    Supabase role, notification, and migration SQL
├── src/
│   ├── auth/               Email and role policies
│   ├── components/         Shared UI and feature components
│   ├── hook/               Notification hooks
│   ├── pages/              Dashboard, resources, safety, and housing pages
│   └── services/           Notification services
├── .env.example            Environment variable template
├── docker-compose.yml      Container configuration
├── Dockerfile              Production image build
└── package.json            Dependencies and npm scripts
```

## Security Notes

- `.env` is ignored by Git and must stay uncommitted.
- Only the public Supabase anon key belongs in the frontend.
- Authorization must be enforced with Supabase Row Level Security, not only
  with React route checks.
- Replace temporary email-domain exceptions and seeded admin details before a
  production deployment.
