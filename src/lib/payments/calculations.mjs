export function dateOnly(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;

    const date = new Date(Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
    ));

    return date.toISOString().slice(0, 10) === value ? value : null;
}

export function positiveMoney(value) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount > 0
        ? Math.round((amount + Number.EPSILON) * 100) / 100
        : null;
}

function firstDueDate(rule) {
    const start = new Date(`${rule.starts_on}T00:00:00Z`);

    if (rule.frequency === "ONCE") return start;

    if (rule.frequency === "WEEKLY") {
        start.setUTCDate(start.getUTCDate() + 7);
        return start;
    }

    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() + 1);
    return monthlyDueDate(start.getUTCFullYear(), start.getUTCMonth(), rule.due_day);
}

function monthlyDueDate(year, month, requestedDay) {
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return new Date(Date.UTC(year, month, Math.min(Number(requestedDay), lastDay)));
}

export function getRuleDates(rule, throughDate) {
    const limitDate = dateOnly(throughDate);
    if (!limitDate) throw new Error("La fecha final para generar obligaciones no es válida.");

    const endDate = rule.ends_on && rule.ends_on < limitDate
        ? rule.ends_on
        : limitDate;
    const dates = [];
    let dueDate = firstDueDate(rule);

    while (dueDate && dueDate.toISOString().slice(0, 10) <= endDate) {
        dates.push(dueDate.toISOString().slice(0, 10));
        if (dates.length > 1200) {
            throw new Error("La regla genera más de 1,200 periodos. Reduce su vigencia antes de continuar.");
        }
        if (rule.frequency === "ONCE") break;
        if (rule.frequency === "WEEKLY") {
            dueDate.setUTCDate(dueDate.getUTCDate() + 7);
        } else {
            dueDate = monthlyDueDate(
                dueDate.getUTCFullYear(),
                dueDate.getUTCMonth() + 1,
                rule.due_day,
            );
        }
    }

    return dates;
}

export function getCalculatedFeeStatus(fee, today) {
    if (fee.status === "WAIVED") return "WAIVED";

    const balance = calculateFeeBalance(fee);

    if (balance <= 0) return "PAID";
    if (fee.due_date && fee.due_date < today) return "OVERDUE";
    if (Number(fee.paid_amount || 0) > 0) return "PARTIAL";
    return "UNPAID";
}

export function calculateFeeBalance(fee) {
    const amount = Number(fee.amount || 0);
    const paid = Number(fee.paid_amount || 0);
    return Math.max(0, Math.round((amount - paid + Number.EPSILON) * 100) / 100);
}

export function getRuleStudentIds({
    rule,
    enrollments,
    classrooms,
    students,
    selectedStudentIds = [],
}) {
    const activeStudentIds = new Set(
        students.filter(student => student.status === "ACTIVE").map(student => student.id),
    );
    const activeEnrollments = enrollments.filter(enrollment =>
        enrollment.academic_year_id === rule.academic_year_id
        && enrollment.status === "ACTIVE"
        && activeStudentIds.has(enrollment.student_id),
    );

    if (rule.scope_type === "STUDENTS") {
        const selectedIds = new Set(selectedStudentIds);
        return [...new Set(activeEnrollments
            .filter(enrollment => selectedIds.has(enrollment.student_id))
            .map(enrollment => enrollment.student_id))];
    }

    const matchingClassroomIds = new Set(classrooms
        .filter(classroom => {
            if (classroom.academic_year_id !== rule.academic_year_id) return false;
            if (classroom.status !== "ACTIVE") return false;
            if (rule.scope_type === "CLASSROOM") return classroom.id === rule.classroom_id;
            if (rule.scope_type === "LEVEL") return classroom.level === rule.target_level;
            if (rule.scope_type === "GRADE") {
                return classroom.level === rule.target_level
                    && classroom.grade_label === rule.target_grade;
            }
            return rule.scope_type === "INSTITUTION";
        })
        .map(classroom => classroom.id));

    return [...new Set(activeEnrollments
        .filter(enrollment => matchingClassroomIds.has(enrollment.classroom_id))
        .map(enrollment => enrollment.student_id))];
}
