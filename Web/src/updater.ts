import { showToast } from './utils';

export const CURRENT_VERSION = "0.0.6";
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

function getBestAssetForPlatform(assets: GitHubReleaseAsset[]): GitHubReleaseAsset | null {
    if (!assets || assets.length === 0) return null;

    const isWin = navigator.userAgent.includes('Windows') || navigator.platform.includes('Win');
    const isLinux = navigator.userAgent.includes('Linux');

    if (isWin) {
        // Priorizar el instalador setup.exe o el exe único
        const nsis = assets.find(a => a.name.endsWith('-setup.exe'));
        if (nsis) return nsis;
        const exeUnico = assets.find(a => a.name.includes('Unico') && a.name.endsWith('.exe'));
        if (exeUnico) return exeUnico;
        const exe = assets.find(a => a.name.endsWith('.exe'));
        if (exe) return exe;
        const msi = assets.find(a => a.name.endsWith('.msi'));
        if (msi) return msi;
    }

    if (isLinux) {
        const appImage = assets.find(a => a.name.endsWith('.AppImage'));
        if (appImage) return appImage;
        const deb = assets.find(a => a.name.endsWith('.deb'));
        if (deb) return deb;
    }

    return assets[0] || null;
}

export function isDevEnvironment(): boolean {
    // Si corre dentro del contenedor de escritorio de Tauri (producción desktop)
    const isTauri = typeof window !== 'undefined' && (
        '__TAURI__' in window || 
        '__TAURI_INTERNALS__' in window || 
        '__TAURI_METADATA__' in window
    );
    if (isTauri) return false;

    // En navegador web directo / localhost / desarrollo
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '' || host.startsWith('192.168.');
}

export async function checkForUpdates(silent: boolean = false): Promise<void> {
    // En desarrollo no saltar avisos de actualización
    if (isDevEnvironment()) {
        if (!silent) {
            showToast("Modo Desarrollo", "Los avisos de actualización están desactivados en entorno de desarrollo.", "info");
        }
        return;
    }

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

    const bestAsset = getBestAssetForPlatform(release.assets);

    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden transition-all transform scale-100">
            <div class="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-5 text-white flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
                        🚀
                    </div>
                    <div>
                        <h3 class="font-bold text-lg leading-tight">¡Nueva versión disponible!</h3>
                        <p class="text-xs text-indigo-100 font-medium">v${CURRENT_VERSION} ➔ <span class="font-bold text-white">${release.tag_name}</span></p>
                    </div>
                </div>
                <button onclick="document.getElementById('modal-update-dialog')?.remove()" class="text-white/80 hover:text-white text-2xl leading-none font-bold cursor-pointer transition-colors">&times;</button>
            </div>
            
            <div class="p-6 space-y-4">
                <div>
                    <h4 class="font-semibold text-slate-800 text-sm mb-1.5">${release.name || release.tag_name}</h4>
                    <div class="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-600 max-h-44 overflow-y-auto whitespace-pre-wrap font-sans leading-relaxed">
                        ${release.body || 'Se han incluido mejoras de rendimiento, estabilidad y nuevas funciones.'}
                    </div>
                </div>

                <div id="update-action-container" class="pt-2">
                    <button id="btn-trigger-update" class="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <span>⚡ Actualizar Ahora</span>
                    </button>
                    <p class="text-center text-[11px] text-slate-400 mt-2">
                        Se descargará e instalará automáticamente la nueva versión.
                    </p>
                </div>

                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button onclick="document.getElementById('modal-update-dialog')?.remove()" class="px-3.5 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-medium transition-colors cursor-pointer">
                        Recordar más tarde
                    </button>
                    <a href="${release.html_url}" target="_blank" class="text-xs text-indigo-600 hover:text-indigo-800 font-medium hover:underline flex items-center gap-1">
                        Ver notas completas en GitHub ↗
                    </a>
                </div>
            </div>
        </div>
    `;

    const updateBtn = document.getElementById('btn-trigger-update');
    if (updateBtn && bestAsset) {
        updateBtn.addEventListener('click', async () => {
            await performOneClickUpdate(bestAsset, release);
        });
    } else if (updateBtn) {
        updateBtn.addEventListener('click', () => {
            window.open(release.html_url, '_blank');
        });
    }
}

async function performOneClickUpdate(asset: GitHubReleaseAsset, release: GitHubRelease): Promise<void> {
    const container = document.getElementById('update-action-container');
    if (!container) return;

    container.innerHTML = `
        <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center space-y-3">
            <div class="flex items-center justify-center gap-3">
                <svg class="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span class="font-semibold text-xs text-indigo-900" id="update-status-text">Descargando actualización (${asset.name})...</span>
            </div>
            <div class="w-full bg-indigo-200/60 rounded-full h-2 overflow-hidden">
                <div class="bg-indigo-600 h-2 rounded-full animate-pulse w-full"></div>
            </div>
            <p class="text-[11px] text-indigo-600/80">Por favor, espere. El programa se reiniciará automáticamente al terminar.</p>
        </div>
    `;

    try {
        const response = await fetch('/api/v1/system/update/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                downloadUrl: asset.browser_download_url,
                fileName: asset.name
            })
        });

        if (response.ok) {
            const statusText = document.getElementById('update-status-text');
            if (statusText) {
                statusText.innerText = "¡Descarga completa! Iniciando instalador...";
            }
            showToast("Actualización", "La aplicación se está reiniciando con la nueva versión.", "success");
        } else {
            throw new Error(`Servidor devolvió status ${response.status}`);
        }
    } catch (err) {
        console.error("Error al ejecutar actualización de un clic:", err);
        showToast("Error de actualización", "No se pudo actualizar automáticamente. Abriendo descarga directa.", "warning");
        container.innerHTML = `
            <div class="space-y-2">
                <p class="text-xs text-rose-600 font-medium text-center">No se pudo completar automáticamente. Puede descargar el instalador directamente:</p>
                <a href="${asset.browser_download_url}" target="_blank" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow transition-colors flex items-center justify-center gap-2">
                    ⬇️ Descargar ${asset.name}
                </a>
            </div>
        `;
    }
}
