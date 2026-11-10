CREATE TABLE IF NOT EXISTS public.support_tickets (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    requester_name text,
    requester_email text NOT NULL,
    institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
    category text NOT NULL CHECK (
        category = ANY (ARRAY['ACCESS'::text, 'ACADEMIC'::text, 'PAYMENTS'::text, 'COMMUNICATIONS'::text, 'OTHER'::text])
    ),
    subject text NOT NULL CHECK (char_length(subject) BETWEEN 4 AND 140),
    description text NOT NULL CHECK (char_length(description) BETWEEN 10 AND 5000),
    status text NOT NULL DEFAULT 'OPEN'::text CHECK (
        status = ANY (ARRAY['OPEN'::text, 'IN_PROGRESS'::text, 'RESOLVED'::text, 'CLOSED'::text])
    ),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_tickets_requester_created_idx
    ON public.support_tickets (requester_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS support_tickets_institution_status_created_idx
    ON public.support_tickets (institution_id, status, created_at DESC);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_tickets FROM anon;
REVOKE ALL ON public.support_tickets FROM authenticated;
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS support_tickets_requester_select ON public.support_tickets;
CREATE POLICY support_tickets_requester_select
ON public.support_tickets FOR SELECT TO authenticated
USING (requester_profile_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
