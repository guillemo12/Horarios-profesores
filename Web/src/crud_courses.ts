import { AppData } from './Datos';
import { Course, CourseGroup } from './types';
import { showToast } from './utils';
import { closeCrudModal, openCourseSubjects } from './crud_subjects';

let currentCourseIdForGroup: string = '';
let currentGroupIdForGroup: string | null = null;

export function openCourseForm(id: string | null = null): void {
    const titleEl = document.getElementById('crud-modal-title');
    const bodyEl = document.getElementById('crud-modal-body');
    if (!titleEl || !bodyEl) return;

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

    const modal = document.getElementById('crud-modal');
    if (modal) modal.classList.replace('hidden', 'flex');

    const form = document.getElementById('form-crud');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const name = (document.getElementById('crud-course-name') as HTMLInputElement).value;

            try {
                await AppData.API.saveCourse({ id: id || undefined, name });
                showToast("Éxito", "Curso guardado correctamente", "success");
                closeCrudModal();
                renderCourses();
            } catch (err) {
                showToast("Error", "No se pudo guardar el curso", "error");
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

export function buildGroupMutation(course: Course, groupId: string | null, name: string, tutorId: string): CourseGroup[] {
    if (!course || !Array.isArray(course.groups)) return [];
    const groupsCopy: CourseGroup[] = JSON.parse(JSON.stringify(course.groups));
    if (groupId) {
        const target = groupsCopy.find(g => g.id === groupId);
        if (target) {
            target.name = name;
            target.tutorId = tutorId;
        }
    } else {
        groupsCopy.push({
            id: 'temp-' + Date.now(),
            name,
            tutorId,
            assignments: {}
        });
    }
    return groupsCopy;
}

export async function renderCourses(): Promise<void> {
    try {
        AppData.courses = await AppData.API.getCourses();
        AppData.teachers = await AppData.API.getTeachers(); 
        const container = document.getElementById('list-courses');
        if (!container) return;

        container.innerHTML = AppData.courses.map(c => {
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

            return `
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
        }).join('');
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
