import { AppData, updateEntitySelector } from './Datos';
import { ScheduledClass } from './types';
import { showToast } from './utils';
import { toggleColorMode as toggleColorModeImpl, getSubjectColor } from './calendar_colors';
import { 
    overlapsRecess, getMergedCalendarEvents, addRecessEvents, parseTimeToMinutes, isRecess 
} from './calendar_events';
import { 
    openAddClassModal, closeAddClassModal, updateModalTeacherOptions, onModalSubjectChange, 
    onModalCourseChange, onModalGroupChange, saveNewClass as saveNewClassImpl, openEventDetail, closeEventDetail 
} from './calendar_modal';

export { 
    getSubjectColor, toggleColorModeImpl, overlapsRecess, getMergedCalendarEvents, 
    addRecessEvents, parseTimeToMinutes, isRecess, openAddClassModal, closeAddClassModal, 
    updateModalTeacherOptions, onModalSubjectChange, onModalCourseChange, onModalGroupChange, 
    openEventDetail, closeEventDetail 
};

declare const tui: any;

export function toggleColorMode(): void {
    toggleColorModeImpl(() => refreshCalendarView());
}

export function saveNewClass(): Promise<void> {
    return saveNewClassImpl(() => refreshCalendarView());
}

export function updateDateRange(): void {
    if (!AppData.calendarInstance) return;

    const start = AppData.calendarInstance.getDateRangeStart();
    const end = AppData.calendarInstance.getDateRangeEnd();

    const formatDate = (date: any): string => {
        const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        return `${d.getDate()} ${months[d.getMonth()]}`;
    };

    const rangeEl = document.getElementById('calendar-date-range');
    if (rangeEl) rangeEl.textContent = `${formatDate(start)} - ${formatDate(end)}`;
}

export function onHeaderCourseChange(previousVal: string | null = null): void {
    const courseSelect = document.getElementById('header-course-select') as HTMLSelectElement;
    const select = document.getElementById('view-entity-select') as HTMLSelectElement;

    if (!courseSelect || !select) return;

    const courseId = courseSelect.value;
    const course = AppData.courses.find(c => c.id === courseId);

    if (course) {
        if (course.groups.length === 0) {
            select.innerHTML = `<option value="">Sin grupos</option>`;
        } else {
            select.innerHTML = course.groups.map(g => `<option value="${g.id}">Grupo ${g.name}</option>`).join('');
        }
    } else {
        select.innerHTML = '';
    }

    if (previousVal && Array.from(select.options).some(opt => opt.value === previousVal)) {
        select.value = previousVal;
    }
    refreshCalendarView();
}

export function initCalendar(): void {
    if (typeof tui === 'undefined') return;

    const Calendar = tui.Calendar;
    AppData.calendarInstance = new Calendar('#calendar', {
        defaultView: 'week',
        useFormPopup: false,
        useDetailPopup: false,
        week: {
            taskView: false,
            eventView: ['time'],
            dayNames: ['Dom', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sáb'],
            workweek: true,
            hourStart: 8,
            hourEnd: 15
        },
        calendars: [
            { id: 'default', name: 'Clases', backgroundColor: '#4f46e5' },
            { id: 'pinned', name: 'Fijadas', backgroundColor: '#059669' },
            { id: 'recess', name: 'Recreo', backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#64748b' },
        ],
        template: {
            weekDayName(model: any) {
                return `<span class="toastui-calendar-day-name-item">${model.dayName}</span>`;
            },
            time(event: any) {
                if (event.calendarId === 'recess') {
                    return `<div class="p-1 font-semibold text-slate-500 text-xs">☕ Recreo</div>`;
                }
                return `
                    <div class="p-1 flex flex-col justify-center h-full overflow-hidden text-white leading-tight">
                        <div class="font-bold text-xs truncate">${event.title}</div>
                        ${event.body ? `<div class="text-[11px] font-medium opacity-90 truncate mt-0.5">${event.body}</div>` : ''}
                    </div>
                `;
            }
        }
    });

    addRecessEvents();

    AppData.calendarInstance.on('selectDateTime', function (info: any) {
        AppData.calendarInstance.clearGridSelections();
        const startObj = (typeof info.start.toDate === 'function') ? info.start.toDate() : new Date(info.start);
        const endObj = (typeof info.end.toDate === 'function') ? info.end.toDate() : new Date(info.end);
        openAddClassModal(startObj, endObj);
    });

    AppData.calendarInstance.on('beforeUpdateEvent', async function (info: any) {
        const { event, changes } = info;
        const mergedEvent = AppData.currentMergedEvents?.find(e => e.id === event.id || (e.mergedIds && e.mergedIds.includes(event.id)));
        let constituentClasses: ScheduledClass[] = [];

        if (mergedEvent && mergedEvent.mergedIds) {
            constituentClasses = AppData.scheduledClasses.filter(c => mergedEvent.mergedIds.includes(c.id));
        } else {
            const singleCls = AppData.scheduledClasses.find(c => c.id === event.id);
            if (singleCls) constituentClasses = [singleCls];
        }
        if (constituentClasses.length === 0) return;

        if (constituentClasses.some(c => c.isPinned)) {
            showToast("Bloqueado", "No puedes mover ni alterar una clase que está fijada (Pin).", "warning");
            return;
        }

        let startCandidate = mergedEvent ? mergedEvent.start : constituentClasses[0].start;
        let endCandidate = mergedEvent ? mergedEvent.end : constituentClasses[constituentClasses.length - 1].end;
        if (changes.start) startCandidate = (typeof changes.start.toDate === 'function') ? changes.start.toDate() : new Date(changes.start);
        if (changes.end) endCandidate = (typeof changes.end.toDate === 'function') ? changes.end.toDate() : new Date(changes.end);

        if (overlapsRecess(new Date(startCandidate), new Date(endCandidate))) {
            showToast("Error", "No se puede programar una clase durante el recreo (12:00 - 12:30).", "error");
            refreshCalendarView();
            return;
        }

        showToast("Sincronizando...", "Guardando nueva posición en el servidor...", "info");
        constituentClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        let currentSlotStart = new Date(startCandidate);
        for (const cls of constituentClasses) {
            const slotDurationHours = cls.duration || 0.5;
            const slotDurationMs = slotDurationHours * 3600000;
            const slotEnd = new Date(currentSlotStart.getTime() + slotDurationMs);

            cls.start = currentSlotStart.toISOString();
            cls.end = slotEnd.toISOString();
            cls.duration = slotDurationHours;

            await AppData.API.updateClass(cls);

            currentSlotStart = slotEnd;
        }

        refreshCalendarView();
    });

    AppData.calendarInstance.on('clickEvent', (e: any) => openEventDetail(e.event, () => refreshCalendarView()));
}

export function refreshCalendarView(): void {
    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const entitySelect = document.getElementById('view-entity-select') as HTMLSelectElement;

    if (!typeSelect || !entitySelect) return;

    const type = typeSelect.value;
    const entityId = entitySelect.value;

    if (AppData.calendarInstance) {
        AppData.calendarInstance.clear();
        addRecessEvents();
    }
    if (!entityId) return;

    const colorMode = AppData.colorMode || 'teacher';
    const mergedEvents = getMergedCalendarEvents(AppData.scheduledClasses, type, entityId, colorMode);
    AppData.currentMergedEvents = mergedEvents;

    if (AppData.calendarInstance) AppData.calendarInstance.createEvents(mergedEvents);

    renderTeacherSummaryCard(type, entityId);
}

function renderTeacherSummaryCard(type: string, entityId: string): void {
    const summaryCard = document.getElementById('teacher-summary-card');
    const summaryContent = document.getElementById('teacher-summary-content');

    if (type === 'teacher' && entityId) {
        const teacher = AppData.teachers.find(t => t.id === entityId);
        if (teacher && summaryCard && summaryContent) {
            const teacherClasses = AppData.scheduledClasses.filter(c => c.teacherId === entityId);
            const totalHours = teacherClasses.reduce((sum, c) => sum + c.duration, 0);

            const map = new Map<string, { courseName: string, groupName: string, subjectName: string, hours: number }>();
            teacherClasses.forEach(cls => {
                const subject = AppData.subjects.find(s => s.id === cls.subjectId);
                const course = AppData.courses.find(c => c.groups.some(g => g.id === cls.groupId));
                const group = course ? course.groups.find(g => g.id === cls.groupId) : null;

                const cName = course ? course.name : 'Curso';
                const gName = group ? group.name : 'Grupo';
                const sName = subject ? subject.name : 'Asignatura';
                const key = `${cName}_${gName}_${sName}`;

                if (!map.has(key)) {
                    map.set(key, { courseName: cName, groupName: gName, subjectName: sName, hours: 0 });
                }
                map.get(key)!.hours += cls.duration;
            });

            const maxHours = teacher.maxHours || (AppData.config ? Math.round(AppData.config.minutosMaximosProfesor / 60) : 25);
            const items = Array.from(map.values());

            let summaryHtml = `
                <div class="flex flex-wrap items-center justify-between gap-4 mb-3 border-b border-gray-100 pb-2">
                    <div class="flex items-center gap-2">
                        <span class="w-3.5 h-3.5 rounded-full shadow-sm" style="background-color: ${teacher.color};"></span>
                        <h4 class="font-bold text-gray-800 text-sm">Resumen Docente: ${teacher.name}</h4>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-500 font-medium">Carga Lectiva Asignada:</span>
                        <span class="text-xs font-bold px-2.5 py-1 ${totalHours <= maxHours ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'} rounded-full">
                            ${totalHours.toFixed(1)}h / ${maxHours}h max
                        </span>
                    </div>
                </div>
            `;

            if (items.length === 0) {
                summaryHtml += `<p class="text-xs text-gray-400 italic">No tiene clases asignadas en el horario actual.</p>`;
            } else {
                summaryHtml += `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">` +
                    items.map(item => `
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between hover:bg-slate-100 transition-colors">
                            <span class="text-xs font-bold text-slate-800 truncate">${item.courseName} - G.${item.groupName}</span>
                            <div class="flex justify-between items-center mt-1 text-[11px]">
                                <span class="text-indigo-600 font-semibold truncate">${item.subjectName}</span>
                                <span class="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">${item.hours.toFixed(1)}h</span>
                            </div>
                        </div>
                    `).join('') +
                    `</div>`;
            }

            summaryContent.innerHTML = summaryHtml;
            summaryCard.classList.remove('hidden');
        }
    } else {
        if (summaryCard) summaryCard.classList.add('hidden');
    }
}

export async function clearGroupSchedule(): Promise<void> {
    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const entitySelect = document.getElementById('view-entity-select') as HTMLSelectElement;
    if (!typeSelect || !entitySelect) return;

    if (typeSelect.value !== 'group') {
        showToast("Info", "Por favor, selecciona la vista de 'Grupo' para vaciar un horario específico.", "info");
        return;
    }

    const groupId = entitySelect.value;
    if (!groupId) {
        showToast("Info", "No hay ningún grupo seleccionado.", "info");
        return;
    }

    const groupObj = AppData.courses.flatMap(c => c.groups).find(g => g.id === groupId);
    const groupName = groupObj ? groupObj.name : 'este grupo';

    if (!confirm(`¿Estás seguro de que deseas vaciar todas las clases programadas para el grupo "${groupName}"?`)) {
        return;
    }

    try {
        showToast("Limpiando...", "Eliminando clases de la base de datos...", "info");
        await AppData.API.deleteGroupSchedule(groupId);

        AppData.scheduledClasses = AppData.scheduledClasses.filter(c => c.groupId !== groupId);
        refreshCalendarView();

        showToast("Éxito", "El horario del grupo se ha vaciado.", "success");
    } catch (err) {
        console.error("Error clearing schedule:", err);
        showToast("Error", "No se pudo limpiar el horario.", "error");
    }
}
