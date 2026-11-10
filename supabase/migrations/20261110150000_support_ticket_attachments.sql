CREATE TABLE IF NOT EXISTS public.support_ticket_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    uploaded_by_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    storage_path text NOT NULL UNIQUE,
    file_name text NOT NULL,
    mime_type text NOT NULL CHECK (
        mime_type = ANY (ARRAY['image/jpeg'::text, 'image/png'::text, 'image/webp'::text])
    ),
    size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 5242880),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS support_ticket_attachments_ticket_created_idx
    ON public.support_ticket_attachments (ticket_id, created_at);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'support-ticket-attachments',
    'support-ticket-attachments',
    false,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']::text[];

ALTER TABLE public.support_ticket_attachments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.support_ticket_attachments FROM anon;
REVOKE ALL ON public.support_ticket_attachments FROM authenticated;
GRANT SELECT ON public.support_ticket_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_ticket_attachments TO service_role;

DROP POLICY IF EXISTS support_ticket_attachments_requester_select
    ON public.support_ticket_attachments;
CREATE POLICY support_ticket_attachments_requester_select
ON public.support_ticket_attachments FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.support_tickets AS ticket
        WHERE ticket.id = support_ticket_attachments.ticket_id
          AND ticket.requester_profile_id = (SELECT auth.uid())
    )
);

DROP POLICY IF EXISTS support_ticket_attachments_requester_read
    ON storage.objects;
CREATE POLICY support_ticket_attachments_requester_read
ON storage.objects FOR SELECT TO authenticated
USING (
    bucket_id = 'support-ticket-attachments'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
);

NOTIFY pgrst, 'reload schema';
