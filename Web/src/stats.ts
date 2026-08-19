import { Teacher, Course, Subject } from './types';

export interface SchoolStatsSummary {
    totalTeachers: number;
    totalCourses: number;
    totalGroups: number;
    totalSubjects: number;
    totalTeacherCapacityHours: number;
    totalDemandedSubjectHours: number;
    hoursBalance: number;
}

/**
 * Calcula métricas y resumen de capacidad del centro escolar de forma pura e inmutable.
 */
export function calculateSchoolStats(
    teachers: Teacher[] | null | undefined,
    courses: Course[] | null | undefined,
    subjects: Subject[] | null | undefined
): SchoolStatsSummary {
    const safeTeachers = Array.isArray(teachers) ? teachers : [];
    const safeCourses = Array.isArray(courses) ? courses : [];
    const safeSubjects = Array.isArray(subjects) ? subjects : [];

    const totalTeachers = safeTeachers.length;
    const totalCourses = safeCourses.length;
    const totalGroups = safeCourses.reduce((acc, c) => acc + (Array.isArray(c.groups) ? c.groups.length : 0), 0);
    const totalSubjects = safeSubjects.length;

    const totalTeacherCapacityHours = safeTeachers.reduce((acc, t) => acc + (typeof t.maxHours === 'number' ? t.maxHours : 0), 0);

    // Horas demandadas = suma de horas de las materias por el número de grupos en su curso
    let totalDemandedSubjectHours = 0;
    for (const s of safeSubjects) {
        const course = safeCourses.find(c => c.id === s.courseId);
        const groupCount = course && Array.isArray(course.groups) ? course.groups.length : 1;
        const subjectHours = typeof s.hours === 'number' ? s.hours : 0;
        totalDemandedSubjectHours += subjectHours * groupCount;
    }

    const hoursBalance = Number((totalTeacherCapacityHours - totalDemandedSubjectHours).toFixed(2));

    return {
        totalTeachers,
        totalCourses,
        totalGroups,
        totalSubjects,
        totalTeacherCapacityHours: Number(totalTeacherCapacityHours.toFixed(2)),
        totalDemandedSubjectHours: Number(totalDemandedSubjectHours.toFixed(2)),
        hoursBalance
    };
}
