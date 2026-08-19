import { openSubjectForm, closeCrudModal, openCourseSubjects, renderSubjects, deleteSubject } from './crud_subjects';
import { openTeacherForm, renderTeachers, deleteTeacher, formatTeacherSpecialties } from './crud_teachers';
import { openCourseForm, openGroupModal, renderCourses, deleteCourse, deleteGroup } from './crud_courses';

export function openFormModal(type: string, id: string | null = null): void {
    if (type === 'subject') {
        openSubjectForm(id);
    } else if (type === 'teacher') {
        openTeacherForm(id);
    } else if (type === 'course') {
        openCourseForm(id);
    }
}

// Re-export public CRUD operations
export {
    closeCrudModal,
    openCourseSubjects,
    renderSubjects,
    deleteSubject,
    renderTeachers,
    deleteTeacher,
    formatTeacherSpecialties,
    openGroupModal,
    renderCourses,
    deleteCourse,
    deleteGroup
};
