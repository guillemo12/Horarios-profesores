import test from 'node:test';
import assert from 'node:assert/strict';

function isDatabaseFileValid(fileName) {
    if (!fileName || typeof fileName !== 'string') return false;
    const lower = fileName.toLowerCase().trim();
    return lower.endsWith('.db') || lower.endsWith('.sqlite');
}

function generateBackupFilename(date = new Date()) {
    const isoDate = date.toISOString().split('T')[0];
    return `EduSchedule_Backup_${isoDate}.db`;
}

// -------------------------------------------------------------
// 1. isDatabaseFileValid - 2+ Tests
// -------------------------------------------------------------
test('isDatabaseFileValid - Test 1 (Happy Path): Valida archivos con extensión .db y .sqlite en mayúsculas o minúsculas', () => {
    assert.strictEqual(isDatabaseFileValid('colegio.db'), true);
    assert.strictEqual(isDatabaseFileValid('backup_2026.sqlite'), true);
    assert.strictEqual(isDatabaseFileValid('COLEGIO.DB'), true);
    assert.strictEqual(isDatabaseFileValid('backup.SQLITE'), true);
});

test('isDatabaseFileValid - Test 2 (Edge Case): Rechaza nombres de archivo no válidos, nulos o extensiones incorrectas', () => {
    assert.strictEqual(isDatabaseFileValid('archivo.txt'), false);
    assert.strictEqual(isDatabaseFileValid('documento.pdf'), false);
    assert.strictEqual(isDatabaseFileValid(''), false);
    assert.strictEqual(isDatabaseFileValid(null), false);
    assert.strictEqual(isDatabaseFileValid(undefined), false);
});

// -------------------------------------------------------------
// 2. generateBackupFilename - 2+ Tests
// -------------------------------------------------------------
test('generateBackupFilename - Test 1 (Happy Path): Genera un nombre estructurado con la fecha proporcionada', () => {
    const testDate = new Date('2026-08-19T12:00:00Z');
    const filename = generateBackupFilename(testDate);
    assert.strictEqual(filename, 'EduSchedule_Backup_2026-08-19.db');
});

test('generateBackupFilename - Test 2 (Edge Case): Genera nombre válido por defecto cuando no se pasa fecha', () => {
    const filename = generateBackupFilename();
    assert.ok(filename.startsWith('EduSchedule_Backup_'));
    assert.ok(filename.endsWith('.db'));
});
