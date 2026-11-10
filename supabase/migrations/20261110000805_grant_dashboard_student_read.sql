-- Keep the Data API read access limited to student fields used by admin screens.
-- RLS on public.students remains responsible for institution and student row access.
GRANT SELECT (
    id,
    institution_id,
    membership_id,
    first_names,
    last_names,
    phone,
    email,
    student_code,
    status,
    created_at
)
ON TABLE public.students
TO authenticated;
