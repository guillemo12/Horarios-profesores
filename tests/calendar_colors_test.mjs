import test from 'node:test';
import assert from 'node:assert/strict';

const SUBJECT_PALETTE = [
    '#4f46e5', '#0284c7', '#059669', '#d97706', '#dc2626', '#7c3aed',
    '#db2777', '#2563eb', '#0d9488', '#ca8a04', '#ea580c', '#e11d48',
    '#9333ea', '#16a34a'
];

function getSubjectColor(subjectId) {
    if (!subjectId) return '#4f46e5';
    let hash = 0;
    for (let i = 0; i < subjectId.length; i++) {
        hash = subjectId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const idx = Math.abs(hash) % SUBJECT_PALETTE.length;
    return SUBJECT_PALETTE[idx];
}

function generateHSLColor(name) {
    if (!name || typeof name !== 'string') return '#4f46e5';
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

// -------------------------------------------------------------
// 1. getSubjectColor - Mínimo 2 Tests
// -------------------------------------------------------------
test('getSubjectColor - Test 1 (Happy Path): Devuelve un color consistente y determinista para cada asignatura', () => {
    const color1 = getSubjectColor('subj-matematicas');
    const color2 = getSubjectColor('subj-matematicas');
    const color3 = getSubjectColor('subj-lengua');

    assert.ok(SUBJECT_PALETTE.includes(color1));
    assert.equal(color1, color2, 'El color debe ser estrictamente determinista para el mismo ID');
    assert.ok(typeof color3 === 'string' && color3.startsWith('#'));
});

test('getSubjectColor - Test 2 (Edge Case): Maneja IDs nulos, vacíos o indefinidos con el color por defecto', () => {
    assert.equal(getSubjectColor(null), '#4f46e5');
    assert.equal(getSubjectColor(undefined), '#4f46e5');
    assert.equal(getSubjectColor(''), '#4f46e5');
});

// -------------------------------------------------------------
// 2. generateHSLColor - Mínimo 2 Tests
// -------------------------------------------------------------
test('generateHSLColor - Test 1 (Happy Path): Genera formato HSL válido con matiz (hue) bien acotado [0-359]', () => {
    const hsl = generateHSLColor('Profesor García');
    assert.match(hsl, /^hsl\(\d{1,3},\s*65%,\s*45%\)$/);
    const hue = parseInt(hsl.match(/^hsl\((\d+)/)[1], 10);
    assert.ok(hue >= 0 && hue < 360);
});

test('generateHSLColor - Test 2 (Edge Case): Retorna fallback seguro ante entradas no string o vacías', () => {
    assert.equal(generateHSLColor(null), '#4f46e5');
    assert.equal(generateHSLColor(''), '#4f46e5');
    assert.equal(generateHSLColor(12345), '#4f46e5');
    assert.equal(generateHSLColor({}), '#4f46e5');
});
