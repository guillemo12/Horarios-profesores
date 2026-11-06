import test from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// 1. greet - Test 1 (Happy Path): Saluda correctamente usando el invocador de Tauri
// -------------------------------------------------------------
test('greet - Test 1 (Happy Path): Saluda correctamente usando el invocador de Tauri', async () => {
    const inputElement = { value: 'Guillermo' } as unknown as HTMLInputElement;
    const msgElement = { textContent: '' } as unknown as HTMLElement;

    let calledCommand = '';
    let calledArgs: Record<string, unknown> | undefined;

    const mockInvoke = async (cmd: string, args?: Record<string, unknown>) => {
        calledCommand = cmd;
        calledArgs = args;
        return `Hello, ${args?.name}! You've been greeted from Rust!`;
    };

    const result = await greet(inputElement, msgElement, mockInvoke);

    assert.strictEqual(calledCommand, 'greet');
    assert.deepStrictEqual(calledArgs, { name: 'Guillermo' });
    assert.strictEqual(result, "Hello, Guillermo! You've been greeted from Rust!");
    assert.strictEqual(msgElement.textContent, "Hello, Guillermo! You've been greeted from Rust!");
});

// -------------------------------------------------------------
// 2. greet - Test 2 (Edge Case): Maneja fallback sin invocador y valores de entrada nulos o vacíos
// -------------------------------------------------------------
test('greet - Test 2 (Edge Case): Maneja fallback sin invocador y valores de entrada nulos o vacíos', async () => {
    const msgElement = { textContent: '' } as unknown as HTMLElement;

    // Caso 1: input nulo y sin invocador (debe usar fallback seguro con string vacío)
    const fallbackResultEmpty = await greet(null, msgElement, undefined);
    assert.strictEqual(fallbackResultEmpty, "Hello, ! You've been greeted from JavaScript (fallback)!");
    assert.strictEqual(msgElement.textContent, "Hello, ! You've been greeted from JavaScript (fallback)!");

    // Caso 2: msgElement nulo no debe lanzar ninguna excepción
    const mockInvoke = async (_cmd: string, args?: Record<string, unknown>) => `Greeting for ${args?.name}`;
    const inputElement = { value: 'Tester' } as unknown as HTMLInputElement;
    const resultWithoutMsgEl = await greet(inputElement, null, mockInvoke);
    assert.strictEqual(resultWithoutMsgEl, 'Greeting for Tester');
});
