import { AppData } from './Datos';
import { Teacher, Course, Subject } from './types';
import { showToast, formatHours } from './utils';
import { closeCrudModal } from './crud_subjects';

export function openTeacherForm(id: string | null = null): void {
    const titleEl = document.getElementById('crud-modal-title');
    const bodyEl = document.getElementById('crud-modal-body');
    if (!titleEl || !bodyEl) return;

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
                <div class="border border-gray-300 rounded-lg p-3 max-h-56 overflow-y-auto space-y-3 bg-gray-50">
                    ${AppData.courses.map(c => {
                        const courseSubjects = AppData.subjects.filter(s => c.subjects.includes(s.id));
                        if (courseSubjects.length === 0) return '';
                        return `
                            <div class="space-y-1.5">
                                <div class="text-xs font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded inline-block">
                                    📚 ${c.name}
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                    ${courseSubjects.map(s => `
                                        <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                            <input type="checkbox" name="crud-teacher-subjects" value="${s.id}" ${t?.subjects.includes(s.id) ? 'checked' : ''} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                            <span class="truncate font-medium text-gray-700">${s.name} <span class="text-xs text-gray-400 font-normal">(${formatHours(s.hours)}h)</span></span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    }).join('')}
                    ${(() => {
                        const unassignedSubjects = AppData.subjects.filter(s => !AppData.courses.some(c => c.subjects.includes(s.id)));
                        if (unassignedSubjects.length === 0) return '';
                        return `
                            <div class="space-y-1.5">
                                <div class="text-xs font-bold text-gray-600 uppercase tracking-wider bg-gray-200 px-2 py-0.5 rounded inline-block">
                                    Otras Asignaturas
                                </div>
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-1">
                                    ${unassignedSubjects.map(s => `
                                        <label class="flex items-center gap-2 cursor-pointer text-sm hover:bg-white p-1 rounded transition-colors">
                                            <input type="checkbox" name="crud-teacher-subjects" value="${s.id}" ${t?.subjects.includes(s.id) ? 'checked' : ''} class="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                                            <span class="truncate font-medium text-gray-700">${s.name} <span class="text-xs text-gray-400 font-normal">(${formatHours(s.hours)}h)</span></span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `;
                    })()}
                </div>
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
            const name = (document.getElementById('crud-teacher-name') as HTMLInputElement).value;
            const maxHours = parseFloat((document.getElementById('crud-teacher-max-hours') as HTMLInputElement).value);
            const color = (document.getElementById('crud-teacher-color') as HTMLInputElement).value;
            const checkboxes = document.querySelectorAll('input[name="crud-teacher-subjects"]:checked');
            const subjects = Array.from(checkboxes).map(cb => (cb as HTMLInputElement).value);

            try {
                const existing = id ? AppData.teachers.find(x => x.id === id) : null;
                const availability = existing ? existing.availability : [];

                await AppData.API.saveTeacher({ id: id || undefined, name, maxHours, color, subjects, availability });
                showToast("Éxito", "Profesor guardado correctamente", "success");
                closeCrudModal();
                renderTeachers();
            } catch (err) {
                showToast("Error", "No se pudo guardar el profesor", "error");
            }
        };
    }
}

export function formatTeacherSpecialties(teacher: Teacher, subjects: Subject[], courses: Course[]): string {
    if (!teacher || !Array.isArray(teacher.subjects) || teacher.subjects.length === 0) {
        return '';
    }
    return teacher.subjects.map(sId => {
        const s = subjects.find(x => x.id === sId);
        if (!s) return '';
        const course = courses.find(c => c.subjects.includes(sId));
        return course ? `${s.name} (${course.name})` : s.name;
    }).filter(n => n !== '').join(', ');
}

export async function renderTeachers(): Promise<void> {
    try {
        AppData.teachers = await AppData.API.getTeachers();
        const list = document.getElementById('list-teachers');
        if (!list) return;

        list.innerHTML = AppData.teachers.map(t => {
            const subjNames = formatTeacherSpecialties(t, AppData.subjects, AppData.courses);

            return `
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
        }).join('');
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
