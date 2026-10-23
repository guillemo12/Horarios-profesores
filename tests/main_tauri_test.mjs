import test from 'node:test';
import assert from 'node:assert/strict';
import { greet } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// Tests unitarios para greet (Proyecto_Horarios/src/main.ts)
// -------------------------------------------------------------

test('greet - Test 1 (Happy Path): Invoca correctamente la API de Tauri y actualiza el elemento mensaje', async () => {
    const inputEl = { value: '  EduSchedule User  ' };
    const msgEl = { textContent: '' };

    const mockInvoke = async (cmd, args) => {
        assert.strictEqual(cmd, 'greet');
        assert.strictEqual(args.name, 'EduSchedule User');
        return `Hello, ${args.name}! You have been greeted from Rust!`;
    };

    const result = await greet(inputEl, msgEl, mockInvoke);

    assert.strictEqual(result, 'Hello, EduSchedule User! You have been greeted from Rust!');
    assert.strictEqual(msgEl.textContent, 'Hello, EduSchedule User! You have been greeted from Rust!');
});

test('greet - Test 2 (Edge Case): Maneja ausencia de API Tauri, elementos nulos o errores de invocación de forma segura', async () => {
    // Subcaso A: Sin función invoke provista ni window.__TAURI__
    const msgEl1 = { textContent: '' };
    const resNoApi = await greet(null, msgEl1, null);
    assert.strictEqual(resNoApi, 'Tauri API no está disponible en este entorno');
    assert.strictEqual(msgEl1.textContent, 'Tauri API no está disponible en este entorno');

    // Subcaso B: Invocación lanza error
    const msgEl2 = { textContent: '' };
    const mockFailingInvoke = async () => {
        throw new Error('Comando no encontrado');
    };
    const resError = await greet({ value: 'Test' }, msgEl2, mockFailingInvoke);
    assert.strictEqual(resError, 'Error al invocar saludo: Comando no encontrado');
    assert.strictEqual(msgEl2.textContent, 'Error al invocar saludo: Comando no encontrado');

    // Subcaso C: Elementos DOM nulos no provocan excepciones
    const mockInvoke = async (cmd, args) => `Hello ${args.name}`;
    const resNullEls = await greet(null, null, mockInvoke);
    assert.strictEqual(resNullEls, 'Hello ');
});
