import test from 'node:test';
import assert from 'node:assert/strict';
import { greet, initTauriApp } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// 1. greet - Test 1 (Happy Path): Invoca Tauri API si window.__TAURI__ existe y actualiza el DOM
// -------------------------------------------------------------
test('greet - Test 1 (Happy Path): Retorna el saludo esperado usando Tauri o fallback', async () => {
    globalThis.window = {
        __TAURI__: {
            core: {
                invoke: async (cmd, args) => `Hola, ${args.name} desde Rust Tauri!`
            }
        }
    };

    const mockInput = { value: 'Guillermo' };
    const mockMsg = { textContent: '' };

    const result = await greet(mockInput, mockMsg);

    assert.strictEqual(result, 'Hola, Guillermo desde Rust Tauri!');
    assert.strictEqual(mockMsg.textContent, 'Hola, Guillermo desde Rust Tauri!');
});

// -------------------------------------------------------------
// 2. greet - Test 2 (Edge Case): Maneja de forma segura inputs nulos y cuando window.__TAURI__ no existe
// -------------------------------------------------------------
test('greet - Test 2 (Edge Case): Maneja de forma segura inputs nulos y cuando window.__TAURI__ no existe', async () => {
    globalThis.window = {}; // Sin __TAURI__

    const mockInputNull = null;
    const mockMsg = { textContent: '' };

    const result = await greet(mockInputNull, mockMsg);

    assert.strictEqual(result, "Hello, ! You've been greeted from JavaScript!");
    assert.strictEqual(mockMsg.textContent, "Hello, ! You've been greeted from JavaScript!");
});

// -------------------------------------------------------------
// 3. initTauriApp - Test 3 (Happy Path & Edge Case): Inicializa elementos DOM y procesa eventos submit
// -------------------------------------------------------------
test('initTauriApp - Test 3 (Happy Path & Edge Case): Inicializa elementos DOM y maneja eventos submit', async () => {
    globalThis.window = {};

    let submitListener = null;

    const mockInput = { value: 'María' };
    const mockMsg = { textContent: '' };
    const mockForm = {
        addEventListener: (event, cb) => {
            if (event === 'submit') submitListener = cb;
        }
    };

    const mockDoc = {
        querySelector: (selector) => {
            if (selector === '#greet-input') return mockInput;
            if (selector === '#greet-msg') return mockMsg;
            if (selector === '#greet-form') return mockForm;
            return null;
        }
    };

    initTauriApp(mockDoc);

    assert.ok(typeof submitListener === 'function');

    let defaultPrevented = false;
    const mockEvent = {
        preventDefault: () => { defaultPrevented = true; }
    };

    submitListener(mockEvent);
    assert.strictEqual(defaultPrevented, true);

    // Wait for async greet() inside submit listener to finish
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.strictEqual(mockMsg.textContent, "Hello, María! You've been greeted from JavaScript!");
});
