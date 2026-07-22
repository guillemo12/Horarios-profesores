import { AppData } from './Datos';
import { refreshCalendarView } from './calendar';
import { Subject, Teacher, Course, CourseGroup } from './types';
import { showToast, formatHours } from './utils';

let currentCrudType: string = '';
let currentCrudId: string | null = null;
let currentCourseIdForGroup: string = '';
let currentGroupIdForGroup: string | null = null;

export function openFormModal(type: string, id: string | null = null): void {
    currentCrudType = type;
    currentCrudId = id;

    const titleEl = document.getElementById('crud-modal-title');
    const bodyEl = document.getElementById('crud-modal-body');
    if (!titleEl || !bodyEl) return;

    if (type === 'subject') {
        titleEl.textContent = id ? 'Editar Asignatura' : 'Nueva Asignatura';
        const s = id ? AppData.subjects.find(x => x.id === id) : null;
        const currentCourseId = (AppData as any).currentCourseId;

        bodyEl.innerHTML = `
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre de la Asignatura</label>
                    <input type="text" id="crud-subject-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${s?.name || ''}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Semanales</label>
                    <input type="number" id="crud-subject-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${s?.hours || 4}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Curso Asociado</label>
                    <select id="crud-subject-course" disabled required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none bg-gray-100 cursor-not-allowed">
                        ${AppData.courses.map(c => `<option value="${c.id}" ${c.id === (s?.courseId || currentCourseId) ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Profesores Cualificados (Especialistas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                        ${AppData.teachers.map(t => {
                            const isChecked = s?.teachers?.includes(t.id) || false;
                            return `
                                <label class="flex items-center gap-2 cursor-pointer text-sm">
                                    <input type="checkbox" name="crud-subject-teachers" value="${t.id}" ${isChecked ? 'checked' : ''} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                    <span>${t.name}</span>
                                </label>
                            `;
                        }).join('')}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow animate-fade-in">Guardar</button>
                </div>
            </form>
        `;
    } 
    else if (type === 'teacher') {
        titleEl.textContent = id ? 'Editar Profesor' : 'Nuevo Profesor';
        const t = id ? AppData.teachers.find(x => x.id === id) : null;

        bodyEl.innerHTML = `
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Profesor</label>
                    <input type="text" id="crud-teacher-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${t?.name || ''}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Horas Máximas Semanales</label>
                    <input type="number" id="crud-teacher-max-hours" required min="0.5" step="0.5" class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${t?.maxHours || 22.5}">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Color Identificativo</label>
                    <div class="flex gap-2 items-center">
                        <input type="color" id="crud-teacher-color" required class="w-10 h-10 border border-gray-300 rounded cursor-pointer" value="${t?.color || '#4f46e5'}">
                        <span class="text-xs text-gray-500">Color visual en el calendario.</span>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Especialidades (Materias habilitadas)</label>
                    <div class="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2 bg-gray-50">
                        ${AppData.subjects.map(s => `
                            <label class="flex items-center gap-2 cursor-pointer text-sm">
                                <input type="checkbox" name="crud-teacher-subjects" value="${s.id}" ${t?.subjects.includes(s.id) ? 'checked' : ''} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                <span>${s.name}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `;
    } 
    else if (type === 'course') {
        titleEl.textContent = id ? 'Editar Curso' : 'Nuevo Curso';
        const c = id ? AppData.courses.find(x => x.id === id) : null;

        bodyEl.innerHTML = `
            <form id="form-crud" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Curso</label>
                    <input type="text" id="crud-course-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${c?.name || ''}">
                </div>
                <div class="flex justify-end gap-2 pt-2">
                    <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                    <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
                </div>
            </form>
        `;
    }

    const modal = document.getElementById('crud-modal');
    if (modal) modal.classList.replace('hidden', 'flex');

    const form = document.getElementById('form-crud');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();

            if (type === 'subject') {
                const name = (document.getElementById('crud-subject-name') as HTMLInputElement).value;
                const hours = parseFloat((document.getElementById('crud-subject-hours') as HTMLInputElement).value);
                const courseId = (AppData as any).currentCourseId;
                const checkboxes = document.querySelectorAll('input[name="crud-subject-teachers"]:checked');
                const teachers = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);

                try {
                    await AppData.API.saveSubject({ id: currentCrudId || undefined, name, hours, courseId, teachers });
                    showToast("Éxito", "Asignatura guardada correctamente", "success");
                    closeCrudModal();
                    renderSubjects();
                } catch (err) {
                    showToast("Error", "No se pudo guardar la asignatura", "error");
                }
            } 
            else if (type === 'teacher') {
                const name = (document.getElementById('crud-teacher-name') as HTMLInputElement).value;
                const maxHours = parseFloat((document.getElementById('crud-teacher-max-hours') as HTMLInputElement).value);
                const color = (document.getElementById('crud-teacher-color') as HTMLInputElement).value;
                
                const checkboxes = document.querySelectorAll('input[name="crud-teacher-subjects"]:checked');
                const subjects = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);

                try {
                    const existing = currentCrudId ? AppData.teachers.find(x => x.id === currentCrudId) : null;
                    const availability = existing ? existing.availability : [];

                    await AppData.API.saveTeacher({ id: currentCrudId || undefined, name, maxHours, color, subjects, availability });
                    showToast("Éxito", "Profesor guardado correctamente", "success");
                    closeCrudModal();
                    renderTeachers();
                } catch (err) {
                    showToast("Error", "No se pudo guardar el profesor", "error");
                }
            } 
            else if (type === 'course') {
                const name = (document.getElementById('crud-course-name') as HTMLInputElement).value;

                try {
                    await AppData.API.saveCourse({ id: currentCrudId || undefined, name });
                    showToast("Éxito", "Curso guardado correctamente", "success");
                    closeCrudModal();
                    renderCourses();
                } catch (err) {
                    showToast("Error", "No se pudo guardar el curso", "error");
                }
            }
        };
    }
}

export function openGroupModal(courseId: string, groupId: string | null = null): void {
    currentCourseIdForGroup = courseId;
    currentGroupIdForGroup = groupId;

    const course = AppData.courses.find(x => x.id === courseId);
    if (!course) return;
    const group = groupId ? course.groups.find(g => g.id === groupId) : null;

    const titleEl = document.getElementById('crud-modal-title');
    if (titleEl) titleEl.textContent = groupId ? 'Editar Grupo' : 'Nuevo Grupo';

    const body = document.getElementById('crud-modal-body');
    if (!body) return;

    body.innerHTML = `
        <form id="form-group-crud" class="space-y-4">
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Nombre del Grupo (Letra/Identificador)</label>
                <input type="text" id="crud-group-name" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" value="${group?.name || ''}">
            </div>
            <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1">Tutor del Grupo</label>
                <select id="crud-group-tutor" required class="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    ${AppData.teachers.map(t => `<option value="${t.id}" ${group?.tutorId === t.id ? 'selected' : ''}>${t.name}</option>`).join('')}
                </select>
            </div>
            <div class="flex justify-end gap-2 pt-2">
                <button type="button" onclick="closeCrudModal()" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50">Cancelar</button>
                <button type="submit" class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 shadow">Guardar</button>
            </div>
        </form>
    `;

    const modal = document.getElementById('crud-modal');
    if (modal) modal.classList.replace('hidden', 'flex');

    const form = document.getElementById('form-group-crud');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const name = (document.getElementById('crud-group-name') as HTMLInputElement).value;
            const tutorId = (document.getElementById('crud-group-tutor') as HTMLSelectElement).value;

            try {
                const courseObj = AppData.courses.find(x => x.id === currentCourseIdForGroup);
                if (!courseObj) return;

                if (currentGroupIdForGroup) {
                    const g = courseObj.groups.find(x => x.id === currentGroupIdForGroup);
                    if (g) {
                        g.name = name;
                        g.tutorId = tutorId;
                    }
                } else {
                    const newGroup = {
                        id: 'temp-' + Date.now(),
                        name,
                        tutorId,
                        assignments: {}
                    };
                    courseObj.groups.push(newGroup);
                }

                await AppData.API.updateCourseGroup(currentCourseIdForGroup, courseObj.groups);
                showToast("Éxito", "Grupo guardado correctamente", "success");
                closeCrudModal();
                renderCourses();
            } catch (err) {
                showToast("Error", "No se pudo guardar el grupo", "error");
            }
        };
    }
}

export function closeCrudModal(): void { 
    const modal = document.getElementById('crud-modal');
    if (modal) modal.classList.replace('flex', 'hidden'); 
}

export function openCourseSubjects(courseId: string): void {
    (AppData as any).currentCourseId = courseId;
    (window as any).switchTab('subjects');
}

export async function renderSubjects(): Promise<void> {
    try {
        AppData.subjects = await AppData.API.getSubjects();
        AppData.courses = await AppData.API.getCourses();
        const courseId = (AppData as any).currentCourseId;

        const titleEl = document.getElementById('view-subjects-title');
        if (titleEl) {
            const course = AppData.courses.find(c => c.id === courseId);
            titleEl.textContent = course ? `Asignaturas de ${course.name}` : 'Gestión de Asignaturas';
        }

        const tbody = document.getElementById('table-subjects');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!courseId) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Por favor, selecciona un curso primero.</td></tr>';
            return;
        }

        const filtered = AppData.subjects.filter(s => s.courseId === courseId);
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No hay asignaturas en este curso.</td></tr>';
            return;
        }

        filtered.forEach(s => {
            tbody.innerHTML += `
                <tr class="hover:bg-gray-50 border-b border-gray-100 text-sm">
                    <td class="p-4 font-medium text-gray-800">${s.name}</td>
                    <td class="p-4 text-center text-gray-600">${formatHours(s.hours)} h</td>
                    <td class="p-4 text-center">
                        <button onclick="openFormModal('subject', '${s.id}')" class="text-indigo-600 hover:text-indigo-900 font-semibold mr-3">Editar</button>
                        <button onclick="deleteSubject('${s.id}')" class="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                    </td>
                </tr>
            `;
        });
    } catch (err) {
        console.error(err);
        showToast("Error", "No se pudieron cargar las asignaturas", "error");
    }
}

export async function deleteSubject(id: string): Promise<void> {
    if (confirm("¿Estás seguro de que deseas eliminar esta asignatura?")) {
        try {
            await AppData.API.deleteSubject(id);
            showToast("Éxito", "Asignatura eliminada correctamente", "success");
            renderSubjects();
        } catch (err) {
            showToast("Error", "No se pudo eliminar la asignatura", "error");
        }
    }
}

export async function renderTeachers(): Promise<void> {
    try {
        AppData.teachers = await AppData.API.getTeachers();
        const list = document.getElementById('list-teachers');
        if (!list) return;
        list.innerHTML = '';
        AppData.teachers.forEach(t => {
            const subjNames = t.subjects.map(sId => {
                const s = AppData.subjects.find(x => x.id === sId);
                return s ? s.name : '';
            }).filter(n => n !== '').join(', ');

            list.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between mb-2">
                            <h3 class="font-bold text-gray-800 text-lg">${t.name}</h3>
                            <span class="w-4 h-4 rounded-full border border-gray-300" style="background-color: ${t.color}"></span>
                        </div>
                        <p class="text-sm text-gray-500 mb-1">Max: <b>${formatHours(t.maxHours)} h / semana</b></p>
                        <p class="text-xs text-gray-600 mt-2 italic truncate" title="${subjNames || 'Sin especialidades'}">
                            Especialidades: ${subjNames || 'Ninguna'}
                        </p>
                    </div>
                    <div class="mt-4 pt-3 border-t border-gray-100 flex justify-end gap-2">
                        <button onclick="openAvailabilityModal('${t.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-semibold mr-auto flex items-center gap-1">📅 Disponibilidad</button>
                        <button onclick="openFormModal('teacher', '${t.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-semibold">Editar</button>
                        <button onclick="deleteTeacher('${t.id}')" class="text-red-600 hover:text-red-900 text-xs font-semibold">Eliminar</button>
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
        showToast("Error", "No se pudieron cargar los profesores", "error");
    }
}

export async function deleteTeacher(id: string): Promise<void> {
    if (confirm("¿Estás seguro de que deseas eliminar este profesor?")) {
        try {
            await AppData.API.deleteTeacher(id);
            showToast("Éxito", "Profesor eliminado correctamente", "success");
            renderTeachers();
        } catch (err) {
            showToast("Error", "No se pudo eliminar al profesor", "error");
        }
    }
}

export async function renderCourses(): Promise<void> {
    try {
        AppData.courses = await AppData.API.getCourses();
        AppData.teachers = await AppData.API.getTeachers(); 
        const container = document.getElementById('list-courses');
        if (!container) return;
        container.innerHTML = '';
        AppData.courses.forEach(c => {
            let groupsHtml = '';
            if (c.groups.length === 0) {
                groupsHtml = '<p class="text-xs text-gray-400 italic">No hay grupos creados en este curso.</p>';
            } else {
                groupsHtml = `
                    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        ${c.groups.map(g => {
                            const tutor = AppData.teachers.find(t => t.id === g.tutorId);
                            return `
                                <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center justify-between">
                                    <div>
                                        <h4 class="font-semibold text-gray-700 text-sm">Grupo ${g.name}</h4>
                                        <p class="text-xs text-gray-500">Tutor: ${tutor ? tutor.name : 'Sin asignar'}</p>
                                    </div>
                                    <div class="flex gap-2">
                                        <button onclick="openGroupModal('${c.id}', '${g.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar</button>
                                        <button onclick="deleteGroup('${c.id}', '${g.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Borrar</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }

            container.innerHTML += `
                <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${c.name}</h3>
                        <div class="flex gap-3">
                            <button onclick="openCourseSubjects('${c.id}')" class="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1">📚 Asignaturas</button>
                            <button onclick="openGroupModal('${c.id}')" class="text-emerald-600 hover:text-emerald-800 text-xs font-bold">+ Añadir Grupo</button>
                            <button onclick="openFormModal('course', '${c.id}')" class="text-indigo-600 hover:text-indigo-900 text-xs font-bold">Editar Curso</button>
                            <button onclick="deleteCourse('${c.id}')" class="text-red-600 hover:text-red-900 text-xs font-bold">Eliminar Curso</button>
                        </div>
                    </div>
                    ${groupsHtml}
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
        showToast("Error", "No se pudieron cargar los cursos", "error");
    }
}

export async function deleteCourse(id: string): Promise<void> {
    if (confirm("¿Estás seguro de que deseas eliminar este curso y todos sus grupos?")) {
        try {
            await AppData.API.deleteCourse(id);
            showToast("Éxito", "Curso eliminado correctamente", "success");
            renderCourses();
        } catch (err) {
            showToast("Error", "No se pudo eliminar el curso", "error");
        }
    }
}

export async function deleteGroup(courseId: string, groupId: string): Promise<void> {
    if (confirm("¿Estás seguro de que deseas eliminar este grupo?")) {
        try {
            const course = AppData.courses.find(x => x.id === courseId);
            if (!course) return;
            const updatedGroups = course.groups.filter(g => g.id !== groupId);
            await AppData.API.updateCourseGroup(courseId, updatedGroups);
            showToast("Éxito", "Grupo eliminado correctamente", "success");
            renderCourses();
        } catch (err) {
            showToast("Error", "No se pudo eliminar el grupo", "error");
        }
    }
}

export async function renderAssignmentsList(): Promise<void> {
    try {
        AppData.courses = await AppData.API.getCourses();
        AppData.subjects = await AppData.API.getSubjects();
        AppData.teachers = await AppData.API.getTeachers();

        const container = document.getElementById('assignments-list');
        if (!container) return;
        container.innerHTML = '';

        if (AppData.courses.length === 0) {
            container.innerHTML = '<p class="text-gray-500 italic">No hay cursos creados. Crea primero un curso y grupos.</p>';
            return;
        }

        AppData.courses.forEach(c => {
            const courseSubjects = AppData.subjects.filter(s => s.courseId === c.id);
            if (c.groups.length === 0) return; 

            let groupsAssignmentsHtml = '';
            c.groups.forEach(g => {
                let subjectsTableHtml = '';
                
                if (courseSubjects.length === 0) {
                    subjectsTableHtml = '<tr><td colspan="2" class="p-3 text-xs text-gray-400 italic">No hay asignaturas en este curso.</td></tr>';
                } else {
                    courseSubjects.forEach(s => {
                        const assignedTeacherId = g.assignments[s.id] || '';
                        const qualifiedTeachers = AppData.teachers.filter(t => t.subjects.includes(s.id));
                        
                        subjectsTableHtml += `
                            <tr class="border-b border-gray-100 last:border-0">
                                <td class="py-2 text-sm font-medium text-gray-700">${s.name} (${formatHours(s.hours)}h)</td>
                                <td class="py-2">
                                    <select onchange="updateAssignment('${c.id}', '${g.id}', '${s.id}', this.value)" class="min-w-[180px] w-full text-xs border border-gray-300 rounded p-1 outline-none bg-white focus:ring-1 focus:ring-indigo-500">
                                        <option value="">-- Sin asignar --</option>
                                        ${AppData.teachers.map(t => {
                                            const isQualified = qualifiedTeachers.some(qt => qt.id === t.id);
                                            const label = isQualified ? t.name : `${t.name} (No especialista)`;
                                            return `<option value="${t.id}" ${assignedTeacherId === t.id ? 'selected' : ''}>${label}</option>`;
                                        }).join('')}
                                    </select>
                                </td>
                            </tr>
                        `;
                    });
                }

                groupsAssignmentsHtml += `
                    <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 class="font-bold text-gray-700 mb-2 border-b pb-1 text-sm">Grupo ${g.name}</h4>
                        <table class="w-full">
                            <tbody>
                                ${subjectsTableHtml}
                            </tbody>
                        </table>
                    </div>
                `;
            });

            container.innerHTML += `
                <div class="mb-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <h3 class="font-bold text-gray-800 text-lg border-b pb-2">${c.name}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${groupsAssignmentsHtml}
                    </div>
                </div>
            `;
        });
    } catch (err) {
        console.error(err);
        showToast("Error", "No se pudieron cargar las asignaciones", "error");
    }
}

export async function updateAssignment(courseId: string, groupId: string, subjectId: string, teacherId: string): Promise<void> {
    try {
        const course = AppData.courses.find(x => x.id === courseId);
        if (!course) return;
        const group = course.groups.find(g => g.id === groupId);
        if (!group) return;

        if (teacherId === '') {
            delete group.assignments[subjectId];
        } else {
            group.assignments[subjectId] = teacherId;
        }

        await AppData.API.updateCourseGroup(courseId, course.groups);
        showToast("Éxito", "Asignación actualizada", "success");
    } catch (err) {
        showToast("Error", "No se pudo guardar la asignación", "error");
    }
}

// --- DISPONIBILIDAD HORARIA DOCENTE (NUEVO) ---
let currentAvailabilityTeacherId: string | null = null;
let currentTeacherAvailabilityList: { dayOfWeek: number; startTime: string; endTime: string }[] = [];

export function openAvailabilityModal(teacherId: string): void {
    const t = AppData.teachers.find(x => x.id === teacherId);
    if (!t) return;

    currentAvailabilityTeacherId = teacherId;
    currentTeacherAvailabilityList = t.availability ? [...t.availability] : [];

    const nameEl = document.getElementById('availability-teacher-name');
    if (nameEl) nameEl.textContent = t.name;

    const tbody = document.getElementById('availability-grid-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const timeSlots = [
        { start: '09:00', end: '09:30' },
        { start: '09:30', end: '10:00' },
        { start: '10:00', end: '10:30' },
        { start: '10:30', end: '11:00' },
        { start: '11:00', end: '11:30' },
        { start: '11:30', end: '12:00' },
        { start: '12:30', end: '13:00' },
        { start: '13:00', end: '13:30' },
        { start: '13:30', end: '14:00' }
    ];

    timeSlots.forEach((slot, index) => {
        let cellsHtml = '';
        for (let day = 1; day <= 5; day++) {
            const isUnavailable = currentTeacherAvailabilityList.some(av => 
                av.dayOfWeek === day && av.startTime === slot.start && av.endTime === slot.end
            );
            
            const cellId = `cell-av-${day}-${index}`;
            const bgClass = isUnavailable 
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-300 font-bold' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200';
            const textVal = isUnavailable ? 'NO DISPONIBLE' : 'DISPONIBLE';

            cellsHtml += `
                <td class="p-2 text-center border border-gray-200">
                    <button type="button" id="${cellId}" 
                        onclick="toggleAvailabilitySlot(${day}, '${slot.start}', '${slot.end}', '${cellId}')"
                        class="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all ${bgClass}">
                        ${textVal}
                    </button>
                </td>
            `;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-3 border border-gray-200 font-semibold text-gray-700 text-center">${slot.start} - ${slot.end}</td>
                ${cellsHtml}
            </tr>
        `;
    });

    const modal = document.getElementById('availability-modal');
    if (modal) modal.classList.replace('hidden', 'flex');
}

(window as any).toggleAvailabilitySlot = function(day: number, start: string, end: string, cellId: string): void {
    const btn = document.getElementById(cellId) as HTMLButtonElement;
    if (!btn) return;

    const index = currentTeacherAvailabilityList.findIndex(av => 
        av.dayOfWeek === day && av.startTime === start && av.endTime === end
    );

    if (index > -1) {
        currentTeacherAvailabilityList.splice(index, 1);
        btn.className = "w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200";
        btn.textContent = "DISPONIBLE";
    } else {
        currentTeacherAvailabilityList.push({ dayOfWeek: day, startTime: start, endTime: end });
        btn.className = "w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-red-500 hover:bg-red-600 text-white border border-red-300 font-bold";
        btn.textContent = "NO DISPONIBLE";
    }
};

export function closeAvailabilityModal(): void {
    const modal = document.getElementById('availability-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

export async function saveAvailability(): Promise<void> {
    if (!currentAvailabilityTeacherId) return;
    const t = AppData.teachers.find(x => x.id === currentAvailabilityTeacherId);
    if (!t) return;

    t.availability = currentTeacherAvailabilityList;
    try {
        await AppData.API.saveTeacher(t);
        showToast("Éxito", "Disponibilidad docente guardada correctamente", "success");
        closeAvailabilityModal();
        renderTeachers();
    } catch (err) {
        showToast("Error", "No se pudo guardar la disponibilidad", "error");
    }
}

// --- CONFIGURACIÓN DE REGLAS (NUEVO) ---
export function loadSettings(): void {
    const conf = AppData.config;
    if (!conf) return;

    const elMinimo = document.getElementById('settings-tiempo-minimo') as HTMLInputElement;
    const elMaximo = document.getElementById('settings-tiempo-maximo') as HTMLInputElement;
    const elMaxProfe = document.getElementById('settings-max-minutos-profesor') as HTMLInputElement;
    const elPriorizar = document.getElementById('settings-priorizar-tutor') as HTMLInputElement;
    const elPriorizarPuntos = document.getElementById('settings-priorizar-tutor-puntos') as HTMLInputElement;
    const elBloquesPuntos = document.getElementById('settings-bloques-60-puntos') as HTMLInputElement;
    const elHuecosPuntos = document.getElementById('settings-huecos-puntos') as HTMLInputElement;
    const elCompactarPuntos = document.getElementById('settings-compactar-temprano-puntos') as HTMLInputElement;

    if (elMinimo) elMinimo.value = conf.tiempoMinimo.toString();
    if (elMaximo) elMaximo.value = conf.tiempoMaximo.toString();
    if (elMaxProfe) elMaxProfe.value = conf.minutosMaximosProfesor.toString();
    
    if (elPriorizar) {
        elPriorizar.checked = conf.priorizarTutor;
        const container = document.getElementById('settings-tutor-points-container');
        if (container) {
            container.style.display = conf.priorizarTutor ? 'flex' : 'none';
        }
        elPriorizar.onchange = () => {
            if (container) container.style.display = elPriorizar.checked ? 'flex' : 'none';
        };
    }
    
    if (elPriorizarPuntos) elPriorizarPuntos.value = conf.priorizarTutorPuntos.toString();
    if (elBloquesPuntos) elBloquesPuntos.value = conf.fomentarBloques60Puntos.toString();
    if (elHuecosPuntos) elHuecosPuntos.value = conf.evitarHuecosPuntos.toString();
    if (elCompactarPuntos) elCompactarPuntos.value = conf.compactarTempranoPuntos.toString();
}

export async function saveSettings(): Promise<void> {
    const elMinimo = document.getElementById('settings-tiempo-minimo') as HTMLInputElement;
    const elMaximo = document.getElementById('settings-tiempo-maximo') as HTMLInputElement;
    const elMaxProfe = document.getElementById('settings-max-minutos-profesor') as HTMLInputElement;
    const elPriorizar = document.getElementById('settings-priorizar-tutor') as HTMLInputElement;
    const elPriorizarPuntos = document.getElementById('settings-priorizar-tutor-puntos') as HTMLInputElement;
    const elBloquesPuntos = document.getElementById('settings-bloques-60-puntos') as HTMLInputElement;
    const elHuecosPuntos = document.getElementById('settings-huecos-puntos') as HTMLInputElement;
    const elCompactarPuntos = document.getElementById('settings-compactar-temprano-puntos') as HTMLInputElement;

    const payload = {
        priorizarTutor: elPriorizar ? elPriorizar.checked : false,
        tiempoMinimo: elMinimo ? parseInt(elMinimo.value) : 30,
        tiempoMaximo: elMaximo ? parseInt(elMaximo.value) : 60,
        minutosMaximosProfesor: elMaxProfe ? parseInt(elMaxProfe.value) : 1500,
        priorizarTutorPuntos: elPriorizarPuntos ? parseInt(elPriorizarPuntos.value) : 100,
        fomentarBloques60Puntos: elBloquesPuntos ? parseInt(elBloquesPuntos.value) : 10,
        evitarHuecosPuntos: elHuecosPuntos ? parseInt(elHuecosPuntos.value) : 50,
        compactarTempranoPuntos: elCompactarPuntos ? parseInt(elCompactarPuntos.value) : 5
    };

    try {
        AppData.config = await AppData.API.saveConfig(payload);
        showToast("Éxito", "Configuración de reglas guardada correctamente", "success");
    } catch (err) {
        showToast("Error", "No se pudo guardar la configuración", "error");
    }
}
