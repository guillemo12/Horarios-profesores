import { AppDataState, Subject, Teacher, Course, ScheduledClass } from './types';
import { ApiService } from './api';
import { EngineWebSocket } from './websocket';
import { initCalendar, updateDateRange, refreshCalendarView, openAddClassModal, closeAddClassModal, onModalCourseChange, saveNewClass, openEventDetail, closeEventDetail, onHeaderCourseChange, clearGroupSchedule, toggleColorMode } from './calendar';
import { 
    openFormModal, closeCrudModal, openGroupModal, deleteSubject, deleteTeacher, deleteCourse, deleteGroup, 
    renderSubjects, renderTeachers, renderCourses, openCourseSubjects
} from './crud';
import { renderAssignmentsList, updateAssignment, clearGroupAssignments, clearCourseAssignments } from './assignments';
import { openAvailabilityModal, closeAvailabilityModal, saveAvailability, toggleAvailabilitySlot } from './availability';
import { loadSettings, saveSettings } from './settings';
import { runPrevalidation, closePrevalidation } from './prevalidation';
import { printAllSchedules } from './print';
import { checkForUpdates } from './updater';
import { showToast } from './utils';

export const AppData: AppDataState = { 
    API: new ApiService(),
    WS: new EngineWebSocket(),
    subjects: [], teachers: [], courses: [], scheduledClasses: [],
    calendarInstance: null, currentEventContext: null,
    currentCourseId: null
};

// ── Interceptor global de errores → reenvía al servidor para verlos en la terminal ──
function sendErrorToServer(level: string, message: string, source: string = '', line: number = 0, stack: string = '') {
    fetch('/api/v1/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, source, line, stack: stack ?? '' })
    }).catch(() => {}); // nunca bloquear
}

// Errores JS síncronos
window.onerror = (msg, src, lineno, _col, err) => {
    sendErrorToServer('error', String(msg), src ?? '', lineno ?? 0, err?.stack ?? '');
    return false;
};

// Promesas rechazadas sin catch
window.addEventListener('unhandledrejection', (e) => {
    const err = e.reason;
    const msg = err instanceof Error ? err.message : String(err);
    sendErrorToServer('error', `Unhandled Promise Rejection: ${msg}`, '', 0, err?.stack ?? '');
});

// Sobrescribir console.error para capturar los errores que ya se manejan en catch
const _originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
    _originalConsoleError(...args);
    const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
    const stack  = args.find(a => a instanceof Error)?.stack ?? '';
    sendErrorToServer('error', message, 'console.error', 0, stack);
};

async function waitForBackend(maxRetries: number = 15, delayMs: number = 1000): Promise<boolean> {
    const loaderText = document.getElementById('loader-text');
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (loaderText && attempt > 1) {
                loaderText.textContent = `Iniciando motor y servidor local... (${attempt}/${maxRetries})`;
            }
            const res = await fetch('/api/v1/config', { cache: 'no-store' });
            if (res.ok) {
                return true;
            }
        } catch (_) {
            // El servidor aún está iniciando
        }
        await new Promise(r => setTimeout(r, delayMs));
    }
    return false;
}

export async function loadAllData(): Promise<void> {
    const [subjects, teachers, courses, scheduledClasses, config] = await Promise.all([
        AppData.API.getSubjects(),
        AppData.API.getTeachers(),
        AppData.API.getCourses(),
        AppData.API.getSchedule(),
        AppData.API.getConfig()
    ]);
    AppData.subjects = subjects;
    AppData.teachers = teachers;
    AppData.courses = courses;
    AppData.scheduledClasses = scheduledClasses;
    AppData.config = config;
}

window.onload = async function(): Promise<void> {
    try {
        const isReady = await waitForBackend();
        if (!isReady) {
            throw new Error("No se pudo conectar con el servidor Ktor tras varios intentos.");
        }

        await loadAllData();
        
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

        setTimeout(() => {
            checkForUpdates(true);
        }, 2000);

    } catch (err) {
        console.error("Init Error:", err);
        const loaderText = document.getElementById('loader-text');
        if (loaderText) {
            loaderText.textContent = "Error conectando con la API local. Asegúrese de que el servidor Ktor esté encendido.";
            loaderText.className = "mt-4 text-red-600 font-bold px-4 text-center";
        }
    }
};

export function setupWebSocketsListeners(): void {
    const btn = document.getElementById('btn-toggle-engine') as HTMLButtonElement;
    const wsStatus = document.getElementById('ws-status');

    AppData.WS.on('connected', () => {
        if (btn) {
            btn.disabled = false;
            btn.classList.replace('bg-gray-400', 'bg-emerald-600');
            btn.classList.add('hover:bg-emerald-700');
            btn.classList.remove('cursor-not-allowed');
        }
        const textBtn = document.getElementById('text-engine-btn');
        if (textBtn) textBtn.textContent = 'Generar (WS)';
        
        if (wsStatus) {
            wsStatus.innerHTML = '<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span></span> Conectado';
        }
    });

    AppData.WS.on('disconnected', () => {
        if (btn) {
            btn.disabled = true;
            btn.classList.replace('bg-emerald-600', 'bg-gray-400');
            btn.classList.remove('hover:bg-emerald-700');
            btn.classList.add('cursor-not-allowed');
        }
        const textBtn = document.getElementById('text-engine-btn');
        if (textBtn) textBtn.textContent = 'Conectando...';
        
        if (wsStatus) {
            wsStatus.innerHTML = '<span class="relative flex h-2.5 w-2.5 mr-1.5"><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span></span> Desconectado';
        }
    });

    AppData.WS.on('scores_updated', (scores: { hard: number, soft: number, bound: number, rawObjective?: number, porcentaje?: number, conflictos?: string[] }) => {
        const elHard = document.getElementById('score-hard');
        const elSoft = document.getElementById('score-soft');
        const elTooltipText = document.getElementById('score-soft-tooltip-text');

        if (elHard) elHard.textContent = scores.hard.toString();
        
        if (elSoft) {
            const pct = (scores.porcentaje !== undefined && !isNaN(scores.porcentaje))
                ? Math.min(100, Math.max(0, scores.porcentaje)).toFixed(1) + '%'
                : '0.0%';
            elSoft.textContent = pct;
        }

        if (elTooltipText) {
            const rawObj = scores.rawObjective || scores.soft || 0;
            const boundVal = scores.bound || 0;
            elTooltipText.innerHTML = `Puntos: <b class="text-white">${rawObj.toLocaleString()}</b> / <b class="text-indigo-400">${boundVal.toLocaleString()}</b> pts`;
        }
        
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

        // Actualizar Tooltip de Conflictos
        const elCount = document.getElementById('conflict-tooltip-count');
        const elList = document.getElementById('conflict-tooltip-list');
        if (elCount && elList) {
            const list = scores.conflictos || [];
            elCount.textContent = list.length.toString();
            if (list.length === 0) {
                elList.innerHTML = '<span class="text-emerald-600 font-medium">¡Horario matemáticamente correcto!</span>';
            } else {
                elList.innerHTML = '<ul class="list-disc pl-4 space-y-1 text-red-600 font-medium">' +
                    list.map(c => `<li>${c}</li>`).join('') +
                    '</ul>';
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

export function toggleOptimizationEngine(forceStop: boolean = false): void {
    try {
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
            btn.classList.replace('hover:bg-red-700', 'hover:bg-red-700');
            btn.classList.add('animate-pulse');
            if (iconPlay) iconPlay.classList.add('hidden');
            if (iconStop) iconStop.classList.remove('hidden');
            if (textEngineBtn) textEngineBtn.textContent = 'Parar Motor';
        }
    } catch (err) {
        console.error("Error in toggleOptimizationEngine:", err);
        showToast("Error", "No se pudo iniciar el motor de optimización", "error");
    }
}

export function switchTab(tabId: string): void {
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
    if (tabId === 'settings') loadSettings();
    if (tabId === 'calendar') {
        setTimeout(() => { 
            if (AppData.calendarInstance) AppData.calendarInstance.render(); 
            updateEntitySelector(); 
            updateDateRange(); 
        }, 50);
    }
}

export function updateEntitySelector(): void {
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
        
        courseSelect.innerHTML = AppData.courses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
        
        if (currentCourseValue && Array.from(courseSelect.options).some(opt => opt.value === currentCourseValue)) {
            courseSelect.value = currentCourseValue;
        }
        onHeaderCourseChange(currentValue);
    } else {
        courseSelect.classList.add('hidden'); 
        courseSeparator.classList.add('hidden');
        
        entitySelect.innerHTML = AppData.teachers.map(t => `<option value="${t.id}">${t.name}</option>`).join('');
        
        if (currentValue && Array.from(entitySelect.options).some(opt => opt.value === currentValue)) {
            entitySelect.value = currentValue;
        }
        refreshCalendarView();
    }
}

function onHeaderCourseChangeWrapper() {
    onHeaderCourseChange(null);
}

async function exportDatabase() {
    try {
        showToast("Copia de Seguridad", "Preparando archivo de base de datos...", "info");
        const res = await fetch('/api/v1/system/database/export');
        if (!res.ok) {
            throw new Error(`Error en el servidor: ${res.statusText}`);
        }
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition');
        let filename = `EduSchedule_Backup_${new Date().toISOString().split('T')[0]}.db`;
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) filename = match[1];
        }

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        showToast("Copia de Seguridad", `Base de datos exportada: ${filename}`, "success");
    } catch (err: any) {
        console.error("Error al exportar base de datos:", err);
        showToast("Error", `No se pudo exportar la base de datos: ${err.message}`, "error");
    }
}

async function handleImportDatabaseFile(input: HTMLInputElement) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    input.value = '';

    if (!file.name.endsWith('.db') && !file.name.endsWith('.sqlite')) {
        showToast("Archivo no válido", "Por favor selecciona un archivo .db o .sqlite válido.", "warning");
        return;
    }

    const confirmed = confirm(`¿Estás seguro de que deseas restaurar la copia de seguridad "${file.name}"?\n\nEsta acción reemplazará la base de datos actual y actualizará toda la información.`);
    if (!confirmed) return;

    try {
        showToast("Restaurando", "Validando e importando base de datos...", "info");
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch('/api/v1/system/database/import', {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        if (res.ok && data.success) {
            showToast("Restauración Completada", "La base de datos se ha restaurado con éxito. Actualizando vista...", "success");
            await loadAllData();
            loadSettings();
            refreshCalendarView();
            updateEntitySelector();
        } else {
            throw new Error(data.message || "Error desconocido al importar.");
        }
    } catch (err: any) {
        console.error("Error al restaurar base de datos:", err);
        showToast("Error de Restauración", `No se pudo restaurar la base de datos: ${err.message}`, "error");
    }
}

declare global {
    interface Window {
        AppData: AppDataState;
        loadAllData: typeof loadAllData;
        switchTab: typeof switchTab;
        updateEntitySelector: typeof updateEntitySelector;
        onHeaderCourseChange: typeof onHeaderCourseChangeWrapper;
        toggleOptimizationEngine: typeof toggleOptimizationEngine;
        openFormModal: typeof openFormModal;
        closeCrudModal: typeof closeCrudModal;
        openGroupModal: typeof openGroupModal;
        deleteSubject: typeof deleteSubject;
        deleteTeacher: typeof deleteTeacher;
        deleteCourse: typeof deleteCourse;
        deleteGroup: typeof deleteGroup;
        updateAssignment: typeof updateAssignment;
        saveNewClass: typeof saveNewClass;
        closeAddClassModal: typeof closeAddClassModal;
        openAddClassModal: typeof openAddClassModal;
        onModalCourseChange: typeof onModalCourseChange;
        openEventDetail: typeof openEventDetail;
        closeEventDetail: typeof closeEventDetail;
        refreshCalendarView: typeof refreshCalendarView;
        updateDateRange: typeof updateDateRange;
        showToast: typeof showToast;
        openCourseSubjects: typeof openCourseSubjects;
        openAvailabilityModal: typeof openAvailabilityModal;
        closeAvailabilityModal: typeof closeAvailabilityModal;
        saveAvailability: typeof saveAvailability;
        saveSettings: typeof saveSettings;
        clearGroupSchedule: typeof clearGroupSchedule;
        clearGroupAssignments: typeof clearGroupAssignments;
        clearCourseAssignments: typeof clearCourseAssignments;
        toggleAvailabilitySlot: typeof toggleAvailabilitySlot;
        runPrevalidation: typeof runPrevalidation;
        closePrevalidation: typeof closePrevalidation;
        toggleColorMode: typeof toggleColorMode;
        printAllSchedules: typeof printAllSchedules;
        checkForUpdates: typeof checkForUpdates;
        exportDatabase: typeof exportDatabase;
        handleImportDatabaseFile: typeof handleImportDatabaseFile;
    }
}

// Expose variables and functions to global scope for HTML inline calls
Object.assign(window, {
    AppData,
    loadAllData,
    switchTab,
    updateEntitySelector,
    onHeaderCourseChange: onHeaderCourseChangeWrapper,
    toggleOptimizationEngine,
    openFormModal,
    closeCrudModal,
    openGroupModal,
    deleteSubject,
    deleteTeacher,
    deleteCourse,
    deleteGroup,
    updateAssignment,
    saveNewClass,
    closeAddClassModal,
    openAddClassModal,
    onModalCourseChange,
    openEventDetail,
    closeEventDetail,
    refreshCalendarView,
    updateDateRange,
    showToast,
    openCourseSubjects,
    openAvailabilityModal,
    closeAvailabilityModal,
    saveAvailability,
    saveSettings,
    clearGroupSchedule,
    clearGroupAssignments,
    clearCourseAssignments,
    toggleAvailabilitySlot,
    runPrevalidation,
    closePrevalidation,
    toggleColorMode,
    printAllSchedules,
    checkForUpdates,
    exportDatabase,
    handleImportDatabaseFile
});