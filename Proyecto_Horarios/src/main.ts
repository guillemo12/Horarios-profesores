declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke<T = unknown>(cmd: string, args?: Record<string, unknown>): Promise<T>;
      };
    };
  }
}

let greetInputEl: HTMLInputElement | null = null;
let greetMsgEl: HTMLElement | null = null;

export async function greet(): Promise<void> {
  if (greetMsgEl && greetInputEl && window.__TAURI__?.core) {
    const name = greetInputEl.value;
    greetMsgEl.textContent = await window.__TAURI__.core.invoke<string>("greet", { name });
  }
}

export function initApp(): void {
  greetInputEl = document.querySelector<HTMLInputElement>("#greet-input");
  greetMsgEl = document.querySelector<HTMLElement>("#greet-msg");
  document.querySelector("#greet-form")?.addEventListener("submit", (e: Event) => {
    e.preventDefault();
    greet();
  });
}

if (typeof window !== "undefined") {
  window.addEventListener("DOMContentLoaded", () => {
    initApp();
  });
}
