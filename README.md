# Robustfix

[![E2E tests](https://github.com/surfgtho-tech/fixflow/actions/workflows/tests.yml/badge.svg)](https://github.com/surfgtho-tech/fixflow/actions/workflows/tests.yml)

**Maintenance job management for property teams** – a mobile-first Progressive Web App that replaces a paid field-service subscription.

The office creates repair jobs reported by tenants (photos, address, description, contact details). The maintenance team gets them on their phones, navigates to the property, updates the status, uploads photos, requests parts, and closes the job – or keeps it open with the reason.

> **Live demo:** https://surfgtho-tech.github.io/fixflow/?demo – pick a demo user, no sign-up needed (demo data is stored only in your browser).

## Features

**Manager (admin)**
- Create / edit / delete jobs with photos, address/Eircode, tenant, client, date, time window and assignee
- See every job, filter by team member, search
- Parts & materials board: *Requested → Ordered → Received*
- Team management (roles)

**Team (staff)**
- Job list with *Overdue / Today / Upcoming / Done* tabs – the whole team sees all jobs so they can help each other
- One-tap directions in **Google Maps, Apple Maps or Waze**
- Call, SMS, WhatsApp or email the tenant
- **On my way → Start → Finish** workflow; "On my way" offers a ready-made message to the tenant
- **Finish**: *Resolved* (photo required) or *Not resolved* (keeps the job open with reason, photos and parts needed)
- Notes and photos at any time; full activity timeline per job

**Platform**
- Installable on Android, iPhone and desktop (PWA), automatic light/dark theme
- Photos compressed on the device before upload
- Live updates across devices (Supabase Realtime)
- Row Level Security: staff can only change a job's status; job details are manager-only (enforced in the database)

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Vanilla JavaScript (ES modules), HTML, CSS | No build step, runs anywhere, easy to maintain |
| Backend | [Supabase](https://supabase.com) – Postgres, Auth, Storage, Realtime | Free tier covers a small team; data hosted in the EU |
| Hosting | GitHub Pages / Netlify | Static hosting, free |

Running cost for a small team: **€0/month**.

## Project structure

```
index.html            single page shell
css/styles.css        design system (light/dark)
js/app.js             screens & routing
js/store.js           data layer – same API for demo (localStorage) and live (Supabase)
js/ui.js              icons, dates, map/phone links, image compression, sheets
js/config.js          Supabase URL + anon key (empty = demo mode)
supabase/schema.sql   tables, RLS policies, triggers, storage bucket, realtime
sw.js                 offline app shell
```

## Run locally

```bash
python serve.py        # http://localhost:5173
```

## Automated tests

End-to-end tests with [Playwright](https://playwright.dev) drive the app in real browsers on **Android (Pixel 7), iPhone 14 and desktop Chrome**. They run on every push via GitHub Actions and use demo mode, so they never touch real company data.

Covered: demo/live login, team-wide job list and filters, tabs, search, map directions, tenant call/SMS/WhatsApp links, *On my way → Start → Finish*, resolved vs kept-open with parts, notes with photos, photo viewer, manager-only actions (create / edit / delete / reopen), parts board, team, PWA files, no horizontal scroll, no JS errors and HTML escaping.

```bash
npm install
npx playwright install chromium webkit
npm test              # starts the local server automatically
npm run test:report   # open the HTML report
```

## Connect a real backend

1. Create a Supabase project (region: West EU / Ireland).
2. Run `supabase/schema.sql` in the SQL Editor.
3. Add users in *Authentication → Users*, then promote the manager:
   ```sql
   update public.profiles set role = 'admin' where email = 'manager@company.com';
   ```
4. Put the project URL and **anon** key in `js/config.js` (the anon key is public by design – access is controlled by RLS).

## Roadmap

- Push notifications for newly assigned jobs
- Tenant signature on completion
- PDF job report for landlords
- Weekly schedule view per team member
