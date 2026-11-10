ALTER TABLE public.student_updates
    ADD COLUMN audience_type text NOT NULL DEFAULT 'ALL'
        CHECK (audience_type IN ('ALL', 'GRADE', 'CLASSROOM', 'STUDENT')),
    ADD COLUMN academic_year_id uuid,
    ADD COLUMN target_level text,
    ADD COLUMN target_grade text;

ALTER TABLE public.student_updates
    ADD CONSTRAINT student_updates_academic_year_id_fkey
        FOREIGN KEY (academic_year_id)
        REFERENCES public.academic_years(id);

UPDATE public.student_updates AS updates
SET audience_type = CASE
    WHEN updates.student_id IS NOT NULL THEN 'STUDENT'
    WHEN updates.classroom_id IS NOT NULL THEN 'CLASSROOM'
    ELSE 'ALL'
END;

UPDATE public.student_updates
SET classroom_id = NULL
WHERE student_id IS NOT NULL;

UPDATE public.student_updates AS updates
SET academic_year_id = classrooms.academic_year_id
FROM public.classrooms AS classrooms
WHERE updates.classroom_id = classrooms.id
  AND updates.institution_id = classrooms.institution_id;

ALTER TABLE public.student_updates
    ADD CONSTRAINT student_updates_audience_target_check CHECK (
        (audience_type = 'ALL'
            AND academic_year_id IS NULL
            AND target_level IS NULL
            AND target_grade IS NULL)
        OR (audience_type = 'GRADE'
            AND academic_year_id IS NOT NULL
            AND target_level IS NOT NULL
            AND target_grade IS NOT NULL
            AND classroom_id IS NULL
            AND student_id IS NULL)
        OR (audience_type = 'CLASSROOM'
            AND academic_year_id IS NOT NULL
            AND classroom_id IS NOT NULL
            AND student_id IS NULL
            AND target_level IS NULL
            AND target_grade IS NULL)
        OR (audience_type = 'STUDENT'
            AND academic_year_id IS NULL
            AND target_level IS NULL
            AND target_grade IS NULL
            AND classroom_id IS NULL
            AND student_id IS NOT NULL)
    );

NOTIFY pgrst, 'reload schema';
