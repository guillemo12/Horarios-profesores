import test from 'node:test';
import assert from 'node:assert';

function overlapsRecess(start, end) {
    const s = new Date(start);
    const e = new Date(end);
    const startMins = s.getHours() * 60 + s.getMinutes();
    const endMins = e.getHours() * 60 + e.getMinutes();
    const recessStart = 12 * 60; // 12:00
    const recessEnd = 12 * 60 + 30; // 12:30
    return Math.max(startMins, recessStart) < Math.min(endMins, recessEnd);
}

function getMergedCalendarEvents(classes, type, entityId) {
    const filtered = classes.filter(cls => {
        if (type === 'teacher') return cls.teacherId === entityId;
        if (type === 'group') return cls.groupId === entityId;
        return false;
    });

    const groupsMap = new Map();
    filtered.forEach(cls => {
        const d = new Date(cls.start);
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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
            const next = (i + 1 < groupClasses.length) ? groupClasses[i + 1] : null;

            const currentEnd = new Date(current.end).getTime();
            const nextStart = next ? new Date(next.start).getTime() : -1;
            const isContiguous = next !== null && Math.abs(currentEnd - nextStart) < 60000;
            const currentDur = current.duration || ((new Date(current.end).getTime() - new Date(current.start).getTime()) / 3600000);
            const nextDur = next ? (next.duration || ((new Date(next.end).getTime() - new Date(next.start).getTime()) / 3600000)) : 0;
            
            const crossesRecess = next !== null && overlapsRecess(new Date(current.start), new Date(next.end));

            if (isContiguous && !crossesRecess && (currentDur <= 0.51 && nextDur <= 0.51) && (currentDur + nextDur <= 1.01)) {
                const isPinned = (current.isPinned || next.isPinned) || false;
                displayEvents.push({
                    id: current.id,
                    mergedIds: [current.id, next.id],
                    start: current.start,
                    end: next.end,
                    duration: currentDur + nextDur,
                    isPinned,
                    title: `${isPinned ? '📌 ' : ''}${current.subjectId}`
                });
                i += 2;
            } else {
                displayEvents.push({
                    id: current.id,
                    mergedIds: [current.id],
                    start: current.start,
                    end: current.end,
                    duration: currentDur,
                    isPinned: current.isPinned || false,
                    title: `${current.isPinned ? '📌 ' : ''}${current.subjectId}`
                });
                i++;
            }
        }
    });

    return displayEvents;
}

test('Fusión de 2 clases contiguas de 30m en 1 bloque de 1.0h', () => {
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
});

test('No fusionar más de 1 hora consecutiva (3 clases de 30m -> [1h, 30m])', () => {
    const classes = [
        { id: 'c1', subjectId: 'Lengua', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Lengua', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 },
        { id: 'c3', subjectId: 'Lengua', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].duration, 1.0);
    assert.strictEqual(result[1].duration, 0.5);
});

test('No fusionar clases separadas por el recreo (11:30-12:00 y 12:30-13:00)', () => {
    const classes = [
        { id: 'c1', subjectId: 'Inglés', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T11:30:00', end: '2026-08-17T12:00:00', duration: 0.5 },
        { id: 'c2', subjectId: 'Inglés', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T12:30:00', end: '2026-08-17T13:00:00', duration: 0.5 }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 2, 'No deben fusionarse a través del recreo');
    assert.strictEqual(result[0].duration, 0.5);
    assert.strictEqual(result[1].duration, 0.5);
});

test('Preservar estado de clase fijada (PIN 📌) en bloque fusionado', () => {
    const classes = [
        { id: 'c1', subjectId: 'EF', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5, isPinned: true },
        { id: 'c2', subjectId: 'EF', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5, isPinned: false }
    ];

    const result = getMergedCalendarEvents(classes, 'group', 'G1');
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].isPinned, true);
    assert.ok(result[0].title.startsWith('📌'));
});

test('Partición atómica de clase de 1 hora al guardar y renderizado unificado con Pin (📌)', () => {
    // Simulación del algoritmo saveNewClass para una clase de 1 hora de 09:00 a 10:00
    const baseStart = new Date('2026-08-17T09:00:00');
    const baseEnd = new Date('2026-08-17T10:00:00');
    const durationInMs = baseEnd.getTime() - baseStart.getTime();
    const slotMinutes = 30;
    const numSlots = Math.max(1, Math.round(durationInMs / (slotMinutes * 60000)));
    const isPinned = true;

    const generatedSlots = [];
    for (let i = 0; i < numSlots; i++) {
        const slotStart = new Date(baseStart.getTime() + i * slotMinutes * 60000);
        const slotEnd = new Date(slotStart.getTime() + slotMinutes * 60000);
        generatedSlots.push({
            id: `evt-1h-${i}`,
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration: 0.5,
            subjectId: 'Inglés',
            groupId: 'G1',
            teacherId: 'T1',
            isPinned
        });
    }

    assert.strictEqual(generatedSlots.length, 2, 'Una clase de 1h debe particionarse en 2 bloques atómicos de 30m');
    assert.strictEqual(generatedSlots[0].duration, 0.5);
    assert.strictEqual(generatedSlots[1].duration, 0.5);
    assert.strictEqual(generatedSlots[0].isPinned, true);
    assert.strictEqual(generatedSlots[1].isPinned, true);

    const merged = getMergedCalendarEvents(generatedSlots, 'group', 'G1');
    assert.strictEqual(merged.length, 1, 'El calendario debe fusionar las 2 franjas de 30m contiguas en 1 solo bloque visible');
    assert.strictEqual(merged[0].duration, 1.0, 'El bloque visible debe tener una duración exacta de 1.0 hora');
    assert.strictEqual(merged[0].isPinned, true, 'El bloque fusionado debe conservar la chincheta (Pin 📌)');
    assert.ok(merged[0].title.startsWith('📌 Inglés'));
});
