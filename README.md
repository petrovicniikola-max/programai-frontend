# ProgramAI Frontend (Jira-like UI)

Next.js App Router + TypeScript + Tailwind. Backend runs on `http://localhost:3000`; this app runs on port **3001** when using the command below.

## Getting Started

1. **Environment**

   Create or use `.env.local` with:

   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
   ```

2. **Run the dev server (port 3001)**

   ```bash
   npm run dev -- -p 3001
   ```

   Open [http://localhost:3001](http://localhost:3001). Root redirects to `/login` or `/dashboard` depending on auth.

3. **Login**

   Use backend credentials (e.g. `admin@demo.local` / `Admin123!` if seeded). Token is stored in `localStorage` (`access_token`).

## Features (Sprint 4 MVP)

- **Login** – POST `/auth/login`, token in localStorage
- **App layout** – Sidebar (Dashboard, Tickets, Clients, Forms, Tables; Settings + Logout at bottom), topbar with user (from GET `/auth/me`) and **Quick Call** button
- **Auth guard** – No token → redirect to `/login`
- **Tickets** – List (GET `/tickets`), status filter, link to ticket detail placeholder; **Quick Call** modal (POST `/tickets/quick-call`)
- **Settings** – Shell with section tiles; placeholder pages for Branding, Users, Tickets, Tags, Notifications, Export, Security, Audit
- **Forms / Tables** – Placeholder pages (pivot integration later)
"testtestdeployauto"
## Build

```bash
npm run build
```
