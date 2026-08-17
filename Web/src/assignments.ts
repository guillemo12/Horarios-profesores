import { AppData } from './Datos';
import { showToast, formatHours } from './utils';

export async function renderAssignmentsList(): Promise<void> {
    const container = document.getElementById('assignments-list');
    if (!container) return;
    container.innerHTML = '';

    try {
        AppData.courses = await AppData.API.getCourses();
        AppData.subjects = await AppData.API.getSubjects();
        AppData.teachers = await AppData.API.getTeachers();

        if (AppData.courses.length === 0) {
            container.innerHTML = '<div class="text-center p-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400 italic">No hay asignaciones cargadas. Cree cursos y grupos primero.</div>';
            return;
        }

        AppData.courses.forEach(c => {
            const courseSubjects = AppData.subjects.filter(s => s.courseId === c.id);
            if (c.groups.length === 0) return; 

            let groupsAssignmentsHtml = '';
            c.groups.forEach(g => {
                let subjectsListHtml = '';
                
                if (courseSubjects.length === 0) {
                    subjectsListHtml = '<p class="text-xs text-gray-400 italic py-2">No hay asignaturas en este curso.</p>';
                } else {
                    courseSubjects.forEach(s => {
                        const assignedTeacherId = g.assignments[s.id] || '';
                        const qualifiedTeachers = AppData.teachers.filter(t => t.subjects.includes(s.id));
                        
                        subjectsListHtml += `
                            <div class="flex flex-col gap-1.5 pb-3 border-b border-gray-100 last:border-b-0 last:pb-0">
                                <span class="text-sm font-semibold text-gray-700 truncate block" title="${s.name}">${s.name} (${formatHours(s.hours)}h)</span>
                                <select onchange="updateAssignment('${c.id}', '${g.id}', '${s.id}', this.value)" class="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white hover:border-slate-400 focus:border-indigo-500 outline-none transition-colors">
                                    <option value="">-- Sin asignar --</option>
                                    ${AppData.teachers.map(t => {
                                        const isQualified = qualifiedTeachers.some(qt => qt.id === t.id);
                                        const label = isQualified ? t.name : `${t.name} (No especialista)`;
                                        return `<option value="${t.id}" ${assignedTeacherId === t.id ? 'selected' : ''}>${label}</option>`;
                                    }).join('')}
                                </select>
                            </div>
                        `;
                    });
                }

                groupsAssignmentsHtml += `
                    <div id="group-card-${c.id}-${g.id}" class="bg-gray-50 rounded-xl p-4 border border-gray-200 shadow-sm space-y-3">
                        <div class="flex items-center justify-between border-b pb-2">
                            <h4 class="font-bold text-gray-800 text-sm">Grupo ${g.name}</h4>
                            <button onclick="clearGroupAssignments('${c.id}', '${g.id}')" class="text-rose-600 hover:text-rose-800 text-xs font-semibold flex items-center gap-0.5" title="Poner todas las asignaturas de este grupo sin asignar">
                                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                Vaciar Grupo
                            </button>
                        </div>
                        <div class="space-y-3">
                            ${subjectsListHtml}
                        </div>
                    </div>
                `;
            });

            container.innerHTML += `
                <div id="course-card-${c.id}" class="mb-8 bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
                    <div class="flex items-center justify-between border-b pb-2">
                        <h3 class="font-bold text-gray-800 text-lg">${c.name}</h3>
                        <button onclick="clearCourseAssignments('${c.id}')" class="text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 transition-colors" title="Poner todas las asignaciones de todos los grupos de este curso sin asignar">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                            Vaciar Curso
                        </button>
                    </div>
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

export async function clearGroupAssignments(courseId: string, groupId: string): Promise<void> {
    try {
        const course = AppData.courses.find(x => x.id === courseId);
        if (!course) return;
        const group = course.groups.find(g => g.id === groupId);
        if (!group) return;

        if (!confirm(`¿Estás seguro de que deseas poner todas las asignaturas del grupo "${group.name}" sin asignar?`)) {
            return;
        }

        group.assignments = {};
        await AppData.API.updateCourseGroup(courseId, course.groups);
        
        // Actualizar directamente los selectores del DOM
        const groupCard = document.getElementById(`group-card-${courseId}-${groupId}`);
        if (groupCard) {
            const selects = groupCard.querySelectorAll('select');
            selects.forEach(select => {
                select.value = "";
            });
        }
        
        showToast("Éxito", "Todas las asignaturas del grupo han sido puestas sin asignar", "success");
    } catch (err) {
        showToast("Error", "No se pudo limpiar las asignaciones del grupo", "error");
    }
}

export async function clearCourseAssignments(courseId: string): Promise<void> {
    try {
        const course = AppData.courses.find(x => x.id === courseId);
        if (!course) return;

        if (!confirm(`¿Estás seguro de que deseas poner todas las asignaturas de TODOS los grupos del curso "${course.name}" sin asignar?`)) {
            return;
        }

        course.groups.forEach(g => {
            g.assignments = {};
        });
        await AppData.API.updateCourseGroup(courseId, course.groups);
        
        // Actualizar directamente los selectores del DOM
        const courseCard = document.getElementById(`course-card-${courseId}`);
        if (courseCard) {
            const selects = courseCard.querySelectorAll('select');
            selects.forEach(select => {
                select.value = "";
            });
        }
        
        showToast("Éxito", "Todas las asignaturas del curso han sido puestas sin asignar", "success");
    } catch (err) {
        showToast("Error", "No se pudo limpiar las asignaciones del curso", "error");
    }
}
