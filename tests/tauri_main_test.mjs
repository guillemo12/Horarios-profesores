import test from 'node:test';
import assert from 'node:assert/strict';
import { greetUser } from '../Proyecto_Horarios/src/main.ts';

test('greetUser - Test 1 (Happy Path): Saluda correctamente usando la invocación de Tauri', async () => {
    const mockInvoker = async (cmd, args) => {
        assert.strictEqual(cmd, 'greet');
        assert.strictEqual(args.name, 'Eduardo');
        return `Hello, ${args.name}! You've been greeted from Rust!`;
    };

    const result = await greetUser('Eduardo', mockInvoker);
    assert.strictEqual(result, "Hello, Eduardo! You've been greeted from Rust!");
});

test('greetUser - Test 2 (Edge Case): Maneja nombres vacíos, modo offline y errores de invocado de forma segura', async () => {
    // 1. Nombre vacío o espacios
    const emptyResult = await greetUser('   ', null);
    assert.strictEqual(emptyResult, 'Hola, visitante silencioso');

    // 2. Modo Offline (sin invoker ni window.__TAURI__)
    const offlineResult = await greetUser('María', null);
    assert.strictEqual(offlineResult, 'Hola, María! (Modo Offline)');

    // 3. Error capturado del invoker
    const failingInvoker = async () => {
        throw new Error('Rust IPC Error');
    };
    const errorResult = await greetUser('Carlos', failingInvoker);
    assert.ok(errorResult.includes('Error al saludar a Carlos: Rust IPC Error'));
});
