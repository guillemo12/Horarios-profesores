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


