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

export async function greet(): Promise<string> {
  const name = greetInputEl ? greetInputEl.value : "";
  const invoke = window.__TAURI__?.core?.invoke;
  if (!invoke) {
    return `Hello, ${name}!`;
  }
  const response = await invoke<string>("greet", { name });
  if (greetMsgEl) {
    greetMsgEl.textContent = response;
  }
  return response;
}

export function initGreetApp(): void {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");

  const formEl = document.querySelector<HTMLFormElement>("#greet-form");
  if (formEl) {
    formEl.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      greet();
    });
  }
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initGreetApp();
  });
}
