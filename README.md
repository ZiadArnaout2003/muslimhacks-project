# Al-Noor International School Platform

An online international Islamic school platform — academic + Islamic education,
live classes, course management, teacher marketplace, financial assistance, and
admin/scholar oversight — built as **React (Vite + TypeScript) + Supabase**.

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS v4, react-router-dom, react-i18next (en/ar/fr, RTL for Arabic), recharts, date-fns-tz
- **Backend:** Supabase — Postgres (with Row Level Security as the real access-control layer), Supabase Auth, Supabase Storage (private buckets for CVs, financial-assistance documents, assignment submissions)

## 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) (or run `supabase start` locally with the Supabase CLI).

## 2. Apply the database schema

Run the SQL files in `supabase/migrations/` **in order** — either paste each into the
Supabase SQL Editor, or with the Supabase CLI. The CLI is installed as a local dev
dependency (`npm install` pulls it in), so run it via `npx` — no system-wide install
or `sudo apt install` needed:

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

- `0001_init_schema.sql` — all tables/enums for the full domain model (§36 of the spec: users, students, teachers, courses, classes, assignments, quizzes, payments, financial assistance, curriculum, messaging, etc.)
- `0002_rls_policies.sql` — Row Level Security policies enforcing: parents only ever see their own family; a teacher's CV/certificates are admin-only; students never see another student's grades; a teacher can't self-approve; quiz `correct_answer` never reaches a student directly (a `SECURITY DEFINER` RPC hands back safe columns and grades server-side); double-booking a teacher is blocked by a DB exclusion constraint.
- `0003_views.sql` — `SECURITY DEFINER` functions for public-safe reads (teacher search cards, teacher profile, admin dashboard stats) that never expose the locked-down `profiles` table directly.
- `0004_grants.sql` — baseline PostgREST role grants (RLS is still the real gate).
- `0005_storage.sql` — storage buckets + policies (`teacher-documents`, `financial-assistance-documents`, `assignment-submissions` are private; `avatars` is public).

All of this was tested against a throwaway local Postgres container while building it (not just eyeballed) — including simulating anonymous/authenticated/other-family sessions to confirm the RLS boundaries actually hold.

## 3. Auth settings (for the demo)

In your Supabase project → **Authentication → Providers → Email**, turn **off**
"Confirm email" for local/demo use. Several flows (parent registration → onboarding,
teacher application → status page) sign a user in immediately after sign-up so they
can proceed without leaving the app; with email confirmation on, they'll be told to
confirm by email first, which is the correct production behavior but adds a step.

## 4. Seed demo data

```bash
npx supabase db reset   # applies all migrations, then supabase/seed.sql
```

Note: `db reset` targets a *local* Supabase stack (`npx supabase start`, requires
Docker) — it resets your local shadow database, not the linked cloud project. To
seed a cloud project instead, run the migrations with `db push` as above, then run
`supabase/seed.sql` directly against it from the SQL Editor (or `psql` using the
connection string from Project Settings → Database).

This creates the full demo scenario from the spec (§42): parent **Ahmed**, his
daughter **Maryam** (age 15, has her own student login), three approved teachers
(Math, Physics, Islamic Studies), an admin, an Islamic scholar/reviewer, published
courses, a booked Physics class, an Islamic Studies enrollment with a quiz and
assignment, and a financial assistance case already at "partially approved" (50%)
with an invoice reflecting the discount.

**Every seeded account's password is `Demo1234!`.** Logins:

| Role | Email |
|---|---|
| Admin | admin@school.test |
| Scholar | scholar@school.test |
| Teacher (Math) | teacher.math@school.test |
| Teacher (Physics) | teacher.physics@school.test |
| Teacher (Islamic Studies) | teacher.islamic@school.test |
| Parent (Ahmed) | ahmed@school.test |
| Student (Maryam) | maryam@school.test |
| Pending teacher applicant | applicant@school.test |

## 5. Run the app

```bash
cp .env.example .env   # fill in VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from
                        # Project Settings → API
npm install
npm run dev
```

## What's fully wired up (Tier 1, per the spec's own MVP priority)

Auth + RBAC (parent/student/teacher/admin/scholar via Postgres RLS, not just UI
hiding) · parent registration → child onboarding → dashboard · teacher search/filter
+ public profile · teacher application → document upload → admin
approve/reject/request-info workflow · teacher availability + class booking with
DB-level double-booking prevention · course catalogue/details → enrollment →
checkout with financial-assistance discount applied automatically · Moodle-style
course learning page with progress tracking · assignment submission + teacher
grading · quizzes graded server-side · admin dashboard, teacher management, course
approval, financial assistance review (partial/full approval), schedule
management, CSV report export.

## What's scaffolded but intentionally lighter (Tier 2/3)

- **Messaging & notifications**: schema + RLS (including the safeguarding rule that
  student↔teacher threads require an active enrollment) are in place; the UI is a
  placeholder.
- **Islamic content review queue UI**: the scholar role, `islamic_content_reviews`
  table, and RLS exist and are seeded with one approved review; the review-queue
  page itself is a placeholder.
- **i18n**: full architecture (react-i18next + RTL flip for Arabic) is wired through
  the nav/footer/hero; deep dashboard copy is English-only — extending translation
  coverage is mechanical (add keys to `src/i18n/locales/*.json`).
- **Live video**: the `classes` table stores `provider`/`meeting_id`/`meeting_url`
  generically so Zoom, Jitsi, or another provider can be swapped in; there's no
  actual Zoom API integration (would need Zoom app credentials to create real
  meetings).
- **Payments**: checkout creates real `invoices`/`payments` rows and applies
  approved financial-assistance discounts automatically, but no card details are
  collected — a real deployment should integrate a provider (e.g. Stripe) at that
  step rather than the current "demo confirm" button.
- **Reports**: one enrollment chart + revenue total + CSV export; more report types
  are straightforward additions against existing tables.

## Security notes worth knowing

Three real bugs were caught and fixed while building this by actually testing RLS
against a local Postgres instance rather than just writing policies and trusting
them:

1. `is_admin()` was `SECURITY DEFINER`, so `current_user` inside it was always the
   function's *owner*, not the caller — meaning every request evaluated as admin.
   Fixed to use `session_user`, which is unaffected by `SECURITY DEFINER`/`SET ROLE`.
2. The `profiles` update policy allowed changing *any* column on your own row,
   including `role` — a parent could `UPDATE profiles SET role='admin'`. Fixed with
   a trigger that reverts `role` changes unless the actor is already an admin.
3. A second RLS policy meant to let enrolled students read quiz questions
   accidentally granted full-row access (RLS is row-level, not column-level), which
   leaked `correct_answer`. Fixed by removing student SELECT on the base table
   entirely and exposing a `SECURITY DEFINER` RPC that returns only safe columns,
   with grading done server-side via another RPC.
