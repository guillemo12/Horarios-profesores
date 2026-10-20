import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeGreetName, greet, initGreetForm } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// 1. sanitizeGreetName - Mínimo 2 Tests
// -------------------------------------------------------------
test('sanitizeGreetName - Test 1 (Happy Path): Sanitiza espacios alrededor de un nombre válido', () => {
    assert.strictEqual(sanitizeGreetName('  EduSchedule  '), 'EduSchedule');
    assert.strictEqual(sanitizeGreetName('Juan'), 'Juan');
});

test('sanitizeGreetName - Test 2 (Caso Borde): Maneja valores nulos, indefinidos o vacíos de forma segura', () => {
    assert.strictEqual(sanitizeGreetName(''), '');
    assert.strictEqual(sanitizeGreetName('   '), '');
    assert.strictEqual(sanitizeGreetName(null), '');
    assert.strictEqual(sanitizeGreetName(undefined), '');
});

// -------------------------------------------------------------
// 2. greet - Mínimo 2 Tests
// -------------------------------------------------------------
test('greet - Test 1 (Happy Path): Retorna saludo invocando la API Tauri cuando el invoker responde correctamente', async () => {
    const mockInput = { value: '  Maria  ' };
    const mockMsg = { textContent: '' };
    const mockInvoker = async (cmd, args) => {
        assert.strictEqual(cmd, 'greet');
        assert.strictEqual(args.name, 'Maria');
        return `Hello, ${args.name}!`;
    };

    const res = await greet(mockInput, mockMsg, mockInvoker);
    assert.strictEqual(res, 'Hello, Maria!');
    assert.strictEqual(mockMsg.textContent, 'Hello, Maria!');
});

test('greet - Test 2 (Caso Borde): Maneja invocaciones fallidas o sin invoker sin lanzar excepciones no controladas', async () => {
    const mockInput = { value: '' };
    const mockMsg = { textContent: '' };

    // Fallback sin invoker
    const fallbackRes = await greet(mockInput, mockMsg, null);
    assert.strictEqual(fallbackRes, 'Hello!');
    assert.strictEqual(mockMsg.textContent, 'Hello!');

    // Manejo de errores lanzados por el invoker de Tauri
    const mockFailingInvoker = async () => {
        throw new Error('Tauri IPC disconnected');
    };
    const errorRes = await greet({ value: 'Pedro' }, mockMsg, mockFailingInvoker);
    assert.strictEqual(errorRes, 'Error: Tauri IPC disconnected');
    assert.strictEqual(mockMsg.textContent, 'Error: Tauri IPC disconnected');
});

// -------------------------------------------------------------
// 3. initGreetForm - Mínimo 2 Tests
// -------------------------------------------------------------
test('initGreetForm - Test 1 (Happy Path): Conecta los elementos del DOM y previene la acción por defecto al enviar el formulario', () => {
    let preventDefaultCalled = false;
    let customSubmitCalled = false;

    const mockForm = {
        addEventListener: (event, handler) => {
            if (event === 'submit') {
                handler({
                    preventDefault: () => { preventDefaultCalled = true; }
                });
            }
        }
    };

    const mockDoc = {
        querySelector: (selector) => {
            if (selector === '#greet-input') return { value: 'Test' };
            if (selector === '#greet-msg') return { textContent: '' };
            if (selector === '#greet-form') return mockForm;
            return null;
        }
    };

    initGreetForm(mockDoc, () => {
        customSubmitCalled = true;
    });

    assert.strictEqual(preventDefaultCalled, true);
    assert.strictEqual(customSubmitCalled, true);
});

test('initGreetForm - Test 2 (Caso Borde): Maneja de forma segura documentos donde no se encuentran los elementos del formulario', () => {
    const mockEmptyDoc = {
        querySelector: () => null
    };

    assert.doesNotThrow(() => {
        initGreetForm(mockEmptyDoc);
    });
});
