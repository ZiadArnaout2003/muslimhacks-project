-- Courses are created centrally before teachers are assigned through
-- course_teachers. Some imported databases still have a required legacy
-- single-teacher column, while fresh installs do not have that column at all.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'courses'
      and column_name = 'teacher_id'
  ) then
    alter table courses alter column teacher_id drop not null;
  end if;
end;
$$;