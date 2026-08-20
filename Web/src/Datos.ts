import { AppDataState, ScheduledClass } from './types';
import { ApiService } from './api';
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
    subjects: [], teachers: [], courses: [], scheduledClasses: [],
    calendarInstance: null, currentEventContext: null,
    currentCourseId: null
};

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
        await loadAllData();
        
        const loader = document.getElementById('app-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 200);
        }
        
        initCalendar();
        updateEntitySelector();
        updateDateRange();
        updateScoreDashboard(0, 1000, 100, []);

        setTimeout(() => {
            checkForUpdates(true);
        }, 2000);

    } catch (err) {
        console.error("Init Error:", err);
        const loaderText = document.getElementById('loader-text');
        if (loaderText) {
            loaderText.textContent = "Error al inicializar la base de datos local de EduSchedule.";
            loaderText.className = "mt-4 text-red-600 font-bold px-4 text-center";
        }
    }
};

export function updateScoreDashboard(hard: number, soft: number, porcentaje: number, conflictos: string[] = []): void {
    const elHard = document.getElementById('score-hard');
    const elSoft = document.getElementById('score-soft');
    const elTooltipText = document.getElementById('score-soft-tooltip-text');

    if (elHard) elHard.textContent = hard.toString();
    if (elSoft) elSoft.textContent = `${porcentaje.toFixed(1)}%`;
    if (elTooltipText) {
        elTooltipText.innerHTML = `Puntos: <b class="text-white">${soft.toLocaleString()}</b> / <b class="text-indigo-400">1,000</b> pts`;
    }
    
    const stConflict = document.getElementById('status-conflict');
    const stOk = document.getElementById('status-ok');
    
    if (stConflict && stOk) {
        if (hard === 0) {
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
        elCount.textContent = conflictos.length.toString();
        if (conflictos.length === 0) {
            elList.innerHTML = '<li class="text-slate-400 italic">No hay solapamientos ni conflictos detectados.</li>';
        } else {
            elList.innerHTML = conflictos.map(c => `<li class="flex items-start gap-1.5"><span class="text-red-400 font-bold">•</span><span>${c}</span></li>`).join('');
        }
    }
}

let isSolvingInProgress = false;

export async function toggleOptimizationEngine(): Promise<void> {
    if (isSolvingInProgress) return;

    const btn = document.getElementById('btn-toggle-engine');
    const textEngineBtn = document.getElementById('text-engine-btn');

    try {
        isSolvingInProgress = true;
        if (btn) {
            btn.classList.add('animate-pulse');
        }
        if (textEngineBtn) {
            textEngineBtn.textContent = 'Calculando...';
        }

        showToast("Generando Horarios", "El motor CSP nativo está calculando la distribución óptima...", "info");

        await AppData.API.startSolver();

        // Recargar horarios actualizados desde SQLite
        AppData.scheduledClasses = await AppData.API.getSchedule();
        refreshCalendarView();

        updateScoreDashboard(0, 1000, 100, []);
        showToast("Horarios Generados", "El horario ha sido calculado y guardado correctamente.", "success");

    } catch (err: any) {
        console.error("Error running solver:", err);
        showToast("Error en Solver", err?.message || String(err), "error");
    } finally {
        isSolvingInProgress = false;
        if (btn) {
            btn.classList.remove('animate-pulse');
        }
        if (textEngineBtn) {
            textEngineBtn.textContent = 'Generar Horarios';
        }
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