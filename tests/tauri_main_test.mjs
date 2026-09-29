import test from 'node:test';
import assert from 'node:assert/strict';
import { greetUser, setupGreetHandler } from '../Proyecto_Horarios/src/main.ts';

// -------------------------------------------------------------
// 1. greetUser - Tests Unitarios (Camino Feliz y Caso Borde)
// -------------------------------------------------------------
test('greetUser - Test 1 (Happy Path): Retorna el saludo esperado llamando a la función invoke de Tauri', async () => {
  const mockInvoke = async (cmd, args) => {
    assert.strictEqual(cmd, 'greet');
    return `Hello, ${args.name}! You've been greeted from Rust!`;
  };

  const result = await greetUser('Alice', mockInvoke);
  assert.strictEqual(result, "Hello, Alice! You've been greeted from Rust!");
});

test('greetUser - Test 2 (Edge Case): Maneja entradas vacías, espacios o nulas con un fallback seguro', async () => {
  const mockInvoke = async (cmd, args) => {
    return `Hello, ${args.name}!`;
  };

  const resultEmpty = await greetUser('   ', mockInvoke);
  assert.strictEqual(resultEmpty, 'Hello, !');

  const resultFallback = await greetUser(null, null);
  assert.strictEqual(resultFallback, 'Hello, Guest!');
});

// -------------------------------------------------------------
// 2. setupGreetHandler - Tests Unitarios (Camino Feliz y Caso Borde)
// -------------------------------------------------------------
test('setupGreetHandler - Test 1 (Happy Path): Asigna el listener del formulario y actualiza el elemento de mensaje al submit', async () => {
  let submitListener = null;

  const mockInput = { value: 'World' };
  const mockMsg = { textContent: '' };
  const mockForm = {
    addEventListener: (event, listener) => {
      if (event === 'submit') {
        submitListener = listener;
      }
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

  setupGreetHandler(mockDoc);
  assert.ok(typeof submitListener === 'function');

  let prevented = false;
  const mockEvent = {
    preventDefault: () => {
      prevented = true;
    }
  };

  await submitListener(mockEvent);
  assert.strictEqual(prevented, true);
  assert.strictEqual(mockMsg.textContent, 'Hello, World!');
});

test('setupGreetHandler - Test 2 (Edge Case): Retorna de forma segura si faltan elementos en el DOM', () => {
  const mockDocIncompleto = {
    querySelector: (selector) => {
      if (selector === '#greet-form') return { addEventListener: () => {} };
      return null;
    }
  };

  // No debe lanzar excepciones si falta #greet-input o #greet-msg
  assert.doesNotThrow(() => {
    setupGreetHandler(mockDocIncompleto);
  });
});
