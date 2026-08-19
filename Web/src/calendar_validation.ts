export interface TimeParts {
    hours: number;
    minutes: number;
}

/**
 * Parsea un string de tiempo en formato "HH:MM" de forma segura.
 */
export function parseTimeParts(timeStr: string | null | undefined): TimeParts {
    if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
        return { hours: 0, minutes: 0 };
    }
    const [hours, minutes] = timeStr.split(':').map(Number);
    return {
        hours: isNaN(hours) ? 0 : hours,
        minutes: isNaN(minutes) ? 0 : minutes
    };
}

/**
 * Valida si un intervalo horario inicio-fin es cronológicamente válido (inicio < fin).
 */
export function isValidTimeRange(startTimeStr: string, endTimeStr: string): boolean {
    const start = parseTimeParts(startTimeStr);
    const end = parseTimeParts(endTimeStr);
    const startTotal = start.hours * 60 + start.minutes;
    const endTotal = end.hours * 60 + end.minutes;
    return endTotal > startTotal;
}

/**
 * Calcula la cantidad de franjas de duración fija (ej. 30m) dentro de un intervalo horario.
 */
export function calculateSlotCount(startTimeStr: string, endTimeStr: string, slotDurationMinutes: number = 30): number {
    const start = parseTimeParts(startTimeStr);
    const end = parseTimeParts(endTimeStr);
    const diffMinutes = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
    const step = slotDurationMinutes > 0 ? slotDurationMinutes : 30;
    if (diffMinutes <= 0) return 0;
    return Math.floor(diffMinutes / step);
}

/**
 * Determina si un intervalo de clase se solapa con el recreo configurado.
 */
export function doesIntervalOverlapRecess(
    startDate: Date,
    endDate: Date,
    recessStartHour: number = 12,
    recessStartMinute: number = 0,
    recessDurationMinutes: number = 30
): boolean {
    if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false;
    const recessStart = new Date(startDate);
    recessStart.setHours(recessStartHour, recessStartMinute, 0, 0);

    const recessEnd = new Date(recessStart.getTime() + recessDurationMinutes * 60000);
    return startDate < recessEnd && endDate > recessStart;
}
