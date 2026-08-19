import test from 'node:test';
import assert from 'node:assert/strict';

function calculateSchoolStats(teachers, courses, subjects) {
    const safeTeachers = Array.isArray(teachers) ? teachers : [];
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeSubjects = Array.isArray(subjects) ? subjects : [];

    const totalTeachers = safeTeachers.length;
    const totalCourses = safeCourses.length;
    const totalGroups = safeCourses.reduce((acc, c) => acc + (Array.isArray(c.groups) ? c.groups.length : 0), 0);
    const totalSubjects = safeSubjects.length;

    const totalTeacherCapacityHours = safeTeachers.reduce((acc, t) => acc + (typeof t.maxHours === 'number' ? t.maxHours : 0), 0);

    let totalDemandedSubjectHours = 0;
    for (const s of safeSubjects) {
        const course = safeCourses.find(c => c.id === s.courseId);
        const groupCount = course && Array.isArray(course.groups) ? course.groups.length : 1;
        const subjectHours = typeof s.hours === 'number' ? s.hours : 0;
        totalDemandedSubjectHours += subjectHours * groupCount;
    }

    const hoursBalance = Number((totalTeacherCapacityHours - totalDemandedSubjectHours).toFixed(2));

    return {
        totalTeachers,
        totalCourses,
        totalGroups,
        totalSubjects,
        totalTeacherCapacityHours: Number(totalTeacherCapacityHours.toFixed(2)),
        totalDemandedSubjectHours: Number(totalDemandedSubjectHours.toFixed(2)),
        hoursBalance
    };
}

// -------------------------------------------------------------
// calculateSchoolStats - 2+ Tests
// -------------------------------------------------------------
test('calculateSchoolStats - Test 1 (Happy Path): Calcula métricas y balance horario exacto en un escenario con 2 cursos y 3 grupos', () => {
    const teachers = [
        { id: 't1', name: 'Prof 1', maxHours: 20 },
        { id: 't2', name: 'Prof 2', maxHours: 25 }
    ];
    const courses = [
        { id: 'c1', name: '1º ESO', groups: [{ id: 'g1' }, { id: 'g2' }] }, // 2 grupos
        { id: 'c2', name: '2º ESO', groups: [{ id: 'g3' }] }                  // 1 grupo
    ];
    const subjects = [
        { id: 's1', courseId: 'c1', hours: 4 }, // 4h * 2 grupos = 8h
        { id: 's2', courseId: 'c2', hours: 5 }  // 5h * 1 grupo = 5h (Total demandado: 13h)
    ];

    const stats = calculateSchoolStats(teachers, courses, subjects);

    assert.strictEqual(stats.totalTeachers, 2);
    assert.strictEqual(stats.totalCourses, 2);
    assert.strictEqual(stats.totalGroups, 3);
    assert.strictEqual(stats.totalSubjects, 2);
    assert.strictEqual(stats.totalTeacherCapacityHours, 45); // 20 + 25
    assert.strictEqual(stats.totalDemandedSubjectHours, 13);
    assert.strictEqual(stats.hoursBalance, 32); // 45 - 13
});

test('calculateSchoolStats - Test 2 (Edge Case): Maneja colecciones vacías o nulas de forma segura sin excepciones', () => {
    const emptyStats = calculateSchoolStats(null, undefined, []);
    assert.strictEqual(emptyStats.totalTeachers, 0);
    assert.strictEqual(emptyStats.totalCourses, 0);
    assert.strictEqual(emptyStats.totalGroups, 0);
    assert.strictEqual(emptyStats.totalSubjects, 0);
    assert.strictEqual(emptyStats.totalTeacherCapacityHours, 0);
    assert.strictEqual(emptyStats.totalDemandedSubjectHours, 0);
    assert.strictEqual(emptyStats.hoursBalance, 0);
});
