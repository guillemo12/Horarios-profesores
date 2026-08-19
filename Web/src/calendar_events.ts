import { AppData } from './Datos';
import { ScheduledClass, MergedDisplayEvent } from './types';
import { getSubjectColor } from './calendar_colors';

export interface RecessConfiguration {
    start?: string;
    duration?: number;
}

export function parseTimeToMinutes(timeString: string): number {
    if (!timeString || typeof timeString !== 'string') return 0;
    const cleanTime = timeString.trim();
    if (!cleanTime.includes(':')) return 0;
    const parts = cleanTime.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) return 0;
    return hours * 60 + minutes;
}

export function overlapsRecess(
    start: Date | string,
    end: Date | string,
    recessConfig?: RecessConfiguration
): boolean {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

    let recessStartMinutes = 12 * 60; // 12:00 -> 720 min por defecto
    let recessDurationMinutes = 30;

    if (recessConfig) {
        if (typeof recessConfig.start === 'string') {
            recessStartMinutes = parseTimeToMinutes(recessConfig.start);
        }
        if (typeof recessConfig.duration === 'number' && recessConfig.duration > 0) {
            recessDurationMinutes = recessConfig.duration;
        }
    } else if (AppData.config) {
        recessStartMinutes = parseTimeToMinutes(AppData.config.horaInicioRecreo);
        recessDurationMinutes = AppData.config.duracionRecreo;
    }

    const recessEndMinutes = recessStartMinutes + recessDurationMinutes;
    return startMinutes < recessEndMinutes && endMinutes > recessStartMinutes;
}

export function isRecess(
    timeString: string,
    recessStart: string = '12:00',
    recessDurationMinutes: number = 30
): boolean {
    const currentMinutes = parseTimeToMinutes(timeString);
    const startMinutes = parseTimeToMinutes(recessStart);
    const endMinutes = startMinutes + recessDurationMinutes;
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function getMergedCalendarEvents(
    classes: ScheduledClass[],
    type: string,
    entityId: string,
    colorMode: string = 'teacher',
    options: { maxBlockDuration?: number; recessConfig?: RecessConfiguration } = {}
): MergedDisplayEvent[] {
    const {
        maxBlockDuration = 2.0,
        recessConfig = AppData.config ? { start: AppData.config.horaInicioRecreo, duration: AppData.config.duracionRecreo } : { start: '12:00', duration: 30 }
    } = options;

    if (!Array.isArray(classes) || classes.length === 0) {
        return [];
    }

    const filtered = classes.filter(cls => {
        if (type === 'teacher') return cls.teacherId === entityId;
        if (type === 'group') return cls.groupId === entityId;
        return false;
    });

    const groupsMap = new Map<string, ScheduledClass[]>();
    filtered.forEach(cls => {
        const d = new Date(cls.start);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const key = `${dateKey}_${cls.subjectId}_${cls.teacherId}_${cls.groupId}`;
        if (!groupsMap.has(key)) {
            groupsMap.set(key, []);
        }
        groupsMap.get(key)!.push(cls);
    });

    const displayEvents: MergedDisplayEvent[] = [];

    groupsMap.forEach(groupClasses => {
        groupClasses.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        let index = 0;
        while (index < groupClasses.length) {
            const current = groupClasses[index];
            let mergedIds = [current.id];
            let blockStart = current.start;
            let blockEnd = current.end;
            let blockDuration = current.duration || ((new Date(current.end).getTime() - new Date(current.start).getTime()) / 3600000);
            let isPinned = Boolean(current.isPinned);

            let nextIndex = index + 1;
            while (nextIndex < groupClasses.length) {
                const next = groupClasses[nextIndex];
                const currentEndTime = new Date(blockEnd).getTime();
                const nextStartTime = new Date(next.start).getTime();
                const isContiguous = Math.abs(currentEndTime - nextStartTime) < 60000;
                const nextDuration = next.duration || ((new Date(next.end).getTime() - new Date(next.start).getTime()) / 3600000);
                const crossesRecess = overlapsRecess(new Date(blockStart), new Date(next.end), recessConfig);

                if (isContiguous && !crossesRecess && (blockDuration + nextDuration <= maxBlockDuration + 0.01)) {
                    blockEnd = next.end;
                    blockDuration += nextDuration;
                    mergedIds.push(next.id);
                    if (next.isPinned) {
                        isPinned = true;
                    }
                    nextIndex++;
                } else {
                    break;
                }
            }

            const subject = AppData.subjects.find(s => s.id === current.subjectId);
            const teacher = AppData.teachers.find(t => t.id === current.teacherId);
            const course = AppData.courses.find(c => c.groups.some(g => g.id === current.groupId));
            const group = course ? course.groups.find(g => g.id === current.groupId) : null;

            const pin = isPinned ? '📌 ' : '';
            const subjectTitle = subject ? `${pin}${subject.name}` : `${pin}Clase API`;
            const subtitle = (type === 'group')
                ? (teacher ? `Prof: ${teacher.name}` : '')
                : (course && group ? `${course.name} - G.${group.name}` : (teacher ? `Prof: ${teacher.name}` : ''));

            const eventBgColor = (colorMode === 'subject')
                ? getSubjectColor(current.subjectId)
                : (teacher ? teacher.color : '#4f46e5');

            displayEvents.push({
                id: current.id,
                mergedIds: [...mergedIds],
                calendarId: current.teacherId,
                title: subjectTitle,
                body: subtitle,
                start: blockStart,
                end: blockEnd,
                duration: Math.round(blockDuration * 100) / 100,
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

            index = nextIndex;
        }
    });

    return displayEvents;
}

export function addRecessEvents(): void {
    if (!AppData.calendarInstance) return;

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
        startHour = parseInt(parts[0], 10) || 12;
        startMin = parseInt(parts[1], 10) || 0;
        duration = AppData.config.duracionRecreo || 30;
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
