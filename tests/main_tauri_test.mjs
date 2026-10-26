import test from "node:test";
import assert from "node:assert/strict";
import { greet, initApp } from "../Proyecto_Horarios/src/main.ts";

test("Tauri Main Module - Test 1 (Happy Path): invokes tauri greet command and sets textContent", async () => {
  let invokedCmd = null;
  let invokedArgs = null;

  const greetInputEl = { value: "Alice" };
  const greetMsgEl = { textContent: "" };
  const formEl = {
    listeners: {},
    addEventListener(event, fn) {
      this.listeners[event] = fn;
    }
  };

  const documentMock = {
    querySelector(selector) {
      if (selector === "#greet-input") return greetInputEl;
      if (selector === "#greet-msg") return greetMsgEl;
      if (selector === "#greet-form") return formEl;
      return null;
    }
  };

  const windowMock = {
    addEventListener() {},
    __TAURI__: {
      core: {
        invoke: async (cmd, args) => {
          invokedCmd = cmd;
          invokedArgs = args;
          return `Hello, ${args.name}!`;
        }
      }
    }
  };

  globalThis.document = documentMock;
  globalThis.window = windowMock;

  initApp();
  await greet();

  assert.equal(invokedCmd, "greet");
  assert.deepEqual(invokedArgs, { name: "Alice" });
  assert.equal(greetMsgEl.textContent, "Hello, Alice!");
});

test("Tauri Main Module - Test 2 (Edge Case): fallback gracefully when invoke function is missing", async () => {
  const greetInputEl = { value: "Bob" };
  const greetMsgEl = { textContent: "" };

  const documentMock = {
    querySelector(selector) {
      if (selector === "#greet-input") return greetInputEl;
      if (selector === "#greet-msg") return greetMsgEl;
      return null;
    }
  };

  const windowMock = {
    addEventListener() {}
  };

  globalThis.document = documentMock;
  globalThis.window = windowMock;

  initApp();
  await greet();

  assert.equal(greetMsgEl.textContent, "Hello, Bob! (Mock)");
});
