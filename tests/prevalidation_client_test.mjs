import test from 'node:test';
import assert from 'node:assert/strict';

function evaluatePrevalidationSummary(checks) {
    if (!Array.isArray(checks) || checks.length === 0) {
        return { isViable: false, errorCount: 0, warnCount: 0, okCount: 0, message: 'NO_CHECKS_AVAILABLE' };
    }
    const errorCount = checks.filter(c => (c.status || '').toLowerCase() === 'error').length;
    const warnCount = checks.filter(c => (c.status || '').toLowerCase() === 'warning').length;
    const okCount = checks.filter(c => (c.status || '').toLowerCase() === 'ok').length;

    const isViable = errorCount === 0;
    return {
        isViable,
        errorCount,
        warnCount,
        okCount,
        message: isViable ? 'VIABLE' : 'UNFEASIBLE'
    };
}

function sortChecksBySeverity(checks) {
    if (!Array.isArray(checks)) return [];
    const order = { error: 0, warning: 1, ok: 2 };
    return [...checks].sort((a, b) => {
        const statusA = (a.status || 'ok').toLowerCase();
        const statusB = (b.status || 'ok').toLowerCase();
        return (order[statusA] ?? 2) - (order[statusB] ?? 2);
    });
}

// -------------------------------------------------------------
// 1. evaluatePrevalidationSummary - Mínimo 2 Tests
// -------------------------------------------------------------
test('evaluatePrevalidationSummary - Test 1 (Happy Path): Calcula correctamente conteo y viabilidad con todos los checks OK', () => {
    const checks = [
        { name: 'Disponibilidad Docente', status: 'ok' },
        { name: 'Carga Lectiva Grupal', status: 'ok' },
        { name: 'Especialidades', status: 'ok' }
    ];
    const summary = evaluatePrevalidationSummary(checks);
    assert.equal(summary.isViable, true);
    assert.equal(summary.errorCount, 0);
    assert.equal(summary.okCount, 3);
    assert.equal(summary.message, 'VIABLE');
});

test('evaluatePrevalidationSummary - Test 2 (Edge Case): Detecta inviabilidad si existe al menos un error y maneja arrays vacíos', () => {
    const checksWithErrors = [
        { name: 'Disponibilidad Docente', status: 'ok' },
        { name: 'Carga Lectiva Grupal', status: 'error' },
        { name: 'Especialidades', status: 'warning' }
    ];
    const summaryError = evaluatePrevalidationSummary(checksWithErrors);
    assert.equal(summaryError.isViable, false);
    assert.equal(summaryError.errorCount, 1);
    assert.equal(summaryError.warnCount, 1);
    assert.equal(summaryError.okCount, 1);

    const emptySummary = evaluatePrevalidationSummary([]);
    assert.equal(emptySummary.isViable, false);
    assert.equal(emptySummary.message, 'NO_CHECKS_AVAILABLE');
});

// -------------------------------------------------------------
// 2. sortChecksBySeverity - Mínimo 2 Tests
// -------------------------------------------------------------
test('sortChecksBySeverity - Test 1 (Happy Path): Ordena colocando errores primero, luego warnings y finalmente ok', () => {
    const raw = [
        { name: 'C1', status: 'ok' },
        { name: 'C2', status: 'error' },
        { name: 'C3', status: 'warning' }
    ];
    const sorted = sortChecksBySeverity(raw);
    assert.equal(sorted[0].name, 'C2');
    assert.equal(sorted[1].name, 'C3');
    assert.equal(sorted[2].name, 'C1');
});

test('sortChecksBySeverity - Test 2 (Edge Case): Maneja estados en mayúsculas, desconocidos o arrays vacíos', () => {
    const mixed = [
        { name: 'C1', status: 'OK' },
        { name: 'C2', status: 'ERROR' },
        { name: 'C3', status: 'UNKNOWN' }
    ];
    const sorted = sortChecksBySeverity(mixed);
    assert.equal(sorted[0].name, 'C2'); // Error primero
    assert.equal(sorted.length, 3);
    assert.deepEqual(sortChecksBySeverity(null), []);
});
