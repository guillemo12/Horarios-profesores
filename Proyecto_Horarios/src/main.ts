interface TauriCore {
  invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
}

declare global {
  interface Window {
    __TAURI__?: {
      core: TauriCore;
    };
  }
}

export async function greetUser(
  name: string,
  invokeFn?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>
): Promise<string> {
  const trimmedName = name.trim();
  const tauriCore = typeof window !== "undefined" ? window.__TAURI__?.core : undefined;
  const caller = invokeFn || tauriCore?.invoke;
  if (!caller) {
    return trimmedName ? `Hello, ${trimmedName}! You've been greeted from Tauri!` : "Hello! You've been greeted from Tauri!";
  }
  return await caller<string>("greet", { name: trimmedName });
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function handleGreetSubmit(
  inputElement: HTMLInputElement | null,
  messageElement: HTMLElement | null,
  invokeFn?: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>
): Promise<void> {
  if (!messageElement) return;
  const name = inputElement ? inputElement.value : "";
  const result = await greetUser(name, invokeFn);
  messageElement.textContent = result;
}

export function initGreetApp(): void {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const greetForm = document.querySelector<HTMLFormElement>("#greet-form");
  if (greetForm) {
    greetForm.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      void handleGreetSubmit(greetInputEl, greetMsgEl);
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initGreetApp();
  });
}
