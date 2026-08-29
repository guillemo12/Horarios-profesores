declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function greet(): Promise<void> {
  if (!greetInputEl || !greetMsgEl) return;
  const name = greetInputEl.value;
  const tauriWindow = typeof window !== "undefined" ? window.__TAURI__ : globalThis.__TAURI__;
  const invoke = tauriWindow?.core?.invoke;
  if (invoke) {
    greetMsgEl.textContent = await invoke<string>("greet", { name });
  } else {
    greetMsgEl.textContent = `Hello, ${name}! You've been greeted from JavaScript!`;
  }
}

export function initGreet(): void {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  const form = document.querySelector<HTMLFormElement>("#greet-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      greet();
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initGreet();
  });
}
