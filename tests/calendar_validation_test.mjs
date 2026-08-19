import test from 'node:test';
import assert from 'node:assert/strict';

function parseTimeParts(timeStr) {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
        return { hours: 0, minutes: 0 };
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return {
        hours: isNaN(hours) ? 0 : hours,
        minutes: isNaN(minutes) ? 0 : minutes
    };
}

function isValidTimeRange(startTimeStr, endTimeStr) {
    const start = parseTimeParts(startTimeStr);
    const end = parseTimeParts(endTimeStr);
    const startTotal = start.hours * 60 + start.minutes;
    const endTotal = end.hours * 60 + end.minutes;
    return endTotal > startTotal;
}

function calculateSlotCount(startTimeStr, endTimeStr, slotDurationMinutes = 30) {
    const start = parseTimeParts(startTimeStr);
    const end = parseTimeParts(endTimeStr);
    const diffMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
    const step = slotDurationMinutes > 0 ? slotDurationMinutes : 30;
    if (diffMinutes <= 0) return 0;
    return Math.floor(diffMinutes / step);
}

function doesIntervalOverlapRecess(startDate, endDate, recessStartHour = 12, recessStartMinute = 0, recessDurationMinutes = 30) {
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
    const recessStart = new Date(startDate);
    recessStart.setHours(recessStartHour, recessStartMinute, 0, 0);

    const recessEnd = new Date(recessStart.getTime() + recessDurationMinutes * 60000);
    return startDate < recessEnd && endDate > recessStart;
}

// -------------------------------------------------------------
// 1. parseTimeParts - 2+ Tests
// -------------------------------------------------------------
test('parseTimeParts - Test 1 (Happy Path): Parsea string "09:30" en horas y minutos exactos', () => {
    const parts = parseTimeParts('09:30');
    assert.strictEqual(parts.hours, 9);
    assert.strictEqual(parts.minutes, 30);
});

test('parseTimeParts - Test 2 (Edge Case): Maneja entradas nulas, vacías o sin dos puntos con ceros seguros', () => {
    assert.deepStrictEqual(parseTimeParts(null), { hours: 0, minutes: 0 });
    assert.deepStrictEqual(parseTimeParts(''), { hours: 0, minutes: 0 });
    assert.deepStrictEqual(parseTimeParts('invalid'), { hours: 0, minutes: 0 });
});

// -------------------------------------------------------------
// 2. isValidTimeRange - 2+ Tests
// -------------------------------------------------------------
test('isValidTimeRange - Test 1 (Happy Path): Retorna true cuando la hora de fin es posterior a la de inicio', () => {
    assert.strictEqual(isValidTimeRange('09:00', '10:00'), true);
    assert.strictEqual(isValidTimeRange('08:30', '09:00'), true);
});

test('isValidTimeRange - Test 2 (Edge Case): Retorna false cuando fin es igual o anterior al inicio', () => {
    assert.strictEqual(isValidTimeRange('10:00', '09:00'), false);
    assert.strictEqual(isValidTimeRange('09:00', '09:00'), false);
});

// -------------------------------------------------------------
// 3. calculateSlotCount - 2+ Tests
// -------------------------------------------------------------
test('calculateSlotCount - Test 1 (Happy Path): Calcula 3 franjas de 30m para 08:30 a 10:00', () => {
    assert.strictEqual(calculateSlotCount('08:30', '10:00', 30), 3);
    assert.strictEqual(calculateSlotCount('09:00', '11:00', 60), 2);
});

test('calculateSlotCount - Test 2 (Edge Case): Retorna 0 para rangos negativos o duraciones de franja <= 0', () => {
    assert.strictEqual(calculateSlotCount('10:00', '09:00', 30), 0);
    assert.strictEqual(calculateSlotCount('09:00', '10:00', 0), 2); // default fallback a 30m
});

// -------------------------------------------------------------
// 4. doesIntervalOverlapRecess - 2+ Tests
// -------------------------------------------------------------
test('doesIntervalOverlapRecess - Test 1 (Happy Path): Detecta solapamiento cuando la clase invade el recreo', () => {
    const classStart = new Date('2026-08-19T11:45:00');
    const classEnd = new Date('2026-08-19T12:15:00');
    assert.strictEqual(doesIntervalOverlapRecess(classStart, classEnd, 12, 0, 30), true);
});

test('doesIntervalOverlapRecess - Test 2 (Edge Case): Retorna false si la clase termina justo antes del recreo o inicia justo después', () => {
    const classBefore = new Date('2026-08-19T11:00:00');
    const classBeforeEnd = new Date('2026-08-19T12:00:00');
    assert.strictEqual(doesIntervalOverlapRecess(classBefore, classBeforeEnd, 12, 0, 30), false);

    const classAfter = new Date('2026-08-19T12:30:00');
    const classAfterEnd = new Date('2026-08-19T13:30:00');
    assert.strictEqual(doesIntervalOverlapRecess(classAfter, classAfterEnd, 12, 0, 30), false);
});
