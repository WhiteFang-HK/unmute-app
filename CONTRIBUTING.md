# How we build UNMUTE

The requirements live in the living doc **"UNMUTE — Product Requirements (BRD · PRD · FRD)"**:
https://claude.ai/artifact/1bHzD4UYSqBd4AjYNSSyoz

Every change follows the same build loop. No step is skipped, however small the change.

1. **Specify** — the user story (`US-Mxx-nn`) and its acceptance criteria exist in the doc (Part D) before code is written.
2. **Build** — on a branch named `feature/US-Mxx-nn-short-name` (or `fix/...`). Any database change is a new numbered file in `supabase/migrations/` (never edit an applied migration).
3. **Test** — `npx tsc --noEmit`, the database checks, then walk every acceptance criterion in the live app with throwaway test accounts, and delete them afterwards.
4. **Update** — open a pull request using the template; after merge, set the story's status in Part E of the doc and add a version-log line for any rule change.
5. **Review** — the founder checks it on the iPhone and accepts it or opens a follow-up story.

## Branches
- `main` — always runs. Only merged through pull requests.
- One branch and one pull request per story (or a small group of stories in the same sprint).

## Never commit
- `.env` files, Resend keys, Supabase service-role keys or any password. The Supabase publishable key in `src/lib/config.ts` is safe to share.

## Migrations applied to the live database
| File | What it does |
|---|---|
| 0001_unmute_schema.sql | Full schema, security rules, seed data |
| 0002_comment_privacy.sql | Anonymous authors stay anonymous in replies |
| 0003_safety.sql | Post review, appeals, visibility, export, self-delete |
