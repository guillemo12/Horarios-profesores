import test from 'node:test';
import assert from 'node:assert/strict';
import { greet, initEventListeners } from '../Proyecto_Horarios/src/main.ts';

test('greet - Test 1 (Happy Path): Llama a window.__TAURI__.core.invoke cuando está disponible', async () => {
  // Configurar DOM simulado si es necesario o mock de window
  global.window = {
    __TAURI__: {
      core: {
        invoke: async (cmd, args) => {
          assert.equal(cmd, 'greet');
          return `Hello, ${args.name}!`;
        }
      }
    }
  };

  const result = await greet();
  assert.equal(result, 'Hello, !');
});

test('greet - Test 2 (Edge Case): Maneja ausencia de window.__TAURI__ con un fallback seguro', async () => {
  global.window = {};

  const result = await greet();
  assert.equal(result, 'Hello, World! (Fallback)');
});
