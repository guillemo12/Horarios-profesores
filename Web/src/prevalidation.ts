import { AppData } from './Datos';
import { PrevalidationResult, PrevalidationCheck } from './types';

const STATUS_ICONS: Record<string, string> = {
    ok: `<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    warning: `<svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    error: `<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    ok: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }
};

function renderCheck(check: PrevalidationCheck): string {
    const colors = STATUS_COLORS[check.status] || STATUS_COLORS.ok;
    const detailsHtml = check.details.length > 0
        ? `<ul class="mt-2 ml-6 space-y-0.5 text-xs ${colors.text} opacity-80">${check.details.map(d => `<li class="list-disc">${d}</li>`).join('')}</ul>`
        : '';

    return `
        <div class="flex items-start gap-3 p-3 rounded-lg ${colors.bg} border ${colors.border} transition-all duration-200">
            ${STATUS_ICONS[check.status] || STATUS_ICONS.ok}
            <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm ${colors.text}">${check.name}</div>
                <div class="text-xs text-gray-600 mt-0.5">${check.message}</div>
                ${detailsHtml}
            </div>
        </div>
    `;
}

export async function runPrevalidation(): Promise<void> {
    const modal = document.getElementById('prevalidation-modal');
    const body = document.getElementById('prevalidation-body');
    const summary = document.getElementById('prevalidation-summary');
    if (!modal || !body || !summary) return;

    // Mostrar modal con loading
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    body.innerHTML = `
        <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <span class="ml-3 text-gray-500 text-sm">Analizando viabilidad...</span>
        </div>
    `;
    summary.innerHTML = '';

    try {
        const result: PrevalidationResult = await AppData.API.getPrevalidation();

        // Renderizar resumen
        const errorCount = result.checks.filter(c => c.status === 'error').length;
        const warnCount = result.checks.filter(c => c.status === 'warning').length;
        const okCount = result.checks.filter(c => c.status === 'ok').length;

        if (result.viable) {
            summary.innerHTML = `
                <div class="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    ${STATUS_ICONS.ok}
                    <span class="text-emerald-700 font-bold text-sm">Viable — Todos los chequeos superados</span>
                    <span class="ml-auto text-xs text-emerald-600">${okCount} ok${warnCount > 0 ? `, ${warnCount} avisos` : ''}</span>
                </div>
            `;
        } else {
            summary.innerHTML = `
                <div class="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    ${STATUS_ICONS.error}
                    <span class="text-red-700 font-bold text-sm">No viable — Hay ${errorCount} error(es) que impiden generar un horario correcto</span>
                    <span class="ml-auto text-xs text-red-600">${errorCount} errores, ${warnCount} avisos</span>
                </div>
            `;
        }

        // Renderizar checks (errores primero, luego warnings, luego ok)
        const sorted = [...result.checks].sort((a, b) => {
            const order: Record<string, number> = { error: 0, warning: 1, ok: 2 };
            return (order[a.status] ?? 2) - (order[b.status] ?? 2);
        });

        body.innerHTML = sorted.map(renderCheck).join('');
    } catch (err) {
        body.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">Error al ejecutar la pre-validación</p>
                <p class="text-sm text-gray-500 mt-1">${err}</p>
            </div>
        `;
    }
}

export function closePrevalidation(): void {
    const modal = document.getElementById('prevalidation-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}
