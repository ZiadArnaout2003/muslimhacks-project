-- Secure parent-issued invitations for optional student login accounts.

create table student_login_invites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references students(id) on delete cascade,
  parent_id uuid not null references parents(profile_id) on delete cascade,
  code_hash bytea not null unique,
  expires_at timestamptz not null,
  claimed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table student_login_invites enable row level security;

create policy student_login_invites_parent_select on student_login_invites for select
  using (parent_id = auth.uid() or is_admin());

create or replace function create_student_login_invite(p_student_id uuid)
returns text
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_parent_id uuid;
  v_code text := encode(gen_random_bytes(12), 'hex');
begin
  select parent_id into v_parent_id from students where id = p_student_id;
  if v_parent_id is null then
    raise exception 'student not found';
  end if;
  if v_parent_id <> auth.uid() and not is_admin() then
    raise exception 'not authorized';
  end if;
  if exists (select 1 from students where id = p_student_id and profile_id is not null) then
    raise exception 'student already has a login account';
  end if;

  insert into student_login_invites (student_id, parent_id, code_hash, expires_at, claimed_at)
  values (p_student_id, v_parent_id, digest(v_code, 'sha256'), now() + interval '24 hours', null)
  on conflict (student_id) do update
    set code_hash = excluded.code_hash,
        expires_at = excluded.expires_at,
        claimed_at = null,
        created_at = now();
  return v_code;
end;
$$;

create or replace function handle_new_user() returns trigger as $$
declare
  v_role user_role;
  v_invite student_login_invites;
begin
  if new.raw_user_meta_data->>'signup_kind' = 'student_invitation' then
    select * into v_invite
    from student_login_invites
    where code_hash = digest(lower(trim(new.raw_user_meta_data->>'invitation_code')), 'sha256')
      and claimed_at is null
      and expires_at > now()
    for update;

    if not found then
      raise exception 'invalid or expired student invitation';
    end if;
    v_role := 'student';
  elsif new.raw_user_meta_data->>'signup_kind' = 'teacher_application' then
    v_role := 'teacher';
  else
    v_role := 'parent';
  end if;

  insert into profiles (id, role, first_name, last_name, email, phone, country, preferred_language)
  values (
    new.id,
    v_role,
    case when v_role = 'student' then (select first_name from students where id = v_invite.student_id)
         else coalesce(new.raw_user_meta_data->>'first_name', '') end,
    case when v_role = 'student' then (select last_name from students where id = v_invite.student_id)
         else coalesce(new.raw_user_meta_data->>'last_name', '') end,
    new.email,
    new.raw_user_meta_data->>'phone',
    case when v_role = 'student' then (select country from students where id = v_invite.student_id)
         else new.raw_user_meta_data->>'country' end,
    case when v_role = 'student' then coalesce((select preferred_language from students where id = v_invite.student_id), 'en')
         else coalesce(new.raw_user_meta_data->>'preferred_language', 'en') end
  );

  if v_role = 'parent' then
    insert into parents (profile_id) values (new.id);
  elsif v_role = 'teacher' then
    insert into teachers (profile_id) values (new.id);
  else
    update students set profile_id = new.id where id = v_invite.student_id;
    update student_login_invites set claimed_at = now() where id = v_invite.id;
  end if;
  return new;
end;
$$ language plpgsql security definer set search_path = public, extensions;

revoke all on table student_login_invites from anon, authenticated;
grant select on table student_login_invites to authenticated;
revoke all on function create_student_login_invite(uuid) from public, anon;
grant execute on function create_student_login_invite(uuid) to authenticated;