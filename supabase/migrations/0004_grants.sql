-- ============================================================================
-- Privilege grants. RLS policies (0002) are the real access control layer;
-- these grants just let PostgREST's anon/authenticated roles reach the
-- tables/functions at all, per Supabase convention.
-- ============================================================================

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant select on tables to anon;

grant execute on all functions in schema public to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
