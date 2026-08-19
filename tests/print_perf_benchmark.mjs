import test from 'node:test';
import assert from 'node:assert';
import { performance } from 'node:perf_hooks';

// Generador de datos sintéticos de prueba
function generateMockAppData() {
    const subjects = [];
    for (let i = 1; i <= 100; i++) {
        subjects.push({ id: `sub_${i}`, name: `Asignatura ${i}`, hours: 4 });
    }

    const teachers = [];
    for (let i = 1; i <= 150; i++) {
        teachers.push({ id: `tech_${i}`, name: `Profesor ${i}`, maxHours: 20, color: '#123456', subjects: [] });
    }

    const courses = [];
    let groupCounter = 1;
    for (let c = 1; c <= 30; c++) {
        const groups = [];
        for (let g = 1; g <= 4; g++) {
            groups.push({ id: `grp_${groupCounter}`, name: `G${g}`, tutorId: `tech_1`, assignments: {} });
            groupCounter++;
        }
        courses.push({ id: `crs_${c}`, name: `Curso ${c}`, subjects: [], groups });
    }

    const scheduledClasses = [];
    let classId = 1;
    const days = [1, 2, 3, 4, 5];
    const hours = [9, 10, 11, 12, 13];

    // Asignar clases para todos los profesores y grupos
    teachers.forEach(t => {
        days.forEach(d => {
            hours.forEach(h => {
                const subId = `sub_${((classId % 100) + 1)}`;
                const grpNum = (classId % (groupCounter - 1)) + 1;
                const grpId = `grp_${grpNum}`;
                const startIso = `2026-08-${17 + d - 1}T${h.toString().padStart(2, '0')}:00:00`;
                const endIso = `2026-08-${17 + d - 1}T${h.toString().padStart(2, '0')}:30:00`;
                scheduledClasses.push({
                    id: `cls_${classId++}`,
                    start: startIso,
                    end: endIso,
                    duration: 0.5,
                    subjectId: subId,
                    groupId: grpId,
                    teacherId: t.id,
                    isPinned: false
                });
            });
        });
    });

    return { subjects, teachers, courses, scheduledClasses };
}

// Algoritmo original (Línea Base)
function runOriginalLookupLoop(appData) {
    let resultCount = 0;
    appData.teachers.forEach(teacher => {
        const teacherClasses = appData.scheduledClasses.filter(c => c.teacherId === teacher.id);
        teacherClasses.forEach(matchCls => {
            // Código exacto reportado en la issue
            const subject = appData.subjects.find(s => s.id === matchCls.subjectId);
            const course = appData.courses.find(c => c.groups.some(g => g.id === matchCls.groupId));
            const group = course ? course.groups.find(g => g.id === matchCls.groupId) : null;
            if (subject && course && group) {
                resultCount++;
            }
        });
    });
    return resultCount;
}

// Algoritmo optimizado (con Maps precalculados)
function runOptimizedLookupLoop(appData) {
    let resultCount = 0;

    // Precalcular Mapas
    const subjectMap = new Map(appData.subjects.map(s => [s.id, s]));
    const groupMap = new Map();
    appData.courses.forEach(course => {
        course.groups.forEach(group => {
            groupMap.set(group.id, { course, group });
        });
    });

    appData.teachers.forEach(teacher => {
        const teacherClasses = appData.scheduledClasses.filter(c => c.teacherId === teacher.id);
        teacherClasses.forEach(matchCls => {
            const subject = subjectMap.get(matchCls.subjectId);
            const grpInfo = groupMap.get(matchCls.groupId);
            const course = grpInfo ? grpInfo.course : null;
            const group = grpInfo ? grpInfo.group : null;
            if (subject && course && group) {
                resultCount++;
            }
        });
    });
    return resultCount;
}

test('Benchmark de rendimiento de print.ts (Original vs Optimizado)', () => {
    const appData = generateMockAppData();

    // Calentamiento V8
    runOriginalLookupLoop(appData);
    runOptimizedLookupLoop(appData);

    const iterations = 5;

    // Medición Original
    const startOrig = performance.now();
    let resOrig = 0;
    for (let i = 0; i < iterations; i++) {
        resOrig = runOriginalLookupLoop(appData);
    }
    const endOrig = performance.now();
    const durationOrig = (endOrig - startOrig) / iterations;

    // Medición Optimizada
    const startOpt = performance.now();
    let resOpt = 0;
    for (let i = 0; i < iterations; i++) {
        resOpt = runOptimizedLookupLoop(appData);
    }
    const endOpt = performance.now();
    const durationOpt = (endOpt - startOpt) / iterations;

    assert.strictEqual(resOrig, resOpt, 'Ambos enfoques deben producir exactamente los mismos resultados');

    const speedup = (durationOrig / durationOpt).toFixed(2);
    console.log(`\n📊 RESULTADOS DE BENCHMARK DE RENDIMIENTO:`);
    console.log(`   ⏱️  Línea Base (Original - Búsqueda anidada): ${durationOrig.toFixed(2)} ms/iteración`);
    console.log(`   ⚡ Optimizado (Índices Map O(1)):           ${durationOpt.toFixed(2)} ms/iteración`);
    console.log(`   🚀 Aceleración (Speedup):                    ${speedup}x más rápido\n`);

    assert.ok(durationOpt < durationOrig, 'El enfoque optimizado debe ser más rápido que la línea base');
});
