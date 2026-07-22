// --- DECLARACIONES EXTERNAS ---
// Declaramos 'tui' para que TS no lance error al usar Toast UI Calendar
declare const tui: any;

// --- INTERFACES DE DATOS ---
interface Subject {
    id: string;
    name: string;
    hours: number;
}

interface Teacher {
    id: string;
    name: string;
    maxHours: number;
    color: string;
    subjects: string[];
}

interface CourseGroup {
    id: string;
    name: string;
    tutorId: string;
    assignments: Record<string, string>;
}

interface Course {
    id: string;
    name: string;
    subjects: string[];
    groups: CourseGroup[];
}

interface ScheduledClass {
    id: string;
    start: Date | string;
    end: Date | string;
    duration: number;
    subjectId: string;
    groupId: string;
    teacherId: string;
    isPinned: boolean;
}

interface Database {
    subjects: Subject[];
    teachers: Teacher[];
    courses: Course[];
    scheduledClasses: ScheduledClass[];
}

// --- SERVICIOS ---

class ApiService {
    private baseUrl: string;
    private db: Database;

    constructor() {
        this.baseUrl = '/api/v1'; 
        this.db = {
            subjects: [
                { id: 'sub-mat', name: 'Matemáticas', hours: 4 }, 
                { id: 'sub-len', name: 'Lengua', hours: 4 }
            ],
            teachers: [
                { id: 't-garcia', name: 'García, J.', maxHours: 15, color: '#ef4444', subjects: ['sub-mat'] }, 
                { id: 't-lopez', name: 'López, M.', maxHours: 18, color: '#3b82f6', subjects: ['sub-len'] }
            ],
            courses: [
                { id: 'c-eso1', name: '1º ESO', subjects: ['sub-mat', 'sub-len'], groups: [{ id: 'g-a', name: 'A', tutorId: 't-garcia', assignments: {'sub-mat':'t-garcia'} }] }
            ],
            scheduledClasses: []
        };
    }

    async _mockFetch<T>(endpoint: keyof Database, method: string = 'GET', payload: any = null): Promise<T> {
        return new Promise((resolve) => {
            setTimeout(() => {
                if (method === 'GET') {
                    resolve([...(this.db[endpoint] as any[])] as unknown as T);
                }
                if (method === 'POST') { 
                    (this.db[endpoint] as any[]).push(payload); 
                    resolve(payload as T); 
                }
                if (method === 'PUT') { 
                    const arr = this.db[endpoint] as any[];
                    let idx = arr.findIndex(e => e.id === payload.id);
                    if (idx > -1) arr[idx] = payload;
                    resolve(payload as T); 
                }
                if (method === 'DELETE') {
                    (this.db as any)[endpoint] = (this.db[endpoint] as any[]).filter(e => e.id !== payload);
                    resolve({ success: true } as unknown as T);
                }
            }, 150);
        });
    }

    async getSubjects(): Promise<Subject[]> {
        return this._mockFetch<Subject[]>('subjects');
    }
    async saveSubject(s: Partial<Subject>): Promise<Subject> {
        return s.id ? this._mockFetch<Subject>('subjects', 'PUT', s) : this._mockFetch<Subject>('subjects', 'POST', {...s, id: 's-'+Date.now()});
    }
    async deleteSubject(id: string): Promise<{success: boolean}> {
        return this._mockFetch<{success: boolean}>('subjects', 'DELETE', id);
    }

    async getTeachers(): Promise<Teacher[]> { return this._mockFetch<Teacher[]>('teachers'); }
    async saveTeacher(t: Partial<Teacher>): Promise<Teacher> { return t.id ? this._mockFetch<Teacher>('teachers', 'PUT', t) : this._mockFetch<Teacher>('teachers', 'POST', {...t, id: 't-'+Date.now()}); }
    async deleteTeacher(id: string): Promise<{success: boolean}> { return this._mockFetch<{success: boolean}>('teachers', 'DELETE', id); }

    async getCourses(): Promise<Course[]> { return this._mockFetch<Course[]>('courses'); }
    async saveCourse(c: Partial<Course>): Promise<Course> { return c.id ? this._mockFetch<Course>('courses', 'PUT', c) : this._mockFetch<Course>('courses', 'POST', {...c, id: 'c-'+Date.now()}); }
    async deleteCourse(id: string): Promise<{success: boolean}> { return this._mockFetch<{success: boolean}>('courses', 'DELETE', id); }
    
    async updateCourseGroup(courseId: string, newGroupsArray: CourseGroup[]): Promise<Course> {
        let courses = await this.getCourses();
        let c = courses.find(x => x.id === courseId);
        if (!c) throw new Error("Curso no encontrado");
        c.groups = newGroupsArray;
        return this._mockFetch<Course>('courses', 'PUT', c);
    }

    async getSchedule(): Promise<ScheduledClass[]> { return this._mockFetch<ScheduledClass[]>('scheduledClasses'); }
    async saveClass(cls: ScheduledClass): Promise<ScheduledClass> { return this._mockFetch<ScheduledClass>('scheduledClasses', 'POST', cls); }
    async updateClass(cls: ScheduledClass): Promise<ScheduledClass> { return this._mockFetch<ScheduledClass>('scheduledClasses', 'PUT', cls); }
    async deleteClass(id: string): Promise<{success: boolean}> { return this._mockFetch<{success: boolean}>('scheduledClasses', 'DELETE', id); }
}

type WsCallback = (data?: any) => void;

class EngineWebSocket {
    public isConnected: boolean;
    public isOptimizing: boolean;
    private wsUrl: string;
    private callbacks: Record<string, WsCallback>;
    private mockLoop: number | null;

    constructor() {
        this.wsUrl = 'ws://localhost:8080/engine';
        this.isConnected = false;
        this.isOptimizing = false;
        this.callbacks = {};
        this.mockLoop = null;
    }

    connect(): void {
        setTimeout(() => {
            this.isConnected = true;
            this._trigger('connected');
        }, 800);
    }

    on(event: string, callback: WsCallback): void { this.callbacks[event] = callback; }
    private _trigger(event: string, data?: any): void { if(this.callbacks[event]) this.callbacks[event](data); }

    sendCommand(command: string, payload: any = {}): void {
        if (!this.isConnected) { showToast("Error", "WebSocket Desconectado", "error"); return; }
        let conexion: WebSocket = new WebSocket("ws://localhost:8080")
        conexion
        conexion.onmessage = (event) =>{

        }
        if (command === 'START') {
            this.isOptimizing = true;
            showToast("Motor Iniciado", "Servidor analizando el árbol de posibilidades (WS)...", "info");
            
            this.mockLoop = window.setInterval(async () => {
                const sched = await AppData.API.getSchedule();
                const mockHard = Math.max(0, 10 - Math.floor(Math.random() * 5));
                const mockSoft = 100 + Math.floor(Math.random() * 50);
                
                this._trigger('scores_updated', { hard: mockHard, soft: mockSoft });
                
                if (mockHard === 0) {
                    this.sendCommand('STOP');
                    this._trigger('optimization_complete');
                }
            }, 2000);
        } 
        else if (command === 'STOP') {
            this.isOptimizing = false;
            if (this.mockLoop) clearInterval(this.mockLoop);
            showToast("Motor Pausado", "Optimización detenida.", "warning");
        }
    }
}

// --- ESTADO GLOBAL ---

interface AppDataState {
    API: ApiService;
    WS: EngineWebSocket;
    subjects: Subject[];
    teachers: Teacher[];
    courses: Course[];
    scheduledClasses: ScheduledClass[];
    calendarInstance: any | null;
    currentEventContext: any | null;
}

const AppData: AppDataState = { 
    API: new ApiService(),
    WS: new EngineWebSocket(),
    subjects: [], teachers: [], courses: [], scheduledClasses: [],
    calendarInstance: null, currentEventContext: null
};

// --- INICIALIZACIÓN ---

window.onload = async function(): Promise<void> {
    try {
        AppData.subjects = await AppData.API.getSubjects();
        AppData.teachers = await AppData.API.getTeachers();
        AppData.courses = await AppData.API.getCourses();
        AppData.scheduledClasses = await AppData.API.getSchedule();
        
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
        
        initCalendar();
        updateEntitySelector();
        updateDateRange();
        
        AppData.WS.connect();
        setupWebSocketsListeners();

    } catch (err) {
        const loaderText = document.getElementById('loader-text');
        if (loaderText) {
            loaderText.textContent = "Error conectando con la API.";
            loaderText.className = "mt-4 text-red-600 font-bold";
        }
    }
};

// --- FUNCIONES UI Y LÓGICA ---

function setupWebSocketsListeners(): void {
    const btn = document.getElementById('btn-toggle-engine') as HTMLButtonElement;
    const wsStatus = document.getElementById('ws-status');

    AppData.WS.on('connected', () => {
        if (btn) {
            btn.disabled = false;
            btn.classList.replace('bg-gray-400', 'bg-emerald-600');
            btn.classList.add('hover:bg-emerald-700');
        }
        const textBtn = document.getElementById('text-engine-btn');
        if (textBtn) textBtn.textContent = 'Generar (WS)';
        
        if (wsStatus) {
            wsStatus.innerHTML = '<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span> Conectado';
        }
    });

    AppData.WS.on('scores_updated', (scores: { hard: number, soft: number }) => {
        const elHard = document.getElementById('score-hard');
        if (elHard) elHard.textContent = scores.hard.toString();
        
        const elSoft = document.getElementById('score-soft');
        if (elSoft) elSoft.textContent = scores.soft.toString();
        
        const stConflict = document.getElementById('status-conflict');
        const stOk = document.getElementById('status-ok');
        
        if (stConflict && stOk) {
            if (scores.hard === 0) {
                stConflict.classList.replace('flex', 'hidden');
                stOk.classList.replace('hidden', 'flex');
            } else {
                stOk.classList.replace('flex', 'hidden');
                stConflict.classList.replace('hidden', 'flex');
            }
        }
    });

    AppData.WS.on('optimization_complete', () => {
        toggleOptimizationEngine(true);
        showToast("¡Matemáticamente Correcto!", "El servidor WS ha encontrado la disposición perfecta.", "success");
    });
    
    AppData.WS.on('schedule_pushed', (newScheduleFromDB: ScheduledClass[]) => {
        AppData.scheduledClasses = newScheduleFromDB;
        refreshCalendarView();
    });
}

function toggleOptimizationEngine(forceStop: boolean = false): void {
    const btn = document.getElementById('btn-toggle-engine');
    if (!btn) return;

    const iconStop = document.getElementById('icon-stop');
    const iconPlay = document.getElementById('icon-play');
    const textEngineBtn = document.getElementById('text-engine-btn');

    if (AppData.WS.isOptimizing || forceStop) {
        AppData.WS.sendCommand('STOP');
        btn.classList.replace('bg-red-600', 'bg-emerald-600');
        btn.classList.replace('hover:bg-red-700', 'hover:bg-emerald-700');
        btn.classList.remove('animate-pulse');
        if (iconStop) iconStop.classList.add('hidden');
        if (iconPlay) iconPlay.classList.remove('hidden');
        if (textEngineBtn) textEngineBtn.textContent = 'Generar (WS)';
    } else {
        AppData.WS.sendCommand('START');
        btn.classList.replace('bg-emerald-600', 'bg-red-600');
        btn.classList.replace('hover:bg-emerald-700', 'hover:bg-red-700');
        btn.classList.add('animate-pulse');
        if (iconPlay) iconPlay.classList.add('hidden');
        if (iconStop) iconStop.classList.remove('hidden');
        if (textEngineBtn) textEngineBtn.textContent = 'Parar Motor';
    }
}

function switchTab(tabId: string): void {
    document.querySelectorAll('.view-tab').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById(`view-${tabId}`);
    if (targetTab) targetTab.classList.add('active');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white', 'shadow-inner');
        btn.classList.add('text-slate-300');
    });
    
    const activeBtn = document.getElementById(`nav-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-slate-300');
        activeBtn.classList.add('bg-indigo-600', 'text-white', 'shadow-inner');
    }

    const headerCalendar = document.getElementById('header-calendar');
    if (headerCalendar) {
        headerCalendar.style.display = (tabId === 'calendar') ? 'flex' : 'none';
    }

    if (tabId === 'subjects') renderSubjects();
    if (tabId === 'teachers') renderTeachers();
    if (tabId === 'courses') renderCourses();
    if (tabId === 'assignments') renderAssignmentsList();
    if (tabId === 'calendar') {
        setTimeout(() => { 
            if (AppData.calendarInstance) AppData.calendarInstance.render(); 
            updateEntitySelector(); 
            updateDateRange(); 
        }, 50);
    }
}

function updateDateRange(): void {
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

function showToast(title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info'): void {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    let bgClass = type === 'error' ? 'border-red-500 text-red-500' 
                : (type === 'success' ? 'border-green-500 text-green-500' 
                : (type === 'warning' ? 'border-yellow-500 text-yellow-500' 
                : 'border-blue-500 text-blue-500'));
    
    toast.className = `bg-white border-l-4 ${bgClass} shadow-lg rounded-r-lg p-4 w-80 transform transition-all duration-300 translate-y-4 opacity-0 flex gap-3`;
    toast.innerHTML = `<div><h4 class="text-sm font-bold text-gray-800">${title}</h4><p class="text-xs text-gray-600 mt-1">${message}</p></div>`;
    
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('translate-y-4', 'opacity-0'), 10);
    setTimeout(() => { 
        toast.classList.add('opacity-0', 'translate-x-full'); 
        setTimeout(() => toast.remove(), 300); 
    }, 4000);
}

function updateEntitySelector(): void {
    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const courseSelect = document.getElementById('header-course-select') as HTMLSelectElement;
    const courseSeparator = document.getElementById('header-course-separator');
    const entitySelect = document.getElementById('view-entity-select') as HTMLSelectElement;
    
    if (!typeSelect || !courseSelect || !entitySelect || !courseSeparator) return;

    const type = typeSelect.value;
    const currentCourseValue = courseSelect.value;
    const currentValue = entitySelect.value;
    
    if (type === 'group') {
        courseSelect.classList.remove('hidden'); 
        courseSeparator.classList.remove('hidden');
        
        courseSelect.innerHTML = '';
        AppData.courses.forEach(c => courseSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`);
        
        if (currentCourseValue && Array.from(courseSelect.options).some(opt => opt.value === currentCourseValue)) {
            courseSelect.value = currentCourseValue;
        }
        onHeaderCourseChange(currentValue);
    } else {
        courseSelect.classList.add('hidden'); 
        courseSeparator.classList.add('hidden');
        
        entitySelect.innerHTML = '';
        AppData.teachers.forEach(t => entitySelect.innerHTML += `<option value="${t.id}">${t.name}</option>`);
        
        if (currentValue && Array.from(entitySelect.options).some(opt => opt.value === currentValue)) {
            entitySelect.value = currentValue;
        }
        refreshCalendarView();
    }
}

function onHeaderCourseChange(previousVal: string | null = null): void {
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

function initCalendar(): void {
    if (typeof tui === 'undefined') return;

    const Calendar = tui.Calendar;
    AppData.calendarInstance = new Calendar('#calendar', {
        defaultView: 'week', useFormPopup: false, useDetailPopup: false,
        week: { taskView: false, eventView: ['time'], dayNames: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'], workweek: true, hourStart: 8, hourEnd: 15 }
    });

    AppData.calendarInstance.setCalendars(AppData.teachers.map(t => ({ id: t.id, name: t.name, backgroundColor: t.color })));

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

        if (changes.start) cls.start = (typeof changes.start.toDate === 'function') ? changes.start.toDate() : new Date(changes.start);
        if (changes.end) cls.end = (typeof changes.end.toDate === 'function') ? changes.end.toDate() : new Date(changes.end);
        
        cls.duration = ((cls.end as Date).getTime() - (cls.start as Date).getTime()) / (1000 * 60 * 60);

        AppData.calendarInstance.updateEvent(event.id, event.calendarId, changes);

        showToast("Sincronizando...", "Guardando nueva posición en el servidor...", "info");
        await AppData.API.updateClass(cls);
        
        AppData.WS.sendCommand('MANUAL_EDIT', { id: cls.id, action: 'moved' });
    });

    AppData.calendarInstance.on('clickEvent', (e: any) => openEventDetail(e.event));
}

function openAddClassModal(startDate: Date | null = null, endDate: Date | null = null): void {
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

function onModalCourseChange(): void {
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

function closeAddClassModal(): void {
    const modal = document.getElementById('add-class-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

async function saveNewClass(): Promise<void> {
    const baseStartStr = (document.getElementById('modal-class-start') as HTMLInputElement).value;
    const baseEndStr = (document.getElementById('modal-class-end') as HTMLInputElement).value;
    
    const baseStart = new Date(baseStartStr);
    const baseEnd = new Date(baseEndStr);
    
    const timeStartStr = (document.getElementById('modal-time-start') as HTMLInputElement).value.split(':');
    const timeEndStr = (document.getElementById('modal-time-end') as HTMLInputElement).value.split(':');
    
    baseStart.setHours(parseInt(timeStartStr[0]), parseInt(timeStartStr[1]));
    baseEnd.setHours(parseInt(timeEndStr[0]), parseInt(timeEndStr[1]));

    const subjId = (document.getElementById('modal-subject') as HTMLSelectElement).value;
    const groupId = (document.getElementById('modal-group') as HTMLSelectElement).value;
    const teacherId = (document.getElementById('modal-teacher') as HTMLSelectElement).value;

    if (!groupId || !teacherId) {
        showToast("Error", "Faltan datos por seleccionar (Grupo o Profesor)", "error");
        return;
    }

    const durationInMs = baseEnd.getTime() - baseStart.getTime();
    const durationInHours = durationInMs / (1000 * 60 * 60);

    let nuevaClase: ScheduledClass = {
        id: 'evt-' + Date.now(),
        start: baseStart,
        end: baseEnd,
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

function refreshCalendarView(): void {
    const typeSelect = document.getElementById('view-type-select') as HTMLSelectElement;
    const entitySelect = document.getElementById('view-entity-select') as HTMLSelectElement;
    
    if (!typeSelect || !entitySelect) return;

    const type = typeSelect.value;
    const entityId = entitySelect.value;
    
    if (AppData.calendarInstance) AppData.calendarInstance.clear();
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
            title: subject ? subject.name : 'Clase API',
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

function openEventDetail(event: any): void {
    const cls = AppData.scheduledClasses.find(c => c.id === event.id);
    if (!cls) return;

    const subject = AppData.subjects.find(s => s.id === cls.subjectId);
    const teacher = AppData.teachers.find(t => t.id === cls.teacherId);

    if (!subject || !teacher) return;

    const titleEl = document.getElementById('event-detail-title');
    if (titleEl) titleEl.textContent = subject.name;
    
    const headerEl = document.getElementById('event-detail-header');
    if (headerEl) headerEl.style.backgroundColor = teacher.color;
    
    const bodyEl = document.getElementById('event-detail-body');
    if (bodyEl) bodyEl.innerHTML = `<p class="text-sm">Impartida por: <b>${teacher.name}</b></p>`;

    const pinBtn = document.getElementById('btn-pin-event') as HTMLButtonElement;
    if (pinBtn) {
        pinBtn.innerText = cls.isPinned ? "Desfijar" : "Fijar (Pin)";
        pinBtn.onclick = async () => { 
            cls.isPinned = !cls.isPinned; 
            await AppData.API.updateClass(cls); 
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

function closeEventDetail(): void { 
    const modal = document.getElementById('event-detail-modal');
    if (modal) modal.classList.replace('flex', 'hidden'); 
}

let currentCrudType: string = '';
let currentCrudId: string | null = null;

function openFormModal(type: string, id: string | null = null): void {
    currentCrudType = type;
    currentCrudId = id;
    showToast("Info", `Abriendo editor de ${type} (Enlazado con API)`, "info");
}

function closeCrudModal(): void { 
    const modal = document.getElementById('crud-modal');
    if (modal) modal.classList.replace('flex', 'hidden'); 
}

async function renderSubjects(): Promise<void> {} 
async function renderTeachers(): Promise<void> {}
async function renderCourses(): Promise<void> {}
async function renderAssignmentsList(): Promise<void> {}