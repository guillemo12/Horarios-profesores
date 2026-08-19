import { performance } from 'node:perf_hooks';

const NUM_TEACHERS = 50;
const NUM_SUBJECTS = 300;
const NUM_COURSES = 30;
const NUM_GROUPS_PER_COURSE = 4;
const NUM_CLASSES = 2000;

const teachers = Array.from({ length: NUM_TEACHERS }, (_, i) => ({
    id: `teacher-${i}`,
    name: `Profesor ${i}`
}));

const subjects = Array.from({ length: NUM_SUBJECTS }, (_, i) => ({
    id: `subject-${i}`,
    name: `Asignatura ${i}`
}));

const courses = Array.from({ length: NUM_COURSES }, (_, c) => ({
    id: `course-${c}`,
    name: `Curso ${c}`,
    groups: Array.from({ length: NUM_GROUPS_PER_COURSE }, (_, g) => ({
        id: `group-${c}-${g}`,
        name: `Grupo ${g}`
    }))
}));

const allGroupIds = courses.flatMap(c => c.groups.map(g => g.id));

const scheduledClasses = Array.from({ length: NUM_CLASSES }, (_, i) => ({
    id: `class-${i}`,
    subjectId: `subject-${i % NUM_SUBJECTS}`,
    teacherId: `teacher-${i % NUM_TEACHERS}`,
    groupId: allGroupIds[i % allGroupIds.length],
    start: '2025-03-03T09:00:00Z',
    duration: 1,
    isPinned: false
}));

const days = [1, 2, 3, 4, 5];
const slotsCount = 10;

function benchmarkOriginal() {
    let lookups = 0;
    const start = performance.now();

    courses.forEach(course => {
        course.groups.forEach(group => {
            const groupClasses = scheduledClasses.filter(c => c.groupId === group.id);
            for (let s = 0; s < slotsCount; s++) {
                days.forEach(day => {
                    const matchCls = groupClasses[s % groupClasses.length];
                    if (matchCls) {
                        const subject = subjects.find(s => s.id === matchCls.subjectId);
                        const teacher = teachers.find(t => t.id === matchCls.teacherId);
                        lookups += 2;
                    }
                });
            }
        });
    });

    teachers.forEach(teacher => {
        const teacherClasses = scheduledClasses.filter(c => c.teacherId === teacher.id);
        for (let s = 0; s < slotsCount; s++) {
            days.forEach(day => {
                const matchCls = teacherClasses[s % teacherClasses.length];
                if (matchCls) {
                    const subject = subjects.find(s => s.id === matchCls.subjectId);
                    const course = courses.find(c => c.groups.some(g => g.id === matchCls.groupId));
                    const group = course ? course.groups.find(g => g.id === matchCls.groupId) : null;
                    lookups += 3;
                }
            });
        }
    });

    const end = performance.now();
    return { timeMs: end - start, lookups };
}

function benchmarkOptimized() {
    let lookups = 0;
    const start = performance.now();

    const subjectMap = new Map(subjects.map(s => [s.id, s]));
    const teacherMap = new Map(teachers.map(t => [t.id, t]));
    const groupCourseMap = new Map();
    courses.forEach(c => {
        c.groups.forEach(g => {
            groupCourseMap.set(g.id, { course: c, group: g });
        });
    });

    courses.forEach(course => {
        course.groups.forEach(group => {
            const groupClasses = scheduledClasses.filter(c => c.groupId === group.id);
            for (let s = 0; s < slotsCount; s++) {
                days.forEach(day => {
                    const matchCls = groupClasses[s % groupClasses.length];
                    if (matchCls) {
                        const subject = subjectMap.get(matchCls.subjectId);
                        const teacher = teacherMap.get(matchCls.teacherId);
                        lookups += 2;
                    }
                });
            }
        });
    });

    teachers.forEach(teacher => {
        const teacherClasses = scheduledClasses.filter(c => c.teacherId === teacher.id);
        for (let s = 0; s < slotsCount; s++) {
            days.forEach(day => {
                const matchCls = teacherClasses[s % teacherClasses.length];
                if (matchCls) {
                    const subject = subjectMap.get(matchCls.subjectId);
                    const cg = groupCourseMap.get(matchCls.groupId);
                    const course = cg ? cg.course : null;
                    const group = cg ? cg.group : null;
                    lookups += 3;
                }
            });
        }
    });

    const end = performance.now();
    return { timeMs: end - start, lookups };
}

for (let i = 0; i < 5; i++) {
    benchmarkOriginal();
    benchmarkOptimized();
}

const iterations = 50;
let totalTimeOrig = 0;
let totalTimeOpt = 0;

for (let i = 0; i < iterations; i++) {
    totalTimeOrig += benchmarkOriginal().timeMs;
    totalTimeOpt += benchmarkOptimized().timeMs;
}

const avgOrig = totalTimeOrig / iterations;
const avgOpt = totalTimeOpt / iterations;

console.log(`Baseline (O(N*M) Array.find): ${avgOrig.toFixed(3)} ms`);
console.log(`Optimized (O(1) Map.get):    ${avgOpt.toFixed(3)} ms`);
console.log(`Speedup factor: ${(avgOrig / avgOpt).toFixed(2)}x faster (${((1 - avgOpt / avgOrig) * 100).toFixed(1)}% reduction in runtime)`);
