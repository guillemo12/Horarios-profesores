import test from 'node:test';
import assert from 'node:assert';
import {
    CURRENT_VERSION,
    GITHUB_REPO,
    parseVersion,
    isNewerVersion,
    getBestAssetForPlatform,
    isDevEnvironment,
    checkForUpdates,
    showUpdateModal
} from '../Web/src/updater.ts';

test('parseVersion: parsing y saneamiento de versiones', () => {
    assert.deepStrictEqual(parseVersion('0.0.6'), [0, 0, 6]);
    assert.deepStrictEqual(parseVersion('v0.0.7'), [0, 0, 7]);
    assert.deepStrictEqual(parseVersion('  V1.2.3  '), [1, 2, 3]);
    assert.deepStrictEqual(parseVersion('1.0.0.1'), [1, 0, 0, 1]);
    assert.deepStrictEqual(parseVersion('2.x.3'), [2, 0, 3]);
    assert.deepStrictEqual(parseVersion(''), [0]);
});

test('isNewerVersion: comparación de versiones semánticas y casos límite', () => {
    // Versiones más recientes
    assert.strictEqual(isNewerVersion('v0.0.7', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('0.1.0', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('1.0.0', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('0.0.6.1', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('0.1', '0.0.6'), true);

    // Misma versión o versiones anteriores
    assert.strictEqual(isNewerVersion('v0.0.6', '0.0.6'), false);
    assert.strictEqual(isNewerVersion('0.0.5', '0.0.6'), false);
    assert.strictEqual(isNewerVersion('0.0.6', '0.0.6.1'), false);

    // Uso de CURRENT_VERSION como valor por defecto
    assert.strictEqual(isNewerVersion('v99.0.0'), true);
    assert.strictEqual(isNewerVersion('0.0.1'), false);
});

test('getBestAssetForPlatform: jerarquía de selección en Windows', () => {
    // Array vacío o nulo
    assert.strictEqual(getBestAssetForPlatform([], 'Windows', 'Win32'), null);

    const setupExe = { name: 'EduSchedule-0.0.7-setup.exe', browser_download_url: 'http://e.com/setup', size: 100 };
    const unicoExe = { name: 'EduSchedule_Unico.exe', browser_download_url: 'http://e.com/unico', size: 100 };
    const plainExe = { name: 'EduSchedule.exe', browser_download_url: 'http://e.com/exe', size: 100 };
    const msi = { name: 'EduSchedule.msi', browser_download_url: 'http://e.com/msi', size: 100 };
    const appImage = { name: 'EduSchedule.AppImage', browser_download_url: 'http://e.com/appimage', size: 100 };

    // 1. Debe priorizar -setup.exe sobre todos los demás
    const assetsWithSetup = [msi, plainExe, setupExe, unicoExe, appImage];
    assert.strictEqual(getBestAssetForPlatform(assetsWithSetup, 'Windows NT 10.0', 'Win32'), setupExe);

    // 2. Sin setup.exe, priorizar Unico.exe
    const assetsWithUnico = [msi, plainExe, unicoExe, appImage];
    assert.strictEqual(getBestAssetForPlatform(assetsWithUnico, 'Windows NT 10.0', 'Win32'), unicoExe);

    // 3. Sin Unico.exe, priorizar .exe estándar
    const assetsWithExe = [msi, plainExe, appImage];
    assert.strictEqual(getBestAssetForPlatform(assetsWithExe, 'Windows NT 10.0', 'Win32'), plainExe);

    // 4. Si solo hay .msi, selecciona .msi
    const assetsWithMsi = [msi, appImage];
    assert.strictEqual(getBestAssetForPlatform(assetsWithMsi, 'Windows NT 10.0', 'Win32'), msi);
});

test('getBestAssetForPlatform: jerarquía de selección en Linux y plataformas no conocidas', () => {
    const appImage = { name: 'EduSchedule.AppImage', browser_download_url: 'http://e.com/app', size: 100 };
    const deb = { name: 'EduSchedule.deb', browser_download_url: 'http://e.com/deb', size: 100 };
    const exe = { name: 'EduSchedule.exe', browser_download_url: 'http://e.com/exe', size: 100 };

    // Linux debe priorizar .AppImage sobre .deb
    assert.strictEqual(getBestAssetForPlatform([deb, appImage, exe], 'Linux x86_64', 'Linux'), appImage);
    assert.strictEqual(getBestAssetForPlatform([deb, exe], 'Linux x86_64', 'Linux'), deb);

    // En plataforma no reconocida (ej. macOS Darwin), retorna el primer activo
    assert.strictEqual(getBestAssetForPlatform([exe, deb], 'Macintosh; Intel Mac OS X', 'MacIntel'), exe);
});

test('isDevEnvironment: detección de entornos de desarrollo, producción y Tauri', () => {
    // Entornos de desarrollo por hostname
    assert.strictEqual(isDevEnvironment({ location: { hostname: 'localhost' } }), true);
    assert.strictEqual(isDevEnvironment({ location: { hostname: '127.0.0.1' } }), true);
    assert.strictEqual(isDevEnvironment({ location: { hostname: '' } }), true);
    assert.strictEqual(isDevEnvironment({ location: { hostname: '192.168.1.15' } }), true);

    // Entorno de producción en la web
    assert.strictEqual(isDevEnvironment({ location: { hostname: 'eduschedule.app' } }), false);

    // Entorno de producción Tauri (desktop app)
    assert.strictEqual(isDevEnvironment({ __TAURI__: {}, location: { hostname: 'localhost' } }), false);
    assert.strictEqual(isDevEnvironment({ __TAURI_INTERNALS__: {}, location: { hostname: 'localhost' } }), false);
    assert.strictEqual(isDevEnvironment({ __TAURI_METADATA__: {}, location: { hostname: 'localhost' } }), false);

    // Sin window
    assert.strictEqual(isDevEnvironment(null), true);
});

test('showUpdateModal: renderizado e integración con el DOM', () => {
    const elements = new Map();
    let appendedChild = null;

    // Simulación del DOM
    globalThis.document = {
        getElementById: (id) => elements.get(id) || null,
        createElement: (tag) => {
            const el = {
                id: '',
                className: '',
                innerHTML: '',
                addEventListener: () => {},
                appendChild: (c) => {}
            };
            return el;
        },
        body: {
            appendChild: (child) => {
                elements.set(child.id, child);
                appendedChild = child;
            }
        }
    };

    const dummyRelease = {
        tag_name: 'v0.0.7',
        name: 'Versión 0.0.7',
        body: 'Notas de la versión',
        html_url: 'https://github.com/guillemo12/Horarios-profesores/releases/tag/v0.0.7',
        published_at: '2026-08-17T00:00:00Z',
        assets: [{ name: 'EduSchedule-setup.exe', browser_download_url: 'https://example.com/download', size: 100 }]
    };

    showUpdateModal(dummyRelease);

    assert.ok(elements.has('modal-update-dialog'), 'El diálogo de actualización debe crearse en el DOM');
    assert.ok(appendedChild.innerHTML.includes('v0.0.7'), 'El modal debe incluir la etiqueta de la nueva versión');
    assert.ok(appendedChild.innerHTML.includes('Versión 0.0.7'), 'El modal debe incluir el nombre del release');
});

test('checkForUpdates: comportamiento en entorno de desarrollo y peticiones API simuladas', async () => {
    const originalFetch = globalThis.fetch;
    const toasts = [];

    // Mock del DOM básico para toasts
    const toastContainer = { appendChild: () => {} };
    globalThis.document = {
        getElementById: (id) => (id === 'toast-container' ? toastContainer : null),
        createElement: () => ({ classList: { add: () => {}, remove: () => {} }, innerHTML: '', appendChild: () => {} }),
        body: { appendChild: () => {} }
    };

    try {
        // 1. En entorno de desarrollo no debe consultar a GitHub
        let fetchCalled = false;
        globalThis.fetch = async () => {
            fetchCalled = true;
            return { ok: true, json: async () => ({}) };
        };

        // Simular ventana en localhost
        globalThis.window = { location: { hostname: 'localhost' } };

        await checkForUpdates(true); // silent = true
        assert.strictEqual(fetchCalled, false, 'No debe llamar a fetch en modo desarrollo');

        // 2. En entorno de producción (ej. Tauri o dominio externo)
        globalThis.window = { __TAURI__: {}, location: { hostname: 'localhost' } };

        let requestedUrl = '';
        globalThis.fetch = async (url) => {
            requestedUrl = url;
            return {
                ok: true,
                json: async () => ({
                    tag_name: 'v0.0.7',
                    name: 'Release 0.0.7',
                    body: 'Changelog',
                    html_url: 'http://example.com',
                    published_at: '2026-08-17',
                    assets: []
                })
            };
        };

        await checkForUpdates(true);
        assert.ok(requestedUrl.includes(`${GITHUB_REPO}/releases/latest`), 'Debe consultar la API de lanzamientos de GitHub');

    } finally {
        globalThis.fetch = originalFetch;
    }
});
