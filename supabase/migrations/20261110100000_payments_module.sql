ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS payments_enabled boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.fee_concepts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    concept_type text NOT NULL CHECK (concept_type IN ('MATRICULA', 'PENSION', 'OTHER')),
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (institution_id, id),
    UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS public.billing_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    academic_year_id uuid NOT NULL REFERENCES public.academic_years(id),
    fee_concept_id uuid NOT NULL REFERENCES public.fee_concepts(id),
    name text NOT NULL,
    scope_type text NOT NULL CHECK (scope_type IN ('INSTITUTION', 'LEVEL', 'GRADE', 'CLASSROOM', 'STUDENTS')),
    target_level text,
    target_grade text,
    classroom_id uuid REFERENCES public.classrooms(id),
    frequency text NOT NULL CHECK (frequency IN ('MONTHLY', 'WEEKLY', 'ONCE')),
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    starts_on date NOT NULL,
    ends_on date,
    due_day smallint CHECK (due_day BETWEEN 1 AND 31),
    status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (institution_id, id),
    CHECK (ends_on IS NULL OR ends_on >= starts_on),
    CHECK (
        (scope_type = 'INSTITUTION' AND target_level IS NULL AND target_grade IS NULL AND classroom_id IS NULL)
        OR (scope_type = 'LEVEL' AND target_level IS NOT NULL AND target_grade IS NULL AND classroom_id IS NULL)
        OR (scope_type = 'GRADE' AND target_level IS NOT NULL AND target_grade IS NOT NULL AND classroom_id IS NULL)
        OR (scope_type = 'CLASSROOM' AND classroom_id IS NOT NULL AND target_level IS NULL AND target_grade IS NULL)
        OR (scope_type = 'STUDENTS' AND target_level IS NULL AND target_grade IS NULL AND classroom_id IS NULL)
    ),
    CHECK ((frequency = 'MONTHLY' AND due_day IS NOT NULL) OR frequency <> 'MONTHLY')
);

CREATE TABLE IF NOT EXISTS public.billing_rule_students (
    institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    billing_rule_id uuid NOT NULL REFERENCES public.billing_rules(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (billing_rule_id, student_id)
);

ALTER TABLE public.student_fees
    ADD COLUMN IF NOT EXISTS fee_concept_id uuid REFERENCES public.fee_concepts(id),
    ADD COLUMN IF NOT EXISTS billing_rule_id uuid REFERENCES public.billing_rules(id),
    ADD COLUMN IF NOT EXISTS academic_year_id uuid REFERENCES public.academic_years(id),
    ADD COLUMN IF NOT EXISTS paid_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0);

CREATE UNIQUE INDEX IF NOT EXISTS academic_years_institution_id_id_unique
    ON public.academic_years (institution_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS classrooms_institution_id_id_unique
    ON public.classrooms (institution_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS students_institution_id_id_unique
    ON public.students (institution_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS memberships_institution_id_id_unique
    ON public.memberships (institution_id, id);
CREATE UNIQUE INDEX IF NOT EXISTS student_fees_institution_id_id_unique
    ON public.student_fees (institution_id, id);

UPDATE public.student_fees
SET paid_amount = amount
WHERE status = 'PAID' AND paid_amount = 0;

ALTER TABLE public.student_fees
    DROP CONSTRAINT IF EXISTS student_fees_status_check;

ALTER TABLE public.student_fees
    ADD CONSTRAINT student_fees_status_check
        CHECK (status IN ('PAID', 'UNPAID', 'PARTIAL', 'OVERDUE', 'WAIVED'));

ALTER TABLE public.student_fees
    ADD CONSTRAINT student_fees_paid_amount_within_amount_check
        CHECK (paid_amount <= amount);

CREATE UNIQUE INDEX IF NOT EXISTS student_fees_rule_student_period_unique
    ON public.student_fees (billing_rule_id, student_id, period_label);

CREATE INDEX IF NOT EXISTS student_fees_institution_due_date_idx
    ON public.student_fees (institution_id, due_date);

CREATE TABLE IF NOT EXISTS public.student_fee_payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_fee_id uuid NOT NULL REFERENCES public.student_fees(id),
    student_id uuid NOT NULL REFERENCES public.students(id),
    amount numeric(12, 2) NOT NULL CHECK (amount > 0),
    paid_at timestamptz NOT NULL,
    payment_method text NOT NULL CHECK (payment_method IN ('CASH', 'TRANSFER', 'DEPOSIT', 'OTHER')),
    reference text,
    notes text,
    status text NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED', 'VOIDED')),
    idempotency_key uuid NOT NULL,
    created_by_membership_id uuid NOT NULL REFERENCES public.memberships(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (institution_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS student_fee_payments_institution_paid_at_idx
    ON public.student_fee_payments (institution_id, paid_at DESC);

CREATE INDEX IF NOT EXISTS student_fee_payments_obligation_idx
    ON public.student_fee_payments (student_fee_id, paid_at DESC);

ALTER TABLE public.billing_rules
    ADD CONSTRAINT billing_rules_academic_year_institution_fkey
        FOREIGN KEY (institution_id, academic_year_id)
        REFERENCES public.academic_years (institution_id, id),
    ADD CONSTRAINT billing_rules_concept_institution_fkey
        FOREIGN KEY (institution_id, fee_concept_id)
        REFERENCES public.fee_concepts (institution_id, id),
    ADD CONSTRAINT billing_rules_classroom_institution_fkey
        FOREIGN KEY (institution_id, classroom_id)
        REFERENCES public.classrooms (institution_id, id);

ALTER TABLE public.billing_rule_students
    ADD CONSTRAINT billing_rule_students_rule_institution_fkey
        FOREIGN KEY (institution_id, billing_rule_id)
        REFERENCES public.billing_rules (institution_id, id)
        ON DELETE CASCADE,
    ADD CONSTRAINT billing_rule_students_student_institution_fkey
        FOREIGN KEY (institution_id, student_id)
        REFERENCES public.students (institution_id, id);

ALTER TABLE public.student_fees
    ADD CONSTRAINT student_fees_academic_year_institution_fkey
        FOREIGN KEY (institution_id, academic_year_id)
        REFERENCES public.academic_years (institution_id, id),
    ADD CONSTRAINT student_fees_concept_institution_fkey
        FOREIGN KEY (institution_id, fee_concept_id)
        REFERENCES public.fee_concepts (institution_id, id),
    ADD CONSTRAINT student_fees_rule_institution_fkey
        FOREIGN KEY (institution_id, billing_rule_id)
        REFERENCES public.billing_rules (institution_id, id);

ALTER TABLE public.student_fee_payments
    ADD CONSTRAINT student_fee_payments_obligation_institution_fkey
        FOREIGN KEY (institution_id, student_fee_id)
        REFERENCES public.student_fees (institution_id, id),
    ADD CONSTRAINT student_fee_payments_student_institution_fkey
        FOREIGN KEY (institution_id, student_id)
        REFERENCES public.students (institution_id, id),
    ADD CONSTRAINT student_fee_payments_creator_institution_fkey
        FOREIGN KEY (institution_id, created_by_membership_id)
        REFERENCES public.memberships (institution_id, id);

ALTER TABLE public.fee_concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_rule_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_fee_payments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.fee_concepts, public.billing_rules, public.billing_rule_students, public.student_fee_payments FROM anon;
GRANT SELECT ON public.fee_concepts, public.billing_rules, public.billing_rule_students, public.student_fee_payments TO authenticated;
GRANT ALL ON public.fee_concepts, public.billing_rules, public.billing_rule_students, public.student_fee_payments TO service_role;

CREATE POLICY fee_concepts_admin_select
ON public.fee_concepts FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = fee_concepts.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY billing_rules_admin_select
ON public.billing_rules FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = billing_rules.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY billing_rule_students_admin_select
ON public.billing_rule_students FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = billing_rule_students.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY student_fee_payments_institution_admin_select
ON public.student_fee_payments FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = student_fee_payments.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY student_fee_payments_student_select
ON public.student_fee_payments FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.students AS student
    JOIN public.memberships AS membership
      ON membership.id = student.membership_id
     AND membership.institution_id = student.institution_id
    WHERE student.id = student_fee_payments.student_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.status = 'ACTIVE'
));

CREATE POLICY student_fee_payments_guardian_select
ON public.student_fee_payments FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.guardian_student_links AS guardian_link
    WHERE guardian_link.institution_id = student_fee_payments.institution_id
      AND guardian_link.student_id = student_fee_payments.student_id
      AND guardian_link.guardian_profile_id = (SELECT auth.uid())
      AND guardian_link.can_view_fees = true
      AND guardian_link.status = 'ACTIVE'
));

CREATE OR REPLACE FUNCTION public.record_student_fee_payment(
    p_institution_id uuid,
    p_student_fee_id uuid,
    p_amount numeric,
    p_paid_at timestamptz,
    p_payment_method text,
    p_reference text,
    p_notes text,
    p_idempotency_key uuid,
    p_actor_profile_id uuid,
    p_actor_membership_id uuid
)
RETURNS public.student_fee_payments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    fee_row public.student_fees%ROWTYPE;
    existing_payment public.student_fee_payments%ROWTYPE;
    payment_row public.student_fee_payments%ROWTYPE;
    next_paid_amount numeric(12, 2);
    next_status text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.memberships
        WHERE id = p_actor_membership_id
          AND institution_id = p_institution_id
          AND profile_id = p_actor_profile_id
          AND role = 'ADMIN'
          AND status = 'ACTIVE'
    ) THEN
        RAISE EXCEPTION 'Necesitas una membresía ADMIN activa para registrar pagos.';
    END IF;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'El importe debe ser mayor que cero.';
    END IF;

    IF p_payment_method NOT IN ('CASH', 'TRANSFER', 'DEPOSIT', 'OTHER') THEN
        RAISE EXCEPTION 'El método de pago no es válido.';
    END IF;

    IF p_idempotency_key IS NULL THEN
        RAISE EXCEPTION 'La clave de registro del pago es obligatoria.';
    END IF;

    SELECT * INTO fee_row
    FROM public.student_fees
    WHERE id = p_student_fee_id
      AND institution_id = p_institution_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró la obligación de esta institución.';
    END IF;

    SELECT * INTO existing_payment
    FROM public.student_fee_payments
    WHERE institution_id = p_institution_id
      AND idempotency_key = p_idempotency_key;

    IF FOUND THEN
        IF existing_payment.student_fee_id <> p_student_fee_id
           OR existing_payment.amount <> p_amount THEN
            RAISE EXCEPTION 'La clave de registro ya fue usada para otro pago.';
        END IF;
        RETURN existing_payment;
    END IF;

    IF fee_row.status = 'WAIVED' THEN
        RAISE EXCEPTION 'No se puede registrar un pago para una obligación exonerada.';
    END IF;

    IF p_amount > fee_row.amount - fee_row.paid_amount THEN
        RAISE EXCEPTION 'El pago supera el saldo pendiente de la obligación.';
    END IF;

    INSERT INTO public.student_fee_payments (
        institution_id,
        student_fee_id,
        student_id,
        amount,
        paid_at,
        payment_method,
        reference,
        notes,
        idempotency_key,
        created_by_membership_id
    ) VALUES (
        p_institution_id,
        p_student_fee_id,
        fee_row.student_id,
        p_amount,
        COALESCE(p_paid_at, now()),
        p_payment_method,
        NULLIF(trim(p_reference), ''),
        NULLIF(trim(p_notes), ''),
        p_idempotency_key,
        p_actor_membership_id
    )
    RETURNING * INTO payment_row;

    next_paid_amount := fee_row.paid_amount + p_amount;
    next_status := CASE
        WHEN next_paid_amount >= fee_row.amount THEN 'PAID'
        WHEN next_paid_amount > 0 THEN 'PARTIAL'
        WHEN fee_row.due_date < (now() AT TIME ZONE 'America/Lima')::date THEN 'OVERDUE'
        ELSE 'UNPAID'
    END;

    UPDATE public.student_fees
    SET paid_amount = next_paid_amount,
        status = next_status,
        paid_at = CASE WHEN next_status = 'PAID' THEN payment_row.paid_at ELSE NULL END,
        updated_at = now()
    WHERE id = fee_row.id;

    RETURN payment_row;
END;
$$;

REVOKE ALL ON FUNCTION public.record_student_fee_payment(uuid, uuid, numeric, timestamptz, text, text, text, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_student_fee_payment(uuid, uuid, numeric, timestamptz, text, text, text, uuid, uuid, uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
