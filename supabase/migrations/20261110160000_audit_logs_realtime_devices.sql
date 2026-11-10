ALTER TABLE public.user_devices
    ALTER COLUMN push_token DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS device_key text,
    ADD COLUMN IF NOT EXISTS device_name text;

UPDATE public.user_devices
SET device_key = 'legacy:' || id::text
WHERE device_key IS NULL;

ALTER TABLE public.user_devices
    ALTER COLUMN device_key SET DEFAULT gen_random_uuid()::text,
    ALTER COLUMN device_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS user_devices_profile_device_key_key
    ON public.user_devices (profile_id, device_key);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_profile_id uuid,
    subject_profile_id uuid,
    institution_id uuid,
    event_type text NOT NULL,
    resource_table text,
    resource_id text,
    changed_fields text[] NOT NULL DEFAULT '{}',
    old_values jsonb,
    new_values jsonb,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_institution_created_idx
    ON public.audit_logs (institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_actor_created_idx
    ON public.audit_logs (actor_profile_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_subject_created_idx
    ON public.audit_logs (subject_profile_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.institution_change_pulses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id uuid NOT NULL,
    resource_table text NOT NULL,
    event_type text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS institution_change_pulses_created_idx
    ON public.institution_change_pulses (institution_id, created_at DESC);

ALTER TABLE public.institution_change_pulses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.institution_change_pulses FROM anon;
REVOKE ALL ON public.institution_change_pulses FROM authenticated;
GRANT SELECT ON public.institution_change_pulses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.institution_change_pulses TO service_role;

DROP POLICY IF EXISTS institution_change_pulses_member_select
    ON public.institution_change_pulses;
CREATE POLICY institution_change_pulses_member_select
ON public.institution_change_pulses FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.profile_id = (SELECT auth.uid())
          AND membership.institution_id = institution_change_pulses.institution_id
          AND membership.status = 'ACTIVE'
    )
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.audit_logs FROM authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_logs TO service_role;

DROP POLICY IF EXISTS audit_logs_owner_select ON public.audit_logs;
CREATE POLICY audit_logs_owner_select
ON public.audit_logs FOR SELECT TO authenticated
USING (
    actor_profile_id = (SELECT auth.uid())
    OR subject_profile_id = (SELECT auth.uid())
    OR EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.profile_id = (SELECT auth.uid())
          AND membership.institution_id = audit_logs.institution_id
          AND membership.role = 'ADMIN'
          AND membership.status = 'ACTIVE'
    )
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_devices FROM anon;
REVOKE ALL ON public.user_devices FROM authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_devices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_devices TO service_role;

DROP POLICY IF EXISTS user_devices_owner_select ON public.user_devices;
CREATE POLICY user_devices_owner_select
ON public.user_devices FOR SELECT TO authenticated
USING (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_devices_owner_insert ON public.user_devices;
CREATE POLICY user_devices_owner_insert
ON public.user_devices FOR INSERT TO authenticated
WITH CHECK (profile_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS user_devices_owner_update ON public.user_devices;
CREATE POLICY user_devices_owner_update
ON public.user_devices FOR UPDATE TO authenticated
USING (profile_id = (SELECT auth.uid()))
WITH CHECK (profile_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION public.audit_redact_row(source_row jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    field_name text;
    field_value jsonb;
    safe_row jsonb := '{}'::jsonb;
BEGIN
    IF source_row IS NULL THEN
        RETURN NULL;
    END IF;

    IF jsonb_typeof(source_row) = 'array' THEN
        SELECT COALESCE(jsonb_agg(public.audit_redact_row(item)), '[]'::jsonb)
        INTO safe_row
        FROM jsonb_array_elements(source_row) AS items(item);
        RETURN safe_row;
    END IF;

    IF jsonb_typeof(source_row) <> 'object' THEN
        RETURN source_row;
    END IF;

    FOR field_name, field_value IN
        SELECT key, value
        FROM jsonb_each(source_row)
    LOOP
        IF field_name ~* '(password|token|secret|access_code|login_code|device_key|email|phone|document|birth|name|address|description|body|notes|reference|qr_hash|claim_hash)' THEN
            safe_row := safe_row || jsonb_build_object(field_name, '[REDACTED]');
        ELSE
            safe_row := safe_row || jsonb_build_object(
                field_name,
                CASE
                    WHEN jsonb_typeof(field_value) IN ('object', 'array')
                    THEN public.audit_redact_row(field_value)
                    ELSE field_value
                END
            );
        END IF;
    END LOOP;

    RETURN safe_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.capture_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    old_row jsonb;
    new_row jsonb;
    source_row jsonb;
    actor_id uuid;
    subject_id uuid;
    institution_uuid uuid;
    row_id text;
    event_name text;
    changed text[] := '{}';
    request_headers jsonb;
    subject_text text;
    related_institution uuid;
BEGIN
    IF TG_OP <> 'INSERT' THEN
        old_row := to_jsonb(OLD);
    END IF;
    IF TG_OP <> 'DELETE' THEN
        new_row := to_jsonb(NEW);
    END IF;

    source_row := COALESCE(new_row, old_row);
    actor_id := auth.uid();

    IF actor_id IS NULL THEN
        BEGIN
            request_headers := NULLIF(current_setting('request.headers', true), '')::jsonb;
            actor_id := NULLIF(request_headers ->> 'x-ttutis-actor-id', '')::uuid;
        EXCEPTION WHEN OTHERS THEN
            actor_id := NULL;
        END;
    END IF;

    BEGIN
        institution_uuid := NULLIF(COALESCE(new_row ->> 'institution_id', old_row ->> 'institution_id'), '')::uuid;
        IF institution_uuid IS NULL AND TG_TABLE_NAME = 'institutions' THEN
            institution_uuid := NULLIF(COALESCE(new_row ->> 'id', old_row ->> 'id'), '')::uuid;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        institution_uuid := NULL;
    END;

    subject_text := COALESCE(
        source_row ->> 'profile_id',
        source_row ->> 'guardian_profile_id',
        source_row ->> 'requester_profile_id',
        source_row ->> 'uploaded_by_profile_id'
    );
    IF TG_TABLE_NAME = 'profiles' THEN
        subject_text := source_row ->> 'id';
    END IF;

    BEGIN
        subject_id := NULLIF(subject_text, '')::uuid;
    EXCEPTION WHEN OTHERS THEN
        subject_id := NULL;
    END;

    row_id := COALESCE(
        source_row ->> 'id',
        source_row ->> 'profile_id',
        source_row ->> 'device_key',
        source_row ->> 'student_id',
        source_row ->> 'billing_rule_id'
    );

    event_name := 'DB_' || TG_OP;
    IF TG_TABLE_NAME = 'profiles' AND (
        TG_OP = 'DELETE'
        OR (TG_OP = 'UPDATE' AND new_row ->> 'status' = 'DELETED')
    ) THEN
        event_name := 'ACCOUNT_CLOSED';
    END IF;

    IF TG_OP = 'UPDATE' THEN
        SELECT COALESCE(array_agg(fields.key ORDER BY fields.key), '{}')
        INTO changed
        FROM (
            SELECT key
            FROM jsonb_each(new_row)
            WHERE old_row -> key IS DISTINCT FROM value
            UNION
            SELECT key
            FROM jsonb_each(old_row)
            WHERE new_row -> key IS DISTINCT FROM value
        ) AS fields;
    ELSIF TG_OP = 'INSERT' THEN
        SELECT COALESCE(array_agg(key ORDER BY key), '{}')
        INTO changed
        FROM jsonb_object_keys(new_row) AS keys(key);
    ELSE
        SELECT COALESCE(array_agg(key ORDER BY key), '{}')
        INTO changed
        FROM jsonb_object_keys(old_row) AS keys(key);
    END IF;

    INSERT INTO public.audit_logs (
        actor_profile_id,
        subject_profile_id,
        institution_id,
        event_type,
        resource_table,
        resource_id,
        changed_fields,
        old_values,
        new_values,
        metadata
    ) VALUES (
        actor_id,
        subject_id,
        institution_uuid,
        event_name,
        TG_TABLE_NAME,
        row_id,
        changed,
        public.audit_redact_row(old_row),
        public.audit_redact_row(new_row),
        jsonb_build_object(
            'source', 'database_trigger',
            'operation', TG_OP,
            'transaction_id', txid_current()
        )
    );

    IF institution_uuid IS NOT NULL THEN
        INSERT INTO public.institution_change_pulses (
            institution_id,
            resource_table,
            event_type
        ) VALUES (
            institution_uuid,
            TG_TABLE_NAME,
            event_name
        );
    ELSIF TG_TABLE_NAME = 'profiles' AND subject_id IS NOT NULL THEN
        FOR related_institution IN
            SELECT membership.institution_id
            FROM public.memberships AS membership
            WHERE membership.profile_id = subject_id
              AND membership.status = 'ACTIVE'
            UNION
            SELECT guardian_link.institution_id
            FROM public.guardian_student_links AS guardian_link
            WHERE guardian_link.guardian_profile_id = subject_id
              AND guardian_link.status = 'ACTIVE'
        LOOP
            INSERT INTO public.institution_change_pulses (
                institution_id,
                resource_table,
                event_type
            ) VALUES (
                related_institution,
                TG_TABLE_NAME,
                event_name
            );
        END LOOP;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DO $$
DECLARE
    table_record record;
BEGIN
    FOR table_record IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename <> 'audit_logs'
          AND tablename <> 'institution_change_pulses'
          AND tablename <> 'app_audit_events'
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS audit_log_changes ON public.%I',
            table_record.tablename
        );
        EXECUTE format(
            'CREATE TRIGGER audit_log_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.capture_audit_log()',
            table_record.tablename
        );
    END LOOP;
END;
$$;

CREATE TABLE IF NOT EXISTS public.app_audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_profile_id uuid NOT NULL,
    event_type text NOT NULL CHECK (
        event_type = ANY (ARRAY['LOGIN_SUCCESS'::text, 'LOGOUT'::text, 'ACCOUNT_SIGNUP'::text, 'PASSWORD_CHANGED'::text])
    ),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.app_audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.app_audit_events FROM anon;
REVOKE ALL ON public.app_audit_events FROM authenticated;
GRANT SELECT ON public.app_audit_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_audit_events TO service_role;

DROP POLICY IF EXISTS app_audit_events_owner_select ON public.app_audit_events;
CREATE POLICY app_audit_events_owner_select
ON public.app_audit_events FOR SELECT TO authenticated
USING (actor_profile_id = (SELECT auth.uid()));

DROP TRIGGER IF EXISTS app_audit_events_capture ON public.app_audit_events;
CREATE TRIGGER app_audit_events_capture
AFTER INSERT OR UPDATE OR DELETE ON public.app_audit_events
FOR EACH ROW EXECUTE FUNCTION public.capture_audit_log();

DO $$
DECLARE
    table_record record;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        EXECUTE 'CREATE PUBLICATION supabase_realtime';
    END IF;

    FOR table_record IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = table_record.schemaname
              AND tablename = table_record.tablename
        ) THEN
            EXECUTE format(
                'ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I',
                table_record.schemaname,
                table_record.tablename
            );
        END IF;
    END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
