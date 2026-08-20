import { AppDataState, Subject, Teacher, Course, ScheduledClass } from './types';
import { ApiService } from './api';
import { EngineWebSocket } from './websocket';
import { 
    initCalendar, updateDateRange, refreshCalendarView, openAddClassModal, closeAddClassModal, 
    onModalCourseChange, onModalSubjectChange, onModalGroupChange, updateModalTeacherOptions,
    saveNewClass, openEventDetail, closeEventDetail, onHeaderCourseChange, clearGroupSchedule, toggleColorMode 
} from './calendar';
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
import { switchTab, updateEntitySelector, onHeaderCourseChangeWrapper } from './navigation';
import { exportDatabase, handleImportDatabaseFile } from './backup_manager';

export const AppData: AppDataState = { 
    API: new ApiService(),
    WS: new EngineWebSocket(),
    subjects: [], teachers: [], courses: [], scheduledClasses: [],
    calendarInstance: null, currentEventContext: null,
    currentCourseId: null
};

// ── Interceptor global de errores → reenvía al servidor para verlos en la terminal ──
function sendErrorToServer(level: string, message: string, source: string = '', line: number = 0, stack: string = '') {
    if (AppData.API.isTauri()) {
        return;
    }
    fetch('/api/v1/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, source, line, stack: stack ?? '' })
    }).catch(() => {});
}

window.onerror = (msg, src, lineno, _col, err) => {
    sendErrorToServer('error', String(msg), src ?? '', lineno ?? 0, err?.stack ?? '');
    return false;
};

window.addEventListener('unhandledrejection', (e) => {
    const err = e.reason;
    const msg = err instanceof Error ? err.message : String(err);
    sendErrorToServer('error', `Unhandled Promise Rejection: ${msg}`, '', 0, err?.stack ?? '');
});

const _originalConsoleError = console.error.bind(console);
console.error = (...args: any[]) => {
    _originalConsoleError(...args);
    const message = args.map(a => (a instanceof Error ? a.message : String(a))).join(' ');
    const stack = args.find(a => a instanceof Error)?.stack ?? '';
    sendErrorToServer('error', message, 'console.error', 0, stack);
};

async function waitForBackend(maxRetries: number = 15, delayMs: number = 1000): Promise<boolean> {
    if (AppData.API.isTauri()) {
        return true;
    }
    const loaderText = document.getElementById('loader-text');
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (loaderText && attempt > 1) {
                loaderText.textContent = `Iniciando motor y servidor local... (${attempt}/${maxRetries})`;
            }
            const res = await fetch('/api/v1/config', { cache: 'no-store' });
            if (res.ok) return true;
        } catch (_) {}
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

        const elCount = document.getElementById('conflict-tooltip-count');
        const elList = document.getElementById('conflict-tooltip-list');
        if (elCount && elList) {
            const conflicts = scores.conflictos || [];
            elCount.textContent = conflicts.length.toString();
            if (conflicts.length === 0) {
                elList.innerHTML = '<li class="text-slate-400 italic">No hay solapamientos ni conflictos detectados.</li>';
            } else {
                elList.innerHTML = conflicts.map(c => `<li class="flex items-start gap-1.5"><span class="text-red-400 font-bold">•</span><span>${c}</span></li>`).join('');
            }
        }
    });

    AppData.WS.on('schedule_updated', (classes: ScheduledClass[]) => {
        AppData.scheduledClasses = classes;
        refreshCalendarView();
    });

    AppData.WS.on('optimization_finished', (classes: ScheduledClass[]) => {
        AppData.scheduledClasses = classes;
        refreshCalendarView();
        toggleOptimizationEngine(true);
        showToast("Optimización completada", "El motor ha encontrado la mejor distribución de horarios.", "success");
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
        onModalSubjectChange: typeof onModalSubjectChange;
        onModalGroupChange: typeof onModalGroupChange;
        updateModalTeacherOptions: typeof updateModalTeacherOptions;
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
    onModalSubjectChange,
    onModalGroupChange,
    updateModalTeacherOptions,
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