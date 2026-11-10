import test from "node:test";
import assert from "node:assert/strict";
import { fetchAllPages, paginate } from "../src/lib/pagination.mjs";
import {
    dateOnly,
    calculateFeeBalance,
    getCalculatedFeeStatus,
    getRuleDates,
    getRuleStudentIds,
    positiveMoney,
} from "../src/lib/payments/calculations.mjs";

test("paginate shows correct ranges and clamps out-of-range pages", () => {
    const records = Array.from({ length: 51 }, (_, index) => index + 1);
    const firstPage = paginate(records, 1, 25);
    const lastPage = paginate(records, 99, 25);

    assert.deepEqual(firstPage.items, records.slice(0, 25));
    assert.equal(firstPage.from, 1);
    assert.equal(firstPage.to, 25);
    assert.equal(firstPage.pageCount, 3);
    assert.equal(lastPage.page, 3);
    assert.deepEqual(lastPage.items, [51]);
    assert.deepEqual(paginate([], 3, 0), {
        items: [],
        page: 1,
        pageCount: 1,
        pageSize: 25,
        total: 0,
        from: 0,
        to: 0,
    });
});

test("fetchAllPages retrieves each page and stops on a short page", async () => {
    const records = Array.from({ length: 7 }, (_, index) => index);
    const ranges = [];
    const result = await fetchAllPages(async ({ from, to }) => {
        ranges.push([from, to]);
        return { data: records.slice(from, to + 1), error: null };
    }, { pageSize: 3 });

    assert.deepEqual(result, records);
    assert.deepEqual(ranges, [[0, 2], [3, 5], [6, 8]]);
});

test("fetchAllPages propagates database errors and protects against runaway results", async () => {
    await assert.rejects(
        fetchAllPages(async () => ({ data: null, error: new Error("database unavailable") })),
        /database unavailable/,
    );
    await assert.rejects(
        fetchAllPages(async ({ from, to }) => ({
            data: Array(to - from + 1).fill({ id: "same" }),
            error: null,
        }), { pageSize: 2, maxRows: 4 }),
        /máximo seguro de 4 registros/,
    );
});

test("dateOnly rejects impossible calendar dates and positiveMoney rounds to cents", () => {
    assert.equal(dateOnly("2024-02-29"), "2024-02-29");
    assert.equal(dateOnly("2025-02-29"), null);
    assert.equal(dateOnly("2025-2-09"), null);
    assert.equal(positiveMoney("19.995"), 20);
    assert.equal(positiveMoney("1.005"), 1.01);
    assert.equal(positiveMoney("0"), null);
    assert.equal(positiveMoney("NaN"), null);
});

test("monthly billing dates clamp to month end and respect rule end date", () => {
    const rule = {
        starts_on: "2024-01-31",
        ends_on: "2024-04-15",
        frequency: "MONTHLY",
        due_day: 31,
    };

    assert.deepEqual(getRuleDates(rule, "2024-12-31"), [
        "2024-02-29",
        "2024-03-31",
    ]);
});

test("one-time and weekly billing periods do not create extra installments", () => {
    assert.deepEqual(getRuleDates({
        starts_on: "2026-01-10",
        frequency: "ONCE",
    }, "2026-12-31"), ["2026-01-10"]);

    assert.deepEqual(getRuleDates({
        starts_on: "2026-01-01",
        ends_on: "2026-01-17",
        frequency: "WEEKLY",
    }, "2026-01-31"), ["2026-01-08", "2026-01-15"]);

    assert.throws(
        () => getRuleDates({ starts_on: "2026-01-01", frequency: "ONCE" }, "not-a-date"),
        /fecha final.*no es válida/,
    );
    assert.throws(
        () => getRuleDates({
            starts_on: "2000-01-01",
            frequency: "WEEKLY",
        }, "2026-12-31"),
        /más de 1,200 periodos/,
    );
});

test("fee status respects waivers, balances, due dates and partial payment", () => {
    assert.equal(getCalculatedFeeStatus({ status: "WAIVED", amount: 100 }, "2026-01-01"), "WAIVED");
    assert.equal(getCalculatedFeeStatus({ amount: 100, paid_amount: 100, due_date: "2025-01-01" }, "2026-01-01"), "PAID");
    assert.equal(getCalculatedFeeStatus({ amount: 100, paid_amount: 0, due_date: "2025-12-31" }, "2026-01-01"), "OVERDUE");
    assert.equal(getCalculatedFeeStatus({ amount: 100, paid_amount: 10, due_date: "2026-01-01" }, "2026-01-01"), "PARTIAL");
    assert.equal(getCalculatedFeeStatus({ amount: 100, paid_amount: 0, due_date: "2026-01-01" }, "2026-01-01"), "UNPAID");
    assert.equal(calculateFeeBalance({ amount: 1.01, paid_amount: 0.1 }), 0.91);
    assert.equal(calculateFeeBalance({ amount: 1, paid_amount: 1.01 }), 0);
});

test("billing audiences include only active students with active enrollment in the selected year", () => {
    const students = [
        { id: "s1", status: "ACTIVE" },
        { id: "s2", status: "ACTIVE" },
        { id: "s3", status: "INACTIVE" },
        { id: "s4", status: "ACTIVE" },
    ];
    const enrollments = [
        { student_id: "s1", classroom_id: "c1", academic_year_id: "y1", status: "ACTIVE" },
        { student_id: "s2", classroom_id: "c2", academic_year_id: "y1", status: "ACTIVE" },
        { student_id: "s3", classroom_id: "c1", academic_year_id: "y1", status: "ACTIVE" },
        { student_id: "s4", classroom_id: "c1", academic_year_id: "y2", status: "ACTIVE" },
    ];
    const classrooms = [
        { id: "c1", academic_year_id: "y1", status: "ACTIVE", level: "PRIMARY", grade_label: "1.º" },
        { id: "c2", academic_year_id: "y1", status: "ACTIVE", level: "SECONDARY", grade_label: "1.º" },
        { id: "c3", academic_year_id: "y1", status: "INACTIVE", level: "PRIMARY", grade_label: "1.º" },
        { id: "c4", academic_year_id: "y2", status: "ACTIVE", level: "PRIMARY", grade_label: "1.º" },
    ];
    const base = { academic_year_id: "y1" };

    assert.deepEqual(getRuleStudentIds({
        rule: { ...base, scope_type: "GRADE", target_level: "PRIMARY", target_grade: "1.º" },
        enrollments,
        classrooms,
        students,
    }), ["s1"]);
    assert.deepEqual(getRuleStudentIds({
        rule: { ...base, scope_type: "STUDENTS" },
        enrollments,
        classrooms,
        students,
        selectedStudentIds: ["s1", "s3", "s4", "unknown"],
    }), ["s1"]);
});
