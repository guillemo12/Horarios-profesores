import test from 'node:test';
import assert from 'node:assert/strict';

function generatePrintTimeSlots(startHour = 9, endHour = 14, slotMin = 30) {
    const slots = [];
    let currentMin = Math.max(0, startHour) * 60;
    const finishMin = Math.min(24, Math.max(startHour + 1, endHour)) * 60;
    const step = slotMin > 0 ? slotMin : 30;

    while (currentMin < finishMin) {
        const nextMin = currentMin + step;
        const h1 = Math.floor(currentMin / 60).toString().padStart(2, '0');
        const m1 = (currentMin % 60).toString().padStart(2, '0');
        const h2 = Math.floor(nextMin / 60).toString().padStart(2, '0');
        const m2 = (nextMin % 60).toString().padStart(2, '0');

        slots.push({
            startStr: `${h1}:${m1}`,
            endStr: `${h2}:${m2}`,
            startMin: currentMin,
            endMin: nextMin
        });
        currentMin = nextMin;
    }
    return slots;
}

function isRecessTimeSlot(slotMin, recessStartStr = "11:30", recessDuration = 30) {
    if (!recessStartStr || typeof recessStartStr !== 'string' || !recessStartStr.includes(':')) return false;
    const parts = recessStartStr.split(':');
    const rStart = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const rEnd = rStart + (recessDuration > 0 ? recessDuration : 30);
    return slotMin >= rStart && slotMin < rEnd;
}

// -------------------------------------------------------------
// 1. generatePrintTimeSlots - 2+ Tests
// -------------------------------------------------------------
test('generatePrintTimeSlots - Test 1 (Happy Path): Genera franjas estándar de 30m de 09:00 a 14:00 (10 franjas)', () => {
    const slots = generatePrintTimeSlots(9, 14, 30);
    assert.strictEqual(slots.length, 10);
    assert.strictEqual(slots[0].startStr, '09:00');
    assert.strictEqual(slots[0].endStr, '09:30');
    assert.strictEqual(slots[9].startStr, '13:30');
    assert.strictEqual(slots[9].endStr, '14:00');
});

test('generatePrintTimeSlots - Test 2 (Edge Case): Maneja duración de franja personalizada de 45m y horas borde', () => {
    const slots = generatePrintTimeSlots(8, 11, 45);
    // 8:00 a 11:00 = 180 min -> 4 franjas de 45m
    assert.strictEqual(slots.length, 4);
    assert.strictEqual(slots[0].startStr, '08:00');
    assert.strictEqual(slots[0].endStr, '08:45');
    assert.strictEqual(slots[3].startStr, '10:15');
    assert.strictEqual(slots[3].endStr, '11:00');
});

// -------------------------------------------------------------
// 2. isRecessTimeSlot - 2+ Tests
// -------------------------------------------------------------
test('isRecessTimeSlot - Test 1 (Happy Path): Detecta franjas dentro del intervalo de recreo estándar 11:30 a 12:00', () => {
    const min1130 = 11 * 60 + 30; // 690 min
    const min1100 = 11 * 60;      // 660 min
    const min1200 = 12 * 60;      // 720 min

    assert.strictEqual(isRecessTimeSlot(min1130, '11:30', 30), true);
    assert.strictEqual(isRecessTimeSlot(min1100, '11:30', 30), false);
    assert.strictEqual(isRecessTimeSlot(min1200, '11:30', 30), false);
});

test('isRecessTimeSlot - Test 2 (Edge Case): Maneja formato de hora no válido o valores nulos/vacíos', () => {
    assert.strictEqual(isRecessTimeSlot(690, null, 30), false);
    assert.strictEqual(isRecessTimeSlot(690, '', 30), false);
    assert.strictEqual(isRecessTimeSlot(690, 'sin-dos-puntos', 30), false);
});
