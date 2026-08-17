import { AppData } from './Datos';
import { renderTeachers } from './crud';
import { showToast } from './utils';

let currentAvailabilityTeacherId: string | null = null;
let currentTeacherAvailabilityList: { dayOfWeek: number; startTime: string; endTime: string }[] = [];

export function openAvailabilityModal(teacherId: string): void {
    const t = AppData.teachers.find(x => x.id === teacherId);
    if (!t) return;

    currentAvailabilityTeacherId = teacherId;
    currentTeacherAvailabilityList = t.availability ? [...t.availability] : [];

    const nameEl = document.getElementById('availability-teacher-name');
    if (nameEl) nameEl.textContent = t.name;

    const tbody = document.getElementById('availability-grid-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const timeSlots = [
        { start: '09:00', end: '09:30' },
        { start: '09:30', end: '10:00' },
        { start: '10:00', end: '10:30' },
        { start: '10:30', end: '11:00' },
        { start: '11:00', end: '11:30' },
        { start: '11:30', end: '12:00' },
        { start: '12:30', end: '13:00' },
        { start: '13:00', end: '13:30' },
        { start: '13:30', end: '14:00' }
    ];

    timeSlots.forEach((slot, index) => {
        let cellsHtml = '';
        for (let day = 1; day <= 5; day++) {
            const isUnavailable = currentTeacherAvailabilityList.some(av => 
                av.dayOfWeek === day && av.startTime === slot.start && av.endTime === slot.end
            );
            
            const cellId = `cell-av-${day}-${index}`;
            const bgClass = isUnavailable 
                ? 'bg-red-500 hover:bg-red-600 text-white border-red-300 font-bold' 
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200';
            const textVal = isUnavailable ? 'NO DISPONIBLE' : 'DISPONIBLE';

            cellsHtml += `
                <td class="p-2 text-center border border-gray-200">
                    <button type="button" id="${cellId}" 
                        onclick="toggleAvailabilitySlot(${day}, '${slot.start}', '${slot.end}', '${cellId}')"
                        class="w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all ${bgClass}">
                        ${textVal}
                    </button>
                </td>
            `;
        }

        tbody.innerHTML += `
            <tr class="hover:bg-gray-50">
                <td class="p-3 border border-gray-200 font-semibold text-gray-700 text-center">${slot.start} - ${slot.end}</td>
                ${cellsHtml}
            </tr>
        `;
    });

    const modal = document.getElementById('availability-modal');
    if (modal) modal.classList.replace('hidden', 'flex');
}

export function toggleAvailabilitySlot(day: number, start: string, end: string, cellId: string): void {
    const btn = document.getElementById(cellId) as HTMLButtonElement;
    if (!btn) return;

    const index = currentTeacherAvailabilityList.findIndex(av => 
        av.dayOfWeek === day && av.startTime === start && av.endTime === end
    );

    if (index > -1) {
        currentTeacherAvailabilityList.splice(index, 1);
        btn.className = "w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200";
        btn.textContent = "DISPONIBLE";
    } else {
        currentTeacherAvailabilityList.push({ dayOfWeek: day, startTime: start, endTime: end });
        btn.className = "w-full py-2 px-1 rounded text-[10px] tracking-wide transition-all bg-red-500 hover:bg-red-600 text-white border border-red-300 font-bold";
        btn.textContent = "NO DISPONIBLE";
    }
}

export function closeAvailabilityModal(): void {
    const modal = document.getElementById('availability-modal');
    if (modal) modal.classList.replace('flex', 'hidden');
}

export async function saveAvailability(): Promise<void> {
    if (!currentAvailabilityTeacherId) return;
    const t = AppData.teachers.find(x => x.id === currentAvailabilityTeacherId);
    if (!t) return;

    t.availability = currentTeacherAvailabilityList;
    try {
        await AppData.API.saveTeacher(t);
        showToast("Éxito", "Disponibilidad docente guardada correctamente", "success");
        closeAvailabilityModal();
        renderTeachers();
    } catch (err) {
        showToast("Error", "No se pudo guardar la disponibilidad", "error");
    }
}
