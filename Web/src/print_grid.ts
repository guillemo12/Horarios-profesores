export interface PrintTimeSlot {
    startStr: string;
    endStr: string;
    startMin: number;
    endMin: number;
}

export interface PrintDay {
    id: number;
    name: string;
}

export const PRINT_DAYS: PrintDay[] = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' }
];

/**
 * Genera la lista de franjas horarias a imprimir según el rango de horas configurado.
 */
export function generatePrintTimeSlots(startHour: number = 9, endHour: number = 14, slotMin: number = 30): PrintTimeSlot[] {
    const slots: PrintTimeSlot[] = [];
    let currentMin = Math.max(0, startHour) * 60;
    const finishMin = Math.min(24, Math.max(startHour + 1, endHour)) * 60;
    const step = slotMin > 0 ? slotMin : 30;

    while (currentMin < finishMin) {
        const nextMin = currentMin + step;
        const h1 = Math.floor(currentMin / 60).toString().padStart(2, '0');
        const m1 = (currentMin % 60).toString().padStart(2, '0');
        const h2 = Math.floor(nextMin / 60).toString().padStart(2, '0');
        const m2 = (nextMin % 60).toString().padStart(2, '0');

        slots.push({
            startStr: `${h1}:${m1}`,
            endStr: `${h2}:${m2}`,
            startMin: currentMin,
            endMin: nextMin
        });
        currentMin = nextMin;
    }
    return slots;
}

/**
 * Comprueba si una franja horaria coincide con el recreo configurado.
 */
export function isRecessTimeSlot(slotMin: number, recessStartStr: string = "11:30", recessDuration: number = 30): boolean {
    if (!recessStartStr || typeof recessStartStr !== 'string' || !recessStartStr.includes(':')) return false;
    const parts = recessStartStr.split(':');
    const rStart = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    const rEnd = rStart + (recessDuration > 0 ? recessDuration : 30);
    return slotMin >= rStart && slotMin < rEnd;
}
