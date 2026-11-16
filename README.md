# UNMUTE (proof of concept)

A private app for adults 30+ going through separation or divorce: Community, Friendship, Dating and UNMUTE CARE.

- App: React Native + Expo (TypeScript), screens in `src/app/`
- Backend: Supabase (free plan, project "unmute", Mumbai) — database, sign-in, live chat
- Database: `supabase/migrations/0001_unmute_schema.sql` (run once in the Supabase SQL Editor)

## Run it
Double-click **START-UNMUTE** in this folder, then scan the QR code with the Expo Go app.
(Your Supabase connection is in `src/lib/config.ts`.)

## Sign-in in this test version
Email code (6 digits) sent through Resend (SMTP: smtp.resend.com, sender onboarding@resend.dev).
Without a verified domain in Resend, codes only reach the Resend account's own email address.
Other testers can tap "Use a password instead". To email anyone, verify a domain in Resend and
change the sender address in Supabase > Authentication > Emails > SMTP Settings.

## Make yourself a moderator
In Supabase > SQL Editor, after you've signed up in the app:
```sql
update public.profiles set role = 'admin' where display_name = 'YOUR_DISPLAY_NAME';
```
A "Moderation" link then appears in your Profile tab.

## What's in this version
Sign-in with email code (or password) · 30+ check (nothing saved if under 30) · onboarding (name, private stage, interests, pillars) ·
Community groups, posts (incl. anonymous), replies, reactions · friend suggestions and requests · dating (policy gate,
mutual matches only) · inbox with live chat · report and block · CARE guides and professionals with enquiries ·
in-app moderation for staff.

Not yet: Hindi screens, push notifications, photo uploads, account self-deletion, web admin dashboard.
