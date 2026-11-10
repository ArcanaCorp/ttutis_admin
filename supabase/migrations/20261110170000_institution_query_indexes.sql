CREATE INDEX IF NOT EXISTS students_institution_status_idx
    ON public.students (institution_id, status);

CREATE INDEX IF NOT EXISTS memberships_institution_profile_status_idx
    ON public.memberships (institution_id, profile_id, status);

CREATE INDEX IF NOT EXISTS memberships_institution_role_status_idx
    ON public.memberships (institution_id, role, status);

CREATE INDEX IF NOT EXISTS guardian_student_links_institution_student_status_idx
    ON public.guardian_student_links (institution_id, student_id, status);

CREATE INDEX IF NOT EXISTS guardian_student_links_institution_guardian_status_idx
    ON public.guardian_student_links (institution_id, guardian_profile_id, status);

CREATE INDEX IF NOT EXISTS academic_years_institution_dates_idx
    ON public.academic_years (institution_id, starts_on DESC);

CREATE INDEX IF NOT EXISTS classrooms_institution_year_status_idx
    ON public.classrooms (institution_id, academic_year_id, status);

CREATE INDEX IF NOT EXISTS enrollments_institution_year_status_idx
    ON public.enrollments (institution_id, academic_year_id, status);

CREATE INDEX IF NOT EXISTS enrollments_institution_student_year_idx
    ON public.enrollments (institution_id, student_id, academic_year_id);

CREATE INDEX IF NOT EXISTS attendance_events_institution_occurred_idx
    ON public.attendance_events (institution_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS student_updates_institution_visible_idx
    ON public.student_updates (institution_id, visible_from DESC);

CREATE INDEX IF NOT EXISTS course_assignments_institution_year_status_idx
    ON public.course_assignments (institution_id, academic_year_id, status);

CREATE INDEX IF NOT EXISTS schedules_institution_status_weekday_idx
    ON public.schedules (institution_id, status, weekday);

CREATE INDEX IF NOT EXISTS billing_rules_institution_year_status_idx
    ON public.billing_rules (institution_id, academic_year_id, status);

CREATE INDEX IF NOT EXISTS billing_rule_students_institution_rule_idx
    ON public.billing_rule_students (institution_id, billing_rule_id);

CREATE INDEX IF NOT EXISTS student_fees_institution_year_student_idx
    ON public.student_fees (institution_id, academic_year_id, student_id);

CREATE INDEX IF NOT EXISTS student_fee_payments_institution_created_idx
    ON public.student_fee_payments (institution_id, created_at DESC);

NOTIFY pgrst, 'reload schema';
