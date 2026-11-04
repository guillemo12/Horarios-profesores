import test from 'node:test';
import assert from 'node:assert/strict';
import { greetUser, handleGreetSubmit } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// 1. greetUser - Mínimo 2 Tests
// -------------------------------------------------------------
test('greetUser - Test 1 (Happy Path): Invoca comando Tauri greet con nombre y retorna respuesta formateada', async () => {
    let invokedCmd = '';
    let invokedArgs = null;

    const mockInvoke = async (cmd, args) => {
        invokedCmd = cmd;
        invokedArgs = args;
        return `Hello, ${args.name}! You've been greeted from Rust!`;
    };

    const result = await greetUser('Guillermo', mockInvoke);
    assert.strictEqual(invokedCmd, 'greet');
    assert.deepStrictEqual(invokedArgs, { name: 'Guillermo' });
    assert.strictEqual(result, "Hello, Guillermo! You've been greeted from Rust!");
});

test('greetUser - Test 2 (Edge Case): Maneja nombres vacíos, con espacios o ausencia del runtime de Tauri', async () => {
    // Caso con espacios y simulador Tauri
    const mockInvoke = async (cmd, args) => `Hello, ${args.name}!`;
    const resTrimmed = await greetUser('   Maria   ', mockInvoke);
    assert.strictEqual(resTrimmed, 'Hello, Maria!');

    // Caso sin runtime de Tauri ni invokeFn (fallback seguro)
    const originalTauri = globalThis.window ? globalThis.window.__TAURI__ : undefined;
    if (globalThis.window) {
        delete globalThis.window.__TAURI__;
    }
    const resFallback = await greetUser('Ana', undefined);
    assert.strictEqual(resFallback, "Hello, Ana! You've been greeted from Tauri!");

    const resFallbackEmpty = await greetUser('', undefined);
    assert.strictEqual(resFallbackEmpty, "Hello! You've been greeted from Tauri!");

    if (globalThis.window && originalTauri) {
        globalThis.window.__TAURI__ = originalTauri;
    }
});

// -------------------------------------------------------------
// 2. handleGreetSubmit - Mínimo 2 Tests
// -------------------------------------------------------------
test('handleGreetSubmit - Test 1 (Happy Path): Obtiene valor del input y actualiza textContent del elemento mensaje', async () => {
    const inputMock = { value: 'Carlos' };
    const msgMock = { textContent: '' };
    const mockInvoke = async (_cmd, args) => `Respuesta para ${args.name}`;

    await handleGreetSubmit(inputMock, msgMock, mockInvoke);
    assert.strictEqual(msgMock.textContent, 'Respuesta para Carlos');
});

test('handleGreetSubmit - Test 2 (Edge Case): Maneja de forma segura input o messageElement nulos sin excepciones', async () => {
    // msgMock nulo: no hace nada y no lanza excepción
    await assert.doesNotReject(async () => {
        await handleGreetSubmit({ value: 'Test' }, null);
    });

    // inputMock nulo: procesa con string vacío
    const msgMock = { textContent: '' };
    const mockInvoke = async (_cmd, args) => `Respuesta: '${args.name}'`;
    await handleGreetSubmit(null, msgMock, mockInvoke);
    assert.strictEqual(msgMock.textContent, "Respuesta: ''");
});
