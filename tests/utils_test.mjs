import test from 'node:test';
import assert from 'node:assert/strict';

// Funciones puras e implementaciones para test en aislamiento ESM
function formatHours(h) {
    if (typeof h !== 'number' || isNaN(h)) return '0';
    return Number(h.toFixed(2)).toString();
}

function showToast(title, message, type = 'info', documentMock = null) {
    const doc = documentMock || globalThis.document;
    if (!doc) return;
    const container = doc.getElementById('toast-container');
    if (!container) return;

    const toast = doc.createElement('div');
    const bgClass = type === 'error' ? 'border-red-500 text-red-500'
        : (type === 'success' ? 'border-green-500 text-green-500'
        : (type === 'warning' ? 'border-yellow-500 text-yellow-500'
        : 'border-blue-500 text-blue-500'));

    toast.className = `bg-white border-l-4 ${bgClass} shadow-lg rounded-r-lg p-4 w-80 transform transition-all duration-300 translate-y-4 opacity-0 flex gap-3`;
    toast.innerHTML = `<div><h4 class="text-sm font-bold text-gray-800">${title}</h4><p class="text-xs text-gray-600 mt-1">${message}</p></div>`;

    container.appendChild(toast);
    return toast;
}

// -------------------------------------------------------------
// 1. formatHours - Mínimo 2 Tests
// -------------------------------------------------------------
test('formatHours - Test 1 (Happy Path): Formatea correctamente enteros y decimales con hasta 2 cifras', () => {
    assert.strictEqual(formatHours(0), '0');
    assert.strictEqual(formatHours(2), '2');
    assert.strictEqual(formatHours(1.5), '1.5');
    assert.strictEqual(formatHours(2.25), '2.25');
    assert.strictEqual(formatHours(1.333333), '1.33');
    assert.strictEqual(formatHours(2.666666), '2.67');
});

test('formatHours - Test 2 (Edge Case): Maneja valores flotantes con imprecisiones, negativos y valores no numéricos', () => {
    assert.strictEqual(formatHours(0.1 + 0.2), '0.3');
    assert.strictEqual(formatHours(-1.5), '-1.5');
    assert.strictEqual(formatHours(null), '0');
    assert.strictEqual(formatHours(undefined), '0');
    assert.strictEqual(formatHours('invalido'), '0');
    assert.strictEqual(formatHours(NaN), '0');
});

// -------------------------------------------------------------
// 2. showToast - Mínimo 2 Tests
// -------------------------------------------------------------
test('showToast - Test 1 (Happy Path): Agrega el toast al contenedor DOM con los estilos de tipo correctos', () => {
    const children = [];
    const container = { appendChild: (el) => children.push(el) };
    const mockDoc = {
        getElementById: (id) => (id === 'toast-container' ? container : null),
        createElement: (tag) => ({ className: '', innerHTML: '' })
    };

    const toastInfo = showToast('Título Info', 'Mensaje Info', 'info', mockDoc);
    assert.ok(toastInfo.className.includes('border-blue-500 text-blue-500'));
    assert.ok(toastInfo.innerHTML.includes('Título Info'));

    const toastSuccess = showToast('Éxito', 'Guardado', 'success', mockDoc);
    assert.ok(toastSuccess.className.includes('border-green-500 text-green-500'));

    const toastError = showToast('Error', 'Falló', 'error', mockDoc);
    assert.ok(toastError.className.includes('border-red-500 text-red-500'));

    assert.strictEqual(children.length, 3);
});

test('showToast - Test 2 (Edge Case): Retorna de forma segura y sin excepciones cuando no existe #toast-container o document', () => {
    const mockDocSinContenedor = {
        getElementById: () => null,
        createElement: () => ({})
    };

    // No debe lanzar error si falta el contenedor
    const resultado = showToast('Sin contenedor', 'Mensaje', 'info', mockDocSinContenedor);
    assert.strictEqual(resultado, undefined);

    // No debe lanzar error si document es nulo
    const resultadoNull = showToast('Sin doc', 'Mensaje', 'info', null);
    assert.strictEqual(resultadoNull, undefined);
});
