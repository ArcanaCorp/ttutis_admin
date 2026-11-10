-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.institutions (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    legal_name text NOT NULL,
    trade_name text,
    slug text NOT NULL UNIQUE,
    tax_id text,
    email text,
    phone text,
    website text,
    logo_path text,
    description text,
    timezone text NOT NULL DEFAULT 'America/Lima'::text,
    currency character NOT NULL DEFAULT 'PEN'::bpchar,
    payments_enabled boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'CLOSED'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT institutions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    display_name text,
    avatar_path text,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'SUSPENDED'::text, 'DELETED'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profiles_pkey PRIMARY KEY (id),
    CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

CREATE TABLE public.memberships (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    profile_id uuid,
    full_name text NOT NULL,
    email text,
    role text NOT NULL CHECK (role = ANY (ARRAY['ADMIN'::text, 'TEACHER'::text, 'ASSISTANT'::text, 'STUDENT'::text])),
    login_code text UNIQUE CHECK (login_code IS NULL OR login_code ~ '^[A-Z][0-9]{8}$'::text),
    status text NOT NULL DEFAULT 'PROVISIONING'::text CHECK (status = ANY (ARRAY['PROVISIONING'::text, 'ACTIVE'::text, 'SUSPENDED'::text, 'REVOKED'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT memberships_pkey PRIMARY KEY (id),
    CONSTRAINT memberships_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT memberships_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.students (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    membership_id uuid UNIQUE,
    first_names text NOT NULL,
    last_names text NOT NULL,
    document_type text,
    document_number text,
    birth_date date,
    phone text,
    email text,
    student_code text,
    admission_date date,
    attendance_qr_hash text UNIQUE,
    guardian_claim_hash text UNIQUE,
    guardian_claim_expires_at timestamp with time zone,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text, 'TRANSFERRED'::text, 'GRADUATED'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT students_pkey PRIMARY KEY (id),
    CONSTRAINT students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT students_membership_id_institution_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id),
    CONSTRAINT students_membership_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.memberships(institution_id)
);

CREATE TABLE public.guardian_student_links (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    guardian_profile_id uuid NOT NULL,
    relationship text NOT NULL,
    can_view_attendance boolean NOT NULL DEFAULT true,
    can_view_grades boolean NOT NULL DEFAULT true,
    can_view_behavior boolean NOT NULL DEFAULT false,
    can_view_fees boolean NOT NULL DEFAULT true,
    can_receive_notifications boolean NOT NULL DEFAULT true,
    status text NOT NULL DEFAULT 'PENDING'::text CHECK (status = ANY (ARRAY['PENDING'::text, 'ACTIVE'::text, 'REJECTED'::text, 'REVOKED'::text])),
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT guardian_student_links_pkey PRIMARY KEY (id),
    CONSTRAINT guardian_student_links_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT guardian_student_links_guardian_profile_id_fkey FOREIGN KEY (guardian_profile_id) REFERENCES public.profiles(id),
    CONSTRAINT guardian_student_links_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id),
    CONSTRAINT guardian_student_links_student_id_institution_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT guardian_student_links_student_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.students(institution_id)
);

CREATE TABLE public.academic_years (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    name text NOT NULL,
    starts_on date NOT NULL,
    ends_on date NOT NULL,
    status text NOT NULL DEFAULT 'PLANNED'::text CHECK (status = ANY (ARRAY['PLANNED'::text, 'ACTIVE'::text, 'CLOSED'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT academic_years_pkey PRIMARY KEY (id),
    CONSTRAINT academic_years_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.classrooms (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    level text NOT NULL CHECK (level = ANY (ARRAY['INITIAL'::text, 'PRIMARY'::text, 'SECONDARY'::text, 'OTHER'::text])),
    grade_label text NOT NULL,
    grade_order integer,
    section_name text NOT NULL,
    capacity integer CHECK (capacity IS NULL OR capacity > 0),
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT classrooms_pkey PRIMARY KEY (id),
    CONSTRAINT classrooms_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT classrooms_academic_year_id_institution_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
    CONSTRAINT classrooms_academic_year_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.academic_years(institution_id)
);

CREATE TABLE public.classroom_staff (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    classroom_id uuid NOT NULL,
    membership_id uuid NOT NULL,
    assignment_role text NOT NULL CHECK (assignment_role = ANY (ARRAY['TUTOR'::text, 'ASSISTANT'::text])),
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT classroom_staff_pkey PRIMARY KEY (id),
    CONSTRAINT classroom_staff_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT classroom_staff_classroom_id_institution_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id),
    CONSTRAINT classroom_staff_classroom_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.classrooms(institution_id),
    CONSTRAINT classroom_staff_membership_id_institution_id_fkey FOREIGN KEY (membership_id) REFERENCES public.memberships(id),
    CONSTRAINT classroom_staff_membership_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.memberships(institution_id)
);

CREATE TABLE public.subjects (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    code text,
    name text NOT NULL,
    description text,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT subjects_pkey PRIMARY KEY (id),
    CONSTRAINT subjects_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.course_assignments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    classroom_id uuid NOT NULL,
    subject_id uuid NOT NULL,
    teacher_membership_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT course_assignments_pkey PRIMARY KEY (id),
    CONSTRAINT course_assignments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT course_assignments_academic_year_id_institution_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
    CONSTRAINT course_assignments_academic_year_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.academic_years(institution_id),
    CONSTRAINT course_assignments_classroom_id_institution_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id),
    CONSTRAINT course_assignments_classroom_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.classrooms(institution_id),
    CONSTRAINT course_assignments_subject_id_institution_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id),
    CONSTRAINT course_assignments_subject_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.subjects(institution_id),
    CONSTRAINT course_assignments_teacher_membership_id_institution_id_fkey FOREIGN KEY (teacher_membership_id) REFERENCES public.memberships(id),
    CONSTRAINT course_assignments_teacher_membership_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.memberships(institution_id)
);

CREATE TABLE public.schedules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    course_assignment_id uuid NOT NULL,
    weekday smallint NOT NULL CHECK (weekday >= 1 AND weekday <= 7),
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    classroom_label text,
    effective_from date,
    effective_until date,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT schedules_pkey PRIMARY KEY (id),
    CONSTRAINT schedules_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT schedules_course_assignment_id_institution_id_fkey FOREIGN KEY (course_assignment_id) REFERENCES public.course_assignments(id),
    CONSTRAINT schedules_course_assignment_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.course_assignments(institution_id)
);

CREATE TABLE public.enrollments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    student_id uuid NOT NULL,
    classroom_id uuid NOT NULL,
    enrolled_at date NOT NULL,
    ended_at date,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text, 'TRANSFERRED'::text, 'COMPLETED'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT enrollments_pkey PRIMARY KEY (id),
    CONSTRAINT enrollments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT enrollments_academic_year_id_institution_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
    CONSTRAINT enrollments_academic_year_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.academic_years(institution_id),
    CONSTRAINT enrollments_student_id_institution_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT enrollments_student_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.students(institution_id),
    CONSTRAINT enrollments_classroom_id_institution_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id),
    CONSTRAINT enrollments_classroom_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.classrooms(institution_id)
);

CREATE TABLE public.attendance_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    student_id uuid NOT NULL,
    enrollment_id uuid,
    event_type text NOT NULL CHECK (event_type = ANY (ARRAY['ENTRY'::text, 'EXIT'::text, 'TEMP_EXIT'::text, 'RETURN'::text, 'MANUAL_ADJUSTMENT'::text])),
    occurred_at timestamp with time zone NOT NULL,
    source text NOT NULL CHECK (source = ANY (ARRAY['QR'::text, 'MANUAL'::text, 'SYSTEM'::text])),
    recorded_by_membership_id uuid,
    idempotency_key text NOT NULL,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT attendance_events_pkey PRIMARY KEY (id),
    CONSTRAINT attendance_events_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT attendance_events_student_id_institution_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT attendance_events_student_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.students(institution_id),
    CONSTRAINT attendance_events_enrollment_id_institution_id_fkey FOREIGN KEY (enrollment_id) REFERENCES public.enrollments(id),
    CONSTRAINT attendance_events_enrollment_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.enrollments(institution_id),
    CONSTRAINT attendance_events_recorded_by_membership_id_institution_id_fkey FOREIGN KEY (recorded_by_membership_id) REFERENCES public.memberships(id),
    CONSTRAINT attendance_events_recorded_by_membership_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.memberships(institution_id)
);

CREATE TABLE public.student_updates (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    author_membership_id uuid NOT NULL,
    audience_type text NOT NULL DEFAULT 'ALL'::text CHECK (audience_type = ANY (ARRAY['ALL'::text, 'GRADE'::text, 'CLASSROOM'::text, 'STUDENT'::text])),
    academic_year_id uuid,
    target_level text,
    target_grade text,
    student_id uuid,
    classroom_id uuid,
    update_type text NOT NULL CHECK (update_type = ANY (ARRAY['ANNOUNCEMENT'::text, 'GRADE'::text, 'BEHAVIOR'::text, 'CITATION'::text, 'REPORT'::text, 'RECOMMENDATION'::text, 'NOTIFICATION'::text])),
    title text NOT NULL,
    body text NOT NULL,
    grade_value numeric,
    priority text NOT NULL DEFAULT 'NORMAL'::text CHECK (priority = ANY (ARRAY['LOW'::text, 'NORMAL'::text, 'HIGH'::text, 'URGENT'::text])),
    visible_from timestamp with time zone NOT NULL DEFAULT now(),
    visible_until timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT student_updates_pkey PRIMARY KEY (id),
    CONSTRAINT student_updates_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT student_updates_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
    CONSTRAINT student_updates_author_membership_id_institution_id_fkey FOREIGN KEY (author_membership_id) REFERENCES public.memberships(id),
    CONSTRAINT student_updates_author_membership_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.memberships(institution_id),
    CONSTRAINT student_updates_student_id_institution_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT student_updates_student_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.students(institution_id),
    CONSTRAINT student_updates_classroom_id_institution_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id),
    CONSTRAINT student_updates_classroom_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.classrooms(institution_id),
    CONSTRAINT student_updates_audience_target_check CHECK (
        (audience_type = 'ALL' AND academic_year_id IS NULL AND target_level IS NULL AND target_grade IS NULL)
        OR (audience_type = 'GRADE' AND academic_year_id IS NOT NULL AND target_level IS NOT NULL AND target_grade IS NOT NULL AND classroom_id IS NULL AND student_id IS NULL)
        OR (audience_type = 'CLASSROOM' AND academic_year_id IS NOT NULL AND classroom_id IS NOT NULL AND student_id IS NULL AND target_level IS NULL AND target_grade IS NULL)
        OR (audience_type = 'STUDENT' AND academic_year_id IS NULL AND target_level IS NULL AND target_grade IS NULL AND classroom_id IS NULL AND student_id IS NOT NULL)
    )
);

CREATE TABLE public.student_fees (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    academic_year_id uuid,
    fee_concept_id uuid,
    billing_rule_id uuid,
    student_id uuid NOT NULL,
    concept text NOT NULL,
    period_label text NOT NULL,
    due_date date,
    amount numeric NOT NULL CHECK (amount >= 0::numeric),
    paid_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0 AND paid_amount <= amount),
    status text NOT NULL DEFAULT 'UNPAID'::text CHECK (status = ANY (ARRAY['PAID'::text, 'UNPAID'::text, 'PARTIAL'::text, 'WAIVED'::text, 'OVERDUE'::text])),
    paid_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT student_fees_pkey PRIMARY KEY (id),
    CONSTRAINT student_fees_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT student_fees_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
    CONSTRAINT student_fees_student_id_institution_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT student_fees_student_id_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.students(institution_id)
);

CREATE TABLE public.fee_concepts (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    concept_type text NOT NULL CHECK (concept_type = ANY (ARRAY['MATRICULA'::text, 'PENSION'::text, 'OTHER'::text])),
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT fee_concepts_pkey PRIMARY KEY (id),
    CONSTRAINT fee_concepts_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT fee_concepts_institution_name_key UNIQUE (institution_id, name)
);

CREATE TABLE public.billing_rules (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    academic_year_id uuid NOT NULL,
    fee_concept_id uuid NOT NULL,
    name text NOT NULL,
    scope_type text NOT NULL CHECK (scope_type = ANY (ARRAY['INSTITUTION'::text, 'LEVEL'::text, 'GRADE'::text, 'CLASSROOM'::text, 'STUDENTS'::text])),
    target_level text,
    target_grade text,
    classroom_id uuid,
    frequency text NOT NULL CHECK (frequency = ANY (ARRAY['MONTHLY'::text, 'WEEKLY'::text, 'ONCE'::text])),
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    starts_on date NOT NULL,
    ends_on date,
    due_day smallint CHECK (due_day BETWEEN 1 AND 31),
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT billing_rules_pkey PRIMARY KEY (id),
    CONSTRAINT billing_rules_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT billing_rules_academic_year_id_fkey FOREIGN KEY (academic_year_id) REFERENCES public.academic_years(id),
    CONSTRAINT billing_rules_fee_concept_id_fkey FOREIGN KEY (fee_concept_id) REFERENCES public.fee_concepts(id),
    CONSTRAINT billing_rules_classroom_id_fkey FOREIGN KEY (classroom_id) REFERENCES public.classrooms(id),
    CONSTRAINT billing_rules_dates_check CHECK (ends_on IS NULL OR ends_on >= starts_on),
    CONSTRAINT billing_rules_scope_check CHECK (
        (scope_type = 'INSTITUTION' AND target_level IS NULL AND target_grade IS NULL AND classroom_id IS NULL)
        OR (scope_type = 'LEVEL' AND target_level IS NOT NULL AND target_grade IS NULL AND classroom_id IS NULL)
        OR (scope_type = 'GRADE' AND target_level IS NOT NULL AND target_grade IS NOT NULL AND classroom_id IS NULL)
        OR (scope_type = 'CLASSROOM' AND classroom_id IS NOT NULL AND target_level IS NULL AND target_grade IS NULL)
        OR (scope_type = 'STUDENTS' AND target_level IS NULL AND target_grade IS NULL AND classroom_id IS NULL)
    ),
    CONSTRAINT billing_rules_month_due_day_check CHECK ((frequency = 'MONTHLY' AND due_day IS NOT NULL) OR frequency <> 'MONTHLY')
);

CREATE TABLE public.billing_rule_students (
    institution_id uuid NOT NULL,
    billing_rule_id uuid NOT NULL,
    student_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT billing_rule_students_pkey PRIMARY KEY (billing_rule_id, student_id),
    CONSTRAINT billing_rule_students_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT billing_rule_students_billing_rule_id_fkey FOREIGN KEY (billing_rule_id) REFERENCES public.billing_rules(id),
    CONSTRAINT billing_rule_students_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id)
);

ALTER TABLE public.student_fees
    ADD CONSTRAINT student_fees_fee_concept_id_fkey FOREIGN KEY (fee_concept_id) REFERENCES public.fee_concepts(id),
    ADD CONSTRAINT student_fees_billing_rule_id_fkey FOREIGN KEY (billing_rule_id) REFERENCES public.billing_rules(id);

CREATE TABLE public.student_fee_payments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    student_fee_id uuid NOT NULL,
    student_id uuid NOT NULL,
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    paid_at timestamp with time zone NOT NULL,
    payment_method text NOT NULL CHECK (payment_method = ANY (ARRAY['CASH'::text, 'TRANSFER'::text, 'DEPOSIT'::text, 'OTHER'::text])),
    reference text,
    notes text,
    status text NOT NULL DEFAULT 'CONFIRMED'::text CHECK (status = ANY (ARRAY['CONFIRMED'::text, 'VOIDED'::text])),
    idempotency_key uuid NOT NULL,
    created_by_membership_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT student_fee_payments_pkey PRIMARY KEY (id),
    CONSTRAINT student_fee_payments_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
    CONSTRAINT student_fee_payments_student_fee_id_fkey FOREIGN KEY (student_fee_id) REFERENCES public.student_fees(id),
    CONSTRAINT student_fee_payments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id),
    CONSTRAINT student_fee_payments_created_by_membership_id_fkey FOREIGN KEY (created_by_membership_id) REFERENCES public.memberships(id),
    CONSTRAINT student_fee_payments_institution_request_key UNIQUE (institution_id, idempotency_key)
);

CREATE TABLE public.user_devices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    profile_id uuid NOT NULL,
    platform text NOT NULL CHECK (platform = ANY (ARRAY['IOS'::text, 'ANDROID'::text, 'WEB'::text])),
    push_token text UNIQUE,
    device_key text NOT NULL DEFAULT gen_random_uuid()::text,
    device_name text,
    status text NOT NULL DEFAULT 'ACTIVE'::text CHECK (status = ANY (ARRAY['ACTIVE'::text, 'INACTIVE'::text])),
    last_seen_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_devices_pkey PRIMARY KEY (id),
    CONSTRAINT user_devices_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id),
    CONSTRAINT user_devices_profile_device_key_key UNIQUE (profile_id, device_key)
);

CREATE TABLE public.profile_preferences (
    profile_id uuid NOT NULL,
    timezone text NOT NULL DEFAULT 'America/Lima'::text,
    notifications_enabled boolean NOT NULL DEFAULT true,
    email_notifications boolean NOT NULL DEFAULT true,
    in_app_notifications boolean NOT NULL DEFAULT true,
    attendance_notifications boolean NOT NULL DEFAULT true,
    academic_notifications boolean NOT NULL DEFAULT true,
    payment_notifications boolean NOT NULL DEFAULT true,
    communication_notifications boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT profile_preferences_pkey PRIMARY KEY (profile_id),
    CONSTRAINT profile_preferences_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.support_tickets (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    requester_profile_id uuid,
    requester_name text,
    requester_email text NOT NULL,
    institution_id uuid,
    category text NOT NULL CHECK (category = ANY (ARRAY['ACCESS'::text, 'ACADEMIC'::text, 'PAYMENTS'::text, 'COMMUNICATIONS'::text, 'OTHER'::text])),
    subject text NOT NULL CHECK (char_length(subject) BETWEEN 4 AND 140),
    description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
    status text NOT NULL DEFAULT 'OPEN'::text CHECK (status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'RESOLVED'::text, 'CLOSED'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
    CONSTRAINT support_tickets_requester_profile_id_fkey FOREIGN KEY (requester_profile_id) REFERENCES public.profiles(id),
    CONSTRAINT support_tickets_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
);

CREATE TABLE public.support_ticket_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL,
    uploaded_by_profile_id uuid,
    storage_path text NOT NULL UNIQUE,
    file_name text NOT NULL,
    mime_type text NOT NULL CHECK (mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])),
    size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT support_ticket_attachments_pkey PRIMARY KEY (id),
    CONSTRAINT support_ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id),
    CONSTRAINT support_ticket_attachments_uploaded_by_profile_id_fkey FOREIGN KEY (uploaded_by_profile_id) REFERENCES public.profiles(id)
);

CREATE TABLE public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    actor_profile_id uuid,
    subject_profile_id uuid,
    institution_id uuid,
    event_type text NOT NULL,
    resource_table text,
    resource_id text,
    changed_fields text[] NOT NULL DEFAULT '{}'::text[],
    old_values jsonb,
    new_values jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

CREATE TABLE public.institution_change_pulses (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    resource_table text NOT NULL,
    event_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT institution_change_pulses_pkey PRIMARY KEY (id)
);

CREATE TABLE public.app_audit_events (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    actor_profile_id uuid NOT NULL,
    event_type text NOT NULL CHECK (event_type = ANY (ARRAY['LOGIN_SUCCESS'::text, 'LOGOUT'::text, 'ACCOUNT_SIGNUP'::text, 'PASSWORD_CHANGED'::text])),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT app_audit_events_pkey PRIMARY KEY (id)
);
