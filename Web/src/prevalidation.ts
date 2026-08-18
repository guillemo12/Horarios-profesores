import { AppData } from './Datos';
import { PrevalidationResult, PrevalidationCheck } from './types';

const STATUS_ICONS: Record<string, string> = {
    ok: `<svg class="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    warning: `<svg class="w-5 h-5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`,
    error: `<svg class="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
};

const STATUS_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    ok: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800', badge: 'bg-emerald-100 text-emerald-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-700' },
    error: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'bg-red-100 text-red-700' }
};

function renderCheck(check: PrevalidationCheck): string {
    const status = (check.status || 'ok').toLowerCase();
    const colors = STATUS_COLORS[status] || STATUS_COLORS.ok;
    const icon = STATUS_ICONS[status] || STATUS_ICONS.ok;
    
    const detailsHtml = check.details && check.details.length > 0
        ? `<div class="mt-2.5 pt-2 border-t border-red-200/60 space-y-1.5">
            <div class="text-[11px] font-bold uppercase tracking-wider ${colors.text} opacity-90">Detalles del conflicto (${check.details.length}):</div>
            <ul class="space-y-1 text-xs text-gray-700">
                ${check.details.map(d => `<li class="flex items-start gap-1.5 leading-relaxed bg-white/70 p-2 rounded border border-red-100"><span class="text-red-500 font-bold">•</span><span class="flex-1">${d}</span></li>`).join('')}
            </ul>
           </div>`
        : '';

    return `
        <div class="p-3.5 rounded-xl ${colors.bg} border ${colors.border} transition-all duration-200 shadow-sm">
            <div class="flex items-start gap-3">
                ${icon}
                <div class="flex-1 min-w-0">
                    <div class="flex items-center justify-between gap-2">
                        <div class="font-bold text-sm ${colors.text}">${check.name}</div>
                        <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full ${colors.badge} uppercase tracking-wider">${status}</span>
                    </div>
                    <div class="text-xs text-gray-600 mt-1">${check.message}</div>
                    ${detailsHtml}
                </div>
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

        // Normalizar estados
        const errorCount = result.checks.filter(c => (c.status || '').toLowerCase() === 'error').length;
        const warnCount = result.checks.filter(c => (c.status || '').toLowerCase() === 'warning').length;
        const okCount = result.checks.filter(c => (c.status || '').toLowerCase() === 'ok').length;

        if (result.viable && errorCount === 0) {
            summary.innerHTML = `
                <div class="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                    ${STATUS_ICONS.ok}
                    <div>
                        <div class="text-emerald-800 font-bold text-sm">Plantilla Viable — Todos los chequeos superados</div>
                        <div class="text-xs text-emerald-600 mt-0.5">El sistema puede generar los horarios sin conflictos estructurales.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">${okCount} OK</span>
                </div>
            `;
        } else {
            summary.innerHTML = `
                <div class="flex items-center gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
                    ${STATUS_ICONS.error}
                    <div>
                        <div class="text-red-800 font-bold text-sm">Inviabilidad Detectada — ${errorCount} chequeo(s) con errores</div>
                        <div class="text-xs text-red-600 mt-0.5">Corrige los puntos señalados abajo para asegurar la viabilidad.</div>
                    </div>
                    <span class="ml-auto text-xs font-semibold px-2.5 py-1 bg-red-100 text-red-800 rounded-full">${errorCount} Error${errorCount !== 1 ? 'es' : ''}</span>
                </div>
            `;
        }

        // Renderizar checks (errores primero, luego warnings, luego ok)
        const sorted = [...result.checks].sort((a, b) => {
            const order: Record<string, number> = { error: 0, warning: 1, ok: 2 };
            const statusA = (a.status || 'ok').toLowerCase();
            const statusB = (b.status || 'ok').toLowerCase();
            return (order[statusA] ?? 2) - (order[statusB] ?? 2);
        });

        body.innerHTML = sorted.map(renderCheck).join('');
    } catch (err) {
        body.innerHTML = `
            <div class="text-center py-8 text-red-500">
                <p class="font-bold">Error al ejecutar el diagnóstico</p>
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
