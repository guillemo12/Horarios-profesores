import test from 'node:test';
import assert from 'node:assert/strict';

function filterSubjectsByCourse(subjects, courseId) {
    if (!courseId || !Array.isArray(subjects)) return [];
    return subjects.filter(s => s.courseId === courseId);
}

// -------------------------------------------------------------
// filterSubjectsByCourse - Mínimo 2 Tests
// -------------------------------------------------------------
test('filterSubjectsByCourse - Test 1 (Happy Path): Filtra asignaturas que pertenecen al curso seleccionado', () => {
    const subjects = [
        { id: 's1', name: 'Matemáticas', courseId: 'c1', hours: 4 },
        { id: 's2', name: 'Lengua', courseId: 'c1', hours: 4 },
        { id: 's3', name: 'Historia', courseId: 'c2', hours: 3 }
    ];

    const c1Subjects = filterSubjectsByCourse(subjects, 'c1');
    assert.strictEqual(c1Subjects.length, 2);
    assert.deepStrictEqual(c1Subjects.map(s => s.id), ['s1', 's2']);

    const c2Subjects = filterSubjectsByCourse(subjects, 'c2');
    assert.strictEqual(c2Subjects.length, 1);
    assert.strictEqual(c2Subjects[0].id, 's3');
});

test('filterSubjectsByCourse - Test 2 (Edge Case): Maneja listas vacías, curso no existente o entradas nulas', () => {
    assert.deepStrictEqual(filterSubjectsByCourse([], 'c1'), []);
    assert.deepStrictEqual(filterSubjectsByCourse(null, 'c1'), []);
    assert.deepStrictEqual(filterSubjectsByCourse(undefined, 'c1'), []);
    assert.deepStrictEqual(filterSubjectsByCourse([{ id: 's1', courseId: 'c1' }], null), []);
    assert.deepStrictEqual(filterSubjectsByCourse([{ id: 's1', courseId: 'c1' }], 'c_inexistente'), []);
});
