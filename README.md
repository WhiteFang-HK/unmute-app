# UNMUTE (proof of concept)

A private app for adults 30+ going through separation or divorce: Community, Friendship, Dating and UNMUTE CARE.

- App: React Native + Expo (TypeScript), screens in `src/app/`
- Backend: Supabase (free plan) — database, sign-in by email code, live chat
- Database: `supabase/migrations/0001_unmute_schema.sql` (run once in the Supabase SQL Editor)

## Run it
1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and publishable key.
3. `npx expo start`, then scan the QR code with the Expo Go app.

## Make yourself a moderator
In Supabase > SQL Editor, after you've signed up in the app:
```sql
update public.profiles set role = 'admin' where display_name = 'YOUR_DISPLAY_NAME';
```
A "Moderation" link then appears in your Profile tab.

## What's in this version
Sign-in with email code · 30+ check (nothing saved if under 30) · onboarding (name, private stage, interests, pillars) ·
Community groups, posts (incl. anonymous), replies, reactions · friend suggestions and requests · dating (policy gate,
mutual matches only) · inbox with live chat · report and block · CARE guides and professionals with enquiries ·
in-app moderation for staff.

Not yet: Hindi screens, push notifications, photo uploads, account self-deletion, web admin dashboard.
