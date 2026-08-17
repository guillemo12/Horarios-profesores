import { showToast } from './utils';

export const CURRENT_VERSION = "0.0.5";
export const GITHUB_REPO = "guillemo12/Horarios-profesores";

export interface GitHubReleaseAsset {
    name: string;
    browser_download_url: string;
    size: number;
}

export interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    html_url: string;
    published_at: string;
    assets: GitHubReleaseAsset[];
}

function parseVersion(versionStr: string): number[] {
    const clean = versionStr.replace(/^v/, '').trim();
    return clean.split('.').map(n => parseInt(n, 10) || 0);
}

export function isNewerVersion(latestTag: string, currentVersion: string = CURRENT_VERSION): boolean {
    const latest = parseVersion(latestTag);
    const current = parseVersion(currentVersion);
    const maxLen = Math.max(latest.length, current.length);

    for (let i = 0; i < maxLen; i++) {
        const l = latest[i] ?? 0;
        const c = current[i] ?? 0;
        if (l > c) return true;
        if (l < c) return false;
    }
    return false;
}

export async function checkForUpdates(silent: boolean = false): Promise<void> {
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!res.ok) {
            if (!silent) {
                showToast("Actualizaciones", "No se encontró ningún release publicado en GitHub.", "warning");
            }
            return;
        }

        const release: GitHubRelease = await res.json();
        const hasUpdate = isNewerVersion(release.tag_name, CURRENT_VERSION);

        if (hasUpdate) {
            showUpdateModal(release);
        } else if (!silent) {
            showToast("Actualizado", `EduSchedule está al día (v${CURRENT_VERSION}).`, "success");
        }
    } catch (err) {
        console.error("Error al buscar actualizaciones:", err);
        if (!silent) {
            showToast("Error", "Error de red al consultar actualizaciones.", "error");
        }
    }
}

export function showUpdateModal(release: GitHubRelease): void {
    let modal = document.getElementById('modal-update-dialog');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-update-dialog';
        modal.className = 'fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4';
        document.body.appendChild(modal);
    }

    const winAssets = release.assets ? release.assets.filter(a => a.name.endsWith('.exe') || a.name.endsWith('.msi')) : [];
    const linuxAssets = release.assets ? release.assets.filter(a => a.name.endsWith('.AppImage') || a.name.endsWith('.deb') || a.name.endsWith('.tar.gz')) : [];

    let downloadButtons = `
        <a href="${release.html_url}" target="_blank" class="inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition-colors text-sm">
            Ver Release en GitHub
        </a>
    `;

    if (release.assets && release.assets.length > 0) {
        downloadButtons = `
            <div class="flex flex-wrap gap-2 w-full justify-end">
                ${winAssets.map(a => `
                    <a href="${a.browser_download_url}" target="_blank" class="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                        ⬇️ Windows (${a.name.split('_').pop() || a.name})
                    </a>
                `).join('')}
                ${linuxAssets.map(a => `
                    <a href="${a.browser_download_url}" target="_blank" class="inline-flex items-center px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors">
                        ⬇️ Linux (${a.name.split('_').pop() || a.name})
                    </a>
                `).join('')}
                <a href="${release.html_url}" target="_blank" class="inline-flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold rounded-lg shadow-sm transition-colors">
                    Ver todos
                </a>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 text-white flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-2xl">✨</span>
                    <div>
                        <h3 class="font-bold text-lg leading-tight">¡Nueva versión disponible!</h3>
                        <p class="text-xs text-indigo-100 font-medium">Versión actual: v${CURRENT_VERSION} ➔ Nueva: ${release.tag_name}</p>
                    </div>
                </div>
                <button onclick="document.getElementById('modal-update-dialog')?.remove()" class="text-white/80 hover:text-white text-xl leading-none font-bold cursor-pointer">&times;</button>
            </div>
            <div class="p-6 space-y-4">
                <div>
                    <h4 class="font-semibold text-slate-800 text-sm mb-1">${release.name || release.tag_name}</h4>
                    <div class="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono">
                        ${release.body || 'Sin notas de versión disponibles.'}
                    </div>
                </div>
                <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-3">
                    <button onclick="document.getElementById('modal-update-dialog')?.remove()" class="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer">
                        Cerrar
                    </button>
                    ${downloadButtons}
                </div>
            </div>
        </div>
    `;
}
