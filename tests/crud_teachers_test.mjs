import test from 'node:test';
import assert from 'node:assert/strict';

function formatTeacherSpecialties(teacher, subjects, courses) {
    if (!teacher || !Array.isArray(teacher.subjects) || teacher.subjects.length === 0) {
        return '';
    }
    const safeSubjects = Array.isArray(subjects) ? subjects : [];
    const safeCourses = Array.isArray(courses) ? courses : [];

    return teacher.subjects.map(sId => {
        const s = safeSubjects.find(x => x.id === sId);
        if (!s) return '';
        const course = safeCourses.find(c => Array.isArray(c.subjects) && c.subjects.includes(sId));
        return course ? `${s.name} (${course.name})` : s.name;
    }).filter(n => n !== '').join(', ');
}

// -------------------------------------------------------------
// formatTeacherSpecialties - Mínimo 2 Tests
// -------------------------------------------------------------
test('formatTeacherSpecialties - Test 1 (Happy Path): Formatea nombres de especialidades junto con su curso', () => {
    const teacher = {
        id: 't1',
        name: 'García',
        subjects: ['s1', 's2']
    };
    const subjects = [
        { id: 's1', name: 'Matemáticas' },
        { id: 's2', name: 'Física' }
    ];
    const courses = [
        { id: 'c1', name: '1º ESO', subjects: ['s1'] },
        { id: 'c2', name: '2º Bachillerato', subjects: ['s2'] }
    ];

    const formatted = formatTeacherSpecialties(teacher, subjects, courses);
    assert.strictEqual(formatted, 'Matemáticas (1º ESO), Física (2º Bachillerato)');
});

test('formatTeacherSpecialties - Test 2 (Edge Case): Maneja profesor sin especialidades, materias sin curso o datos nulos', () => {
    // Profesor sin especialidades
    assert.strictEqual(formatTeacherSpecialties({ id: 't1', subjects: [] }, [], []), '');
    assert.strictEqual(formatTeacherSpecialties(null, [], []), '');

    // Asignatura sin curso asociado
    const teacherWithStandaloneSubject = { id: 't2', subjects: ['s1'] };
    const subjects = [{ id: 's1', name: 'Música' }];
    assert.strictEqual(formatTeacherSpecialties(teacherWithStandaloneSubject, subjects, []), 'Música');

    // ID de asignatura que no existe en el catálogo
    const teacherWithMissingSubject = { id: 't3', subjects: ['s999'] };
    assert.strictEqual(formatTeacherSpecialties(teacherWithMissingSubject, subjects, []), '');
});
