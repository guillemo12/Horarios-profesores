import { AppData } from './Datos';
import { getSubjectColor } from './calendar';
import { showToast } from './utils';
import { generatePrintTimeSlots, isRecessTimeSlot, PRINT_DAYS } from './print_grid';

export function printAllSchedules(): void {
    if (!AppData.courses || AppData.courses.length === 0) {
        showToast("Info", "No hay cursos ni grupos registrados para imprimir.", "info");
        return;
    }

    let printArea = document.getElementById('print-area');
    if (!printArea) {
        printArea = document.createElement('div');
        printArea.id = 'print-area';
        document.body.appendChild(printArea);
    }

    // Configuración de horas
    let startHour = 9;
    let endHour = 14;
    let slotMin = 30;

    if (AppData.config) {
        const partsStart = AppData.config.horaInicioClases.split(':');
        const partsEnd = AppData.config.horaFinClases.split(':');
        startHour = parseInt(partsStart[0]);
        endHour = parseInt(partsEnd[0]);
        slotMin = AppData.config.tiempoMinimo || 30;
    }

    const slots = generatePrintTimeSlots(startHour, endHour, slotMin);
    const days = PRINT_DAYS;

    // Precalcular índices O(1) para evitar búsquedas O(N) y O(N*M) dentro de los bucles de renderizado
    const subjectMap = new Map(AppData.subjects.map(s => [s.id, s]));
    const teacherMap = new Map(AppData.teachers.map(t => [t.id, t]));
    const groupCourseMap = new Map<string, { course: (typeof AppData.courses)[0]; group: (typeof AppData.courses)[0]['groups'][0] }>();

    AppData.courses.forEach(course => {
        course.groups.forEach(group => {
            groupCourseMap.set(group.id, { course, group });
        });
    });

    let html = '';

    // 1. HORARIOS POR CURSO Y GRUPO
    AppData.courses.forEach(course => {
        course.groups.forEach(group => {
            const groupClasses = AppData.scheduledClasses.filter(c => c.groupId === group.id);

            html += `
                <div class="print-page">
                    <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                        <div>
                            <h1 class="text-xl font-bold text-gray-900 leading-tight">${course.name} - Grupo ${group.name}</h1>
                            <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Lectivo Oficial • EduSchedule</p>
                        </div>
                        <div class="text-right">
                            <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Clases: ${groupClasses.length}</span>
                        </div>
                    </div>

                    <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                        <thead>
                            <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                                <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                                ${days.map(d => `<th class="p-1 border border-gray-300 text-center text-[11px]">${d.name}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;

            const skipSlotDayCourse = new Map<number, Set<number>>();
            days.forEach(d => skipSlotDayCourse.set(d.id, new Set<number>()));

            slots.forEach((slot, sIdx) => {
                const recessStart = AppData.config ? AppData.config.horaInicioRecreo : "11:30";
                const recessDur = AppData.config ? AppData.config.duracionRecreo : 30;
                const isRecess = isRecessTimeSlot(slot.startMin, recessStart, recessDur);

                if (isRecess) {
                    html += `
                        <tr class="bg-gray-100 text-gray-500 font-semibold">
                            <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${slot.startStr} - ${slot.endStr}</td>
                            <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">☕ Recreo</td>
                        </tr>
                    `;
                    return;
                }

                html += `<tr>`;
                html += `<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${slot.startStr} - ${slot.endStr}</td>`;

                days.forEach(day => {
                    if (skipSlotDayCourse.get(day.id)!.has(sIdx)) {
                        return;
                    }

                    const matchCls = groupClasses.find(cls => {
                        const dt = new Date(cls.start);
                        const dNum = dt.getDay();
                        if (dNum !== day.id) return false;
                        const cMin = dt.getHours() * 60 + dt.getMinutes();
                        return cMin === slot.startMin;
                    });

                    if (matchCls) {
                        const subject = subjectMap.get(matchCls.subjectId);
                        const teacher = teacherMap.get(matchCls.teacherId);
                        const bgColor = getSubjectColor(matchCls.subjectId);
                        const pinIcon = matchCls.isPinned ? '📌 ' : '';

                        let isMerged1h = false;
                        const nextSlot = (sIdx + 1 < slots.length) ? slots[sIdx + 1] : null;
                        if (nextSlot) {
                            const nextIsRecess = isRecessTimeSlot(nextSlot.startMin, recessStart, recessDur);
                            if (!nextIsRecess) {
                                const nextCls = groupClasses.find(cls => {
                                    const dt = new Date(cls.start);
                                    if (dt.getDay() !== day.id) return false;
                                    const cMin = dt.getHours() * 60 + dt.getMinutes();
                                    return cMin === nextSlot.startMin;
                                });
                                if (nextCls && nextCls.subjectId === matchCls.subjectId && nextCls.teacherId === matchCls.teacherId && nextCls.groupId === matchCls.groupId) {
                                    isMerged1h = true;
                                    skipSlotDayCourse.get(day.id)!.add(sIdx + 1);
                                }
                            }
                        }

                        const rowspanAttr = isMerged1h ? 'rowspan="2"' : '';
                        const durLabel = isMerged1h ? ' (1h)' : '';

                        html += `
                            <td ${rowspanAttr} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${bgColor} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                                <div class="font-bold text-[10px] truncate leading-tight">${pinIcon}${subject ? subject.name : 'Clase'}${durLabel}</div>
                                ${teacher ? `<div class="text-[9px] opacity-95 truncate leading-tight font-normal">Prof: ${teacher.name}</div>` : ''}
                            </td>
                        `;
                    } else {
                        html += `<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>`;
                    }
                });

                html += `</tr>`;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });
    });

    // 2. HORARIOS INDIVIDUALES POR PROFESOR
    AppData.teachers.forEach(teacher => {
        const teacherClasses = AppData.scheduledClasses.filter(c => c.teacherId === teacher.id);
        const totalHours = teacherClasses.reduce((sum, c) => sum + c.duration, 0);

        html += `
            <div class="print-page">
                <div class="flex justify-between items-center mb-2 border-b-2 border-indigo-600 pb-1">
                    <div>
                        <h1 class="text-xl font-bold text-gray-900 leading-tight">Horario Personal Docente: ${teacher.name}</h1>
                        <p class="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Horario Individual • EduSchedule</p>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] font-semibold px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">Jornada: ${totalHours.toFixed(1)}h</span>
                    </div>
                </div>

                <table class="w-full border-collapse border border-gray-300 text-xs table-fixed">
                    <thead>
                        <tr class="bg-slate-800 text-white font-bold border-b border-gray-300">
                            <th class="p-1 border border-gray-300 w-20 text-center text-[10px]">Hora</th>
                            ${days.map(d => `<th class="p-1 border border-gray-300 text-center text-[11px]">${d.name}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
        `;

        const skipSlotDayTeacher = new Map<number, Set<number>>();
        days.forEach(d => skipSlotDayTeacher.set(d.id, new Set<number>()));

        slots.forEach((slot, sIdx) => {
            const recessStart = AppData.config ? AppData.config.horaInicioRecreo : "11:30";
            const recessDur = AppData.config ? AppData.config.duracionRecreo : 30;
            const isRecess = isRecessTimeSlot(slot.startMin, recessStart, recessDur);

            if (isRecess) {
                html += `
                    <tr class="bg-gray-100 text-gray-500 font-semibold">
                        <td class="p-1 border border-gray-300 text-center font-mono text-[9px]">${slot.startStr} - ${slot.endStr}</td>
                        <td colspan="5" class="p-1 border border-gray-300 text-center bg-gray-100 text-slate-500 text-[10px]">☕ Recreo</td>
                    </tr>
                `;
                return;
            }

            html += `<tr>`;
            html += `<td class="p-1 border border-gray-300 text-center font-mono text-[9px] font-medium bg-gray-50">${slot.startStr} - ${slot.endStr}</td>`;

            days.forEach(day => {
                if (skipSlotDayTeacher.get(day.id)!.has(sIdx)) {
                    return;
                }

                const matchCls = teacherClasses.find(cls => {
                    const dt = new Date(cls.start);
                    const dNum = dt.getDay();
                    if (dNum !== day.id) return false;
                    const cMin = dt.getHours() * 60 + dt.getMinutes();
                    return cMin === slot.startMin;
                });

                if (matchCls) {
                    const subject = subjectMap.get(matchCls.subjectId);
                    const groupInfo = groupCourseMap.get(matchCls.groupId);
                    const bgColor = getSubjectColor(matchCls.subjectId);
                    const pinIcon = matchCls.isPinned ? '📌 ' : '';

                    let isMerged1h = false;
                    const nextSlot = (sIdx + 1 < slots.length) ? slots[sIdx + 1] : null;
                    if (nextSlot) {
                        const nextIsRecess = isRecessTimeSlot(nextSlot.startMin, recessStart, recessDur);
                        if (!nextIsRecess) {
                            const nextCls = teacherClasses.find(cls => {
                                const dt = new Date(cls.start);
                                if (dt.getDay() !== day.id) return false;
                                const cMin = dt.getHours() * 60 + dt.getMinutes();
                                return cMin === nextSlot.startMin;
                            });
                            if (nextCls && nextCls.subjectId === matchCls.subjectId && nextCls.teacherId === matchCls.teacherId && nextCls.groupId === matchCls.groupId) {
                                isMerged1h = true;
                                skipSlotDayTeacher.get(day.id)!.add(sIdx + 1);
                            }
                        }
                    }

                    const rowspanAttr = isMerged1h ? 'rowspan="2"' : '';
                    const durLabel = isMerged1h ? ' (1h)' : '';
                    const groupNameStr = groupInfo ? `${groupInfo.course.name} - ${groupInfo.group.name}` : `Grupo`;

                    html += `
                        <td ${rowspanAttr} class="p-1 border border-gray-300 align-middle text-white font-medium shadow-inner" style="background-color: ${bgColor} !important; color: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important;">
                            <div class="font-bold text-[10px] truncate leading-tight">${pinIcon}${subject ? subject.name : 'Clase'}${durLabel}</div>
                            <div class="text-[9px] opacity-95 truncate leading-tight font-normal">${groupNameStr}</div>
                        </td>
                    `;
                } else {
                    html += `<td class="p-1 border border-gray-300 text-center text-gray-300 bg-white text-[9px]">--</td>`;
                }
            });

            html += `</tr>`;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;
    });

    printArea.innerHTML = html;
    window.print();
}
