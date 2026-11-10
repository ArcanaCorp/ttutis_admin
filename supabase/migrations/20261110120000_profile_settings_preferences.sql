CREATE TABLE IF NOT EXISTS public.profile_preferences (
    profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    timezone text NOT NULL DEFAULT 'America/Lima',
    notifications_enabled boolean NOT NULL DEFAULT true,
    email_notifications boolean NOT NULL DEFAULT true,
    in_app_notifications boolean NOT NULL DEFAULT true,
    attendance_notifications boolean NOT NULL DEFAULT true,
    academic_notifications boolean NOT NULL DEFAULT true,
    payment_notifications boolean NOT NULL DEFAULT true,
    communication_notifications boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profile_preferences
    ADD COLUMN IF NOT EXISTS notifications_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.profile_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profile_preferences FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.profile_preferences TO authenticated;

DROP POLICY IF EXISTS profile_preferences_owner_select ON public.profile_preferences;
CREATE POLICY profile_preferences_owner_select
ON public.profile_preferences FOR SELECT TO authenticated
USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profile_preferences_owner_insert ON public.profile_preferences;
CREATE POLICY profile_preferences_owner_insert
ON public.profile_preferences FOR INSERT TO authenticated
WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profile_preferences_owner_update ON public.profile_preferences;
CREATE POLICY profile_preferences_owner_update
ON public.profile_preferences FOR UPDATE TO authenticated
USING (profile_id = (SELECT auth.uid()))
WITH CHECK (profile_id = (SELECT auth.uid()));

NOTIFY pgrst, 'reload schema';
