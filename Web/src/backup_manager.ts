import { AppData } from './Datos';
import { loadAllData } from './Datos';
import { loadSettings } from './settings';
import { refreshCalendarView } from './calendar';
import { updateEntitySelector } from './navigation';
import { showToast } from './utils';

export function isDatabaseFileValid(fileName: string | null | undefined): boolean {
    if (!fileName || typeof fileName !== 'string') return false;
    const lower = fileName.toLowerCase().trim();
    return lower.endsWith('.db') || lower.endsWith('.sqlite');
}

export function generateBackupFilename(date: Date = new Date()): string {
    const isoDate = date.toISOString().split('T')[0];
    return `EduSchedule_Backup_${isoDate}.db`;
}

export async function exportDatabase(): Promise<void> {
    try {
        showToast("Copia de Seguridad", "Preparando archivo de base de datos...", "info");
        const res = await fetch('/api/v1/system/database/export');
        if (!res.ok) {
            throw new Error(`Error en el servidor: ${res.statusText}`);
        }
        const blob = await res.blob();
        const disposition = res.headers.get('Content-Disposition');
        let filename = generateBackupFilename();
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

export async function handleImportDatabaseFile(input: HTMLInputElement): Promise<void> {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    input.value = '';

    if (!isDatabaseFileValid(file.name)) {
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
