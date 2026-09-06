-- Automatically create pending course invoices and derive private-lesson
-- prices from each teacher's chosen hourly rate.

alter table teachers
  add constraint teachers_hourly_price_nonnegative
  check (hourly_price >= 0);

create or replace function ensure_course_invoice(p_student_id uuid, p_course_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_course courses;
  v_discount numeric(5,2) := 0;
begin
  select * into v_course from courses where id = p_course_id and status = 'published';
  if not found then return; end if;

  select coalesce(max(approved_percent), 0) into v_discount
  from financial_assistance_applications
  where student_id = p_student_id
    and status in ('approved', 'partially_approved');

  insert into invoices (
    student_id, course_id, description, tier, amount, discount_amount,
    final_amount, currency, status
  ) values (
    p_student_id,
    v_course.id,
    'Enrollment — ' || v_course.title,
    case when v_discount > 0 then 'assisted'::payment_tier else 'standard'::payment_tier end,
    v_course.price,
    round(v_course.price * v_discount / 100, 2),
    round(v_course.price - (v_course.price * v_discount / 100), 2),
    v_course.currency,
    case when v_course.price = 0 then 'paid'::invoice_status else 'pending'::invoice_status end
  )
  on conflict (student_id, course_id) do update
  set description = excluded.description,
      tier = excluded.tier,
      amount = excluded.amount,
      discount_amount = excluded.discount_amount,
      final_amount = excluded.final_amount,
      currency = excluded.currency;
end;
$$;

create or replace function enroll_student_in_published_courses()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_course_id uuid;
begin
  insert into enrollments (student_id, course_id, status)
  select new.id, c.id, 'active'
  from courses c
  where c.status = 'published'
  on conflict (student_id, course_id) do nothing;

  for v_course_id in select id from courses where status = 'published' loop
    perform ensure_course_invoice(new.id, v_course_id);
  end loop;
  return new;
end;
$$;

create or replace function enroll_all_students_when_course_published()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_student_id uuid;
begin
  if new.status = 'published'
     and (tg_op = 'INSERT' or old.status is distinct from 'published') then
    insert into enrollments (student_id, course_id, status)
    select s.id, new.id, 'active'
    from students s
    on conflict (student_id, course_id) do nothing;

    for v_student_id in select id from students loop
      perform ensure_course_invoice(v_student_id, new.id);
    end loop;
  end if;
  return new;
end;
$$;

-- Backfill pending invoices for automatic enrollments that already exist.
do $$
declare
  v_enrollment record;
begin
  for v_enrollment in
    select e.student_id, e.course_id
    from enrollments e
    join courses c on c.id = e.course_id
    where c.status = 'published'
  loop
    perform ensure_course_invoice(v_enrollment.student_id, v_enrollment.course_id);
  end loop;
end $$;

create or replace function create_private_lesson_invoice(p_class_id uuid)
returns invoices
language plpgsql security definer set search_path = public as $$
declare
  v_student students;
  v_class classes;
  v_price numeric(10,2);
  v_currency text;
  v_invoice invoices;
begin
  if auth_role() <> 'student' then raise exception 'student account required'; end if;

  select * into v_student from students where profile_id = auth.uid();
  if not found then raise exception 'student profile not found'; end if;

  select c.* into v_class
  from classes c
  join class_students cs on cs.class_id = c.id
  where c.id = p_class_id
    and cs.student_id = v_student.id
    and cs.booked_by = auth.uid();
  if not found then raise exception 'owned class booking not found'; end if;

  select
    round(coalesce(hourly_price, 0) * extract(epoch from (v_class.end_datetime - v_class.start_datetime)) / 3600, 2),
    currency
  into v_price, v_currency
  from teachers
  where profile_id = v_class.teacher_id and status = 'approved';
  if not found then raise exception 'approved teacher not found'; end if;

  update class_students
  set price_charged = v_price
  where class_id = v_class.id and student_id = v_student.id;

  insert into invoices (
    student_id, description, tier, amount, discount_amount,
    final_amount, currency, status
  ) values (
    v_student.id, v_class.title, 'standard', v_price, 0, v_price, v_currency,
    case when v_price = 0 then 'paid'::invoice_status else 'pending'::invoice_status end
  )
  returning * into v_invoice;
  return v_invoice;
end;
$$;

revoke all on function ensure_course_invoice(uuid, uuid) from public;
grant execute on function ensure_course_invoice(uuid, uuid) to service_role;