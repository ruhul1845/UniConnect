# UniConnect – CSE Departmental Hub

UniConnect is a React-based university web application designed for the Computer Science & Engineering department. It aims to bring academic resources, student marketplace, housing/to-let support, chat, safety tools, and admin management into one unified digital platform.

This project is currently under active development. Some modules are completed for UI demonstration, while some functional database-based features are still being implemented.

---



---

## How to Clone and Run the Project

### 1. Clone the Repository

```bash
git clone https://github.com/ruhul1845/UniConnect.git
```

### 2. Enter the Project Folder



### 3. Install Dependencies

```bash
npm install
```

### 4. Create Environment File

Create a `.env` file in the project root folder.

```env
REACT_APP_SUPABASE_URL=your_supabase_project_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Example:

```env
REACT_APP_SUPABASE_URL=https://your-project.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Start the Development Server

```bash
npm start
```

The app will run at:

```bash
http://localhost:3000
```

If port `3000` is busy, React may run on another port such as:

```bash
http://localhost:3001
http://localhost:3002
```

---

## Available Routes

| Route | Description |
|---|---|
| `/login` | Login page |
| `/signup` | Signup page |
| `/` | Homepage |
| `/resources` | Academic resources page |
| `/marketplace` | Student marketplace |
| `/sell` | Sell item page |
| `/my-listings` | User listed items |
| `/product/:id` | Product details page |
| `/conversations` | Chat conversation list |
| `/chat/:conversationId` | Chat page |
| `/housing` | Housing & To-Let page |
| `/safety` | Safety / SOS page |
| `/admin` | Admin panel |

---

## Current Features

### 1. Authentication

The project includes login and signup pages connected with Supabase authentication.

Current auth features:

- User signup
- User login
- Session-based routing
- Protected pages after login
- Logout from profile dropdown

---

### 2. Homepage

The homepage is designed as a modern university-style landing page.

It includes:

- Hero section
- Feature cards
- Quick access sections
- Dummy statistics
- Dummy notices/events
- Blue, golden, and white university theme

Some homepage features are currently dummy/demo content for explaining the UI structure. These will be connected to real database records after the full backend/database work is completed.

---

### 3. Navbar and Footer

The app has a shared navbar and footer layout.

Navbar includes:

- Home
- Resources
- Marketplace
- Housing & To-Let
- Safety
- Chat
- Notification icon
- Profile icon
- Logout option inside profile dropdown

The navbar and footer are reused across the main protected routes.

---

### 4. Marketplace

The marketplace module is designed for students to buy and sell department-related items.

Current features:

- Marketplace listing UI
- Product card UI
- Product details UI
- Sell item page
- My listings page
- Chat button structure
- Blue/golden/white design theme

Marketplace is intended for items such as:

- Books
- Hardware
- Devices
- Academic materials
- Software-related items

---

### 5. Chat System

The chat system is designed for communication between buyer and seller.

Current features:

- Conversation list UI
- Chat page UI
- Supabase realtime structure
- Message display and sending logic

This module is connected with Supabase tables, but final behavior depends on correct database table structure and policies.

---

### 6. Academic Resources

The resources page is designed for academic materials such as:

- Lecture slides
- Books
- Mid-term question papers
- Final question papers
- Lab sheets
- Project resources

Current status:

- Resource UI is designed
- Resource filters are designed
- Upload section UI is available for assigned CR/Admin users
- Resource upload section is not fully connected to the database yet
- Preview/download will work only after the database and storage connection are fully completed

The final system will allow CR users to upload resources after Admin assigns them as CR.

---

### 7. Admin Panel

The admin panel can be accessed manually using:

```bash
http://localhost:3000/admin
```

or if React runs on another port:

```bash
http://localhost:3002/admin
```

Current admin features:

- Admin dashboard UI
- CR assignment UI
- Resource management UI
- Analytics UI structure

Important note:

Currently, Admin access is available by typing `/admin` directly in the browser. Later, Admin access will be restricted so that only verified admin users can access it after login. There will be no public signup for Admin accounts.

---

### 8. CR Role Management

The project includes a CR assignment concept.

Current idea:

- Admin assigns a CR using university email
- CR information is stored in a `cr` table
- Resources page checks whether the logged-in user is assigned as CR
- If the user is CR, upload option becomes visible

Expected CR table structure:

```sql
id
name
university_email
batch
created_at
```

Expected profile matching:

```text
profiles.university_email === cr.university_email
```

This feature is still under development and depends on proper Supabase database setup.

---

### 9. Housing & To-Let Finder

The Housing & To-Let page is designed for students to find:

- Flats
- Sublets
- Shared rooms
- Roommates
- CSE-only housing options

Current status:

- UI is designed
- Listing cards are added
- Filter UI is added
- Map preview UI is added

Not completed yet:

- Buttons are not fully functional
- Housing posting is not connected to database
- Map/geolocation functionality is not fully implemented
- Roommate matching is not fully implemented

This module is under development.

---

### 10. Safety / SOS System

The Safety page is designed for emergency support.

Planned features:

- SOS panic button
- Emergency contact list
- Safety alert UI
- Recent alert display
- Location-based emergency broadcast

Current status:

- UI is designed
- SOS button is shown for demonstration

Not completed yet:

- SOS button is not fully functional
- Real-time emergency broadcast is not implemented
- Location/GPS integration is not completed
- Emergency alert database logic is under development

This module is under development.

---

## Database Notes

This project uses Supabase for:

- Authentication
- Profiles
- Marketplace
- Chat
- Resources
- CR role management
- Future SOS and housing modules

Required environment variables:

```env
REACT_APP_SUPABASE_URL=
REACT_APP_SUPABASE_ANON_KEY=
```

Some features require correct Supabase tables and Row Level Security policies.

Important tables may include:

- `profiles`
- `products`
- `product_images`
- `conversations`
- `messages`
- `resources`
- `cr`
- `housing_posts`
- `sos_events`

Some of these tables may still need to be created or adjusted during development.

---

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm install -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Add Environment Variables in Vercel

```bash
vercel env add REACT_APP_SUPABASE_URL production
vercel env add REACT_APP_SUPABASE_ANON_KEY production
```

When Vercel asks for values, paste the Supabase URL and Supabase anon key.

### 4. Create `vercel.json`

Create a file named `vercel.json` in the root folder:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This is required so React Router routes like `/admin`, `/resources`, and `/marketplace` work correctly after deployment.

### 5. Deploy

```bash
vercel
```

For production deployment:

```bash
vercel --prod
```

---

## Tech Stack

- React.js
- React Router
- Tailwind CSS
- Supabase
- Supabase Auth
- Supabase Realtime
- Vercel Deployment

---

## Development Status

This project is not fully completed yet.

Completed or partially completed:

- UI design
- Authentication structure
- Shared navbar/footer
- Marketplace UI
- Chat UI
- Resources UI
- Admin UI
- Housing UI
- Safety UI

Under development:

- Full resource database upload/download
- Final CR role management
- Housing database integration
- SOS emergency functionality
- Admin-only protected access
- Notification system with complete database logic
- Full production-level Supabase RLS policies

---

## Notes for Developers

Before pushing to GitHub, make sure `.env` is not committed.

`.gitignore` should include:

```gitignore
node_modules
build
.env
.vercel
```

To push updates:

```bash
git add .
git commit -m "Update UniConnect"
git push origin main
```

To run locally:

```bash
npm install
npm start
```

---

## Project Summary

UniConnect is a departmental platform for CSE students. It is designed to reduce scattered communication by combining resources, marketplace, housing, safety, and student communication tools in one system.

The current version focuses mainly on UI design and basic structure. Full database functionality will be completed step by step.