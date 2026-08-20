import { AppData } from './Datos';
import { Course, ScheduledClass } from './types';
import { showToast, formatHours } from './utils';
import { getSubjectColor } from './calendar_colors';
import { overlapsRecess } from './calendar_events';
import { isValidTimeRange, calculateSlotCount, parseTimeParts } from './calendar_validation';

export function updateModalTeacherOptions(preferredTeacherId: string | null = null): void {
    const teacherSelect = document.getElementById('modal-teacher') as HTMLSelectElement;
    const subjSelect = document.getElementById('modal-subject') as HTMLSelectElement;
    const groupSelect = document.getElementById('modal-group') as HTMLSelectElement;
    const courseSelect = document.getElementById('modal-course') as HTMLSelectElement;
    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const viewEntitySelect = document.getElementById('view-entity-select') as HTMLSelectElement;

    if (!teacherSelect || !subjSelect || !groupSelect) return;

    const currentTeacherVal = preferredTeacherId || teacherSelect.value;
    const subjId = subjSelect.value;
    const groupId = groupSelect.value;
    const courseId = courseSelect?.value;
    const viewType = typeSelect?.value;
    const viewEntity = viewEntitySelect?.value;

    if (viewType === 'teacher' && viewEntity) {
        teacherSelect.innerHTML = AppData.teachers.map(t => {
            return `<option value="${t.id}" ${t.id === viewEntity ? 'selected' : ''}>${t.name}</option>`;
        }).join('');
        teacherSelect.value = viewEntity;
        teacherSelect.disabled = true;
        return;
    }

    // Buscar si hay un profesor asignado en Reparto Docente para este grupo y asignatura
    let assignedTeacherId = '';
    const course = AppData.courses.find(c => c.id === courseId || c.groups.some(g => g.id === groupId));
    const group = course?.groups.find(g => g.id === groupId);
    if (group && group.assignments && group.assignments[subjId]) {
        assignedTeacherId = group.assignments[subjId];
    }

    // Profesores especialistas (que imparten esta asignatura)
    const qualifiedTeachers = AppData.teachers.filter(t => t.subjects.includes(subjId));

    // Determinar qué profesor seleccionar por defecto
    let selectedTeacherId = '';
    if (assignedTeacherId && AppData.teachers.some(t => t.id === assignedTeacherId)) {
        selectedTeacherId = assignedTeacherId;
    } else if (currentTeacherVal && AppData.teachers.some(t => t.id === currentTeacherVal) && qualifiedTeachers.some(t => t.id === currentTeacherVal)) {
        selectedTeacherId = currentTeacherVal;
    } else if (qualifiedTeachers.length > 0) {
        selectedTeacherId = qualifiedTeachers[0].id;
    } else if (group?.tutor) {
        const tutorTeacher = AppData.teachers.find(t => t.name === group.tutor);
        selectedTeacherId = tutorTeacher ? tutorTeacher.id : (AppData.teachers[0]?.id || '');
    } else {
        selectedTeacherId = currentTeacherVal || (AppData.teachers[0]?.id || '');
    }

    // Ordenar profesores: 1º Asignado en reparto, 2º Especialistas, 3º Resto
    const sortedTeachers = [...AppData.teachers].sort((a, b) => {
        const aAssigned = a.id === assignedTeacherId ? 1 : 0;
        const bAssigned = b.id === assignedTeacherId ? 1 : 0;
        if (aAssigned !== bAssigned) return bAssigned - aAssigned;

        const aQual = a.subjects.includes(subjId) ? 1 : 0;
        const bQual = b.subjects.includes(subjId) ? 1 : 0;
        if (aQual !== bQual) return bQual - aQual;

        return a.name.localeCompare(b.name);
    });

    teacherSelect.innerHTML = sortedTeachers.map(t => {
        let tag = '';
        if (t.id === assignedTeacherId) {
            tag = ' ⭐ (Asignado en Reparto)';
        } else if (t.subjects.includes(subjId)) {
            tag = ' ✓ (Especialista)';
        }
        return `<option value="${t.id}" ${t.id === selectedTeacherId ? 'selected' : ''}>${t.name}${tag}</option>`;
    }).join('');

    if (selectedTeacherId) {
        teacherSelect.value = selectedTeacherId;
    }
}

export function onModalSubjectChange(): void {
    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const viewType = typeSelect?.value;
    const subjSelect = document.getElementById('modal-subject') as HTMLSelectElement;
    const courseSelect = document.getElementById('modal-course') as HTMLSelectElement;
    const groupSelect = document.getElementById('modal-group') as HTMLSelectElement;
    const teacherSelect = document.getElementById('modal-teacher') as HTMLSelectElement;

    if (!subjSelect) return;
    const subjId = subjSelect.value;

    if (viewType === 'teacher') {
        const teacherId = teacherSelect?.value;
        let foundCourse: Course | undefined;
        let foundGroup: any;

        for (const c of AppData.courses) {
            for (const g of c.groups) {
                if (g.assignments && g.assignments[subjId] === teacherId) {
                    foundCourse = c;
                    foundGroup = g;
                    break;
                }
            }
            if (foundCourse) break;
        }

        if (foundCourse && foundGroup) {
            if (courseSelect) {
                courseSelect.value = foundCourse.id;
                onModalCourseChange(foundGroup.id);
            }
        } else {
            const subjectObj = AppData.subjects.find(s => s.id === subjId);
            const courseBySubj = AppData.courses.find(c => c.id === subjectObj?.courseId || c.subjects.includes(subjId));
            if (courseBySubj && courseSelect) {
                courseSelect.value = courseBySubj.id;
                onModalCourseChange();
            }
        }
    } else {
        updateModalTeacherOptions();
    }
}

export function onModalCourseChange(targetGroupId: string | null = null): void {
    const courseSelect = document.getElementById('modal-course') as HTMLSelectElement;
    const groupSelect = document.getElementById('modal-group') as HTMLSelectElement;
    if (!courseSelect || !groupSelect) return;

    const courseId = courseSelect.value;
    const course = AppData.courses.find(c => c.id === courseId);

    if (course) {
        groupSelect.innerHTML = course.groups.map(g => `<option value="${g.id}">Grupo ${g.name}</option>`).join('');
        if (targetGroupId && course.groups.some(g => g.id === targetGroupId)) {
            groupSelect.value = targetGroupId;
        }
    } else {
        groupSelect.innerHTML = '';
    }

    updateModalTeacherOptions();
}

export function onModalGroupChange(): void {
    updateModalTeacherOptions();
}

export function openAddClassModal(start?: Date, end?: Date): void {
    const subjSelect = document.getElementById('modal-subject') as HTMLSelectElement;
    const teacherSelect = document.getElementById('modal-teacher') as HTMLSelectElement;
    const groupSelect = document.getElementById('modal-group') as HTMLSelectElement;
    const courseSelect = document.getElementById('modal-course') as HTMLSelectElement;
    const daySelect = document.getElementById('modal-day') as HTMLSelectElement;
    const startTimeInput = document.getElementById('modal-start-time') as HTMLInputElement;
    const endTimeInput = document.getElementById('modal-end-time') as HTMLInputElement;

    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const viewEntitySelect = document.getElementById('view-entity-select') as HTMLSelectElement;
    const headerCourseSelect = document.getElementById('header-course-select') as HTMLSelectElement;

    const viewType = typeSelect ? typeSelect.value : 'group';
    const viewEntity = viewEntitySelect ? viewEntitySelect.value : '';

    if (courseSelect) {
        courseSelect.innerHTML = AppData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    let defaultCourseId = headerCourseSelect ? headerCourseSelect.value : (AppData.courses[0]?.id || '');
    let defaultGroupId = '';

    if (viewType === 'group' && viewEntity) {
        defaultGroupId = viewEntity;
        const currentCourse = AppData.courses.find(c => c.groups.some(g => g.id === defaultGroupId));
        if (currentCourse) defaultCourseId = currentCourse.id;
    } else if (viewType === 'teacher' && viewEntity) {
        const teacherObj = AppData.teachers.find(t => t.id === viewEntity);
        if (teacherObj) {
            for (const c of AppData.courses) {
                for (const g of c.groups) {
                    if (g.assignments && Object.values(g.assignments).includes(teacherObj.id)) {
                        defaultCourseId = c.id;
                        defaultGroupId = g.id;
                        break;
                    }
                }
            }
        }
    }

    if (courseSelect) {
        courseSelect.value = defaultCourseId;
        courseSelect.disabled = (viewType === 'group');
    }

    onModalCourseChange(defaultGroupId);
    if (groupSelect) {
        groupSelect.disabled = (viewType === 'group');
    }

    let availableSubjects = AppData.subjects;
    if (viewType === 'teacher' && viewEntity) {
        const teacherObj = AppData.teachers.find(t => t.id === viewEntity);
        if (teacherObj && teacherObj.subjects && teacherObj.subjects.length > 0) {
            availableSubjects = AppData.subjects.filter(s => teacherObj.subjects.includes(s.id));
            if (availableSubjects.length === 0) availableSubjects = AppData.subjects;
        }
    } else if (defaultCourseId) {
        const selectedCourse = AppData.courses.find(c => c.id === defaultCourseId);
        if (selectedCourse && selectedCourse.subjects && selectedCourse.subjects.length > 0) {
            availableSubjects = AppData.subjects.filter(s => selectedCourse.subjects.includes(s.id));
            if (availableSubjects.length === 0) availableSubjects = AppData.subjects;
        }
    }

    if (subjSelect) {
        subjSelect.innerHTML = availableSubjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
    }

    updateModalTeacherOptions();

    if (daySelect && start) {
        const dayMap: { [key: number]: string } = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' };
        const day = start.getDay();
        if (dayMap[day]) daySelect.value = dayMap[day];
    }

    if (startTimeInput && start) {
        startTimeInput.value = `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
    } else if (startTimeInput) {
        startTimeInput.value = "09:00";
    }

    if (endTimeInput && end) {
        endTimeInput.value = `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
    } else if (endTimeInput) {
        endTimeInput.value = "10:00";
    }

    const modal = document.getElementById('add-class-modal');
    if (modal) modal.classList.replace('hidden', 'flex');
}

export function closeAddClassModal(): void {
    const modal = document.getElementById('add-class-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

export async function saveNewClass(onSavedCallback?: () => void): Promise<void> {
    const subjSelect = document.getElementById('modal-subject') as HTMLSelectElement;
    const teacherSelect = document.getElementById('modal-teacher') as HTMLSelectElement;
    const groupSelect = document.getElementById('modal-group') as HTMLSelectElement;
    const daySelect = document.getElementById('modal-day') as HTMLSelectElement;
    const startTimeInput = document.getElementById('modal-start-time') as HTMLInputElement;
    const endTimeInput = document.getElementById('modal-end-time') as HTMLInputElement;

    if (!subjSelect || !teacherSelect || !groupSelect || !daySelect || !startTimeInput || !endTimeInput) return;

    const subjectId = subjSelect.value;
    const teacherId = teacherSelect.value;
    const groupId = groupSelect.value;
    const dayIndex = parseInt(daySelect.value, 10);
    const startStr = startTimeInput.value;
    const endStr = endTimeInput.value;

    if (!subjectId || !teacherId || !groupId) {
        showToast("Error de Validación", "Por favor completa todos los campos requeridos.", "warning");
        return;
    }

    if (!isValidTimeRange(startStr, endStr)) {
        showToast("Error de Validación", "La hora de fin debe ser posterior a la de inicio.", "warning");
        return;
    }

    const numSlots = calculateSlotCount(startStr, endStr, 30);
    const { hours: sH, minutes: sM } = parseTimeParts(startStr);
    const { hours: eH, minutes: eM } = parseTimeParts(endStr);

    const now = new Date();
    const currentDay = now.getDay();
    const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diff));

    const classDate = new Date(monday);
    classDate.setDate(monday.getDate() + (dayIndex - 1));

    const startDate = new Date(classDate);
    startDate.setHours(sH, sM, 0, 0);

    const endDate = new Date(classDate);
    endDate.setHours(eH, eM, 0, 0);

    if (overlapsRecess(startDate, endDate)) {
        showToast("Error", "No se puede programar una clase durante el recreo (12:00 - 12:30).", "error");
        return;
    }

    for (let i = 0; i < numSlots; i++) {
        const slotStart = new Date(startDate.getTime() + i * 30 * 60000);
        const slotEnd = new Date(slotStart.getTime() + 30 * 60000);

        const nuevaClase: ScheduledClass = {
            id: `class-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            subjectId: subjectId,
            teacherId: teacherId,
            groupId: groupId,
            start: slotStart.toISOString(),
            end: slotEnd.toISOString(),
            duration: 0.5,
            isPinned: false
        };

        await AppData.API.saveClass(nuevaClase);
        AppData.scheduledClasses.push(nuevaClase);
    }

    closeAddClassModal();
    if (typeof onSavedCallback === 'function') {
        onSavedCallback();
    }

    const assignedTeacher = AppData.teachers.find(t => t.id === teacherId);
    showToast("Clase Guardada", `Programada correctamente para el profesor ${assignedTeacher ? assignedTeacher.name : ''}`, "success");
}

export function openEventDetail(event: any, onActionCallback?: () => void): void {
    let mergedEvent = AppData.currentMergedEvents?.find(e => e.id === event.id || (e.mergedIds && e.mergedIds.includes(event.id)));
    let constituentClasses: ScheduledClass[] = [];
    if (mergedEvent && mergedEvent.mergedIds) {
        constituentClasses = AppData.scheduledClasses.filter(c => mergedEvent.mergedIds.includes(c.id));
    } else {
        const singleCls = AppData.scheduledClasses.find(c => c.id === event.id);
        if (singleCls) constituentClasses = [singleCls];
    }
    if (constituentClasses.length === 0) return;

    const firstCls = constituentClasses[0];
    const subject = AppData.subjects.find(s => s.id === firstCls.subjectId);
    const teacher = AppData.teachers.find(t => t.id === firstCls.teacherId);

    if (!subject || !teacher) return;

    const totalDuration = constituentClasses.reduce((sum, c) => sum + (c.duration || 0.5), 0);
    const isAnyPinned = constituentClasses.some(c => c.isPinned);

    const course = AppData.courses.find(c => c.groups.some(g => g.id === firstCls.groupId));
    const group = course ? course.groups.find(g => g.id === firstCls.groupId) : null;
    const courseGroupName = course && group ? `${course.name} - Grupo ${group.name}` : 'Sin grupo';

    const titleEl = document.getElementById('event-detail-title');
    if (titleEl) titleEl.textContent = `${subject.name} (${formatHours(totalDuration)}h)`;

    const colorMode = AppData.colorMode || 'teacher';
    const headerColor = (colorMode === 'subject')
        ? getSubjectColor(firstCls.subjectId)
        : teacher.color;

    const headerEl = document.getElementById('event-detail-header');
    if (headerEl) headerEl.style.backgroundColor = headerColor;

    const bodyEl = document.getElementById('event-detail-body');
    if (bodyEl) {
        const sTime = new Date(mergedEvent ? mergedEvent.start : firstCls.start).toTimeString().slice(0, 5);
        const eTime = new Date(mergedEvent ? mergedEvent.end : constituentClasses[constituentClasses.length - 1].end).toTimeString().slice(0, 5);
        bodyEl.innerHTML = `
            <p class="text-sm mb-1.5">Curso/Grupo: <b>${courseGroupName}</b></p>
            <p class="text-sm mb-1.5">Impartida por: <b>${teacher.name}</b></p>
            <p class="text-xs text-gray-500">Horario: <b>${sTime} - ${eTime}</b> (${formatHours(totalDuration)}h)</p>
        `;
    }

    const pinBtn = document.getElementById('btn-pin-event') as HTMLButtonElement;
    if (pinBtn) {
        pinBtn.innerText = isAnyPinned ? "Desfijar" : "Fijar (Pin)";
        pinBtn.onclick = async () => {
            const newPinState = !isAnyPinned;
            for (const cls of constituentClasses) {
                cls.isPinned = newPinState;
                try {
                    await AppData.API.updateClass(cls);
                } catch (err) {
                    console.error("Error al actualizar estado del pin:", err);
                }
            }
            closeEventDetail();
            if (typeof onActionCallback === 'function') onActionCallback();
        };
    }

    const delBtn = document.getElementById('btn-delete-event') as HTMLButtonElement;
    if (delBtn) {
        delBtn.onclick = async () => {
            for (const cls of constituentClasses) {
                await AppData.API.deleteClass(cls.id);
                AppData.scheduledClasses = AppData.scheduledClasses.filter(c => c.id !== cls.id);
            }
            closeEventDetail();
            if (typeof onActionCallback === 'function') onActionCallback();
        };
    }

    const modal = document.getElementById('event-detail-modal');
    if (modal) {
        modal.classList.replace('hidden', 'flex');
        modal.onclick = (e: MouseEvent) => {
            if (e.target === modal) {
                closeEventDetail();
            }
        };
    }
}

export function closeEventDetail(): void {
    const modal = document.getElementById('event-detail-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
}
