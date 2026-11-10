UPDATE storage.buckets
SET file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/webp']
WHERE id = 'institution';

CREATE POLICY institution_logo_admin_select
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'institution'
    AND EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.institution_id::text = (storage.foldername(name))[1]
          AND membership.profile_id = (SELECT auth.uid())
          AND membership.role = 'ADMIN'
          AND membership.status = 'ACTIVE'
    )
);

CREATE POLICY institution_logo_admin_insert
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'institution'
    AND EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.institution_id::text = (storage.foldername(name))[1]
          AND membership.profile_id = (SELECT auth.uid())
          AND membership.role = 'ADMIN'
          AND membership.status = 'ACTIVE'
    )
);

CREATE POLICY institution_logo_admin_delete
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'institution'
    AND EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.institution_id::text = (storage.foldername(name))[1]
          AND membership.profile_id = (SELECT auth.uid())
          AND membership.role = 'ADMIN'
          AND membership.status = 'ACTIVE'
    )
);
