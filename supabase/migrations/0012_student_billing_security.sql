-- Enforce emergency contact consistency and keep billing amounts/statuses out
-- of direct browser-controlled inserts.

alter table students
  alter column emergency_guardian_phone set not null;

alter table students
  add constraint students_emergency_guardian_phone_required
  check (length(trim(emergency_guardian_phone)) > 0);

alter table invoices
  add column course_id uuid references courses(id) on delete set null;

alter table invoices
  add constraint invoices_student_course_key unique (student_id, course_id);

drop policy if exists invoices_insert_student on invoices;
drop policy if exists payments_insert_student on payments;

create or replace function student_checkout_course(p_course_id uuid)
returns invoices
language plpgsql security definer set search_path = public as $$
declare
  v_student students;
  v_course courses;
  v_discount numeric(5,2) := 0;
  v_invoice invoices;
begin
  if auth_role() <> 'student' then
    raise exception 'student account required';
  end if;

  select * into v_student
  from students
  where profile_id = auth.uid();

  if not found then
    raise exception 'student profile not found';
  end if;

  select * into v_course
  from courses
  where id = p_course_id and status = 'published';

  if not found then
    raise exception 'published course not found';
  end if;

  select coalesce(max(approved_percent), 0) into v_discount
  from financial_assistance_applications
  where student_id = v_student.id
    and status in ('approved', 'partially_approved');

  insert into enrollments (student_id, course_id, status)
  values (v_student.id, v_course.id, 'active')
  on conflict (student_id, course_id) do nothing;

  insert into invoices (
    student_id,
    course_id,
    description,
    tier,
    amount,
    discount_amount,
    final_amount,
    currency,
    status
  )
  values (
    v_student.id,
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
      currency = excluded.currency
  returning * into v_invoice;

  return v_invoice;
end;
$$;

create or replace function create_private_lesson_invoice(p_class_id uuid)
returns invoices
language plpgsql security definer set search_path = public as $$
declare
  v_student students;
  v_class classes;
  v_price numeric(10,2);
  v_invoice invoices;
begin
  if auth_role() <> 'student' then
    raise exception 'student account required';
  end if;

  select * into v_student from students where profile_id = auth.uid();
  if not found then raise exception 'student profile not found'; end if;

  select c.* into v_class
  from classes c
  join class_students cs on cs.class_id = c.id
  where c.id = p_class_id
    and cs.student_id = v_student.id
    and cs.booked_by = auth.uid();

  if not found then raise exception 'owned class booking not found'; end if;

  select coalesce(hourly_price, 0) into v_price
  from teachers
  where profile_id = v_class.teacher_id and status = 'approved';

  if not found then raise exception 'approved teacher not found'; end if;

  insert into invoices (
    student_id, description, tier, amount, discount_amount,
    final_amount, currency, status
  )
  values (
    v_student.id,
    v_class.title,
    'standard',
    v_price,
    0,
    v_price,
    'USD',
    case when v_price = 0 then 'paid'::invoice_status else 'pending'::invoice_status end
  )
  returning * into v_invoice;

  return v_invoice;
end;
$$;

revoke all on function student_checkout_course(uuid) from public;
revoke all on function create_private_lesson_invoice(uuid) from public;
grant execute on function student_checkout_course(uuid) to authenticated;
grant execute on function create_private_lesson_invoice(uuid) to authenticated;