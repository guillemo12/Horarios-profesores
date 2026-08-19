import { AppData } from './Datos';

export const SUBJECT_PALETTE = [
    '#4f46e5', // Indigo
    '#0284c7', // Sky Blue
    '#059669', // Emerald
    '#d97706', // Amber
    '#dc2626', // Red
    '#7c3aed', // Purple
    '#db2777', // Pink
    '#2563eb', // Blue
    '#0d9488', // Teal
    '#ca8a04', // Yellow
    '#ea580c', // Orange
    '#e11d48', // Rose
    '#9333ea', // Violet
    '#16a34a'  // Green
];

export function getSubjectColor(subjectId: string): string {
    if (!subjectId) return '#4f46e5';
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
        hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % SUBJECT_PALETTE.length;
    return SUBJECT_PALETTE[index];
}

export function generateHSLColor(name: string): string {
    if (!name || typeof name !== 'string') return '#4f46e5';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

export function toggleColorMode(onModeChanged?: () => void): void {
    if (!AppData.colorMode) AppData.colorMode = 'teacher';
    AppData.colorMode = AppData.colorMode === 'teacher' ? 'subject' : 'teacher';

    const buttonText = document.getElementById('btn-color-mode-text');
    if (buttonText) {
        buttonText.textContent = AppData.colorMode === 'teacher' ? 'Color: Profesor' : 'Color: Asignatura';
    }

    const buttonIcon = document.getElementById('btn-color-mode-icon');
    if (buttonIcon) {
        buttonIcon.textContent = AppData.colorMode === 'teacher' ? '🎨' : '📚';
    }

    if (typeof onModeChanged === 'function') {
        onModeChanged();
    }
}
