import test from 'node:test';
import assert from 'node:assert';

function parseVersion(versionStr) {
    const clean = versionStr.replace(/^v/, '').trim();
    return clean.split('.').map(n => parseInt(n, 10) || 0);
}

function isNewerVersion(latestTag, currentVersion = "0.0.6") {
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

function getBestAssetForPlatform(assets, platform = 'win32') {
    if (!assets || assets.length === 0) return null;

    if (platform === 'win32') {
        const nsis = assets.find(a => a.name.endsWith('-setup.exe'));
        if (nsis) return nsis;
        const exeUnico = assets.find(a => a.name.includes('Unico') && a.name.endsWith('.exe'));
        if (exeUnico) return exeUnico;
        const exe = assets.find(a => a.name.endsWith('.exe'));
        if (exe) return exe;
        const msi = assets.find(a => a.name.endsWith('.msi'));
        if (msi) return msi;
    }

    if (platform === 'linux') {
        const appImage = assets.find(a => a.name.endsWith('.AppImage'));
        if (appImage) return appImage;
        const deb = assets.find(a => a.name.endsWith('.deb'));
        if (deb) return deb;
    }

    return assets[0] || null;
}

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
