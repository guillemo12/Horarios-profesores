import { AppData } from './Datos';
import { renderSubjects } from './crud_subjects';
import { renderTeachers } from './crud_teachers';
import { renderCourses } from './crud_courses';
import { renderAssignmentsList } from './assignments';
import { loadSettings } from './settings';
import { refreshCalendarView, updateDateRange, onHeaderCourseChange } from './calendar';

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

export function onHeaderCourseChangeWrapper(): void {
    onHeaderCourseChange(null);
}
