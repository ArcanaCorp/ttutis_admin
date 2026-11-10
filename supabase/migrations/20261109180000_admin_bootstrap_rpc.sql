create or replace function public.bootstrap_admin_institution(
    p_full_name text,
    p_legal_name text,
    p_slug text,
    p_trade_name text default null,
    p_tax_id text default null,
    p_institution_email text default null,
    p_phone text default null,
    p_website text default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
    v_user_id uuid := auth.uid();
    v_user_email text;
    v_institution_id uuid;
begin
    if v_user_id is null then
        raise exception 'Se requiere una sesión autenticada.' using errcode = '28000';
    end if;

    if nullif(btrim(p_full_name), '') is null
       or nullif(btrim(p_legal_name), '') is null
       or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
        raise exception 'El nombre, la razón social y el identificador del colegio son obligatorios.' using errcode = '22023';
    end if;

    if not exists (
        select 1
        from public.profiles as profile
        where profile.id = v_user_id
    ) then
        raise exception 'No existe el perfil asociado a la cuenta autenticada.' using errcode = '23503';
    end if;

    if exists (
        select 1
        from public.memberships as membership
        where membership.profile_id = v_user_id
    ) then
        raise exception 'Esta cuenta ya tiene una membresía institucional.' using errcode = '23505';
    end if;

    select auth_user.email
      into v_user_email
      from auth.users as auth_user
     where auth_user.id = v_user_id;

    update public.profiles
       set display_name = btrim(p_full_name)
     where id = v_user_id;

    insert into public.institutions (
        legal_name,
        trade_name,
        slug,
        tax_id,
        email,
        phone,
        website
    ) values (
        btrim(p_legal_name),
        nullif(btrim(p_trade_name), ''),
        btrim(p_slug),
        nullif(btrim(p_tax_id), ''),
        nullif(btrim(p_institution_email), ''),
        nullif(btrim(p_phone), ''),
        nullif(btrim(p_website), '')
    ) returning id into v_institution_id;

    insert into public.memberships (
        institution_id,
        profile_id,
        full_name,
        email,
        role,
        status
    ) values (
        v_institution_id,
        v_user_id,
        btrim(p_full_name),
        v_user_email,
        'ADMIN',
        'ACTIVE'
    );

    return v_institution_id;
end;
$function$;

revoke all on function public.bootstrap_admin_institution(text, text, text, text, text, text, text, text) from public;
revoke all on function public.bootstrap_admin_institution(text, text, text, text, text, text, text, text) from anon;
grant execute on function public.bootstrap_admin_institution(text, text, text, text, text, text, text, text) to authenticated;
