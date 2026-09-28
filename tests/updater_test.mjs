import test from 'node:test';
import assert from 'node:assert';
import { parseVersion, isNewerVersion, getBestAssetForPlatform, isDevEnvironment } from '../Web/src/updater.ts';

test('Comparación de versiones semánticas', () => {
    assert.strictEqual(isNewerVersion('v0.0.7', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('0.1.0', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('1.0.0', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('v0.0.6', '0.0.6'), false);
    assert.strictEqual(isNewerVersion('0.0.5', '0.0.6'), false);
    assert.strictEqual(isNewerVersion('0.0.6.1', '0.0.6'), true);
});

test('Selección óptima de binarios por plataforma (Windows)', () => {
    const assets = [
        { name: 'EduSchedule_0.0.7.msi', browser_download_url: 'http://example.com/msi' },
        { name: 'EduSchedule_0.0.7_x64-setup.exe', browser_download_url: 'http://example.com/setup' },
        { name: 'EduSchedule_0.0.7_amd64.AppImage', browser_download_url: 'http://example.com/appimage' }
    ];

    const bestWin = getBestAssetForPlatform(assets, 'win32');
    assert.strictEqual(bestWin.name, 'EduSchedule_0.0.7_x64-setup.exe');
});

test('Selección óptima de binarios por plataforma (Linux)', () => {
    const assets = [
        { name: 'EduSchedule_0.0.7_x64-setup.exe', browser_download_url: 'http://example.com/setup' },
        { name: 'EduSchedule_0.0.7_amd64.deb', browser_download_url: 'http://example.com/deb' },
        { name: 'EduSchedule_0.0.7_amd64.AppImage', browser_download_url: 'http://example.com/appimage' }
    ];

    const bestLinux = getBestAssetForPlatform(assets, 'linux');
    assert.strictEqual(bestLinux.name, 'EduSchedule_0.0.7_amd64.AppImage');
});

test('isDevEnvironment - Test 1 (Happy Path): Detecta correctamente entornos de desarrollo local', () => {
    const originalWindow = globalThis.window;
    try {
        // Localhost
        globalThis.window = { location: { hostname: 'localhost' } };
        assert.strictEqual(isDevEnvironment(), true);

        // 127.0.0.1
        globalThis.window = { location: { hostname: '127.0.0.1' } };
        assert.strictEqual(isDevEnvironment(), true);

        // Host vacío
        globalThis.window = { location: { hostname: '' } };
        assert.strictEqual(isDevEnvironment(), true);

        // IP red local 192.168.x.x
        globalThis.window = { location: { hostname: '192.168.1.50' } };
        assert.strictEqual(isDevEnvironment(), true);
    } finally {
        globalThis.window = originalWindow;
    }
});

test('isDevEnvironment - Test 2 (Edge Case): Identifica dominios de producción e infraestructuras Tauri', () => {
    const originalWindow = globalThis.window;
    try {
        // Dominio web de producción
        globalThis.window = { location: { hostname: 'horarios.colegio.es' } };
        assert.strictEqual(isDevEnvironment(), false);

        // IP de producción no local
        globalThis.window = { location: { hostname: '10.0.0.1' } };
        assert.strictEqual(isDevEnvironment(), false);

        // Entorno Tauri Desktop con __TAURI__
        globalThis.window = {
            location: { hostname: 'localhost' },
            __TAURI__: {}
        };
        assert.strictEqual(isDevEnvironment(), false);

        // Entorno Tauri Desktop con __TAURI_INTERNALS__
        globalThis.window = {
            location: { hostname: 'localhost' },
            __TAURI_INTERNALS__: {}
        };
        assert.strictEqual(isDevEnvironment(), false);

        // Entorno Tauri Desktop con __TAURI_METADATA__
        globalThis.window = {
            location: { hostname: 'localhost' },
            __TAURI_METADATA__: {}
        };
        assert.strictEqual(isDevEnvironment(), false);
    } finally {
        globalThis.window = originalWindow;
    }
});
