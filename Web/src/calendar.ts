import { AppData, updateEntitySelector } from './Datos';
import { ScheduledClass } from './types';
import { showToast, formatHours } from './utils';

declare const tui: any;

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
    select.innerHTML = '';
    
    const course = AppData.courses.find(c => c.id === courseId);
    if (course) {
        if (course.groups.length === 0) {
            select.innerHTML = `<option value="">Sin grupos</option>`;
        } else {
            course.groups.forEach(g => select.innerHTML += `<option value="${g.id}">Grupo ${g.name}</option>`);
        }
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
        defaultView: 'week', useFormPopup: false, useDetailPopup: false,
        week: { taskView: false, eventView: ['time'], dayNames: ['Dom', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sáb'], workweek: true, hourStart: 8, hourEnd: 15 },
        calendars: [
            { id: 'default', name: 'Clases', backgroundColor: '#4f46e5' },
            { id: 'pinned',  name: 'Fijadas', backgroundColor: '#059669' },
            { id: 'recess',  name: 'Recreo',  backgroundColor: '#f1f5f9', borderColor: '#94a3b8', color: '#64748b' },
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

    // Añadir bloque de recreo como evento de fondo (12:00 - 12:30, Lun-Vie)
    addRecessEvents();

    AppData.calendarInstance.on('selectDateTime', function(info: any) {
        AppData.calendarInstance.clearGridSelections();
        
        let startObj = (typeof info.start.toDate === 'function') ? info.start.toDate() : new Date(info.start);
        let endObj = (typeof info.end.toDate === 'function') ? info.end.toDate() : new Date(info.end);
        
        openAddClassModal(startObj, endObj);
    });

    AppData.calendarInstance.on('beforeUpdateEvent', async function(info: any) {
        const { event, changes } = info;
        
        let mergedEvent = AppData.currentMergedEvents?.find(e => e.id === event.id || (e.mergedIds && e.mergedIds.includes(event.id)));
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

        const newStartDate = new Date(startCandidate);
        showToast("Sincronizando...", "Guardando nueva posición en el servidor...", "info");

        if (constituentClasses.length === 2) {
            const c1 = constituentClasses[0];
            c1.start = newStartDate.toISOString();
            const end1 = new Date(newStartDate.getTime() + 30 * 60000);
            c1.end = end1.toISOString();
            c1.duration = 0.5;
            await AppData.API.updateClass(c1);
            AppData.WS.sendCommand('MANUAL_EDIT', { id: c1.id, action: 'moved' });

            const c2 = constituentClasses[1];
            c2.start = end1.toISOString();
            const end2 = new Date(newStartDate.getTime() + 60 * 60000);
            c2.end = end2.toISOString();
            c2.duration = 0.5;
            await AppData.API.updateClass(c2);
            AppData.WS.sendCommand('MANUAL_EDIT', { id: c2.id, action: 'moved' });
        } else {
            const cls = constituentClasses[0];
            cls.start = newStartDate.toISOString();
            const endCandidateDate = new Date(endCandidate);
            cls.end = endCandidateDate.toISOString();
            cls.duration = (endCandidateDate.getTime() - newStartDate.getTime()) / (1000 * 60 * 60);
            await AppData.API.updateClass(cls);
            AppData.WS.sendCommand('MANUAL_EDIT', { id: cls.id, action: 'moved' });
        }

        refreshCalendarView();
    });

    AppData.calendarInstance.on('clickEvent', (e: any) => openEventDetail(e.event));
}

export function openAddClassModal(startDate: Date | null = null, endDate: Date | null = null): void {
    if (!startDate) {
        const now = new Date();
        const diff = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
        startDate = new Date(now.setDate(diff));
        startDate.setHours(9, 0, 0, 0);
        
        endDate = new Date(startDate);
        endDate.setHours(10, 0, 0, 0);
    }

    const formatTime = (date: Date): string => date.toTimeString().slice(0, 5);
    
    (document.getElementById('modal-class-start') as HTMLInputElement).value = startDate.toISOString();
    (document.getElementById('modal-class-end') as HTMLInputElement).value = endDate!.toISOString();
    (document.getElementById('modal-time-start') as HTMLInputElement).value = formatTime(startDate);
    (document.getElementById('modal-time-end') as HTMLInputElement).value = formatTime(endDate!);

    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const headerCourseSelect = document.getElementById('header-course-select') as HTMLSelectElement;
    const viewEntitySelect = document.getElementById('view-entity-select') as HTMLSelectElement;

    const viewType = typeSelect?.value;
    const viewCourse = headerCourseSelect?.value;
    const viewEntity = viewEntitySelect?.value; 

    const subjSelect = document.getElementById('modal-subject') as HTMLSelectElement;
    const courseSelect = document.getElementById('modal-course') as HTMLSelectElement;
    const groupSelect = document.getElementById('modal-group') as HTMLSelectElement;
    const teacherSelect = document.getElementById('modal-teacher') as HTMLSelectElement;

    subjSelect.innerHTML = AppData.subjects.map(s => {
        const course = AppData.courses.find(c => c.subjects.includes(s.id));
        const courseLabel = course ? ` (${course.name})` : '';
        return `<option value="${s.id}">${s.name}${courseLabel}</option>`;
    }).join('');
    courseSelect.innerHTML = AppData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    teacherSelect.innerHTML = AppData.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
    
    courseSelect.disabled = false; 
    groupSelect.disabled = false; 
    teacherSelect.disabled = false;

    if (viewType === 'group' && viewCourse) {
        courseSelect.value = viewCourse;
        courseSelect.disabled = true;
        onModalCourseChange(); 
        
        if (viewEntity) {
            groupSelect.value = viewEntity;
            groupSelect.disabled = true;
        }
    } 
    else if (viewType === 'teacher' && viewEntity) {
        teacherSelect.value = viewEntity;
        teacherSelect.disabled = true;
        onModalCourseChange(); 
        
        const teacherObj = AppData.teachers.find(t => t.id === viewEntity);
        if (teacherObj && teacherObj.subjects && teacherObj.subjects.length > 0) {
             subjSelect.value = teacherObj.subjects[0];
        }
    } else {
        onModalCourseChange(); 
    }

    const modal = document.getElementById('add-class-modal');
    if (modal) {
        modal.classList.replace('hidden', 'flex');
        modal.onclick = (e: MouseEvent) => {
            if (e.target === modal) {
                closeAddClassModal();
            }
        };
    }
}

export function onModalCourseChange(): void {
    const courseId = (document.getElementById('modal-course') as HTMLSelectElement).value;
    const groupSelect = document.getElementById('modal-group') as HTMLSelectElement;
    groupSelect.innerHTML = '';
    
    const course = AppData.courses.find(c => c.id === courseId);
    if (course && course.groups.length > 0) {
        course.groups.forEach(g => { groupSelect.innerHTML += `<option value="${g.id}">Grupo ${g.name}</option>`; });
    } else {
        groupSelect.innerHTML = `<option value="">(Sin grupos)</option>`;
    }
}

export function closeAddClassModal(): void {
    const modal = document.getElementById('add-class-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

export async function saveNewClass(): Promise<void> {
    const baseStartStr = (document.getElementById('modal-class-start') as HTMLInputElement).value;
    const baseEndStr = (document.getElementById('modal-class-end') as HTMLInputElement).value;
    
    const baseStart = new Date(baseStartStr);
    const baseEnd = new Date(baseEndStr);
    
    const timeStartStr = (document.getElementById('modal-time-start') as HTMLInputElement).value.split(':');
    const timeEndStr = (document.getElementById('modal-time-end') as HTMLInputElement).value.split(':');
    
    baseStart.setHours(parseInt(timeStartStr[0]), parseInt(timeStartStr[1]), 0, 0);
    baseEnd.setHours(parseInt(timeEndStr[0]), parseInt(timeEndStr[1]), 0, 0);

    const subjId = (document.getElementById('modal-subject') as HTMLSelectElement).value;
    const groupId = (document.getElementById('modal-group') as HTMLSelectElement).value;
    const teacherId = (document.getElementById('modal-teacher') as HTMLSelectElement).value;

    if (!groupId || !teacherId) {
        showToast("Error", "Faltan datos por seleccionar (Grupo o Profesor)", "error");
        return;
    }

    if (overlapsRecess(baseStart, baseEnd)) {
        showToast("Error", "No se puede programar una clase durante el recreo (12:00 - 12:30).", "error");
        return;
    }

    const durationInMs = baseEnd.getTime() - baseStart.getTime();
    const durationInHours = durationInMs / (1000 * 60 * 60);

    let nuevaClase: ScheduledClass = {
        id: 'evt-' + Date.now(),
        start: baseStart.toISOString(),
        end: baseEnd.toISOString(),
        duration: durationInHours,
        subjectId: subjId,
        groupId: groupId,
        teacherId: teacherId,
        isPinned: false
    };

    showToast('Guardando...', 'Enviando bloque a la base de datos API', 'info');
    await AppData.API.saveClass(nuevaClase);
    AppData.scheduledClasses.push(nuevaClase);
    
    closeAddClassModal();
    refreshCalendarView();
    
    AppData.WS.sendCommand('MANUAL_EDIT', { id: nuevaClase.id }); 
}

const SUBJECT_PALETTE = [
    '#4f46e5', // Indigo
    '#0284c7', // Sky Blue
    '#059669', // Emerald
    '#d97706', // Amber
    '#dc2626', // Red
    '#7c3aed', // Purple
    '#db2777', // Pink
    '#2563eb', // Blue
    '#0d9488', // Teal
    '#ca8a04', // Yellow
    '#ea580c', // Orange
    '#e11d48', // Rose
    '#9333ea', // Violet
    '#16a34a'  // Green
];

export function getSubjectColor(subjectId: string): string {
    if (!subjectId) return '#4f46e5';
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
        hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % SUBJECT_PALETTE.length;
    return SUBJECT_PALETTE[idx];
}

export function toggleColorMode(): void {
    if (!AppData.colorMode) AppData.colorMode = 'teacher';
    AppData.colorMode = AppData.colorMode === 'teacher' ? 'subject' : 'teacher';

    const btnText = document.getElementById('btn-color-mode-text');
    if (btnText) {
        btnText.textContent = AppData.colorMode === 'teacher' ? 'Color: Profesor' : 'Color: Asignatura';
    }

    const btnIcon = document.getElementById('btn-color-mode-icon');
    if (btnIcon) {
        btnIcon.textContent = AppData.colorMode === 'teacher' ? '🎨' : '📚';
    }

    refreshCalendarView();
}

export interface MergedDisplayEvent {
    id: string;
    mergedIds: string[];
    calendarId: string;
    title: string;
    body: string;
    start: Date | string;
    end: Date | string;
    duration: number;
    isReadOnly: boolean;
    isPinned: boolean;
    backgroundColor: string;
    color: string;
    customStyle: any;
    raw: {
        subjectId: string;
        teacherId: string;
        groupId: string;
    };
}

export function getMergedCalendarEvents(classes: ScheduledClass[], type: string, entityId: string, colorMode: string): MergedDisplayEvent[] {
    const filtered = classes.filter(cls => {
        if (type === 'teacher') return cls.teacherId === entityId;
        if (type === 'group') return cls.groupId === entityId;
        return false;
    });

    const groupsMap = new Map<string, ScheduledClass[]>();
    filtered.forEach(cls => {
        const d = new Date(cls.start);
        const dateKey = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        const key = `${dateKey}_${cls.subjectId}_${cls.teacherId}_${cls.groupId}`;
        if (!groupsMap.has(key)) {
            groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(cls);
    });

    const displayEvents: MergedDisplayEvent[] = [];

    groupsMap.forEach(groupClasses => {
        groupClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        let i = 0;
        while (i < groupClasses.length) {
            const current = groupClasses[i];
            const next = (i + 1 < groupClasses.length) ? groupClasses[i + 1] : null;

            const currentEnd = new Date(current.end).getTime();
            const nextStart = next ? new Date(next.start).getTime() : -1;
            const isContiguous = next !== null && Math.abs(currentEnd - nextStart) < 60000;
            const currentDur = current.duration || ((new Date(current.end).getTime() - new Date(current.start).getTime()) / 3600000);
            const nextDur = next ? (next.duration || ((new Date(next.end).getTime() - new Date(next.start).getTime()) / 3600000)) : 0;
            
            const crossesRecess = next !== null && overlapsRecess(new Date(current.start), new Date(next.end));

            // Solo fusionar si son 2 bloques de 30m (<= 0.5h cada uno), la suma no excede 1.01h, contiguos y sin cruzar recreo
            if (isContiguous && !crossesRecess && (currentDur <= 0.51 && nextDur <= 0.51) && (currentDur + nextDur <= 1.01)) {
                const isPinned = (current.isPinned || next.isPinned) || false;
                const subject = AppData.subjects.find(s => s.id === current.subjectId);
                const teacher = AppData.teachers.find(t => t.id === current.teacherId);
                const course = AppData.courses.find(c => c.groups.some(g => g.id === current.groupId));
                const grp = course ? course.groups.find(g => g.id === current.groupId) : null;

                const pin = isPinned ? '📌 ' : '';
                const subjectTitle = subject ? `${pin}${subject.name}` : 'Clase API';
                const subtitle = (type === 'group')
                    ? (teacher ? `Prof: ${teacher.name}` : '')
                    : (course && grp ? `${course.name} - G.${grp.name}` : (teacher ? `Prof: ${teacher.name}` : ''));

                const eventBgColor = (colorMode === 'subject')
                    ? getSubjectColor(current.subjectId)
                    : (teacher ? teacher.color : '#4f46e5');

                displayEvents.push({
                    id: current.id,
                    mergedIds: [current.id, next.id],
                    calendarId: current.teacherId,
                    title: subjectTitle,
                    body: subtitle,
                    start: current.start,
                    end: next.end,
                    duration: currentDur + nextDur,
                    isReadOnly: isPinned,
                    isPinned: isPinned,
                    backgroundColor: eventBgColor,
                    color: '#ffffff',
                    customStyle: { borderRadius: '6px', border: 'none', padding: '2px' },
                    raw: {
                        subjectId: current.subjectId,
                        teacherId: current.teacherId,
                        groupId: current.groupId
                    }
                });

                // Avanzar 2 posiciones para respetar el límite de solo juntar de una hora en una hora
                i += 2;
            } else {
                const isPinned = current.isPinned || false;
                const subject = AppData.subjects.find(s => s.id === current.subjectId);
                const teacher = AppData.teachers.find(t => t.id === current.teacherId);
                const course = AppData.courses.find(c => c.groups.some(g => g.id === current.groupId));
                const grp = course ? course.groups.find(g => g.id === current.groupId) : null;

                const pin = isPinned ? '📌 ' : '';
                const subjectTitle = subject ? `${pin}${subject.name}` : 'Clase API';
                const subtitle = (type === 'group')
                    ? (teacher ? `Prof: ${teacher.name}` : '')
                    : (course && grp ? `${course.name} - G.${grp.name}` : (teacher ? `Prof: ${teacher.name}` : ''));

                const eventBgColor = (colorMode === 'subject')
                    ? getSubjectColor(current.subjectId)
                    : (teacher ? teacher.color : '#4f46e5');

                displayEvents.push({
                    id: current.id,
                    mergedIds: [current.id],
                    calendarId: current.teacherId,
                    title: subjectTitle,
                    body: subtitle,
                    start: current.start,
                    end: current.end,
                    duration: currentDur,
                    isReadOnly: isPinned,
                    isPinned: isPinned,
                    backgroundColor: eventBgColor,
                    color: '#ffffff',
                    customStyle: { borderRadius: '6px', border: 'none', padding: '2px' },
                    raw: {
                        subjectId: current.subjectId,
                        teacherId: current.teacherId,
                        groupId: current.groupId
                    }
                });

                i += 1;
            }
        }
    });

    return displayEvents;
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

    // Actualizar Tarjeta de Resumen Docente
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
                summaryHtml += `<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">`;
                items.forEach(item => {
                    summaryHtml += `
                        <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between hover:bg-slate-100 transition-colors">
                            <span class="text-xs font-bold text-slate-800 truncate">${item.courseName} - G.${item.groupName}</span>
                            <div class="flex justify-between items-center mt-1 text-[11px]">
                                <span class="text-indigo-600 font-semibold truncate">${item.subjectName}</span>
                                <span class="font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">${item.hours.toFixed(1)}h</span>
                            </div>
                        </div>
                    `;
                });
                summaryHtml += `</div>`;
            }

            summaryContent.innerHTML = summaryHtml;
            summaryCard.classList.remove('hidden');
        }
    } else {
        if (summaryCard) summaryCard.classList.add('hidden');
    }
}

export function openEventDetail(event: any): void {
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
                AppData.WS.sendCommand('PIN_UPDATE', { id: cls.id, state: cls.isPinned });
            }
            closeEventDetail(); 
            refreshCalendarView(); 
        };
    }
    
    const delBtn = document.getElementById('btn-delete-event') as HTMLButtonElement;
    if (delBtn) {
        delBtn.onclick = async () => { 
            for (const cls of constituentClasses) {
                await AppData.API.deleteClass(cls.id); 
                AppData.scheduledClasses = AppData.scheduledClasses.filter(c => c.id !== cls.id);
                AppData.WS.sendCommand('MANUAL_EDIT', { delete: cls.id });
            }
            closeEventDetail(); 
            refreshCalendarView(); 
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

function overlapsRecess(start: Date, end: Date): boolean {
    const startHour = start.getHours();
    const startMin = start.getMinutes();
    const endHour = end.getHours();
    const endMin = end.getMinutes();

    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    let recessStart = 12 * 60; // 12:00 -> 720 min
    let recessDuration = 30;

    if (AppData.config) {
        const parts = AppData.config.horaInicioRecreo.split(':');
        recessStart = parseInt(parts[0]) * 60 + parseInt(parts[1]);
        recessDuration = AppData.config.duracionRecreo;
    }

    const recessEnd = recessStart + recessDuration;

    return startMinutes < recessEnd && endMinutes > recessStart;
}

// Añade bloques visuales de recreo (fondo gris) para Lun-Vie dinámicamente según configuración
function addRecessEvents(): void {
    if (!AppData.calendarInstance) return;

    // Calcular el lunes de la semana actual
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 Dom, 1 Lun...
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    let startHour = 12;
    let startMin = 0;
    let duration = 30;

    if (AppData.config) {
        const parts = AppData.config.horaInicioRecreo.split(':');
        startHour = parseInt(parts[0]);
        startMin = parseInt(parts[1]);
        duration = AppData.config.duracionRecreo;
    }

    for (let i = 0; i < 5; i++) {
        const day = new Date(monday);
        day.setDate(monday.getDate() + i);

        const start = new Date(day);
        start.setHours(startHour, startMin, 0, 0);

        const end = new Date(start);
        end.setMinutes(start.getMinutes() + duration);

        AppData.calendarInstance.createEvents([{
            id: `recess-${i}`,
            calendarId: 'recess',
            title: '☕ Recreo',
            start: start.toISOString(),
            end: end.toISOString(),
            isReadOnly: true,
            isAllDay: false,
            backgroundColor: '#f1f5f9',
            borderColor: '#94a3b8',
            color: '#64748b',
        }]);
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
        
        // Quitar de local
        AppData.scheduledClasses = AppData.scheduledClasses.filter(c => c.groupId !== groupId);
        refreshCalendarView();
        
        showToast("Éxito", "El horario del grupo se ha vaciado.", "success");
        AppData.WS.sendCommand('MANUAL_EDIT', { action: 'cleared', groupId });
    } catch (err) {
        console.error("Error clearing schedule:", err);
        showToast("Error", "No se pudo limpiar el horario.", "error");
    }
}
