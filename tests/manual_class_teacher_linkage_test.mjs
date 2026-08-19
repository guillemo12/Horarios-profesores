import test from 'node:test';
import assert from 'node:assert';
import { getMergedCalendarEvents } from './calendar_merge_test.mjs';

test('MANUAL-LINK-01: Auto-detection of assigned teacher from reparto docente when creating a manual class', () => {
    const mockCourses = [
        {
            id: 'c1',
            name: '1º ESO',
            subjects: ['s1', 's2', 's3'],
            groups: [
                {
                    id: 'g1',
                    name: 'A',
                    tutor: 'Profesor García',
                    assignments: {
                        's1': 't_math',     // Matemáticas asignado a t_math
                        's2': 't_english'    // Inglés asignado a t_english
                    }
                }
            ]
        }
    ];

    const mockTeachers = [
        { id: 't_tutor', name: 'Profesor García', subjects: ['s3'] },
        { id: 't_math', name: 'Profesor Pitágoras', subjects: ['s1'] },
        { id: 't_english', name: 'Profesor Shakespeare', subjects: ['s2'] },
        { id: 't_music', name: 'Profesor Mozart', subjects: ['s4'] }
    ];

    function resolveTeacherForGroupSubject(courses, teachers, groupId, subjectId) {
        let assignedTeacherId = '';
        for (const c of courses) {
            const grp = c.groups.find(g => g.id === groupId);
            if (grp && grp.assignments && grp.assignments[subjectId]) {
                assignedTeacherId = grp.assignments[subjectId];
                break;
            }
        }
        if (assignedTeacherId && teachers.some(t => t.id === assignedTeacherId)) {
            return assignedTeacherId;
        }
        const qualified = teachers.filter(t => t.subjects.includes(subjectId));
        if (qualified.length > 0) return qualified[0].id;
        return teachers[0]?.id || '';
    }

    // Probar resolución de Matemáticas (s1) -> debe ser t_math
    const resolvedMath = resolveTeacherForGroupSubject(mockCourses, mockTeachers, 'g1', 's1');
    assert.strictEqual(resolvedMath, 't_math');

    // Probar resolución de Inglés (s2) -> debe ser t_english
    const resolvedEnglish = resolveTeacherForGroupSubject(mockCourses, mockTeachers, 'g1', 's2');
    assert.strictEqual(resolvedEnglish, 't_english');

    // Probar resolución de Asignatura sin reparto pero con especialista (s3) -> debe ser t_tutor
    const resolvedS3 = resolveTeacherForGroupSubject(mockCourses, mockTeachers, 'g1', 's3');
    assert.strictEqual(resolvedS3, 't_tutor');
});

test('MANUAL-LINK-02: Manually created class immediately renders under the corresponding teacher calendar', () => {
    const scheduledClasses = [
        {
            id: 'manual-evt-1',
            start: '2026-08-17T09:00:00',
            end: '2026-08-17T10:00:00',
            duration: 1.0,
            subjectId: 's1',
            groupId: 'g1',
            teacherId: 't_math',
            isPinned: true
        }
    ];

    // Verificar renderizado en la vista del profesor t_math
    const teacherEvents = getMergedCalendarEvents(scheduledClasses, 'teacher', 't_math');
    assert.strictEqual(teacherEvents.length, 1);
    assert.strictEqual(teacherEvents[0].id, 'manual-evt-1');
    assert.strictEqual(teacherEvents[0].isPinned, true);
    assert.strictEqual(teacherEvents[0].teacherId, 't_math');
    assert.strictEqual(teacherEvents[0].groupId, 'g1');

    // Verificar que NO aparece en la vista de otro profesor (t_english)
    const otherTeacherEvents = getMergedCalendarEvents(scheduledClasses, 'teacher', 't_english');
    assert.strictEqual(otherTeacherEvents.length, 0);

    // Verificar que SÍ aparece en la vista del grupo (g1)
    const groupEvents = getMergedCalendarEvents(scheduledClasses, 'group', 'g1');
    assert.strictEqual(groupEvents.length, 1);
    assert.strictEqual(groupEvents[0].id, 'manual-evt-1');
});

test('MANUAL-LINK-03: Multi-slot manual class (1.5h = 3 slots) merges cleanly and retains teacher linkage', () => {
    const scheduledClasses = [
        {
            id: 'evt-slot-0',
            start: '2026-08-17T09:00:00',
            end: '2026-08-17T09:30:00',
            duration: 0.5,
            subjectId: 's2',
            groupId: 'g1',
            teacherId: 't_english',
            isPinned: false
        },
        {
            id: 'evt-slot-1',
            start: '2026-08-17T09:30:00',
            end: '2026-08-17T10:00:00',
            duration: 0.5,
            subjectId: 's2',
            groupId: 'g1',
            teacherId: 't_english',
            isPinned: false
        },
        {
            id: 'evt-slot-2',
            start: '2026-08-17T10:00:00',
            end: '2026-08-17T10:30:00',
            duration: 0.5,
            subjectId: 's2',
            groupId: 'g1',
            teacherId: 't_english',
            isPinned: false
        }
    ];

    const teacherEvents = getMergedCalendarEvents(scheduledClasses, 'teacher', 't_english');
    assert.strictEqual(teacherEvents.length, 1);
    assert.strictEqual(teacherEvents[0].duration, 1.5);
    assert.strictEqual(teacherEvents[0].mergedIds.length, 3);
    assert.strictEqual(teacherEvents[0].teacherId, 't_english');
});
