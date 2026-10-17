import test from 'node:test';
import assert from 'node:assert/strict';
import { executeGreetCommand, handleGreetSubmit } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// 1. executeGreetCommand - Mínimo 2 Tests (AGENTS.md)
// -------------------------------------------------------------
test('executeGreetCommand - Test 1 (Happy Path): Retorna la respuesta de saludo correctamente cuando se provee un nombre válido', async () => {
  const mockInvoke = async (cmd, args) => {
    assert.strictEqual(cmd, 'greet');
    assert.strictEqual(args.name, 'EduSchedule User');
    return 'Hola, EduSchedule User! Saludos desde Rust!';
  };

  const result = await executeGreetCommand('EduSchedule User', mockInvoke);
  assert.strictEqual(result, 'Hola, EduSchedule User! Saludos desde Rust!');
});

test('executeGreetCommand - Test 2 (Edge Case): Maneja entradas vacías, compuestas solo de espacios o nulas de forma segura', async () => {
  const emptyResult = await executeGreetCommand('', async () => 'Fail');
  assert.strictEqual(emptyResult, 'Por favor, introduce un nombre válido.');

  const whitespaceResult = await executeGreetCommand('   ', async () => 'Fail');
  assert.strictEqual(whitespaceResult, 'Por favor, introduce un nombre válido.');

  const nullResult = await executeGreetCommand(null, async () => 'Fail');
  assert.strictEqual(nullResult, 'Por favor, introduce un nombre válido.');
});

// -------------------------------------------------------------
// 2. handleGreetSubmit - Mínimo 2 Tests (AGENTS.md)
// -------------------------------------------------------------
test('handleGreetSubmit - Test 1 (Happy Path): Actualiza el contenido de texto del elemento con la respuesta esperada', async () => {
  const inputEl = { value: '  Profesor Juan  ' };
  const msgEl = { textContent: '' };

  const mockInvoke = async (cmd, args) => {
    assert.strictEqual(args.name, 'Profesor Juan');
    return 'Hola Profesor Juan!';
  };

  const prevWindow = globalThis.window;
  globalThis.window = {
    __TAURI__: {
      core: {
        invoke: mockInvoke,
      },
    },
  };

  try {
    await handleGreetSubmit(inputEl, msgEl);
    assert.strictEqual(msgEl.textContent, 'Hola Profesor Juan!');
  } finally {
    globalThis.window = prevWindow;
  }
});

test('handleGreetSubmit - Test 2 (Edge Case): Maneja de forma segura elementos DOM nulos o no existentes sin lanzar excepciones', async () => {
  await assert.doesNotReject(async () => {
    await handleGreetSubmit(null, null);
    await handleGreetSubmit({ value: 'Test' }, null);
    await handleGreetSubmit(null, { textContent: '' });
  });
});
