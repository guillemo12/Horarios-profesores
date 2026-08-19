import test from 'node:test';
import assert from 'node:assert/strict';

function buildGroupMutation(course, groupId, name, tutorId) {
    if (!course || !Array.isArray(course.groups)) return [];
    const groupsCopy = JSON.parse(JSON.stringify(course.groups));
    if (groupId) {
        const target = groupsCopy.find(g => g.id === groupId);
        if (target) {
            target.name = name;
            target.tutorId = tutorId;
        }
    } else {
        groupsCopy.push({
            id: 'temp-' + Date.now(),
            name,
            tutorId,
            assignments: {}
        });
    }
    return groupsCopy;
}

// -------------------------------------------------------------
// buildGroupMutation - Mínimo 2 Tests
// -------------------------------------------------------------
test('buildGroupMutation - Test 1 (Happy Path): Agrega nuevo grupo y actualiza grupo existente sin mutar el original', () => {
    const originalCourse = {
        id: 'c1',
        name: '1º ESO',
        groups: [
            { id: 'g1', name: 'A', tutorId: 't1', assignments: {} }
        ]
    };

    // 1. Añadir nuevo grupo (groupId = null)
    const addedGroups = buildGroupMutation(originalCourse, null, 'B', 't2');
    assert.strictEqual(addedGroups.length, 2);
    assert.strictEqual(addedGroups[1].name, 'B');
    assert.strictEqual(addedGroups[1].tutorId, 't2');
    assert.strictEqual(originalCourse.groups.length, 1, 'No debe mutar el objeto original');

    // 2. Editar grupo existente (groupId = 'g1')
    const updatedGroups = buildGroupMutation(originalCourse, 'g1', 'A (Modificado)', 't3');
    assert.strictEqual(updatedGroups.length, 1);
    assert.strictEqual(updatedGroups[0].name, 'A (Modificado)');
    assert.strictEqual(updatedGroups[0].tutorId, 't3');
});

test('buildGroupMutation - Test 2 (Edge Case): Maneja curso nulo, groups indefinido o ID de grupo no coincidente', () => {
    assert.deepStrictEqual(buildGroupMutation(null, null, 'A', 't1'), []);
    assert.deepStrictEqual(buildGroupMutation({}, null, 'A', 't1'), []);

    const course = { id: 'c1', groups: [{ id: 'g1', name: 'A', tutorId: 't1', assignments: {} }] };
    const unchanged = buildGroupMutation(course, 'non-existent-id', 'Z', 't1');
    assert.strictEqual(unchanged.length, 1);
    assert.strictEqual(unchanged[0].name, 'A');
});
