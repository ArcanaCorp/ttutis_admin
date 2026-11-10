-- Permite la gestión de la estructura académica únicamente a administradores activos.
-- Este cambio añade políticas de escritura y no habilita RLS ni altera las políticas de lectura existentes.

CREATE POLICY academic_classrooms_admin_insert
ON public.classrooms FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = classrooms.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_classrooms_admin_select
ON public.classrooms FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = classrooms.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_classrooms_admin_update
ON public.classrooms FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = classrooms.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = classrooms.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_classrooms_admin_delete
ON public.classrooms FOR DELETE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = classrooms.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_subjects_admin_insert
ON public.subjects FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = subjects.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_subjects_admin_select
ON public.subjects FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = subjects.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_subjects_admin_update
ON public.subjects FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = subjects.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = subjects.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_subjects_admin_delete
ON public.subjects FOR DELETE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = subjects.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_assignments_admin_insert
ON public.course_assignments FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = course_assignments.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_assignments_admin_select
ON public.course_assignments FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = course_assignments.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_assignments_admin_update
ON public.course_assignments FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = course_assignments.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = course_assignments.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_assignments_admin_delete
ON public.course_assignments FOR DELETE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = course_assignments.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_schedules_admin_insert
ON public.schedules FOR INSERT TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = schedules.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_schedules_admin_select
ON public.schedules FOR SELECT TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = schedules.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_schedules_admin_update
ON public.schedules FOR UPDATE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = schedules.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = schedules.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));

CREATE POLICY academic_schedules_admin_delete
ON public.schedules FOR DELETE TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.memberships AS membership
    WHERE membership.institution_id = schedules.institution_id
      AND membership.profile_id = (SELECT auth.uid())
      AND membership.role = 'ADMIN' AND membership.status = 'ACTIVE'
));
