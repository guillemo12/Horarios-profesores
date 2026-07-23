import { AppData, updateEntitySelector } from './Datos';
import { ScheduledClass } from './types';
import { showToast } from './utils';

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
        
        let cls = AppData.scheduledClasses.find(c => c.id === event.id);
        if (!cls) return;

        if (cls.isPinned) {
            showToast("Bloqueado", "No puedes mover ni alterar una clase que está fijada (Pin).", "warning");
            return;
        }

        let startCandidate = cls.start;
        let endCandidate = cls.end;
        if (changes.start) startCandidate = (typeof changes.start.toDate === 'function') ? changes.start.toDate() : new Date(changes.start);
        if (changes.end) endCandidate = (typeof changes.end.toDate === 'function') ? changes.end.toDate() : new Date(changes.end);

        if (overlapsRecess(new Date(startCandidate), new Date(endCandidate))) {
            showToast("Error", "No se puede programar una clase durante el recreo (12:00 - 12:30).", "error");
            refreshCalendarView();
            return;
        }

        if (changes.start) cls.start = (typeof changes.start.toDate === 'function') ? changes.start.toDate() : new Date(changes.start);
        if (changes.end) cls.end = (typeof changes.end.toDate === 'function') ? changes.end.toDate() : new Date(changes.end);
        
        cls.duration = (new Date(cls.end).getTime() - new Date(cls.start).getTime()) / (1000 * 60 * 60);

        AppData.calendarInstance.updateEvent(event.id, event.calendarId, changes);

        showToast("Sincronizando...", "Guardando nueva posición en el servidor...", "info");
        await AppData.API.updateClass(cls);
        
        AppData.WS.sendCommand('MANUAL_EDIT', { id: cls.id, action: 'moved' });
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

    subjSelect.innerHTML = AppData.subjects.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
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
    if (modal) modal.classList.replace('hidden', 'flex');
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

    const events = AppData.scheduledClasses.filter(cls => {
        if (type === 'teacher') return cls.teacherId === entityId;
        if (type === 'group') return cls.groupId === entityId;
        return false;
    }).map(cls => {
        const subject = AppData.subjects.find(s => s.id === cls.subjectId);
        const teacher = AppData.teachers.find(t => t.id === cls.teacherId);
        const course = AppData.courses.find(c => c.groups.some(g => g.id === cls.groupId));
        const group = course ? course.groups.find(g => g.id === cls.groupId) : null;
        
        return {
            id: cls.id, 
            calendarId: cls.teacherId, 
            title: subject ? (cls.isPinned ? `📌 ${subject.name}` : subject.name) : 'Clase API',
            body: `${course ? course.name : ''} ${group ? ' - G.' + group.name : ''}<br/>Prof: ${teacher ? teacher.name : ''}`,
            start: cls.start, 
            end: cls.end, 
            isReadOnly: cls.isPinned || false,
            backgroundColor: teacher ? teacher.color : '#cbd5e1', 
            color: '#ffffff',
            customStyle: { borderRadius: '6px', border: 'none', padding: '4px' }
        };
    });

    if (AppData.calendarInstance) AppData.calendarInstance.createEvents(events);
}

export function openEventDetail(event: any): void {
    const cls = AppData.scheduledClasses.find(c => c.id === event.id);
    if (!cls) return;

    const subject = AppData.subjects.find(s => s.id === cls.subjectId);
    const teacher = AppData.teachers.find(t => t.id === cls.teacherId);

    if (!subject || !teacher) return;

    const course = AppData.courses.find(c => c.groups.some(g => g.id === cls.groupId));
    const group = course ? course.groups.find(g => g.id === cls.groupId) : null;
    const courseGroupName = course && group ? `${course.name} - Grupo ${group.name}` : 'Sin grupo';

    const titleEl = document.getElementById('event-detail-title');
    if (titleEl) titleEl.textContent = subject.name;
    
    const headerEl = document.getElementById('event-detail-header');
    if (headerEl) headerEl.style.backgroundColor = teacher.color;
    
    const bodyEl = document.getElementById('event-detail-body');
    if (bodyEl) {
        bodyEl.innerHTML = `
            <p class="text-sm mb-1.5">Curso/Grupo: <b>${courseGroupName}</b></p>
            <p class="text-sm">Impartida por: <b>${teacher.name}</b></p>
        `;
    }

    const pinBtn = document.getElementById('btn-pin-event') as HTMLButtonElement;
    if (pinBtn) {
        pinBtn.innerText = cls.isPinned ? "Desfijar" : "Fijar (Pin)";
        pinBtn.onclick = async () => { 
            cls.isPinned = !cls.isPinned; 
            try {
                await AppData.API.updateClass(cls); 
            } catch (err) {
                console.error("Error al actualizar estado del pin:", err);
            }
            AppData.WS.sendCommand('PIN_UPDATE', { id: cls.id, state: cls.isPinned }); 
            closeEventDetail(); 
            refreshCalendarView(); 
        };
    }
    
    const delBtn = document.getElementById('btn-delete-event') as HTMLButtonElement;
    if (delBtn) {
        delBtn.onclick = async () => { 
            await AppData.API.deleteClass(cls.id); 
            AppData.scheduledClasses = AppData.scheduledClasses.filter(c => c.id !== cls.id);
            AppData.WS.sendCommand('MANUAL_EDIT', { delete: cls.id });
            closeEventDetail(); 
            refreshCalendarView(); 
        };
    }

    const modal = document.getElementById('event-detail-modal');
    if (modal) modal.classList.replace('hidden', 'flex');
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
