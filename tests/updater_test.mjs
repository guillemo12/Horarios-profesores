import test from 'node:test';
import assert from 'node:assert';
import { isNewerVersion, parseVersion, getBestAssetForPlatform, CURRENT_VERSION } from '../Web/src/updater.ts';

test('parseVersion: descompone cadenas de versión e ignora prefijos/espacios', () => {
    assert.deepStrictEqual(parseVersion('0.0.6'), [0, 0, 6]);
    assert.deepStrictEqual(parseVersion('v1.2.3'), [1, 2, 3]);
    assert.deepStrictEqual(parseVersion('  v2.1.0  '), [2, 1, 0]);
    assert.deepStrictEqual(parseVersion('1.0.0-beta.1'), [1, 0, 0, 1]);
    assert.deepStrictEqual(parseVersion(''), [0]);
});

test('isNewerVersion: incremento de parches, minor y major', () => {
    assert.strictEqual(isNewerVersion('0.0.7', '0.0.6'), true, '0.0.7 > 0.0.6 (Patch)');
    assert.strictEqual(isNewerVersion('0.1.0', '0.0.6'), true, '0.1.0 > 0.0.6 (Minor)');
    assert.strictEqual(isNewerVersion('1.0.0', '0.0.6'), true, '1.0.0 > 0.0.6 (Major)');
});

test('isNewerVersion: versiones idénticas o anteriores devuelven false', () => {
    assert.strictEqual(isNewerVersion('0.0.6', '0.0.6'), false, 'Misma versión exacta');
    assert.strictEqual(isNewerVersion('0.0.5', '0.0.6'), false, 'Parche anterior');
    assert.strictEqual(isNewerVersion('0.0.9', '0.1.0'), false, 'Minor anterior');
    assert.strictEqual(isNewerVersion('0.9.9', '1.0.0'), false, 'Major anterior');
});

test('isNewerVersion: tolera prefijo "v" y espacios en blanco', () => {
    assert.strictEqual(isNewerVersion('v0.0.7', '0.0.6'), true);
    assert.strictEqual(isNewerVersion('v0.0.7', 'v0.0.6'), true);
    assert.strictEqual(isNewerVersion('  v0.0.7  ', ' 0.0.6 '), true);
});

test('isNewerVersion: manejo de versiones con diferente cantidad de componentes', () => {
    assert.strictEqual(isNewerVersion('0.0.6.1', '0.0.6'), true, 'Sub-patch más reciente');
    assert.strictEqual(isNewerVersion('0.0.6', '0.0.6.1'), false, 'Sub-patch en versión actual');
    assert.strictEqual(isNewerVersion('0.0.6.0', '0.0.6'), false, 'Ceros a la derecha equivalentes');
    assert.strictEqual(isNewerVersion('1.0', '1.0.0'), false, '1.0 es equivalente a 1.0.0');
    assert.strictEqual(isNewerVersion('1.1', '1.0.5'), true, 'Versión corta más reciente');
    assert.strictEqual(isNewerVersion('1.0.0.0', '1.0'), false, 'Misma versión con ceros extra');
});

test('isNewerVersion: parámetro por defecto CURRENT_VERSION', () => {
    // CURRENT_VERSION es '0.0.6'
    assert.strictEqual(CURRENT_VERSION, '0.0.6');
    assert.strictEqual(isNewerVersion('0.0.7'), true);
    assert.strictEqual(isNewerVersion('0.0.5'), false);
    assert.strictEqual(isNewerVersion('0.0.6'), false);
});

test('isNewerVersion: casos de borde con cadenas vacías o no numéricas', () => {
    assert.strictEqual(isNewerVersion('', '0.0.6'), false, 'Etiqueta vacía');
    assert.strictEqual(isNewerVersion('invalid', '0.0.6'), false, 'Etiqueta invosible/no numérica');
    assert.strictEqual(isNewerVersion('2', '1.0.0'), true, 'Dígito único superior');
});

test('Selección óptima de binarios por plataforma (Windows)', () => {
    const assets = [
        { name: 'EduSchedule_0.0.7.msi', browser_download_url: 'http://example.com/msi', size: 1000 },
        { name: 'EduSchedule_0.0.7_x64-setup.exe', browser_download_url: 'http://example.com/setup', size: 1000 },
        { name: 'EduSchedule_0.0.7_amd64.AppImage', browser_download_url: 'http://example.com/appimage', size: 1000 }
    ];

    const bestWin = getBestAssetForPlatform(assets, 'win32');
    assert.ok(bestWin !== null);
    assert.strictEqual(bestWin.name, 'EduSchedule_0.0.7_x64-setup.exe');
});

test('Selección óptima de binarios por plataforma (Linux)', () => {
    const assets = [
        { name: 'EduSchedule_0.0.7_x64-setup.exe', browser_download_url: 'http://example.com/setup', size: 1000 },
        { name: 'EduSchedule_0.0.7_amd64.deb', browser_download_url: 'http://example.com/deb', size: 1000 },
        { name: 'EduSchedule_0.0.7_amd64.AppImage', browser_download_url: 'http://example.com/appimage', size: 1000 }
    ];

    const bestLinux = getBestAssetForPlatform(assets, 'linux');
    assert.ok(bestLinux !== null);
    assert.strictEqual(bestLinux.name, 'EduSchedule_0.0.7_amd64.AppImage');
});

test('Selección óptima de binarios: lista vacía o plataforma desconocida', () => {
    assert.strictEqual(getBestAssetForPlatform([]), null);

    const assets = [
        { name: 'EduSchedule_0.0.7.zip', browser_download_url: 'http://example.com/zip', size: 1000 }
    ];
    const fallback = getBestAssetForPlatform(assets, 'unknown_os');
    assert.strictEqual(fallback?.name, 'EduSchedule_0.0.7.zip');
});
