import test from 'node:test';
import assert from 'node:assert/strict';
import { greet, handleGreetSubmit, initApp } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// 1. greet - Test 1 (Happy Path)
// -------------------------------------------------------------
test('greet - Test 1 (Happy Path): Invoca correctamente el comando de Tauri y devuelve el mensaje de saludo', async () => {
  const customInvoke = async (cmd, args) => {
    assert.strictEqual(cmd, 'greet');
    return `Hello, ${args.name}! Welcome to EduSchedule.`;
  };

  const result = await greet('Jules', customInvoke);
  assert.strictEqual(result, 'Hello, Jules! Welcome to EduSchedule.');
});

// -------------------------------------------------------------
// 2. greet - Test 2 (Edge Case)
// -------------------------------------------------------------
test('greet - Test 2 (Edge Case): Maneja nombres vacíos/nulos y fallback cuando no hay entorno Tauri', async () => {
  // Con entrada nula y función invoke de pruebas
  const customInvoke = async (cmd, args) => {
    assert.strictEqual(args.name, '');
    return `Hello, !`;
  };

  const resultNull = await greet(null, customInvoke);
  assert.strictEqual(resultNull, 'Hello, !');

  // Sin runtime de Tauri y sin customInvoke
  const resultFallback = await greet('   Maria   ');
  assert.strictEqual(resultFallback, 'Hello, Maria!');
});
