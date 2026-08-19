import test from 'node:test';
import assert from 'node:assert/strict';

function validateSettingsPayload(config) {
    if (!config || typeof config !== 'object') {
        return { isValid: false, errors: ['CONFIG_NULL_OR_INVALID'] };
    }
    const errors = [];

    if (typeof config.tiempoMinimo !== 'number' || config.tiempoMinimo <= 0) {
        errors.push('INVALID_TIEMPO_MINIMO');
    }
    if (typeof config.tiempoMaximo !== 'number' || config.tiempoMaximo < config.tiempoMinimo) {
        errors.push('INVALID_TIEMPO_MAXIMO_LESS_THAN_MINIMO');
    }
    if (typeof config.minutosMaximosProfesor !== 'number' || config.minutosMaximosProfesor <= 0) {
        errors.push('INVALID_MINUTOS_MAXIMOS');
    }
    if (typeof config.duracionRecreo !== 'number' || config.duracionRecreo < 0) {
        errors.push('INVALID_RECREO_DURACION');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

function sanitizeSettingsPayload(raw) {
    return {
        priorizarTutor: Boolean(raw?.priorizarTutor),
        tiempoMinimo: Number(raw?.tiempoMinimo) || 30,
        tiempoMaximo: Number(raw?.tiempoMaximo) || 60,
        minutosMaximosProfesor: Number(raw?.minutosMaximosProfesor) || 1500,
        priorizarTutorPuntos: Number(raw?.priorizarTutorPuntos) || 100,
        fomentarBloques60Puntos: Number(raw?.fomentarBloques60Puntos) || 10,
        minimizarAsignaturasDistintas: raw?.minimizarAsignaturasDistintas ?? true,
        minimizarAsignaturasPuntos: Number(raw?.minimizarAsignaturasPuntos) || 50,
        limiteTiempoSegundos: Number(raw?.limiteTiempoSegundos) || 18000.0,
        tiempoEstancamientoSegundos: Number(raw?.tiempoEstancamientoSegundos) || 60.0,
        horaInicioClases: raw?.horaInicioClases || "09:00",
        horaFinClases: raw?.horaFinClases || "14:00",
        horaInicioRecreo: raw?.horaInicioRecreo || "12:00",
        duracionRecreo: Number(raw?.duracionRecreo) || 30,
        respetarEspecialidad: raw?.respetarEspecialidad ?? true,
        respetarLimiteHoras: raw?.respetarLimiteHoras ?? true,
        respetarDisponibilidad: raw?.respetarDisponibilidad ?? true
    };
}

// -------------------------------------------------------------
// 1. validateSettingsPayload - Mínimo 2 Tests
// -------------------------------------------------------------
test('validateSettingsPayload - Test 1 (Happy Path): Valida configuración con parámetros lógicos y correctos', () => {
    const validConfig = {
        tiempoMinimo: 30,
        tiempoMaximo: 60,
        minutosMaximosProfesor: 1500,
        duracionRecreo: 30
    };
    const result = validateSettingsPayload(validConfig);
    assert.equal(result.isValid, true);
    assert.equal(result.errors.length, 0);
});

test('validateSettingsPayload - Test 2 (Edge Case): Detecta tiempo máximo inferior al mínimo o valores nulos', () => {
    const invalidConfig = {
        tiempoMinimo: 60,
        tiempoMaximo: 30, // Inválido: max < min
        minutosMaximosProfesor: -10, // Inválido
        duracionRecreo: -5
    };
    const result = validateSettingsPayload(invalidConfig);
    assert.equal(result.isValid, false);
    assert.ok(result.errors.includes('INVALID_TIEMPO_MAXIMO_LESS_THAN_MINIMO'));
    assert.ok(result.errors.includes('INVALID_MINUTOS_MAXIMOS'));
    assert.ok(result.errors.includes('INVALID_RECREO_DURACION'));

    const nullResult = validateSettingsPayload(null);
    assert.equal(nullResult.isValid, false);
});

// -------------------------------------------------------------
// 2. sanitizeSettingsPayload - Mínimo 2 Tests
// -------------------------------------------------------------
test('sanitizeSettingsPayload - Test 1 (Happy Path): Transforma valores limpios y asegura tipos numéricos y booleanos', () => {
    const sanitized = sanitizeSettingsPayload({
        tiempoMinimo: '30',
        tiempoMaximo: '60',
        priorizarTutor: true
    });
    assert.strictEqual(sanitized.tiempoMinimo, 30);
    assert.strictEqual(sanitized.tiempoMaximo, 60);
    assert.strictEqual(sanitized.priorizarTutor, true);
    assert.strictEqual(sanitized.horaInicioClases, '09:00');
});

test('sanitizeSettingsPayload - Test 2 (Edge Case): Provee valores seguros por defecto ante payload vacío o nulo', () => {
    const defaultObj = sanitizeSettingsPayload(null);
    assert.strictEqual(defaultObj.tiempoMinimo, 30);
    assert.strictEqual(defaultObj.tiempoMaximo, 60);
    assert.strictEqual(defaultObj.minutosMaximosProfesor, 1500);
    assert.strictEqual(defaultObj.horaInicioRecreo, '12:00');
    assert.strictEqual(defaultObj.duracionRecreo, 30);
});
