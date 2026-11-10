import { randomBytes, randomInt } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const isEmail = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const clean = value => typeof value === "string" ? value.trim() : "";

const isIsoDate = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value;
};

const loginCode = () =>
    `S${String(randomInt(0, 100000000)).padStart(8, "0")}`;

const generatedStudentCode = () =>
    `ALU-${String(randomInt(0, 100000000)).padStart(8, "0")}`;

function errorResponse(message, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

function normalizePayload(payload) {
    const students = Array.isArray(payload.students) ? payload.students : [];
    const staff = Array.isArray(payload.staff) ? payload.staff : [];
    const guardians = Array.isArray(payload.guardians) ? payload.guardians : [];
    const links = [];

    guardians.forEach(guardian => {
        (Array.isArray(guardian.links) ? guardian.links : []).forEach(link => {
            links.push({
                guardian_email: clean(guardian.email).toLowerCase(),
                student_code: clean(link.student_code),
                student_id: clean(link.student_id),
                student_index: Number.isInteger(link.student_index)
                    ? link.student_index
                    : null,
                relationship: clean(link.relationship),
            });
        });
    });

    return { students, staff, guardians, links };
}

function validatePeople({ students, staff, guardians, links }) {
    const errors = [];

    if (students.length + staff.length + guardians.length > 500) {
        errors.push("La carga admite hasta 500 personas por solicitud.");
    }

    if (links.length > 1000) {
        errors.push("La carga admite hasta 1,000 vínculos apoderado-alumno.");
    }

    const emails = new Map();

    const rememberEmail = (emailValue, name, required, label) => {
        const email = clean(emailValue).toLowerCase();

        if (!email && required) {
            errors.push(`${label}: el correo es obligatorio para crear la cuenta.`);
        }

        if (email && !isEmail(email)) {
            errors.push(`${label}: el correo no tiene un formato válido.`);
        }

        if (email) {
            const priorName = emails.get(email);

            if (priorName && priorName !== clean(name)) {
                errors.push(`El correo ${email} aparece con nombres distintos.`);
            } else {
                emails.set(email, clean(name));
            }
        }

        return email;
    };

    students.forEach((student, index) => {
        if (!clean(student.first_names) || !clean(student.last_names)) {
            errors.push(`Alumno ${index + 1}: nombres y apellidos son obligatorios.`);
        }

        rememberEmail(
            student.email,
            `${clean(student.first_names)} ${clean(student.last_names)}`,
            true,
            `Alumno ${index + 1}`
        );

        ["birth_date", "admission_date"].forEach(field => {
            const date = clean(student[field]);

            if (date && !isIsoDate(date)) {
                errors.push(
                    `Alumno ${index + 1}: ${field} debe ser una fecha válida con formato AAAA-MM-DD.`
                );
            }
        });
    });

    staff.forEach((person, index) => {
        if (!["TEACHER", "ASSISTANT"].includes(person.role)) {
            errors.push(`Personal ${index + 1}: rol no permitido.`);
        }

        if (!clean(person.full_name)) {
            errors.push(`Personal ${index + 1}: el nombre es obligatorio.`);
        }

        rememberEmail(
            person.email,
            person.full_name,
            true,
            `Personal ${index + 1}`
        );
    });

    const staffKeys = new Set();

    staff.forEach(person => {
        const key = `${person.role}|${clean(person.email).toLowerCase()}`;

        if (staffKeys.has(key)) {
            errors.push(
                `El correo ${clean(person.email)} está duplicado para ${person.role}.`
            );
        }

        staffKeys.add(key);
    });

    const studentEmails = students
        .map(student => clean(student.email).toLowerCase())
        .filter(Boolean);

    if (new Set(studentEmails).size !== studentEmails.length) {
        errors.push("Cada alumno debe usar un correo distinto para su cuenta.");
    }

    const guardianEmails = guardians
        .map(guardian => clean(guardian.email).toLowerCase())
        .filter(Boolean);

    if (new Set(guardianEmails).size !== guardianEmails.length) {
        errors.push(
            "Cada apoderado debe aparecer una sola vez; agrega todos sus vínculos en una fila."
        );
    }

    guardians.forEach((guardian, index) => {
        if (!clean(guardian.full_name)) {
            errors.push(`Apoderado ${index + 1}: el nombre es obligatorio.`);
        }

        rememberEmail(
            guardian.email,
            guardian.full_name,
            true,
            `Apoderado ${index + 1}`
        );

        if (!Array.isArray(guardian.links) || !guardian.links.length) {
            errors.push(
                `Apoderado ${index + 1}: vincúlalo al menos con un alumno.`
            );
        }
    });

    links.forEach((link, index) => {
        if (!link.guardian_email) {
            errors.push(`Vínculo ${index + 1}: correo de apoderado vacío.`);
        }

        if (
            !link.student_code &&
            !link.student_id &&
            link.student_index === null
        ) {
            errors.push(
                `Vínculo ${index + 1}: indica el código, ID o posición del alumno.`
            );
        }

        if (!link.relationship) {
            errors.push(`Vínculo ${index + 1}: indica el parentesco.`);
        }
    });

    const linkKeys = new Set();

    links.forEach((link, index) => {
        const student =
            link.student_id ||
            link.student_code ||
            `row-${link.student_index}`;

        const key = `${link.guardian_email}|${student}`.toLowerCase();

        if (linkKeys.has(key)) {
            errors.push(`Vínculo ${index + 1}: relación duplicada en la carga.`);
        }

        linkKeys.add(key);
    });

    const studentCodes = students
        .map(student => clean(student.student_code).toLowerCase())
        .filter(Boolean);

    if (new Set(studentCodes).size !== studentCodes.length) {
        errors.push("Hay códigos de alumno duplicados en la carga.");
    }

    return errors;
}

async function listAuthUsers(adminClient) {
    const usersByEmail = new Map();

    for (let page = 1; page <= 50; page += 1) {
        const { data, error } = await adminClient.auth.admin.listUsers({
            page,
            perPage: 1000,
        });

        if (error) throw error;

        const users = data?.users ?? [];

        users.forEach(user => {
            if (user.email) {
                usersByEmail.set(user.email.toLowerCase(), user);
            }
        });

        if (users.length < 1000) break;
    }

    return usersByEmail;
}

export async function POST(request) {
    try {
        const sessionClient = await createClient();

        const {
            data: { user },
            error: userError,
        } = await sessionClient.auth.getUser();

        if (userError || !user) {
            return errorResponse("Inicia sesión para registrar personas.", 401);
        }

        const payload = await request.json();
        const institutionId = clean(payload?.institutionId);

        if (
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                institutionId
            )
        ) {
            return errorResponse("Selecciona una institución válida.");
        }

        const { students, staff, guardians, links } =
            normalizePayload(payload ?? {});

        const validationErrors = validatePeople({
            students,
            staff,
            guardians,
            links,
        });

        if (validationErrors.length) {
            return errorResponse(validationErrors.slice(0, 30).join("\n"));
        }

        if (!students.length && !staff.length && !guardians.length) {
            return errorResponse("No hay personas para registrar.");
        }

        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

        if (!serviceRoleKey || !supabaseUrl) {
            return errorResponse(
                "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor para crear las cuentas y los perfiles.",
                503
            );
        }

        const adminClient = createAdminClient(user.id);

        const { data: adminMembership, error: membershipError } =
            await adminClient
                .from("memberships")
                .select("id")
                .eq("institution_id", institutionId)
                .eq("profile_id", user.id)
                .eq("role", "ADMIN")
                .eq("status", "ACTIVE")
                .maybeSingle();

        if (membershipError) throw membershipError;

        if (!adminMembership) {
            return errorResponse(
                "Necesitas una membresía ADMIN activa en esta institución.",
                403
            );
        }

        // Recopilar correos para crear las cuentas.
        const emailsToInvite = new Map();

        [...staff, ...guardians, ...students].forEach(person => {
            const email = clean(person.email).toLowerCase();

            if (email && !emailsToInvite.has(email)) {
                emailsToInvite.set(
                    email,
                    clean(person.full_name) ||
                    `${clean(person.first_names)} ${clean(person.last_names)}`.trim()
                );
            }
        });

        // Consultar usuarios existentes.
        const existingUsers = await listAuthUsers(adminClient);

        const membershipEmails = [...new Set([
            ...staff.map(person => clean(person.email).toLowerCase()),
            ...students.map(student => clean(student.email).toLowerCase()).filter(Boolean),
        ])];

        const membershipProfileIds = membershipEmails
            .map(email => existingUsers.get(email)?.id)
            .filter(Boolean);

        if (membershipProfileIds.length) {
            const { data: existingMemberships, error } = await adminClient
                .from("memberships")
                .select("profile_id,role")
                .eq("institution_id", institutionId)
                .in("profile_id", membershipProfileIds);

            if (error) throw error;

            if (existingMemberships?.length) {
                return errorResponse(
                    "Una o más cuentas ya tienen una membresía en esta institución; revisa duplicados antes de continuar.",
                    409
                );
            }
        }

        // Consultar códigos de alumnos existentes.
        const { data: existingStudentRows, error: studentsQueryError } =
            await adminClient
                .from("students")
                .select("student_code")
                .eq("institution_id", institutionId)
                .not("student_code", "is", null);

        if (studentsQueryError) throw studentsQueryError;

        const usedStudentCodes = new Set(
            (existingStudentRows ?? []).map(row =>
                clean(row.student_code).toLowerCase()
            )
        );

        for (const [index, student] of students.entries()) {
            let code = clean(student.student_code);

            if (!code) {
                do {
                    code = generatedStudentCode();
                } while (usedStudentCodes.has(code.toLowerCase()));
            }

            if (usedStudentCodes.has(code.toLowerCase())) {
                return errorResponse(
                    `Alumno ${index + 1}: el código ${code} ya existe en esta institución o en esta carga.`,
                    409
                );
            }

            usedStudentCodes.add(code.toLowerCase());
            student.student_code = code;
        }

        // Resolver vínculos con alumnos de la carga.
        links.forEach(link => {
            if (link.student_index !== null) {
                const student = students[link.student_index];

                if (!student) return;

                link.student_code = clean(student.student_code);
            }
        });

        if (
            links.some(
                link =>
                    link.student_index !== null &&
                    !students[link.student_index]
            )
        ) {
            return errorResponse(
                "Un vínculo hace referencia a un alumno que no está en la carga."
            );
        }

        // Validar alumnos existentes vinculados.
        const requestedExistingStudentIds = [
            ...new Set(links.map(link => link.student_id).filter(Boolean)),
        ];

        if (requestedExistingStudentIds.length) {
            const { data: institutionStudents, error } = await adminClient
                .from("students")
                .select("id")
                .eq("institution_id", institutionId)
                .in("id", requestedExistingStudentIds);

            if (error) throw error;

            if (
                (institutionStudents ?? []).length !==
                requestedExistingStudentIds.length
            ) {
                return errorResponse(
                    "Uno o más alumnos vinculados no pertenecen a esta institución.",
                    400
                );
            }
        }

        const profilesByEmail = new Map();

        const createdAuthUserIds = [];
        const insertedMembershipIds = [];
        const insertedStudentIds = [];
        const insertedLinkIds = [];
        const createdProfileIds = [];

        // Revertir los registros si ocurre algún error.
        const rollback = async () => {
            if (insertedLinkIds.length) {
                await adminClient
                    .from("guardian_student_links")
                    .delete()
                    .in("id", insertedLinkIds);
            }

            if (insertedStudentIds.length) {
                await adminClient
                    .from("students")
                    .delete()
                    .in("id", insertedStudentIds);
            }

            if (insertedMembershipIds.length) {
                await adminClient
                    .from("memberships")
                    .delete()
                    .in("id", insertedMembershipIds);
            }

            if (createdProfileIds.length) {
                await adminClient
                    .from("profiles")
                    .delete()
                    .in("id", createdProfileIds);
            }

            for (const userId of createdAuthUserIds) {
                await adminClient.auth.admin.deleteUser(userId);
            }
        };

        try {
            // CREAR CUENTAS SIN ENVIAR CORREOS.
            for (const [email, fullName] of emailsToInvite) {
                let authUser = existingUsers.get(email);

                if (!authUser) {
                    const { data, error } =
                        await adminClient.auth.admin.createUser({
                            email,

                            // Confirmación automática del correo.
                            email_confirm: true,

                            // Contraseña aleatoria segura.
                            password: randomBytes(32).toString("hex"),

                            user_metadata: {
                                display_name: fullName,
                            },
                        });

                    if (error) {
                        throw new Error(
                            `No se pudo crear la cuenta de ${email}: ${error.message}`
                        );
                    }

                    authUser = data.user;

                    if (!authUser) {
                        throw new Error(
                            `Supabase no devolvió la cuenta creada para ${email}.`
                        );
                    }

                    createdAuthUserIds.push(authUser.id);
                }

                profilesByEmail.set(email, authUser.id);
            }

            // CREAR PERFILES.
            const profileIds = [...new Set(profilesByEmail.values())];

            if (profileIds.length) {
                const {
                    data: existingProfiles,
                    error,
                } = await adminClient
                    .from("profiles")
                    .select("id")
                    .in("id", profileIds);

                if (error) throw error;

                const existingProfileIds = new Set(
                    (existingProfiles ?? []).map(profile => profile.id)
                );

                const profilesToCreate = profileIds
                    .filter(id => !existingProfileIds.has(id))
                    .map(id => ({
                        id,
                        display_name:
                            [...emailsToInvite].find(
                                ([email]) => profilesByEmail.get(email) === id
                            )?.[1] ?? null,
                    }));

                if (profilesToCreate.length) {
                    const {
                        data,
                        error: profileError,
                    } = await adminClient
                        .from("profiles")
                        .insert(profilesToCreate)
                        .select("id");

                    if (profileError) throw profileError;

                    createdProfileIds.push(
                        ...(data ?? []).map(profile => profile.id)
                    );
                }
            }

            // PREPARAR ALUMNOS Y MEMBRESÍAS.
            const studentIdByCode = new Map();
            const studentsToCreate = [];
            const membershipsToCreate = [];

            for (let index = 0; index < students.length; index += 1) {
                const student = students[index];
                const code = clean(student.student_code);

                studentIdByCode.set(code.toLowerCase(), null);

                const email = clean(student.email).toLowerCase();
                const profileId = email
                    ? profilesByEmail.get(email)
                    : null;

                let codeForLogin = loginCode();

                for (let attempt = 0; attempt < 5; attempt += 1) {
                    const {
                        data: existingLogin,
                        error,
                    } = await adminClient
                        .from("memberships")
                        .select("id")
                        .eq("login_code", codeForLogin)
                        .maybeSingle();

                    if (error) throw error;

                    if (!existingLogin) break;

                    codeForLogin = loginCode();
                }

                membershipsToCreate.push({
                    institution_id: institutionId,
                    profile_id: profileId,
                    full_name: `${clean(student.first_names)} ${clean(student.last_names)}`.trim(),
                    email: email || null,
                    role: "STUDENT",
                    login_code: codeForLogin,
                    status: "ACTIVE",
                    __studentIndex: index,
                    __loginCode: codeForLogin,
                });

                studentsToCreate.push({
                    institution_id: institutionId,
                    first_names: clean(student.first_names),
                    last_names: clean(student.last_names),
                    document_type: clean(student.document_type) || null,
                    document_number: clean(student.document_number) || null,
                    birth_date: clean(student.birth_date) || null,
                    phone: clean(student.phone) || null,
                    email: email || null,
                    student_code: code,
                    admission_date: clean(student.admission_date) || null,
                    status: "ACTIVE",
                    __code: code.toLowerCase(),
                });
            }

            // INSERTAR MEMBRESÍAS.
            const membershipRows = [
                ...membershipsToCreate.map(
                    ({ __studentIndex, __loginCode, ...membership }) =>
                        membership
                ),

                ...staff.map(person => ({
                    institution_id: institutionId,
                    profile_id: profilesByEmail.get(
                        clean(person.email).toLowerCase()
                    ),
                    full_name: clean(person.full_name),
                    email: clean(person.email).toLowerCase(),
                    role: person.role,
                    status: "ACTIVE",
                })),
            ];

            if (membershipRows.length) {
                const { data, error } = await adminClient
                    .from("memberships")
                    .insert(membershipRows)
                    .select(
                        "id,role,profile_id,login_code,full_name,email"
                    );

                if (error) throw error;

                insertedMembershipIds.push(
                    ...(data ?? []).map(item => item.id)
                );

                studentsToCreate.forEach((student, index) => {
                    const membership = (data ?? []).find(
                        item =>
                            item.login_code ===
                            membershipsToCreate[index].__loginCode
                    );

                    if (!membership) {
                        throw new Error(
                            "No se pudo relacionar la cuenta con el registro del alumno."
                        );
                    }

                    student.membership_id = membership.id;
                    studentIdByCode.set(student.__code, null);
                    student.student_login_code = membership.login_code;

                    delete student.__code;
                });
            }

            // INSERTAR ALUMNOS.
            if (studentsToCreate.length) {
                const { data, error } = await adminClient
                    .from("students")
                    .insert(
                        studentsToCreate.map(
                            ({ student_login_code, ...student }) => student
                        )
                    )
                    .select("id,student_code");

                if (error) throw error;

                insertedStudentIds.push(
                    ...(data ?? []).map(item => item.id)
                );

                (data ?? []).forEach(student => {
                    studentIdByCode.set(
                        student.student_code.toLowerCase(),
                        student.id
                    );
                });
            }

            // PREPARAR VÍNCULOS DE APODERADOS.
            const guardianLinkRows = links.map(link => {
                const guardianProfileId = profilesByEmail.get(
                    link.guardian_email
                );

                const studentId =
                    link.student_id ||
                    studentIdByCode.get(link.student_code.toLowerCase());

                if (!guardianProfileId) {
                    throw new Error(
                        `No se creó la cuenta del apoderado ${link.guardian_email}.`
                    );
                }

                if (!studentId) {
                    throw new Error(
                        `No se encontró el alumno ${link.student_code}.`
                    );
                }

                return {
                    institution_id: institutionId,
                    guardian_profile_id: guardianProfileId,
                    student_id: studentId,
                    relationship: link.relationship,
                    status: "PENDING",
                };
            });

            // INSERTAR VÍNCULOS.
            if (guardianLinkRows.length) {
                const { data, error } = await adminClient
                    .from("guardian_student_links")
                    .insert(guardianLinkRows)
                    .select("id");

                if (error) throw error;

                insertedLinkIds.push(
                    ...(data ?? []).map(item => item.id)
                );
            }

            // RESPUESTA EXITOSA.
            return NextResponse.json({
                success: true,
                studentsCreated: studentsToCreate.length,
                staffCreated: staff.length,
                guardiansLinked: guardianLinkRows.length,
                accountsCreated: createdAuthUserIds.length,
            });

        } catch (error) {
            await rollback();
            throw error;
        }

    } catch (error) {
        console.error(
            "No se pudieron registrar las personas.",
            error
        );

        return errorResponse(
            error.message || "No se pudieron registrar las personas.",
            500
        );
    }
}
