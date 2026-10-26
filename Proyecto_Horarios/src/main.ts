declare global {
  interface Window {
    __TAURI__?: {
      core?: {
        invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function greet(): Promise<void> {
  const invoke = window.__TAURI__?.core?.invoke;
  if (!greetMsgEl) {
    return;
  }
  const nameValue = greetInputEl?.value ?? "";
  if (typeof invoke === "function") {
    const greeting = await invoke<string>("greet", { name: nameValue });
    greetMsgEl.textContent = greeting;
  } else {
    greetMsgEl.textContent = `Hello, ${nameValue}! (Mock)`;
  }
}

export function initApp(): void {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  const formEl = document.querySelector<HTMLFormElement>("#greet-form");

  if (formEl) {
    formEl.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      void greet();
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
}
