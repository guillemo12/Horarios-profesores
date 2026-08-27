import test from 'node:test';
import assert from 'node:assert/strict';
import { greet, initApp } from '../Proyecto_Horarios/src/main.ts';

test('Tauri main.ts - greet() invoca el comando greet de Tauri y actualiza el elemento DOM', async () => {
  let invokedCommand = null;
  let invokedArgs = null;

  globalThis.window = {
    __TAURI__: {
      core: {
        async invoke(cmd, args) {
          invokedCommand = cmd;
          invokedArgs = args;
          return `Hola, ${args.name}!`;
        }
      }
    }
  };

  const inputEl = { value: 'Mundo' };
  const msgEl = { textContent: '' };
  const formEl = {
    addEventListener: (event, handler) => {
      formEl.submitHandler = handler;
    }
  };

  globalThis.document = {
    querySelector: (selector) => {
      if (selector === '#greet-input') return inputEl;
      if (selector === '#greet-msg') return msgEl;
      if (selector === '#greet-form') return formEl;
      return null;
    }
  };

  initApp();

  assert.ok(typeof formEl.submitHandler === 'function');

  const eventMock = { preventDefault: () => {} };
  await formEl.submitHandler(eventMock);

  assert.strictEqual(invokedCommand, 'greet');
  assert.deepStrictEqual(invokedArgs, { name: 'Mundo' });
  assert.strictEqual(msgEl.textContent, 'Hola, Mundo!');
});

test('Tauri main.ts - greet() se comporta de forma segura si falta el entorno Tauri o DOM', async () => {
  globalThis.window = {};
  globalThis.document = { querySelector: () => null };

  initApp();
  await greet();

  assert.ok(true);
});
