import test from 'node:test';
import assert from 'node:assert/strict';

import { greet, initGreetApp } from '../Proyecto_Horarios/src/main.ts';

test('Tauri main - Test 1 (Happy Path): Saluda con el nombre proporcionado si no hay tauri invoke', async () => {
    // Simular DOM básico si no está presente
    const originalWindow = globalThis.window;
    const mockDocument = {
        querySelector: (selector) => {
            if (selector === '#greet-input') return { value: 'EduSchedule' };
            if (selector === '#greet-msg') return { textContent: '' };
            if (selector === '#greet-form') return { addEventListener: () => {} };
            return null;
        }
    };

    globalThis.window = {
        addEventListener: () => {}
    };
    globalThis.document = mockDocument;

    try {
        initGreetApp();
        const result = await greet();
        assert.strictEqual(result, 'Hello, EduSchedule!');
    } finally {
        globalThis.window = originalWindow;
    }
});

test('Tauri main - Test 2 (Edge Case): Llama a window.__TAURI__.core.invoke cuando está disponible y actualiza el mensaje', async () => {
    let invokedCmd = '';
    let invokedArgs = null;
    const msgEl = { textContent: '' };
    const inputEl = { value: 'Maria' };

    const mockDocument = {
        querySelector: (selector) => {
            if (selector === '#greet-input') return inputEl;
            if (selector === '#greet-msg') return msgEl;
            if (selector === '#greet-form') return { addEventListener: () => {} };
            return null;
        }
    };

    const originalWindow = globalThis.window;
    globalThis.window = {
        addEventListener: () => {},
        __TAURI__: {
            core: {
                invoke: async (cmd, args) => {
                    invokedCmd = cmd;
                    invokedArgs = args;
                    return `Hola desde Tauri, ${args.name}!`;
                }
            }
        }
    };
    globalThis.document = mockDocument;

    try {
        initGreetApp();
        const result = await greet();
        assert.strictEqual(result, 'Hola desde Tauri, Maria!');
        assert.strictEqual(invokedCmd, 'greet');
        assert.deepStrictEqual(invokedArgs, { name: 'Maria' });
        assert.strictEqual(msgEl.textContent, 'Hola desde Tauri, Maria!');
    } finally {
        globalThis.window = originalWindow;
    }
});
