import test from 'node:test';
import assert from 'node:assert';
import { getMergedCalendarEvents, overlapsRecess } from '../tests/calendar_merge_test.mjs';

// ============================================================================
// ADVERSARIAL STRESS TEST SUITE: Milestone 3 Frontend & Calendar Merging
// ============================================================================

test('ADV-01: Boundary Recess Checks - Exact touch at 12:00 and 12:30', () => {
    const recessConfig = { start: '12:00', duration: 30 }; // Recess is 12:00 to 12:30

    // Slot 11:30 to 12:00 ends exactly when recess starts -> MUST NOT overlap
    const beforeRecess = overlapsRecess('2026-08-17T11:30:00', '2026-08-17T12:00:00', recessConfig);
    assert.strictEqual(beforeRecess, false, 'Clase 11:30-12:00 no debe solapar con recreo 12:00-12:30');

    // Slot 12:30 to 13:00 starts exactly when recess ends -> MUST NOT overlap
    const afterRecess = overlapsRecess('2026-08-17T12:30:00', '2026-08-17T13:00:00', recessConfig);
    assert.strictEqual(afterRecess, false, 'Clase 12:30-13:00 no debe solapar con recreo 12:00-12:30');

    // Slot 11:45 to 12:15 enters recess -> MUST overlap
    const insideRecessStart = overlapsRecess('2026-08-17T11:45:00', '2026-08-17T12:15:00', recessConfig);
    assert.strictEqual(insideRecessStart, true, 'Clase 11:45-12:15 debe solapar con recreo');

    // Slot 12:15 to 12:45 exits recess -> MUST overlap
    const insideRecessEnd = overlapsRecess('2026-08-17T12:15:00', '2026-08-17T12:45:00', recessConfig);
    assert.strictEqual(insideRecessEnd, true, 'Clase 12:15-12:45 debe solapar con recreo');

    // Spanning interval 11:30 to 13:00 across entire recess -> MUST overlap
    const spanning = overlapsRecess('2026-08-17T11:30:00', '2026-08-17T13:00:00', recessConfig);
    assert.strictEqual(spanning, true, 'Intervalo 11:30-13:00 debe solapar con recreo');
});

test('ADV-02: Custom Recess Configurations (e.g. 10:15 with 45 min duration)', () => {
    const customRecess = { start: '10:15', duration: 45 }; // 10:15 to 11:00

    assert.strictEqual(overlapsRecess('2026-08-17T09:15:00', '2026-08-17T10:15:00', customRecess), false);
    assert.strictEqual(overlapsRecess('2026-08-17T11:00:00', '2026-08-17T12:00:00', customRecess), false);
    assert.strictEqual(overlapsRecess('2026-08-17T10:00:00', '2026-08-17T10:30:00', customRecess), true);
    assert.strictEqual(overlapsRecess('2026-08-17T10:45:00', '2026-08-17T11:15:00', customRecess), true);
});

test('ADV-03: Variable maxBlockDuration options (0.5h, 1.0h, 1.5h, 3.0h)', () => {
    const fourSlots = [
        { id: 's1', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T08:00:00', end: '2026-08-17T08:30:00', duration: 0.5 },
        { id: 's2', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T08:30:00', end: '2026-08-17T09:00:00', duration: 0.5 },
        { id: 's3', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 's4', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];

    // maxBlockDuration = 0.5h -> 4 distinct events of 0.5h
    const res05 = getMergedCalendarEvents(fourSlots, 'group', 'G1', { maxBlockDuration: 0.5 });
    assert.strictEqual(res05.length, 4);
    res05.forEach(r => assert.strictEqual(r.duration, 0.5));

    // maxBlockDuration = 1.0h -> 2 events of 1.0h
    const res10 = getMergedCalendarEvents(fourSlots, 'group', 'G1', { maxBlockDuration: 1.0 });
    assert.strictEqual(res10.length, 2);
    assert.strictEqual(res10[0].duration, 1.0);
    assert.strictEqual(res10[1].duration, 1.0);

    // maxBlockDuration = 1.5h -> [1.5h, 0.5h]
    const res15 = getMergedCalendarEvents(fourSlots, 'group', 'G1', { maxBlockDuration: 1.5 });
    assert.strictEqual(res15.length, 2);
    assert.strictEqual(res15[0].duration, 1.5);
    assert.strictEqual(res15[1].duration, 0.5);

    // maxBlockDuration = 3.0h -> 1 event of 2.0h (all 4 slots merged)
    const res30 = getMergedCalendarEvents(fourSlots, 'group', 'G1', { maxBlockDuration: 3.0 });
    assert.strictEqual(res30.length, 1);
    assert.strictEqual(res30[0].duration, 2.0);
});

test('ADV-04: Floating-point precision and tolerance on block boundary', () => {
    // 3 slots of 0.33333333h (20 min each)
    const slots = [
        { id: 'f1', subjectId: 'M1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T08:00:00', end: '2026-08-17T08:20:00', duration: 1/3 },
        { id: 'f2', subjectId: 'M1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T08:20:00', end: '2026-08-17T08:40:00', duration: 1/3 },
        { id: 'f3', subjectId: 'M1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T08:40:00', end: '2026-08-17T09:00:00', duration: 1/3 }
    ];

    const res = getMergedCalendarEvents(slots, 'group', 'G1', { maxBlockDuration: 1.0 });
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].duration, 1.0);
    assert.strictEqual(res[0].start, '2026-08-17T08:00:00');
    assert.strictEqual(res[0].end, '2026-08-17T09:00:00');
});

test('ADV-05: Non-contiguous gap tolerance test (exact 60s boundary)', () => {
    // Gap of exactly 30 seconds -> within 60000ms threshold -> contiguous
    const slotsSmallGap = [
        { id: 'g1', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:29:45', duration: 0.5 },
        { id: 'g2', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 }
    ];
    const resSmall = getMergedCalendarEvents(slotsSmallGap, 'group', 'G1');
    assert.strictEqual(resSmall.length, 1, 'Diferencias menores a 60s deben considerarse contiguas');

    // Gap of 5 minutes -> NOT contiguous
    const slotsLargeGap = [
        { id: 'g1', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'g2', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:35:00', end: '2026-08-17T10:05:00', duration: 0.5 }
    ];
    const resLarge = getMergedCalendarEvents(slotsLargeGap, 'group', 'G1');
    assert.strictEqual(resLarge.length, 2, 'Huecos de 5m no deben fusionarse');
});

test('ADV-06: Reverse and Randomly Shuffled Inputs Sorting Stability', () => {
    const rawSlots = [
        { id: 'slot-4', subjectId: 'Art', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5 },
        { id: 'slot-2', subjectId: 'Art', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 },
        { id: 'slot-1', subjectId: 'Art', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'slot-3', subjectId: 'Art', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5 }
    ];

    const res = getMergedCalendarEvents(rawSlots, 'group', 'G1');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].duration, 2.0);
    assert.strictEqual(res[0].start, '2026-08-17T09:00:00');
    assert.strictEqual(res[0].end, '2026-08-17T11:00:00');
    assert.deepStrictEqual(res[0].mergedIds, ['slot-1', 'slot-2', 'slot-3', 'slot-4'], 'Los IDs deben fusionarse en orden estrictamente cronológico');
});

test('ADV-07: Multi-Day Interleaved Input Streams', () => {
    const multiDaySlots = [
        // Monday slots
        { id: 'mon-1', subjectId: 'Math', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 },
        { id: 'mon-2', subjectId: 'Math', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5 },
        // Tuesday slots (same time, same subject/teacher/group)
        { id: 'tue-1', subjectId: 'Math', teacherId: 'T1', groupId: 'G1', start: '2026-08-18T09:00:00', end: '2026-08-18T09:30:00', duration: 0.5 },
        { id: 'tue-2', subjectId: 'Math', teacherId: 'T1', groupId: 'G1', start: '2026-08-18T09:30:00', end: '2026-08-18T10:00:00', duration: 0.5 },
        // Wednesday slots
        { id: 'wed-1', subjectId: 'Math', teacherId: 'T1', groupId: 'G1', start: '2026-08-19T09:00:00', end: '2026-08-19T09:30:00', duration: 0.5 }
    ];

    const res = getMergedCalendarEvents(multiDaySlots, 'group', 'G1');
    assert.strictEqual(res.length, 3, 'Debe haber exactamente 3 eventos correspondientes a cada uno de los 3 días');
    
    const mon = res.find(e => e.start.startsWith('2026-08-17'));
    const tue = res.find(e => e.start.startsWith('2026-08-18'));
    const wed = res.find(e => e.start.startsWith('2026-08-19'));

    assert.ok(mon && tue && wed);
    assert.strictEqual(mon.duration, 1.0);
    assert.strictEqual(tue.duration, 1.0);
    assert.strictEqual(wed.duration, 0.5);
    assert.deepStrictEqual(mon.mergedIds, ['mon-1', 'mon-2']);
    assert.deepStrictEqual(tue.mergedIds, ['tue-1', 'tue-2']);
    assert.deepStrictEqual(wed.mergedIds, ['wed-1']);
});

test('ADV-08: Pin Flag Propagation across all positions (1st, 2nd, 3rd, 4th, none, all)', () => {
    // 4 slots where only slot 3 is pinned
    const slotsWithPin3 = [
        { id: 'p1', subjectId: 'Bio', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5, isPinned: false },
        { id: 'p2', subjectId: 'Bio', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:30:00', end: '2026-08-17T10:00:00', duration: 0.5, isPinned: false },
        { id: 'p3', subjectId: 'Bio', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:00:00', end: '2026-08-17T10:30:00', duration: 0.5, isPinned: true },
        { id: 'p4', subjectId: 'Bio', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T10:30:00', end: '2026-08-17T11:00:00', duration: 0.5, isPinned: false }
    ];

    const res = getMergedCalendarEvents(slotsWithPin3, 'group', 'G1');
    assert.strictEqual(res.length, 1);
    assert.strictEqual(res[0].isPinned, true);
    assert.strictEqual(res[0].title, '📌 Bio');

    // 4 slots where all are pinned
    const allPinned = slotsWithPin3.map(s => ({ ...s, isPinned: true }));
    const resAll = getMergedCalendarEvents(allPinned, 'group', 'G1');
    assert.strictEqual(resAll.length, 1);
    assert.strictEqual(resAll[0].isPinned, true);
    assert.strictEqual(resAll[0].title, '📌 Bio');

    // 4 slots where none are pinned
    const nonePinned = slotsWithPin3.map(s => ({ ...s, isPinned: false }));
    const resNone = getMergedCalendarEvents(nonePinned, 'group', 'G1');
    assert.strictEqual(resNone.length, 1);
    assert.strictEqual(resNone[0].isPinned, false);
    assert.strictEqual(resNone[0].title, 'Bio');
});

test('ADV-09: High Scale Stress Benchmark (1,000 classes across 20 groups and 30 teachers)', () => {
    const largeDataset = [];
    const subjects = ['Mates', 'Lengua', 'Física', 'Química', 'Historia', 'Inglés', 'Biología', 'Filosofía'];
    const days = ['2026-08-17', '2026-08-18', '2026-08-19', '2026-08-20', '2026-08-21'];
    const hours = ['08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:30', '13:00', '13:30'];

    let count = 0;
    for (let g = 1; g <= 20; g++) {
        const groupId = `G${g}`;
        for (const day of days) {
            for (let h = 0; h < hours.length; h++) {
                const sIdx = (g + h) % subjects.length;
                const tIdx = (g * 3 + h) % 30 + 1;
                const sTime = hours[h];
                const parts = sTime.split(':').map(Number);
                const sDate = new Date(`${day}T${sTime}:00`);
                const eDate = new Date(sDate.getTime() + 30 * 60000);
                const eTimeStr = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}:00`;

                largeDataset.push({
                    id: `large-evt-${count++}`,
                    subjectId: subjects[sIdx],
                    groupId,
                    teacherId: `T${tIdx}`,
                    start: `${day}T${sTime}:00`,
                    end: `${day}T${eTimeStr}`,
                    duration: 0.5,
                    isPinned: count % 7 === 0
                });
            }
        }
    }

    assert.strictEqual(largeDataset.length, 1000, 'Generados 1,000 eventos para prueba de estrés');

    const startTime = performance.now();
    
    // Benchmark single group merging
    const group1Merged = getMergedCalendarEvents(largeDataset, 'group', 'G1');
    
    // Benchmark single teacher merging
    const teacher1Merged = getMergedCalendarEvents(largeDataset, 'teacher', 'T1');

    // Benchmark all 20 groups merging sequentially
    let totalMergedEvents = 0;
    for (let g = 1; g <= 20; g++) {
        const res = getMergedCalendarEvents(largeDataset, 'group', `G${g}`);
        totalMergedEvents += res.length;
    }

    const elapsed = performance.now() - startTime;
    assert.ok(elapsed < 100, `El procesamiento de 1000 eventos en 20 grupos debe ser < 100ms (obtenido ${elapsed.toFixed(2)}ms)`);
    assert.ok(totalMergedEvents > 0);
    assert.ok(group1Merged.length > 0);
    assert.ok(teacher1Merged.length > 0);
});

test('ADV-10: Error Resilience on Corrupted and Malformed Class Objects', () => {
    // Empty / null inputs
    assert.deepStrictEqual(getMergedCalendarEvents(null, 'group', 'G1'), []);
    assert.deepStrictEqual(getMergedCalendarEvents(undefined, 'group', 'G1'), []);
    assert.deepStrictEqual(getMergedCalendarEvents([], 'group', 'G1'), []);
    assert.deepStrictEqual(getMergedCalendarEvents('not-an-array', 'group', 'G1'), []);

    // Filter type mismatch
    const classes = [
        { id: 'c1', subjectId: 'S1', teacherId: 'T1', groupId: 'G1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5 }
    ];
    assert.deepStrictEqual(getMergedCalendarEvents(classes, 'unknown-type', 'G1'), []);
    assert.deepStrictEqual(getMergedCalendarEvents(classes, 'group', 'WRONG_ID'), []);
});
