import { AppData } from './Datos';
import { Subject } from './types';
import { showToast, formatHours } from './utils';

export function openSubjectForm(id: string | null = null): void {
    const titleEl = document.getElementById('crud-modal-title');
    const bodyEl = document.getElementById('crud-modal-body');
    if (!titleEl || !bodyEl) return;

    titleEl.textContent = id ? 'Editar Asignatura' : 'Nueva Asignatura';
    const s = id ? AppData.subjects.find(x => x.id === id) : null;
    const currentCourseId = AppData.currentCourseId;

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

    const modal = document.getElementById('crud-modal');
    if (modal) modal.classList.replace('hidden', 'flex');

    const form = document.getElementById('form-crud');
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            const name = (document.getElementById('crud-subject-name') as HTMLInputElement).value;
            const hours = parseFloat((document.getElementById('crud-subject-hours') as HTMLInputElement).value);
            const courseId = AppData.currentCourseId;
            const checkboxes = document.querySelectorAll('input[name="crud-subject-teachers"]:checked');
            const teachers = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);

            try {
                await AppData.API.saveSubject({ id: id || undefined, name, hours, courseId, teachers });
                showToast("Éxito", "Asignatura guardada correctamente", "success");
                closeCrudModal();
                renderSubjects();
            } catch (err) {
                showToast("Error", "No se pudo guardar la asignatura", "error");
            }
        };
    }
}

export function closeCrudModal(): void {
    const modal = document.getElementById('crud-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

export function openCourseSubjects(courseId: string): void {
    AppData.currentCourseId = courseId;
    window.switchTab('subjects');
}

export function filterSubjectsByCourse(subjects: Subject[], courseId: string | null): Subject[] {
    if (!courseId || !Array.isArray(subjects)) return [];
    return subjects.filter(s => s.courseId === courseId);
}

export async function renderSubjects(): Promise<void> {
    try {
        AppData.subjects = await AppData.API.getSubjects();
        AppData.courses = await AppData.API.getCourses();
        const courseId = AppData.currentCourseId;

        const titleEl = document.getElementById('view-subjects-title');
        if (titleEl) {
            const course = AppData.courses.find(c => c.id === courseId);
            titleEl.textContent = course ? `Asignaturas de ${course.name}` : 'Gestión de Asignaturas';
        }

        const tbody = document.getElementById('table-subjects');
        if (!tbody) return;

        if (!courseId) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">Por favor, selecciona un curso primero.</td></tr>';
            return;
        }

        const filtered = filterSubjectsByCourse(AppData.subjects, courseId);
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="p-4 text-center text-gray-500 italic">No hay asignaturas en este curso.</td></tr>';
            return;
        }

        tbody.innerHTML = filtered.map(s => `
            <tr class="hover:bg-gray-50 border-b border-gray-100 text-sm">
                <td class="p-4 font-medium text-gray-800">${s.name}</td>
                <td class="p-4 text-center text-gray-600">${formatHours(s.hours)} h</td>
                <td class="p-4 text-center">
                    <button onclick="openFormModal('subject', '${s.id}')" class="text-indigo-600 hover:text-indigo-900 font-semibold mr-3">Editar</button>
                    <button onclick="deleteSubject('${s.id}')" class="text-red-600 hover:text-red-900 font-semibold">Eliminar</button>
                </td>
            </tr>
        `).join('');
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
