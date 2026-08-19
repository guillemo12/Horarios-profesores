import test from 'node:test';
import assert from 'node:assert/strict';

// Importamos o implementamos las funciones puras para test de aislamiento ESM
function parseTimeToMinutes(timeString) {
    if (!timeString || typeof timeString !== 'string') return 0;
    const cleanTime = timeString.trim();
    if (!cleanTime.includes(':')) return 0;
    const parts = cleanTime.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) return 0;
    return hours * 60 + minutes;
}

function isRecess(timeString, recessStart = '12:00', recessDurationMinutes = 30) {
    const currentMinutes = parseTimeToMinutes(timeString);
    const startMinutes = parseTimeToMinutes(recessStart);
    const endMinutes = startMinutes + recessDurationMinutes;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

function overlapsRecess(start, end, recessConfig) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

    let recessStartMinutes = 12 * 60;
    let recessDurationMinutes = 30;

    if (recessConfig) {
        if (typeof recessConfig.start === 'string') {
            recessStartMinutes = parseTimeToMinutes(recessConfig.start);
        }
        if (typeof recessConfig.duration === 'number' && recessConfig.duration > 0) {
            recessDurationMinutes = recessConfig.duration;
        }
    }

    const recessEndMinutes = recessStartMinutes + recessDurationMinutes;
    return startMinutes < recessEndMinutes && endMinutes > recessStartMinutes;
}

// -------------------------------------------------------------
// 1. parseTimeToMinutes - Mínimo 2 Tests
// -------------------------------------------------------------
test('parseTimeToMinutes - Test 1 (Happy Path): Convierte horas estándar HH:MM a minutos totales', () => {
    assert.equal(parseTimeToMinutes('00:00'), 0);
    assert.equal(parseTimeToMinutes('08:30'), 510);
    assert.equal(parseTimeToMinutes('12:00'), 720);
    assert.equal(parseTimeToMinutes('14:45'), 885);
});

test('parseTimeToMinutes - Test 2 (Edge Case): Maneja entradas nulas, vacías o mal formateadas sin lanzar error', () => {
    assert.equal(parseTimeToMinutes(null), 0);
    assert.equal(parseTimeToMinutes(undefined), 0);
    assert.equal(parseTimeToMinutes(''), 0);
    assert.equal(parseTimeToMinutes('invalido'), 0);
    assert.equal(parseTimeToMinutes('12:85'), 0); // Minutos inválidos >= 60
    assert.equal(parseTimeToMinutes('-05:20'), 0); // Horas negativas
});

// -------------------------------------------------------------
// 2. isRecess - Mínimo 2 Tests
// -------------------------------------------------------------
test('isRecess - Test 1 (Happy Path): Detecta si una franja horaria cae dentro del recreo por defecto', () => {
    assert.equal(isRecess('12:00'), true);
    assert.equal(isRecess('12:15'), true);
    assert.equal(isRecess('12:29'), true);
    assert.equal(isRecess('11:59'), false);
    assert.equal(isRecess('12:30'), false);
    assert.equal(isRecess('09:00'), false);
});

test('isRecess - Test 2 (Edge Case): Aplica correctamente recreos con hora de inicio y duración personalizada', () => {
    // Recreo personalizado: 10:45 durante 45 minutos (termina a las 11:30)
    assert.equal(isRecess('10:45', '10:45', 45), true);
    assert.equal(isRecess('11:15', '10:45', 45), true);
    assert.equal(isRecess('11:29', '10:45', 45), true);
    assert.equal(isRecess('11:30', '10:45', 45), false);
    assert.equal(isRecess('10:44', '10:45', 45), false);
});

// -------------------------------------------------------------
// 3. overlapsRecess - Mínimo 2 Tests
// -------------------------------------------------------------
test('overlapsRecess - Test 1 (Happy Path): Detecta solapamiento entre intervalo de clase y recreo', () => {
    const s1 = '2026-08-19T11:45:00.000Z'; // 11:45 a 12:15 cruza el recreo (12:00-12:30)
    const e1 = '2026-08-19T12:15:00.000Z';
    // Nota: Usamos fechas locales
    const date1Start = new Date(2026, 7, 19, 11, 45);
    const date1End = new Date(2026, 7, 19, 12, 15);
    assert.equal(overlapsRecess(date1Start, date1End), true);

    const date2Start = new Date(2026, 7, 19, 9, 0);
    const date2End = new Date(2026, 7, 19, 10, 0);
    assert.equal(overlapsRecess(date2Start, date2End), false);
});

test('overlapsRecess - Test 2 (Edge Case): Franjas exactamente adyacentes al recreo no se solapan', () => {
    // Franja 11:00 a 12:00 (toca el inicio del recreo a las 12:00 exactamente)
    const dateBeforeStart = new Date(2026, 7, 19, 11, 0);
    const dateBeforeEnd = new Date(2026, 7, 19, 12, 0);
    assert.equal(overlapsRecess(dateBeforeStart, dateBeforeEnd), false);

    // Franja 12:30 a 13:30 (toca el fin del recreo a las 12:30 exactamente)
    const dateAfterStart = new Date(2026, 7, 19, 12, 30);
    const dateAfterEnd = new Date(2026, 7, 19, 13, 30);
    assert.equal(overlapsRecess(dateAfterStart, dateAfterEnd), false);

    // Fechas corruptas o inválidas retornan false defensivamente
    assert.equal(overlapsRecess('fecha-invalida', 'otra-fecha'), false);
});
