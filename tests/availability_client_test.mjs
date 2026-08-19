import test from 'node:test';
import assert from 'node:assert/strict';

function toggleTeacherAvailability(availabilityList, day, start, end) {
    if (!Array.isArray(availabilityList)) return [{ dayOfWeek: day, startTime: start, endTime: end }];
    const list = [...availabilityList];
    const index = list.findIndex(av => av.dayOfWeek === day && av.startTime === start && av.endTime === end);
    if (index > -1) {
        list.splice(index, 1);
    } else {
        list.push({ dayOfWeek: day, startTime: start, endTime: end });
    }
    return list;
}

function isSlotBlocked(availabilityList, day, start, end) {
    if (!Array.isArray(availabilityList) || availabilityList.length === 0) return false;
    return availabilityList.some(av => av.dayOfWeek === day && av.startTime === start && av.endTime === end);
}

// -------------------------------------------------------------
// 1. toggleTeacherAvailability - Mínimo 2 Tests
// -------------------------------------------------------------
test('toggleTeacherAvailability - Test 1 (Happy Path): Alterna correctamente entre disponible y bloqueado', () => {
    let list = [];
    // 1er toggle: bloquea el lunes a las 09:00
    list = toggleTeacherAvailability(list, 1, '09:00', '09:30');
    assert.equal(list.length, 1);
    assert.deepEqual(list[0], { dayOfWeek: 1, startTime: '09:00', endTime: '09:30' });

    // 2do toggle sobre la misma franja: la desbloquea
    list = toggleTeacherAvailability(list, 1, '09:00', '09:30');
    assert.equal(list.length, 0);
});

test('toggleTeacherAvailability - Test 2 (Edge Case): Maneja listas no inicializadas o nulas', () => {
    const listFromNull = toggleTeacherAvailability(null, 2, '10:00', '10:30');
    assert.equal(listFromNull.length, 1);
    assert.equal(listFromNull[0].dayOfWeek, 2);
});

// -------------------------------------------------------------
// 2. isSlotBlocked - Mínimo 2 Tests
// -------------------------------------------------------------
test('isSlotBlocked - Test 1 (Happy Path): Comprueba verazmente si una franja está marcada como no disponible', () => {
    const blocks = [
        { dayOfWeek: 1, startTime: '09:00', endTime: '09:30' },
        { dayOfWeek: 3, startTime: '12:30', endTime: '13:00' }
    ];
    assert.equal(isSlotBlocked(blocks, 1, '09:00', '09:30'), true);
    assert.equal(isSlotBlocked(blocks, 3, '12:30', '13:00'), true);
    assert.equal(isSlotBlocked(blocks, 2, '09:00', '09:30'), false);
});

test('isSlotBlocked - Test 2 (Edge Case): Resiste listas vacías o valores nulos sin errores', () => {
    assert.equal(isSlotBlocked([], 1, '09:00', '09:30'), false);
    assert.equal(isSlotBlocked(null, 1, '09:00', '09:30'), false);
    assert.equal(isSlotBlocked(undefined, 1, '09:00', '09:30'), false);
});
