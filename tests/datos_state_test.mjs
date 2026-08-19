import test from 'node:test';
import assert from 'node:assert';

// Simulate AppData and ApiService behavior matching Web/src/Datos.ts & Web/src/api.ts

test('DATOS-01: loadAllData() concurrent fetching and state population', async () => {
    let callLog = [];
    const mockApi = {
        getSubjects: async () => { callLog.push('getSubjects'); return [{ id: 's1', name: 'Mates', hours: 4 }]; },
        getTeachers: async () => { callLog.push('getTeachers'); return [{ id: 't1', name: 'Prof A', maxHours: 20, color: '#000', subjects: ['s1'] }]; },
        getCourses: async () => { callLog.push('getCourses'); return [{ id: 'c1', name: '1 ESO', subjects: ['s1'], groups: [] }]; },
        getSchedule: async () => { callLog.push('getSchedule'); return [{ id: 'sc1', start: '2026-08-17T09:00:00', end: '2026-08-17T09:30:00', duration: 0.5, subjectId: 's1', groupId: 'g1', teacherId: 't1', isPinned: false }]; },
        getConfig: async () => { callLog.push('getConfig'); return { horaInicioClases: '08:30', horaFinClases: '14:30', horaInicioRecreo: '12:00', duracionRecreo: 30 }; }
    };

    const AppData = {
        API: mockApi,
        subjects: [],
        teachers: [],
        courses: [],
        scheduledClasses: [],
        config: null
    };

    async function loadAllData() {
        const [subjects, teachers, courses, scheduledClasses, config] = await Promise.all([
            AppData.API.getSubjects(),
            AppData.API.getTeachers(),
            AppData.API.getCourses(),
            AppData.API.getSchedule(),
            AppData.API.getConfig()
        ]);
        AppData.subjects = subjects;
        AppData.teachers = teachers;
        AppData.courses = courses;
        AppData.scheduledClasses = scheduledClasses;
        AppData.config = config;
    }

    await loadAllData();

    assert.strictEqual(AppData.subjects.length, 1);
    assert.strictEqual(AppData.subjects[0].id, 's1');
    assert.strictEqual(AppData.teachers.length, 1);
    assert.strictEqual(AppData.teachers[0].id, 't1');
    assert.strictEqual(AppData.courses.length, 1);
    assert.strictEqual(AppData.courses[0].id, 'c1');
    assert.strictEqual(AppData.scheduledClasses.length, 1);
    assert.strictEqual(AppData.scheduledClasses[0].id, 'sc1');
    assert.strictEqual(AppData.config.horaInicioRecreo, '12:00');
    assert.strictEqual(callLog.length, 5);
});

test('DATOS-02: loadAllData() error propagation on network/backend failure', async () => {
    const mockFailingApi = {
        getSubjects: async () => [{ id: 's1' }],
        getTeachers: async () => { throw new Error('Ktor server connection refused'); },
        getCourses: async () => [],
        getSchedule: async () => [],
        getConfig: async () => ({})
    };

    const AppData = {
        API: mockFailingApi,
        subjects: [], teachers: [], courses: [], scheduledClasses: [], config: null
    };

    async function loadAllData() {
        const [subjects, teachers, courses, scheduledClasses, config] = await Promise.all([
            AppData.API.getSubjects(),
            AppData.API.getTeachers(),
            AppData.API.getCourses(),
            AppData.API.getSchedule(),
            AppData.API.getConfig()
        ]);
        AppData.subjects = subjects;
        AppData.teachers = teachers;
        AppData.courses = courses;
        AppData.scheduledClasses = scheduledClasses;
        AppData.config = config;
    }

    await assert.rejects(async () => {
        await loadAllData();
    }, /Ktor server connection refused/);
});

test('DATOS-03: Multi-slot drag/move chronological shift invariant in beforeUpdateEvent', async () => {
    // Test the logic of beforeUpdateEvent for multi-slot merged events
    const constituentClasses = [
        { id: 'c3', start: '2026-08-17T10:00:00.000Z', end: '2026-08-17T10:30:00.000Z', duration: 0.5, isPinned: false },
        { id: 'c1', start: '2026-08-17T09:00:00.000Z', end: '2026-08-17T09:30:00.000Z', duration: 0.5, isPinned: false },
        { id: 'c2', start: '2026-08-17T09:30:00.000Z', end: '2026-08-17T10:00:00.000Z', duration: 0.5, isPinned: false }
    ];

    // Destination target is 12:30 on Tuesday (2026-08-18T12:30:00.000Z)
    const targetStart = new Date('2026-08-18T12:30:00.000Z');

    // Sort chronologically
    constituentClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    assert.deepStrictEqual(constituentClasses.map(c => c.id), ['c1', 'c2', 'c3']);

    let currentSlotStart = new Date(targetStart);
    for (const cls of constituentClasses) {
        const slotDurationHours = cls.duration || 0.5;
        const slotDurationMs = slotDurationHours * 3600000;
        const slotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);

        cls.start = currentSlotStart.toISOString();
        cls.end = slotEnd.toISOString();
        cls.duration = slotDurationHours;

        currentSlotStart = slotEnd;
    }

    assert.strictEqual(constituentClasses[0].start, '2026-08-18T12:30:00.000Z');
    assert.strictEqual(constituentClasses[0].end, '2026-08-18T13:00:00.000Z');

    assert.strictEqual(constituentClasses[1].start, '2026-08-18T13:00:00.000Z');
    assert.strictEqual(constituentClasses[1].end, '2026-08-18T13:30:00.000Z');

    assert.strictEqual(constituentClasses[2].start, '2026-08-18T13:30:00.000Z');
    assert.strictEqual(constituentClasses[2].end, '2026-08-18T14:00:00.000Z');
});
