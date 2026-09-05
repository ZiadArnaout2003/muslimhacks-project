-- ============================================================================
-- Public-safe views
-- ============================================================================
-- The `profiles` table carries phone/email and is locked to self+admin by RLS.
-- Teacher search/discovery needs a name + avatar without exposing that, so we
-- expose a SECURITY DEFINER function instead of opening `profiles` itself —
-- it re-checks teachers.status = 'approved' internally, so a pending/rejected/
-- suspended teacher's identity never leaks through search.
-- ----------------------------------------------------------------------------
create or replace function public_teacher_cards()
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  country text,
  bio text,
  years_experience int,
  hourly_price numeric,
  currency text,
  gender text,
  languages text[],
  teaching_methodology text,
  rating_avg numeric,
  rating_count int
)
language sql stable security definer set search_path = public as $$
  select
    t.profile_id, p.first_name, p.last_name, p.avatar_url, p.country,
    t.bio, t.years_experience, t.hourly_price, t.currency, t.gender,
    t.languages, t.teaching_methodology, t.rating_avg, t.rating_count
  from teachers t
  join profiles p on p.id = t.profile_id
  where t.status = 'approved';
$$;

grant execute on function public_teacher_cards() to anon, authenticated;

-- Single-teacher public profile lookup (Page 9 — Teacher Profile).
create or replace function public_teacher_profile(p_teacher_id uuid)
returns table (
  id uuid,
  first_name text,
  last_name text,
  avatar_url text,
  country text,
  bio text,
  years_experience int,
  hourly_price numeric,
  currency text,
  gender text,
  languages text[],
  teaching_methodology text,
  video_intro_url text,
  rating_avg numeric,
  rating_count int
)
language sql stable security definer set search_path = public as $$
  select
    t.profile_id, p.first_name, p.last_name, p.avatar_url, p.country,
    t.bio, t.years_experience, t.hourly_price, t.currency, t.gender,
    t.languages, t.teaching_methodology, t.video_intro_url, t.rating_avg, t.rating_count
  from teachers t
  join profiles p on p.id = t.profile_id
  where t.status = 'approved' and t.profile_id = p_teacher_id;
$$;

grant execute on function public_teacher_profile(uuid) to anon, authenticated;

-- Admin-facing stats for Page 37 — Admin Dashboard.
create or replace function admin_dashboard_stats()
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  result json;
begin
  if not is_admin() then
    raise exception 'not authorized';
  end if;

  select json_build_object(
    'total_students', (select count(*) from students),
    'active_teachers', (select count(*) from teachers where status = 'approved'),
    'pending_applications', (select count(*) from teacher_applications where status in ('submitted','under_review')),
    'active_courses', (select count(*) from courses where status = 'published'),
    'upcoming_classes', (select count(*) from classes where start_datetime > now() and status = 'scheduled'),
    'revenue_total', (select coalesce(sum(final_amount),0) from invoices where status = 'paid'),
    'financial_assistance_cases', (select count(*) from financial_assistance_applications where status not in ('approved','rejected')),
    'total_enrollments', (select count(*) from enrollments)
  ) into result;

  return result;
end;
$$;

grant execute on function admin_dashboard_stats() to authenticated;
