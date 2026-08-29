import test from 'node:test';
import assert from 'node:assert/strict';
import { greet, initGreet } from '../Proyecto_Horarios/src/main.ts';

test('greet - Test 1 (Happy Path): Saluda correctamente usando invoke o fallback sin invoke de Tauri', async () => {
  // Configurar elementos DOM mock
  const inputEl = { value: 'Alice' };
  const msgEl = { textContent: '' };

  const originalQuerySelector = globalThis.document ? globalThis.document.querySelector : undefined;
  globalThis.window = globalThis;
  globalThis.document = {
    querySelector: (selector) => {
      if (selector === '#greet-input') return inputEl;
      if (selector === '#greet-msg') return msgEl;
      if (selector === '#greet-form') return null;
      return null;
    }
  };

  initGreet();
  await greet();

  assert.strictEqual(msgEl.textContent, "Hello, Alice! You've been greeted from JavaScript!");

  if (originalQuerySelector) {
    globalThis.document.querySelector = originalQuerySelector;
  }
});

test('greet - Test 2 (Edge Case / Fallback): Retorna de manera segura si los elementos del DOM no existen', async () => {
  globalThis.document = {
    querySelector: () => null
  };

  initGreet();
  // No debe lanzar error ni romper la ejecución
  await greet();
  assert.ok(true);
});
