import test from 'node:test';
import assert from 'node:assert';

/**
 * Checks whether a given time interval [start, end] overlaps with the school recess.
 *
 * @param {string|Date} start 
 * @param {string|Date} end 
 * @param {{ start?: string, duration?: number }} [recessConfig]
 * @returns {boolean}
 */
export function overlapsRecess(start, end, recessConfig = { start: '12:00', duration: 30 }) {
    const s = new Date(start);
    const e = new Date(end);
    const startMins = s.getHours() * 60 + s.getMinutes();
    const endMins = e.getHours() * 60 + e.getMinutes();
    
    let recessStart = 12 * 60; // Default 12:00 = 720 min
    let recessDuration = 30;

    if (recessConfig) {
        if (typeof recessConfig.start === 'string') {
            const parts = recessConfig.start.split(':').map(Number);
            recessStart = parts[0] * 60 + parts[1];
        }
        if (typeof recessConfig.duration === 'number') {
            recessDuration = recessConfig.duration;
        }
    }

    const recessEnd = recessStart + recessDuration;
    return startMins < recessEnd && endMins > recessStart;
}

/**
 * Merges contiguous calendar slots for the same group, teacher, and subject on the same day
 * into multi-hour calendar display cards (up to maxBlockDuration, default 2.0h).
 *
 * @param {Array<Object>} classes 
 * @param {'group'|'teacher'} type 
 * @param {string} entityId 
 * @param {Object} [options]
 * @param {number} [options.maxBlockDuration=2.0]
 * @param {{ start?: string, duration?: number }} [options.recessConfig]
 * @returns {Array<Object>}
 */
export function getMergedCalendarEvents(classes, type, entityId, options = {}) {
    const {
        maxBlockDuration = 2.0,
        recessConfig = { start: '12:00', duration: 30 }
    } = options;

    if (!Array.isArray(classes) || classes.length === 0) {
        return [];
    }

    const filtered = classes.filter(cls => {
        if (type === 'teacher') return cls.teacherId === entityId;
        if (type === 'group') return cls.groupId === entityId;
        return false;
    });

    const groupsMap = new Map();
    filtered.forEach(cls => {
        const d = new Date(cls.start);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const key = `${dateKey}_${cls.subjectId}_${cls.teacherId}_${cls.groupId}`;
        if (!groupsMap.has(key)) {
            groupsMap.set(key, []);
        }
        groupsMap.get(key).push(cls);
    });

    const displayEvents = [];

    groupsMap.forEach(groupClasses => {
        groupClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        let i = 0;
        while (i < groupClasses.length) {
            const current = groupClasses[i];
            let mergedIds = [current.id];
            let blockStart = current.start;
            let blockEnd = current.end;
            let blockDuration = current.duration || ((new Date(current.end).getTime() - new Date(current.start).getTime()) / 3600000);
            let isPinned = Boolean(current.isPinned);

            let j = i + 1;
            while (j < groupClasses.length) {
                const next = groupClasses[j];
                const currentEndTime = new Date(blockEnd).getTime();
                const nextStartTime = new Date(next.start).getTime();
                const isContiguous = Math.abs(currentEndTime - nextStartTime) < 60000;
                const nextDur = next.duration || ((new Date(next.end).getTime() - new Date(next.start).getTime()) / 3600000);
                const crossesRecess = overlapsRecess(new Date(blockStart), new Date(next.end), recessConfig);

                if (isContiguous && !crossesRecess && (blockDuration + nextDur <= maxBlockDuration + 0.01)) {
                    blockEnd = next.end;
                    blockDuration += nextDur;
                    mergedIds.push(next.id);
                    if (next.isPinned) {
                        isPinned = true;
                    }
                    j++;
                } else {
                    break;
                }
            }

            displayEvents.push({
                id: current.id,
                mergedIds: [...mergedIds],
                start: blockStart,
                end: blockEnd,
                duration: Math.round(blockDuration * 100) / 100,
                isPinned,
                title: `${isPinned ? '📌 ' : ''}${current.subjectId}`,
                subjectId: current.subjectId,
                teacherId: current.teacherId,
                groupId: current.groupId
            });

            i = j;
        }
    });

    return displayEvents;
}

// ============================================================================
// 1. Single and Multi-Hour Contiguous Merging (30m, 1h, 1.5h, 2.0h)
// ============================================================================

test('1.1. Franja única de 30m se mantiene como 1 bloque de 0.5h', () => {
    const classes = [
        { id: 'c1', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 0.5);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[0].end, '2026-08-17T09:30:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1']);
    assert.strictEqual(result[0].title, 'Matemáticas');
});

test('1.2. Fusión de 2 clases contiguas de 30m en 1 bloque de 1.0h', () => {
    const classes = [
        { id: 'c1', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 1.0);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[0].end, '2026-08-17T10:00:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1', 'c2']);
    assert.strictEqual(result[0].title, 'Matemáticas');
});

test('1.3. Fusión de 3 clases contiguas de 30m en 1 bloque de 1.5h', () => {
    const classes = [
        { id: 'c1', subjectId: 'Física', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T08:30:00', end: '2026-08-17T09:00:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Física', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c3', subjectId: 'Física', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 1.5);
    assert.strictEqual(result[0].start, '2026-08-17T08:30:00');
    assert.strictEqual(result[0].end, '2026-08-17T10:00:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1', 'c2', 'c3']);
    assert.strictEqual(result[0].title, 'Física');
});

test('1.4. Fusión de 4 clases contiguas de 30m en 1 bloque de 2.0h', () => {
    const classes = [
        { id: 'c1', subjectId: 'Química', teacherId: 'T2', groupId: 'G2', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Química', teacherId: 'T2', groupId: 'G2', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 },
        { id: 'c3', subjectId: 'Química', teacherId: 'T2', groupId: 'G2', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5 },
        { id: 'c4', subjectId: 'Química', teacherId: 'T2', groupId: 'G2', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G2');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 2.0);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[0].end, '2026-08-17T11:00:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1', 'c2', 'c3', 'c4']);
    assert.strictEqual(result[0].title, 'Química');
});

test('1.5. Límite de bloque máximo a 2.0h: 5 clases contiguas de 30m generan [2.0h, 0.5h]', () => {
    const classes = [
        { id: 'c1', subjectId: 'Tecnología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Tecnología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 },
        { id: 'c3', subjectId: 'Tecnología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5 },
        { id: 'c4', subjectId: 'Tecnología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5 },
        { id: 'c5', subjectId: 'Tecnología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T11:00:00', end: '2026-08-17T11:30:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].duration, 2.0);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[0].end, '2026-08-17T11:00:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1', 'c2', 'c3', 'c4']);

    assert.strictEqual(result[1].duration, 0.5);
    assert.strictEqual(result[1].start, '2026-08-17T11:00:00');
    assert.strictEqual(result[1].end, '2026-08-17T11:30:00');
    assert.deepStrictEqual(result[1].mergedIds, ['c5']);
});

test('1.6. Fusión con duraciones heterogéneas preexistentes (1.0h + 0.5h -> 1.5h)', () => {
    const classes = [
        { id: 'c1', subjectId: 'Historia', teacherId: 'T3', groupId: 'G1', start: '2026-08-17T08:30:00', end: '2026-08-17T09:30:00', duration: 1.0 },
        { id: 'c2', subjectId: 'Historia', teacherId: 'T3', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 1.5);
    assert.strictEqual(result[0].start, '2026-08-17T08:30:00');
    assert.strictEqual(result[0].end, '2026-08-17T10:00:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1', 'c2']);
});

test('1.7. Fusión con duraciones heterogéneas preexistentes (1.0h + 1.0h -> 2.0h)', () => {
    const classes = [
        { id: 'c1', subjectId: 'Arte', teacherId: 'T4', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T10:00:00', duration: 1.0 },
        { id: 'c2', subjectId: 'Arte', teacherId: 'T4', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T11:00:00', duration: 1.0 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 2.0);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[0].end, '2026-08-17T11:00:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1', 'c2']);
});

// ============================================================================
// 2. Non-Contiguous Slots & Entity Separation
// ============================================================================

test('2.1. Huecos temporales (gaps): franjas no contiguas permanecen separadas', () => {
    const classes = [
        { id: 'c1', subjectId: 'Biología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Biología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2, 'Las clases con huecos temporales no deben fusionarse');
    assert.strictEqual(result[0].duration, 0.5);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[1].duration, 0.5);
    assert.strictEqual(result[1].start, '2026-08-17T10:30:00');
});

test('2.2. Clases contiguas con distintas asignaturas permanecen separadas', () => {
    const classes = [
        { id: 'c1', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Física', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2, 'Distintas asignaturas no deben fusionarse');
    assert.strictEqual(result[0].title, 'Matemáticas');
    assert.strictEqual(result[1].title, 'Física');
});

test('2.3. Clases contiguas con distintos profesores permanecen separadas', () => {
    const classes = [
        { id: 'c1', subjectId: 'Inglés', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Inglés', teacherId: 'T2', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2, 'Distintos profesores no deben fusionarse');
    assert.strictEqual(result[0].teacherId, 'T1');
    assert.strictEqual(result[1].teacherId, 'T2');
});

test('2.4. Clases en distintos días de la semana permanecen separadas', () => {
    const classes = [
        { id: 'c1', subjectId: 'Geografía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T14:30:00', end: '2026-08-17T15:00:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Geografía', teacherId: 'T1', groupId: 'G1', start: '2026-08-18T08:30:00', end: '2026-08-18T09:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2, 'Clases en días distintos nunca deben fusionarse');
    assert.strictEqual(result[0].start, '2026-08-17T14:30:00');
    assert.strictEqual(result[1].start, '2026-08-18T08:30:00');
});

// ============================================================================
// 3. Recess and Break Boundary Enforcement
// ============================================================================

test('3.1. No fusionar clases separadas por el recreo por defecto (11:30-12:00 y 12:30-13:00)', () => {
    const classes = [
        { id: 'c1', subjectId: 'Inglés', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T11:30:00', end: '2026-08-17T12:00:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Inglés', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T12:30:00', end: '2026-08-17T13:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2, 'No deben fusionarse a través del recreo');
    assert.strictEqual(result[0].duration, 0.5);
    assert.strictEqual(result[1].duration, 0.5);
});

test('3.2. Respetar configuración personalizada de recreo (ej. 10:30 a 11:00)', () => {
    const customRecess = { start: '10:30', duration: 30 };
    const classes = [
        { id: 'c1', subjectId: 'Música', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Música', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T11:00:00', end: '2026-08-17T11:30:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1', { recessConfig: customRecess });
    assert.strictEqual(result.length, 2, 'No debe fusionar a través de un recreo personalizado');
});

test('3.3. Fusión en bloque matinal completo (09:00 a 11:00) sin interferencia de recreo', () => {
    const classes = [
        { id: 'c1', subjectId: 'Lengua', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Lengua', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 },
        { id: 'c3', subjectId: 'Lengua', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5 },
        { id: 'c4', subjectId: 'Lengua', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 2.0);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[0].end, '2026-08-17T11:00:00');
});

test('3.4. Fusión en bloque vespertino completo (12:30 a 14:30) posterior al recreo', () => {
    const classes = [
        { id: 'c1', subjectId: 'Filosofía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T12:30:00', end: '2026-08-17T13:00:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Filosofía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T13:00:00', end: '2026-08-17T13:30:00', duration: 0.5 },
        { id: 'c3', subjectId: 'Filosofía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T13:30:00', end: '2026-08-17T14:00:00', duration: 0.5 },
        { id: 'c4', subjectId: 'Filosofía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T14:00:00', end: '2026-08-17T14:30:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 2.0);
    assert.strictEqual(result[0].start, '2026-08-17T12:30:00');
    assert.strictEqual(result[0].end, '2026-08-17T14:30:00');
});

// ============================================================================
// 4. Pin State (📌) and Title Propagation
// ============================================================================

test('4.1. Preservar estado fijado (PIN 📌) cuando la primera franja está fijada', () => {
    const classes = [
        { id: 'c1', subjectId: 'EF', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5, isPinned: true },
        { id: 'c2', subjectId: 'EF', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5, isPinned: false }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].isPinned, true);
    assert.ok(result[0].title.startsWith('📌'));
});

test('4.2. Preservar estado fijado (PIN 📌) en bloque de 1.5h si una franja intermedia está fijada', () => {
    const classes = [
        { id: 'c1', subjectId: 'Plástica', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5, isPinned: false },
        { id: 'c2', subjectId: 'Plástica', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5, isPinned: true },
        { id: 'c3', subjectId: 'Plástica', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5, isPinned: false }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 1.5);
    assert.strictEqual(result[0].isPinned, true);
    assert.strictEqual(result[0].title, '📌 Plástica');
});

test('4.3. Preservar estado fijado (PIN 📌) en bloque de 2.0h si la última franja está fijada', () => {
    const classes = [
        { id: 'c1', subjectId: 'Economía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5, isPinned: false },
        { id: 'c2', subjectId: 'Economía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5, isPinned: false },
        { id: 'c3', subjectId: 'Economía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5, isPinned: false },
        { id: 'c4', subjectId: 'Economía', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5, isPinned: true }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 2.0);
    assert.strictEqual(result[0].isPinned, true);
    assert.strictEqual(result[0].title, '📌 Economía');
});

test('4.4. Bloque no fijado cuando ninguna de sus franjas tiene Pin', () => {
    const classes = [
        { id: 'c1', subjectId: 'Latín', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5, isPinned: false },
        { id: 'c2', subjectId: 'Latín', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5, isPinned: false }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].isPinned, false);
    assert.strictEqual(result[0].title, 'Latín');
});

// ============================================================================
// 5. Entity Filtering and View Types
// ============================================================================

test('5.1. Vista de Grupo filtra estrictamente por groupId', () => {
    const classes = [
        { id: 'c1', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G2', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 }
    ];

    const resultG1 = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(resultG1.length, 1);
    assert.strictEqual(resultG1[0].groupId, 'G1');

    const resultG2 = getMergedCalendarEvents(classes, 'group', 'G2');
    assert.strictEqual(resultG2.length, 1);
    assert.strictEqual(resultG2[0].groupId, 'G2');
});

test('5.2. Vista de Profesor filtra estrictamente por teacherId', () => {
    const classes = [
        { id: 'c1', subjectId: 'Historia', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Historia', teacherId: 'T2', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 }
    ];

    const resultT1 = getMergedCalendarEvents(classes, 'teacher', 'T1');
    assert.strictEqual(resultT1.length, 1);
    assert.strictEqual(resultT1[0].teacherId, 'T1');

    const resultT2 = getMergedCalendarEvents(classes, 'teacher', 'T2');
    assert.strictEqual(resultT2.length, 1);
    assert.strictEqual(resultT2[0].teacherId, 'T2');
});

test('5.3. Entidad inexistente o lista vacía retorna array vacío', () => {
    const classes = [
        { id: 'c1', subjectId: 'Historia', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 }
    ];

    assert.deepStrictEqual(getMergedCalendarEvents(classes, 'group', 'G_NON_EXISTENT'), []);
    assert.deepStrictEqual(getMergedCalendarEvents([], 'group', 'G1'), []);
    assert.deepStrictEqual(getMergedCalendarEvents(null, 'group', 'G1'), []);
});

// ============================================================================
// 6. Robustness, Out-of-Order Inputs & Atomic Partitioning
// ============================================================================

test('6.1. Franjas desordenadas cronológicamente se ordenan y fusionan correctamente', () => {
    const classes = [
        { id: 'c3', subjectId: 'Biología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5 },
        { id: 'c1', subjectId: 'Biología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c4', subjectId: 'Biología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Biología', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].duration, 2.0);
    assert.strictEqual(result[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(result[0].end, '2026-08-17T11:00:00');
    assert.deepStrictEqual(result[0].mergedIds, ['c1', 'c2', 'c3', 'c4'], 'Los IDs deben estar ordenados cronológicamente');
});

test('6.2. Horario escolar complejo de día completo con múltiples asignaturas, huecos y bloques de 1.5h y 2.0h', () => {
    const classes = [
        // 08:30-10:00: Matemáticas (1.5h = 3 franjas de 30m)
        { id: 'm1', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T08:30:00', end: '2026-08-17T09:00:00', duration: 0.5 },
        { id: 'm2', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'm3', subjectId: 'Matemáticas', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 },
        
        // 10:00-11:00: Física (1.0h = 2 franjas de 30m) con Pin
        { id: 'f1', subjectId: 'Física', teacherId: 'T2', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5, isPinned: true },
        { id: 'f2', subjectId: 'Física', teacherId: 'T2', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5, isPinned: false },

        // 11:00-11:30: Hueco libre para el grupo (sin clases)

        // 11:30-12:00: Inglés (30m)
        { id: 'i1', subjectId: 'Inglés', teacherId: 'T3', groupId: 'G1', start: '2026-08-17T11:30:00', end: '2026-08-17T12:00:00', duration: 0.5 },

        // 12:00-12:30: Recreo

        // 12:30-14:30: Tecnología (2.0h = 4 franjas de 30m)
        { id: 't1', subjectId: 'Tecnología', teacherId: 'T4', groupId: 'G1', start: '2026-08-17T12:30:00', end: '2026-08-17T13:00:00', duration: 0.5 },
        { id: 't2', subjectId: 'Tecnología', teacherId: 'T4', groupId: 'G1', start: '2026-08-17T13:00:00', end: '2026-08-17T13:30:00', duration: 0.5 },
        { id: 't3', subjectId: 'Tecnología', teacherId: 'T4', groupId: 'G1', start: '2026-08-17T13:30:00', end: '2026-08-17T14:00:00', duration: 0.5 },
        { id: 't4', subjectId: 'Tecnología', teacherId: 'T4', groupId: 'G1', start: '2026-08-17T14:00:00', end: '2026-08-17T14:30:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 4, 'Debe haber exactamente 4 bloques visibles fusionados');

    // 1. Matemáticas 1.5h
    const mathEvent = result.find(e => e.subjectId === 'Matemáticas');
    assert.ok(mathEvent);
    assert.strictEqual(mathEvent.duration, 1.5);
    assert.strictEqual(mathEvent.start, '2026-08-17T08:30:00');
    assert.strictEqual(mathEvent.end, '2026-08-17T10:00:00');
    assert.deepStrictEqual(mathEvent.mergedIds, ['m1', 'm2', 'm3']);

    // 2. Física 1.0h con Pin
    const physEvent = result.find(e => e.subjectId === 'Física');
    assert.ok(physEvent);
    assert.strictEqual(physEvent.duration, 1.0);
    assert.strictEqual(physEvent.start, '2026-08-17T10:00:00');
    assert.strictEqual(physEvent.end, '2026-08-17T11:00:00');
    assert.strictEqual(physEvent.isPinned, true);
    assert.ok(physEvent.title.startsWith('📌'));
    assert.deepStrictEqual(physEvent.mergedIds, ['f1', 'f2']);

    // 3. Inglés 0.5h
    const engEvent = result.find(e => e.subjectId === 'Inglés');
    assert.ok(engEvent);
    assert.strictEqual(engEvent.duration, 0.5);
    assert.strictEqual(engEvent.start, '2026-08-17T11:30:00');
    assert.strictEqual(engEvent.end, '2026-08-17T12:00:00');
    assert.deepStrictEqual(engEvent.mergedIds, ['i1']);

    // 4. Tecnología 2.0h
    const techEvent = result.find(e => e.subjectId === 'Tecnología');
    assert.ok(techEvent);
    assert.strictEqual(techEvent.duration, 2.0);
    assert.strictEqual(techEvent.start, '2026-08-17T12:30:00');
    assert.strictEqual(techEvent.end, '2026-08-17T14:30:00');
    assert.deepStrictEqual(techEvent.mergedIds, ['t1', 't2', 't3', 't4']);
});

test('6.3. Partición atómica multi-hora (30m, 1h, 1.5h, 2.0h) al guardar y renderizado unificado', () => {
    const durations = [
        { hours: 0.5, expectedSlots: 1 },
        { hours: 1.0, expectedSlots: 2 },
        { hours: 1.5, expectedSlots: 3 },
        { hours: 2.0, expectedSlots: 4 }
    ];

    const slotMinutes = 30;

    for (const { hours, expectedSlots } of durations) {
        const baseStart = new Date('2026-08-17T08:30:00');
        const baseEnd = new Date(baseStart.getTime() + hours * 3600000);
        const durationInMs = baseEnd.getTime() - baseStart.getTime();
        const numSlots = Math.max(1, Math.round(durationInMs / (slotMinutes * 60000)));

        assert.strictEqual(numSlots, expectedSlots, `Una clase de ${hours}h debe particionarse en ${expectedSlots} franjas`);

        const generatedSlots = [];
        for (let i = 0; i < numSlots; i++) {
            const slotStart = new Date(baseStart.getTime() + i * slotMinutes * 60000);
            const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60000);
            generatedSlots.push({
                id: `evt-${hours}h-${i}`,
                start: slotStart.toISOString(),
                end: slotEnd.toISOString(),
                duration: 0.5,
                subjectId: 'Dibujo',
                groupId: 'G1',
                teacherId: 'T1',
                isPinned: true
            });
        }

        const merged = getMergedCalendarEvents(generatedSlots, 'group', 'G1');
        assert.strictEqual(merged.length, 1, `Debe fusionarse en un único bloque de ${hours}h`);
        assert.strictEqual(merged[0].duration, hours, `La duración debe ser exactamente ${hours}h`);
        assert.strictEqual(merged[0].isPinned, true, 'Debe conservar la chincheta (📌)');
        assert.ok(merged[0].title.startsWith('📌 Dibujo'));
        assert.strictEqual(merged[0].mergedIds.length, expectedSlots);
    }
});
